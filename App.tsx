import React, { useState, useCallback, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import MvpStoredDataDashboard from './components/MvpStoredDataDashboard';
import Registration from './components/Registration';
import AccountSettings from './components/AccountSettings';
import { clearCache } from './services/cacheService';
import type { User, UserUsage } from './types';
import Spinner from './components/common/Spinner';

const CANONICAL_PRIMARY_EMAIL = 'homedesigntaedi@gmail.com';
const CANONICAL_LOGIN_ALIASES = new Set([
  CANONICAL_PRIMARY_EMAIL,
  '8friend8ship@hanmail.net',
]);

const normalizeEmail = (value: string): string => value.trim().toLowerCase();
const isCanonicalAdmin = (value: string): boolean =>
  CANONICAL_LOGIN_ALIASES.has(normalizeEmail(value));

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'dashboard' | 'account'>('landing');
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    clearCache();
    setUser(null);
    setView('landing');
    setInitializing(false);
  }, []);

  const handleLogin = useCallback((credentials: {
    googleUser?: { name: string; email: string };
    email?: string;
    password?: string;
  }) => {
    let userToSet: User | null = null;

    const getUsageLimits = (_plan: 'Free' | 'Pro' | 'Biz', isAdmin: boolean): UserUsage => {
      const unlimitedLimit = { used: 0, limit: Infinity };
      return {
        search: unlimitedLimit,
        channelDetail: unlimitedLimit,
        videoDetail: unlimitedLimit,
        aiInsight: unlimitedLimit,
        aiContentMaker: unlimitedLimit,
        outlierAnalysis: unlimitedLimit,
        credits: { used: 0, limit: isAdmin ? Infinity : 10000 },
      };
    };

    if (credentials.googleUser) {
      const { name, email } = credentials.googleUser;
      const normalizedEmail = normalizeEmail(email);
      const userId = 'gu_' + normalizedEmail.replace(/@.*/, '');
      const isAdmin = isCanonicalAdmin(normalizedEmail);
      const plan = isAdmin ? 'Biz' : 'Free';

      userToSet = {
        id: userId,
        name: isAdmin ? 'home design. taedi' : name,
        email: isAdmin ? CANONICAL_PRIMARY_EMAIL : normalizedEmail,
        isAdmin,
        plan,
        usage: getUsageLimits(plan, isAdmin),
        planExpirationDate: plan !== 'Free' ? '2099. 12. 31.' : undefined,
      };
    } else if (credentials.email && credentials.password) {
      const { password } = credentials;
      const normalizedEmail = normalizeEmail(credentials.email);
      const isAdmin = isCanonicalAdmin(normalizedEmail) || normalizedEmail === 'admin' || normalizedEmail === 'master';
      const plan = isAdmin ? 'Biz' : 'Free';

      userToSet = {
        id: 'form_' + (isAdmin ? 'admin' : normalizedEmail.replace(/@.*/, '')),
        name: isAdmin ? 'home design. taedi' : 'home design. taedi',
        email: isAdmin ? CANONICAL_PRIMARY_EMAIL : normalizedEmail,
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
    setUser((prevUser) => {
      if (!prevUser) return null;
      const newUsage = { ...prevUser.usage, ...updatedUser.usage };
      return { ...prevUser, ...updatedUser, usage: newUsage };
    });
  }, []);

  const handleLogout = useCallback(() => {
    clearCache();
    setUser(null);
    setView('landing');
  }, []);

  const navigateTo = (targetView: 'login' | 'register' | 'dashboard' | 'account') => {
    setView(targetView);
  };

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <Spinner message="Initializing..." />
      </div>
    );
  }

  const renderContent = () => {
    if (user) {
      switch (view) {
        case 'dashboard':
          return <MvpStoredDataDashboard user={user} onLogout={handleLogout} />;
        case 'account':
          return (
            <AccountSettings
              user={user}
              onNavigate={navigateTo}
              onUpdateUser={handleUpdateUser}
            />
          );
        default:
          return <MvpStoredDataDashboard user={user} onLogout={handleLogout} />;
      }
    }

    switch (view) {
      case 'landing':
        return <LandingPage onStart={() => setView('login')} />;
      case 'login':
        return <Login onLogin={handleLogin} onNavigate={navigateTo} />;
      case 'register':
        return (
          <Registration
            onRegister={() => handleLogin({ email: 'demo@user.com', password: 'password' })}
            onNavigate={navigateTo}
          />
        );
      default:
        return <LandingPage onStart={() => setView('login')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 font-sans text-gray-100">
      {renderContent()}
    </div>
  );
}

export default App;
