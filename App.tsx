
import React, { useState, useCallback, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Registration from './components/Registration';
import AccountSettings from './components/AccountSettings';
import { clearCache } from './services/cacheService';
import type { User, AppSettings } from './types';
import { setSystemGeminiApiKey, setUserGeminiApiKey } from './services/apiKeyService';
import Spinner from './components/common/Spinner';

// Helper to safely get environment variables (Runtime > Build)
// Checks for KEY, VITE_KEY in window.env, then import.meta.env
const getEnvVar = (key: string): string => {
    const runtimeEnv = (window as any).env;
    
    if (runtimeEnv) {
        if (runtimeEnv[key]) return runtimeEnv[key];
        if (runtimeEnv[`VITE_${key}`]) return runtimeEnv[`VITE_${key}`];
        // Handle case where input key has VITE_ but env var doesn't
        const strippedKey = key.replace(/^VITE_/, '');
        if (runtimeEnv[strippedKey]) return runtimeEnv[strippedKey];
    }

    // Check import.meta.env (Build)
    // @ts-ignore
    if (import.meta && import.meta.env) {
        // @ts-ignore
        if (import.meta.env[key]) return import.meta.env[key];
        // @ts-ignore
        if (import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`];
    }
    
    return "";
}

// Initial settings with environment variable fallback for system keys
const initialAppSettings: AppSettings = {
    freePlanLimit: 30,
    plans: {
        pro: { name: 'Pro', analyses: 100, price: 19000 },
        biz: { name: 'Biz', analyses: 200, price: 29000 },
    },
    apiKeys: {
        // Check both standard name and VITE_ prefixed name to be safe
        youtube: getEnvVar('YOUTUBE_API_KEY') || getEnvVar('VITE_YOUTUBE_API_KEY'), 
        analytics: '',
        reporting: '',
        gemini: getEnvVar('API_KEY') || getEnvVar('VITE_GEMINI_API_KEY'),
    },
    analyticsConnection: null,
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'dashboard' | 'account'>('landing');
  const [appSettings, setAppSettings] = useState<AppSettings>(initialAppSettings);
  const [initializing, setInitializing] = useState(true);

  // Initialize App & Restore Session
  useEffect(() => {
    const initializeApp = () => {
      // Check for saved user session
      const savedUser = localStorage.getItem('content_os_user_session');
      
      if (savedUser) {
          try {
              const parsedUser = JSON.parse(savedUser);
              setUser(parsedUser);
              setView('dashboard');
          } catch (e) {
              console.error("Failed to restore user session", e);
              localStorage.removeItem('content_os_user_session');
              setUser(null);
              setView('landing');
          }
      } else {
          setUser(null);
          setView('landing');
      }
      
      setInitializing(false);
    };
    initializeApp();
  }, []);

  useEffect(() => {
    setSystemGeminiApiKey(appSettings.apiKeys.gemini);
  }, [appSettings.apiKeys.gemini]);

  useEffect(() => {
    setUserGeminiApiKey(user?.apiKeyGemini || null);
  }, [user?.apiKeyGemini]);


  const handleLogin = useCallback((credentials: { googleUser?: { name: string; email: string }; email?: string; password?: string }) => {
    let userToSet: User | null = null;
    
    const getAdminEmail = () => {
        // Safe access to runtime env
        const runtimeEmail = (window as any).env?.ADMIN_EMAIL;
        if (runtimeEmail) return runtimeEmail;
        return process.env.ADMIN_EMAIL || '8friend8ship@hanmail.net';
    };

    const ADMIN_EMAIL = getAdminEmail();
    
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
            password: password,
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
        // Persist session
        localStorage.setItem('content_os_user_session', JSON.stringify(userToSet));
        setView('dashboard');
    }
  }, []);

  const handleUpdateUser = useCallback((updatedUser: Partial<User>) => {
      setUser(prevUser => {
          if (!prevUser) return null;
          const newUser = { ...prevUser, ...updatedUser };

          // Persist API Keys specifically
          if (newUser.id.startsWith('gu_')) {
              const keysToStore = {
                  apiKeyYoutube: newUser.apiKeyYoutube,
                  apiKeyGemini: newUser.apiKeyGemini,
              };
              localStorage.setItem(`user_api_keys_${newUser.id}`, JSON.stringify(keysToStore));
          }
          
          // Update Session
          localStorage.setItem('content_os_user_session', JSON.stringify(newUser));
          
          return newUser;
      });
  }, []);

  const handleUpdateAppSettings = useCallback((updatedSettings: Partial<AppSettings>) => {
      setAppSettings(prev => ({...prev, ...updatedSettings}));
  }, []);
  
  const handleLogout = useCallback(() => {
    clearCache();
    localStorage.removeItem('content_os_user_session');
    setUser(null);
    setView('landing');
  }, []);

  const navigateTo = (targetView: 'login' | 'register' | 'dashboard' | 'account') => {
    setView(targetView);
  }

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Spinner message="Content OS 시작 중..." />
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
