import React, { useState, useCallback, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import UnifiedDashboard from './components/UnifiedDashboard';
import Registration from './components/Registration';
import AccountSettings from './components/AccountSettings';
import { clearCache } from './services/cacheService';
import type { User, AppSettings, UserUsage } from './types';
import { setSystemGeminiApiKey } from './services/apiKeyService';
import Spinner from './components/common/Spinner';

const initialAppSettings: AppSettings = {
    freePlanLimit: 30,
    plans: {
        pro: { name: 'Pro', analyses: 100, price: 19000 },
        biz: { name: 'Biz', analyses: 200, price: 29000 },
    },
    apiKeys: {
        youtube: (import.meta.env.VITE_YOUTUBE_API_KEY as string) || '',
        analytics: (import.meta.env.VITE_YOUTUBE_ANALYTICS_API_KEY as string) || '',
        reporting: (import.meta.env.VITE_YOUTUBE_REPORTING_API_KEY as string) || '',
        gemini: (import.meta.env.VITE_GEMINI_API_KEY as string) || '',
    },
    analyticsConnection: null,
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'dashboard' | 'account'>('landing');
  const [appSettings, setAppSettings] = useState<AppSettings>(initialAppSettings);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    clearCache();
    setUser(null);
    setView('landing');
    setInitializing(false);
  }, []);

  useEffect(() => {
    setSystemGeminiApiKey(appSettings.apiKeys.gemini);
  }, [appSettings.apiKeys.gemini]);

  const handleLogin = useCallback((credentials: { googleUser?: { name: string; email: string }; email?: string; password?: string }) => {
    let userToSet: User | null = null;
    const ADMIN_EMAIL = '8friend8ship@hanmail.net';

    const getUsageLimits = (plan: 'Free' | 'Pro' | 'Biz', isAdmin: boolean): UserUsage => {
      const unlimitedLimit = { used: 0, limit: Infinity };
      return {
        search: unlimitedLimit,
        channelDetail: unlimitedLimit,
        videoDetail: unlimitedLimit,
        aiInsight: unlimitedLimit,
        aiContentMaker: unlimitedLimit,
        outlierAnalysis: unlimitedLimit,
        credits: { used: 0, limit: isAdmin ? Infinity : 10000 }
      };
    };

    if (credentials.googleUser) {
        const { name, email } = credentials.googleUser;
        const userId = 'gu_' + email.replace(/@.*/, '');
        const isAdmin = email === ADMIN_EMAIL;
        const plan = isAdmin ? 'Biz' : 'Free';
        userToSet = {
            id: userId,
            name,
            email,
            isAdmin,
            plan,
            usage: getUsageLimits(plan, isAdmin),
            planExpirationDate: plan !== 'Free' ? '2099. 12. 31.' : undefined,
        };
    } else if (credentials.email && credentials.password) {
        const { email, password } = credentials;
        const isAdmin = email === ADMIN_EMAIL || email === 'admin' || email === 'master';
        const plan = isAdmin ? 'Biz' : 'Free';
        userToSet = {
            id: 'form_' + (isAdmin ? 'admin' : email.replace(/@.*/, '')),
            name: isAdmin ? 'Johnson' : 'home design. taedi',
            email: isAdmin ? ADMIN_EMAIL : email,
            password,
            isAdmin,
            plan,
            usage: getUsageLimits(plan, isAdmin),
            planExpirationDate: plan !== 'Free' ? '2099. 12. 31.' : undefined,
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
          const newUsage = { ...prevUser.usage, ...updatedUser.usage };
          return { ...prevUser, ...updatedUser, usage: newUsage };
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

  const navigateTo = (targetView: 'login' | 'register' | 'dashboard' | 'account') => setView(targetView);

  if (initializing) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-900"><Spinner message="Initializing..." /></div>;
  }

  const renderContent = () => {
    if (user) {
      if (view === 'account') return <AccountSettings user={user} onNavigate={navigateTo} onUpdateUser={handleUpdateUser} />;
      return <UnifiedDashboard user={user} appSettings={appSettings} onLogout={handleLogout} onNavigate={navigateTo} onUpdateUser={handleUpdateUser} onUpdateAppSettings={handleUpdateAppSettings} />;
    }

    if (view === 'login') return <Login onLogin={handleLogin} onNavigate={navigateTo} />;
    if (view === 'register') return <Registration onRegister={() => handleLogin({email: 'demo@user.com', password: 'password'})} onNavigate={navigateTo} />;
    return <LandingPage onStart={() => setView('login')} />;
  };

  return <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">{renderContent()}</div>;
}

export default App;
