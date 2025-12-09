
import React, { useState, useCallback, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Registration from './components/Registration';
import AccountSettings from './components/AccountSettings';
// FIX: Centralized types in types.ts
import { clearCache } from './services/cacheService';
import type { User, AppSettings } from './types';
import { setGeminiApiKey } from './services/apiKeyService';

// Mock user for demonstration
const mockUser: User = {
  id: 'au_12345',
  name: 'Admin User',
  email: 'admin@corp.com',
  isAdmin: true,
  plan: 'Biz',
  usage: 5,
  apiKeyYoutube: '',
  apiKeyAnalytics: '',
  apiKeyReporting: '',
};

const initialAppSettings: AppSettings = {
    freePlanLimit: 10,
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
  const [view, setView] = useState<'login' | 'register' | 'dashboard' | 'account'>('login');
  const [appSettings, setAppSettings] = useState<AppSettings>(initialAppSettings);

  useEffect(() => {
    // Set the Gemini API key for all service calls.
    // This is a global setter to avoid prop-drilling the key everywhere.
    if (appSettings.apiKeys.gemini) {
      setGeminiApiKey(appSettings.apiKeys.gemini);
    }
  }, [appSettings.apiKeys.gemini]);

  const handleLogin = useCallback(() => {
    setUser(mockUser);
    setView('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    clearCache();
    setUser(null);
    setView('login');
  }, []);
  
  const handleUpdateUser = useCallback((updatedUser: Partial<User>) => {
      setUser(prev => prev ? { ...prev, ...updatedUser } : null);
  }, []);

  const handleUpdateAppSettings = useCallback((updatedSettings: Partial<AppSettings>) => {
      setAppSettings(prev => ({...prev, ...updatedSettings}));
  }, []);

  const navigateTo = (targetView: 'login' | 'register' | 'dashboard' | 'account') => {
    setView(targetView);
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
                 // If logged in but view is login/register, redirect to dashboard
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
            case 'login':
                return <Login onLogin={handleLogin} onNavigate={navigateTo} />;
            case 'register':
                return <Registration onRegister={handleLogin} onNavigate={navigateTo} />;
            default:
                 // If not logged in, always show login
                setView('login');
                return <Login onLogin={handleLogin} onNavigate={navigateTo} />;
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
