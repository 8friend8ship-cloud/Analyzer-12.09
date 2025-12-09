import React, { useState, useCallback, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Registration from './components/Registration';
import AccountSettings from './components/AccountSettings';
import { clearCache, clearOldDailyCaches } from './services/cacheService';
import type { User, AppSettings } from './types';
import { setSystemGeminiApiKey, setUserGeminiApiKey } from './services/apiKeyService';
import Spinner from './components/common/Spinner';

const initialAppSettings: AppSettings = {
    freePlanLimit: 30, // Updated from 10 to 30
    plans: {
        pro: { name: 'Pro', analyses: 100, price: 19000 },
        biz: { name: 'Biz', analyses: 200, price: 29000 },
    },
    apiKeys: {
        youtube: '',
        analytics: '',
        reporting: '',
        gemini: '',
    },
    analyticsConnection: null,
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'dashboard' | 'account'>('landing');
  const [appSettings, setAppSettings] = useState<AppSettings>(initialAppSettings);
  const [initializing, setInitializing] = useState(true); // Forcing a clean start

  // This effect runs only once on mount to ensure a clean state, solving the hot-reload issue.
  useEffect(() => {
    clearCache(); // Clears session cache
    clearOldDailyCaches(); // Clears old daily caches from localStorage
    setUser(null);
    setView('landing');
    setInitializing(false);
  }, []);

  useEffect(() => {
    // Set the SYSTEM Gemini API key when app settings change.
    setSystemGeminiApiKey(appSettings.apiKeys.gemini);
  }, [appSettings.apiKeys.gemini]);

  useEffect(() => {
    // Set or clear the USER-specific Gemini API key when the user logs in/out or updates their key.
    setUserGeminiApiKey(user?.apiKeyGemini || null);
  }, [user?.apiKeyGemini]);


  const handleLogin = useCallback((credentials: { googleUser?: { name: string; email: string }; email?: string; password?: string }) => {
    let userToSet: User | null = null;
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '8friend8ship@hanmail.net';
    
    if (credentials.googleUser) {
        const { name, email } = credentials.googleUser;
        const userId = 'gu_' + email.replace(/@.*/, '');
        const isAdmin = email === ADMIN_EMAIL;
        const plan = isAdmin ? 'Biz' : 'Free';
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);

        userToSet = {
            id: userId,
            name: name,
            email: email,
            isAdmin: isAdmin,
            plan: plan,
            usage: 0,
            apiKeyYoutube: '',
            apiKeyGemini: '',
            planExpirationDate: (plan !== 'Free') ? expirationDate.toISOString().split('T')[0] : undefined,
        };
        // Restore API keys from localStorage
        const storedKeys = localStorage.getItem(`user_api_keys_${userId}`);
        if (storedKeys) {
            const { apiKeyYoutube, apiKeyGemini } = JSON.parse(storedKeys);
            if(apiKeyYoutube) userToSet.apiKeyYoutube = apiKeyYoutube;
            if(apiKeyGemini) userToSet.apiKeyGemini = apiKeyGemini;
        }

    } else if (credentials.email && credentials.password) {
        const { email, password } = credentials;
        const isAdmin = email === 'admin@corp.com' || email === ADMIN_EMAIL;
        const plan = isAdmin ? 'Biz' : 'Free';
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);

        userToSet = {
            id: 'form_' + email.replace(/@.*/, ''),
            name: email.split('@')[0],
            email: email,
            password: password, // Store password for display
            isAdmin: isAdmin,
            plan: plan,
            usage: 0,
            apiKeyYoutube: '',
            apiKeyGemini: '',
            planExpirationDate: (plan !== 'Free') ? expirationDate.toISOString().split('T')[0] : undefined,
        };
    }
    
    if (userToSet) {
        setUser(userToSet);
        setView('dashboard');
    }
  }, []);

  const handleUpdateUser = useCallback((updatedUser: Partial<User>) => {
      setUser(prevUser => {
          if (!prevUser) return null;
          const newUser = { ...prevUser, ...updatedUser };

          // Persist API keys for Google users
          if (newUser.id.startsWith('gu_')) {
              const keysToStore = {
                  apiKeyYoutube: newUser.apiKeyYoutube,
                  apiKeyGemini: newUser.apiKeyGemini,
              };
              localStorage.setItem(`user_api_keys_${newUser.id}`, JSON.stringify(keysToStore));
          }
          return newUser;
      });
  }, []);

  const handleUpdateAppSettings = useCallback((updatedSettings: Partial<AppSettings>) => {
      setAppSettings(prev => ({...prev, ...updatedSettings}));
  }, []);
  
  const handleLogout = useCallback(() => {
    clearCache();
    setUser(null);
    setView('landing');
  }, []);

  const navigateTo = (targetView: 'login' | 'register' | 'dashboard' | 'account') => {
    setView(targetView);
  }

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Spinner message="Initializing..." />
      </div>
    );
  }

  const renderContent = () => {
    if (user) {
        switch (view) {
            case 'dashboard':
                return <Dashboard 
                            user={user} 
                            appSettings={appSettings}
                            onLogout={handleLogout} 
                            onNavigate={navigateTo} 
                            onUpdateUser={handleUpdateUser}
                            onUpdateAppSettings={handleUpdateAppSettings} 
                        />;
            case 'account':
                return <AccountSettings user={user} onNavigate={navigateTo} onUpdateUser={handleUpdateUser} />;
            default:
                 // If logged in but view is something else, redirect to dashboard
                setView('dashboard');
                return <Dashboard 
                            user={user} 
                            appSettings={appSettings}
                            onLogout={handleLogout} 
                            onNavigate={navigateTo} 
                            onUpdateUser={handleUpdateUser} 
                            onUpdateAppSettings={handleUpdateAppSettings}
                        />;
        }
    } else {
        switch (view) {
            case 'landing':
                return <LandingPage onStart={() => setView('login')} />;
            case 'login':
                return <Login onLogin={handleLogin} onNavigate={navigateTo} />;
            case 'register':
                return <Registration onRegister={() => handleLogin({email: 'new@user.com', password: 'password'})} onNavigate={navigateTo} />;
            default:
                 // If not logged in, always show landing
                setView('landing');
                return <LandingPage onStart={() => setView('login')} />;
        }
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {renderContent()}
    </div>
  );
}

export default App;