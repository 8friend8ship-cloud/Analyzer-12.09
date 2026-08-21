import React, { useState, useCallback, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Registration from './components/Registration';
import AccountSettings from './components/AccountSettings';
import { clearCache } from './services/cacheService';
import type { User, AppSettings, UserUsage } from './types';
import { setSystemGeminiApiKey } from './services/apiKeyService';
import {
  clearActiveLocalApiUser,
  emptyLocalApiKeys,
  loadLocalApiKeys,
  saveLocalYouTubeApiKey,
  setActiveLocalApiUser,
} from './services/localApiKeyService';
import Spinner from './components/common/Spinner';

const ADMIN_EMAIL = 'homedesigntaedi@gmail.com';

const initialAppSettings: AppSettings = {
    freePlanLimit: 30,
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
  const [initializing, setInitializing] = useState(true);
  const [isYoutubeKeyOpen, setIsYoutubeKeyOpen] = useState(false);
  const [youtubeKeyDraft, setYoutubeKeyDraft] = useState('');
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);

  useEffect(() => {
    const initializeApp = () => {
      clearCache();
      clearActiveLocalApiUser();
      setUser(null);
      setView('landing');
      setInitializing(false);
    };
    initializeApp();
  }, []);

  useEffect(() => {
    // Gemini remains outside the browser search path. YouTube uses each login's own local key.
    setSystemGeminiApiKey(null);
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
        const { name, email } = credentials.googleUser;
        const userId = 'gu_' + email.replace(/@.*/, '');
        const isAdmin = email.toLowerCase() === ADMIN_EMAIL;
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
        const normalizedEmail = email.toLowerCase();
        const isAdmin = normalizedEmail === ADMIN_EMAIL || email === 'admin' || email === 'master';
        const plan = isAdmin ? 'Biz' : 'Free';

        userToSet = {
            id: 'form_' + (isAdmin ? 'admin' : email.replace(/@.*/, '')),
            name: isAdmin ? "Johnson" : "home design. taedi",
            email: isAdmin ? ADMIN_EMAIL : email,
            password,
            isAdmin,
            plan,
            usage: getUsageLimits(plan, isAdmin),
            planExpirationDate: plan !== 'Free' ? '2099. 12. 31.' : undefined,
        };
    }

    if (userToSet) {
        setActiveLocalApiUser(userToSet.id);
        const localKeys = loadLocalApiKeys(userToSet.id);
        setAppSettings(prev => ({ ...prev, apiKeys: localKeys }));
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
      setAppSettings(prev => {
          const next: AppSettings = {
              ...prev,
              ...updatedSettings,
              apiKeys: { ...prev.apiKeys, ...(updatedSettings.apiKeys || {}) },
          };
          if (user && updatedSettings.apiKeys && Object.prototype.hasOwnProperty.call(updatedSettings.apiKeys, 'youtube')) {
              saveLocalYouTubeApiKey(user.id, next.apiKeys.youtube || '');
          }
          return next;
      });
  }, [user]);

  const handleLogout = useCallback(() => {
    clearCache();
    clearActiveLocalApiUser();
    setAppSettings(prev => ({ ...prev, apiKeys: emptyLocalApiKeys() }));
    setYoutubeKeyDraft('');
    setIsYoutubeKeyOpen(false);
    setUser(null);
    setView('landing');
  }, []);

  const openYoutubeKeyManager = useCallback(() => {
      setYoutubeKeyDraft(appSettings.apiKeys.youtube || '');
      setShowYoutubeKey(false);
      setIsYoutubeKeyOpen(true);
  }, [appSettings.apiKeys.youtube]);

  const saveYoutubeKey = useCallback(() => {
      if (!user) return;
      const value = youtubeKeyDraft.trim();
      saveLocalYouTubeApiKey(user.id, value);
      setAppSettings(prev => ({ ...prev, apiKeys: { ...prev.apiKeys, youtube: value } }));
      setIsYoutubeKeyOpen(false);
  }, [user, youtubeKeyDraft]);

  const deleteYoutubeKey = useCallback(() => {
      if (!user) return;
      saveLocalYouTubeApiKey(user.id, '');
      setYoutubeKeyDraft('');
      setAppSettings(prev => ({ ...prev, apiKeys: { ...prev.apiKeys, youtube: '' } }));
  }, [user]);

  const navigateTo = (targetView: 'login' | 'register' | 'dashboard' | 'account') => {
    setView(targetView);
  };

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
    }

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
  };

  const hasYoutubeKey = Boolean(String(appSettings.apiKeys.youtube || '').trim());

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {renderContent()}

      {user && (
        <button
          onClick={openYoutubeKeyManager}
          className="fixed bottom-5 left-5 z-[60] px-4 py-3 rounded-full bg-gray-800 border border-gray-600 shadow-xl text-sm font-semibold hover:bg-gray-700"
          aria-label="Manage personal YouTube API key"
        >
          {hasYoutubeKey ? '🔑 YouTube API 키 변경' : '🔑 YouTube API 키 등록'}
        </button>
      )}

      {user && isYoutubeKeyOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={() => setIsYoutubeKeyOpen(false)}>
          <div className="w-full max-w-lg rounded-xl bg-gray-800 border border-gray-700 shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">YouTube Data API v3 · 개인 로컬 키</h2>
                <p className="mt-1 text-xs text-gray-400">로그인: {user.email}</p>
              </div>
              <button className="text-2xl text-gray-400 hover:text-white" onClick={() => setIsYoutubeKeyOpen(false)}>×</button>
            </div>

            <p className="mt-4 text-sm text-gray-300">
              이 키는 이 로그인 계정과 현재 브라우저의 localStorage에만 저장됩니다. GitHub, Vercel 환경변수, Drive, 중앙 백데이터에는 API 키를 저장하지 않습니다.
            </p>

            <div className="mt-4 flex gap-2">
              <input
                type={showYoutubeKey ? 'text' : 'password'}
                value={youtubeKeyDraft}
                onChange={e => setYoutubeKeyDraft(e.target.value)}
                placeholder="AIza..."
                autoComplete="off"
                className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-3 py-3 font-mono text-sm text-white"
              />
              <button className="px-3 rounded-md bg-gray-700 hover:bg-gray-600" onClick={() => setShowYoutubeKey(v => !v)}>
                {showYoutubeKey ? '숨김' : '보기'}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button onClick={deleteYoutubeKey} className="px-4 py-2 rounded-md bg-red-700 hover:bg-red-600">키 삭제</button>
              <button onClick={() => setIsYoutubeKeyOpen(false)} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500">취소</button>
              <button onClick={saveYoutubeKey} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold">이 기기에 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
