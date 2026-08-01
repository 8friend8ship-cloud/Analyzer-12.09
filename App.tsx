import React, { useState, useCallback, useEffect } from 'react';
const LandingPage = React.lazy(() => import('./components/LandingPage'));
const Login = React.lazy(() => import('./components/Login'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Registration = React.lazy(() => import('./components/Registration'));
const AccountSettings = React.lazy(() => import('./components/AccountSettings'));
import { clearCache } from './services/cacheService';
import type { User, AppSettings, UserUsage } from './types';
import Spinner from './components/common/Spinner';
import { isCanonicalGoogleAdmin, normalizeEmail } from './services/authPolicy';

const initialAppSettings: AppSettings = {
    freePlanLimit: 30, // Updated from 10 to 30
    plans: {
        pro: { name: 'Pro', analyses: 100, price: 19000 },
        biz: { name: 'Biz', analyses: 200, price: 29000 },
    },
    apiKeys: {
        // Browser-bundled service keys are intentionally disabled. Public configuration
        // must come from a verified backend contract; secrets never belong in Vite state.
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
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initializeApp = () => {
      clearCache();
      setUser(null);
      setView('landing');
      setInitializing(false);
    };
    initializeApp();
  }, []);

  const handleLogin = useCallback((credentials: { googleUser?: { name: string; email: string }; email?: string; password?: string }) => {
    let userToSet: User | null = null;
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
        const { name } = credentials.googleUser;
        const email = normalizeEmail(credentials.googleUser.email);
        const userId = 'gu_' + email.replace(/@.*/, '');
        const isAdmin = isCanonicalGoogleAdmin(email);
        const plan = isAdmin ? 'Biz' : 'Free';
        
        userToSet = {
            id: userId,
            name: name,
            email: email,
            isAdmin: isAdmin,
            plan: plan,
            usage: getUsageLimits(plan, isAdmin),
            planExpirationDate: plan !== 'Free' ? '2099. 12. 31.' : undefined,
        };

    } else if (credentials.email && credentials.password) {
        const email = normalizeEmail(credentials.email);
        // Password-only form login is never trusted for production administrator privileges.
        // Admin access requires the canonical Google identity and must be verified upstream.
        const isAdmin = false;
        const plan = 'Free' as const;

        userToSet = {
            id: 'form_' + email.replace(/@.*/, ''),
            name: email.replace(/@.*/, '') || 'User',
            email,
            isAdmin: isAdmin,
            plan: plan,
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
          // Deep merge for usage object
          const newUsage = { ...prevUser.usage, ...updatedUser.usage };
          const newUser = { ...prevUser, ...updatedUser, usage: newUsage };
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
                return <Registration onRegister={() => handleLogin({email: 'demo@user.com', password: 'password'})} onNavigate={navigateTo} />;
            default:
                setView('landing');
                return <LandingPage onStart={() => setView('login')} />;
        }
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Spinner message="Loading..." /></div>}>
        {renderContent()}
      </React.Suspense>
    </div>
  );
}

export default App;
