import React, { useState, useCallback, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Registration from './components/Registration';
import AccountSettings from './components/AccountSettings';
import { clearCache } from './services/cacheService';
import type { User, AppSettings, UserUsage } from './types';
import {
  clearActiveLocalApiUser,
  emptyLocalApiKeys,
  loadLocalApiKeys,
  saveLocalGeminiApiKey,
  saveLocalYouTubeApiKey,
  setActiveLocalApiUser,
} from './services/localApiKeyService';
import Spinner from './components/common/Spinner';

const ADMIN_EMAIL = 'homedesigntaedi@gmail.com';
const LOCAL_SESSION_KEY = 'contents-os:local-session:v2';

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

const persistLocalSession = (user: User | null) => {
  try {
    if (!user) {
      window.localStorage.removeItem(LOCAL_SESSION_KEY);
      return;
    }
    const safeUser = { ...user } as any;
    delete safeUser.password;
    window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(safeUser));
  } catch (error) {
    console.warn('[ContentOS] local session save failed:', error);
  }
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'dashboard' | 'account'>('landing');
  const [appSettings, setAppSettings] = useState<AppSettings>(initialAppSettings);
  const [initializing, setInitializing] = useState(true);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [youtubeKeyDraft, setYoutubeKeyDraft] = useState('');
  const [geminiKeyDraft, setGeminiKeyDraft] = useState('');
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
      if (raw) {
        const restored = JSON.parse(raw) as User;
        if (restored?.id && restored?.email) {
          setActiveLocalApiUser(restored.id);
          const localKeys = loadLocalApiKeys(restored.id);
          setAppSettings(prev => ({ ...prev, apiKeys: localKeys }));
          setUser(restored);
          setView('dashboard');
          setInitializing(false);
          return;
        }
      }
    } catch (error) {
      console.warn('[ContentOS] local session restore failed:', error);
      window.localStorage.removeItem(LOCAL_SESSION_KEY);
    }
    setUser(null);
    setView('landing');
    setInitializing(false);
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
        const { email } = credentials;
        const normalizedEmail = email.toLowerCase();
        const isAdmin = normalizedEmail === ADMIN_EMAIL || email === 'admin' || email === 'master';
        const plan = isAdmin ? 'Biz' : 'Free';
        userToSet = {
            id: 'form_' + (isAdmin ? 'admin' : email.replace(/@.*/, '')),
            name: isAdmin ? 'Johnson' : 'home design. taedi',
            email: isAdmin ? ADMIN_EMAIL : email,
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
        persistLocalSession(userToSet);
        setView('dashboard');
    }
  }, []);

  const handleUpdateUser = useCallback((updatedUser: Partial<User>) => {
      setUser(prevUser => {
          if (!prevUser) return null;
          const newUsage = { ...prevUser.usage, ...updatedUser.usage };
          const next = { ...prevUser, ...updatedUser, usage: newUsage };
          persistLocalSession(next);
          return next;
      });
  }, []);

  const handleUpdateAppSettings = useCallback((updatedSettings: Partial<AppSettings>) => {
      setAppSettings(prev => {
          const next: AppSettings = {
              ...prev,
              ...updatedSettings,
              apiKeys: { ...prev.apiKeys, ...(updatedSettings.apiKeys || {}) },
          };
          if (user && updatedSettings.apiKeys) {
              if (Object.prototype.hasOwnProperty.call(updatedSettings.apiKeys, 'youtube')) {
                  saveLocalYouTubeApiKey(user.id, next.apiKeys.youtube || '');
              }
              if (Object.prototype.hasOwnProperty.call(updatedSettings.apiKeys, 'gemini')) {
                  saveLocalGeminiApiKey(user.id, next.apiKeys.gemini || '');
              }
          }
          return next;
      });
  }, [user]);

  const handleLogout = useCallback(() => {
    clearCache();
    clearActiveLocalApiUser();
    persistLocalSession(null);
    setAppSettings(prev => ({ ...prev, apiKeys: emptyLocalApiKeys() }));
    setYoutubeKeyDraft('');
    setGeminiKeyDraft('');
    setIsApiKeyOpen(false);
    setUser(null);
    setView('landing');
  }, []);

  const openApiKeyManager = useCallback(() => {
      setYoutubeKeyDraft(appSettings.apiKeys.youtube || '');
      setGeminiKeyDraft(appSettings.apiKeys.gemini || '');
      setShowYoutubeKey(false);
      setShowGeminiKey(false);
      setIsApiKeyOpen(true);
  }, [appSettings.apiKeys.youtube, appSettings.apiKeys.gemini]);

  const saveApiKeys = useCallback(() => {
      if (!user) return;
      const youtube = youtubeKeyDraft.trim();
      const gemini = geminiKeyDraft.trim();
      saveLocalYouTubeApiKey(user.id, youtube);
      saveLocalGeminiApiKey(user.id, gemini);
      setAppSettings(prev => ({ ...prev, apiKeys: { ...prev.apiKeys, youtube, gemini } }));
      setIsApiKeyOpen(false);
  }, [user, youtubeKeyDraft, geminiKeyDraft]);

  const deleteYoutubeKey = useCallback(() => {
      if (!user) return;
      saveLocalYouTubeApiKey(user.id, '');
      setYoutubeKeyDraft('');
      setAppSettings(prev => ({ ...prev, apiKeys: { ...prev.apiKeys, youtube: '' } }));
  }, [user]);

  const deleteGeminiKey = useCallback(() => {
      if (!user) return;
      saveLocalGeminiApiKey(user.id, '');
      setGeminiKeyDraft('');
      setAppSettings(prev => ({ ...prev, apiKeys: { ...prev.apiKeys, gemini: '' } }));
  }, [user]);

  const navigateTo = (targetView: 'login' | 'register' | 'dashboard' | 'account') => setView(targetView);

  if (initializing) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-900"><Spinner message="Initializing..." /></div>;
  }

  const renderContent = () => {
    if (user) {
        switch (view) {
            case 'dashboard':
                return <Dashboard user={user} appSettings={appSettings} onLogout={handleLogout} onNavigate={navigateTo} onUpdateUser={handleUpdateUser} onUpdateAppSettings={handleUpdateAppSettings} />;
            case 'account':
                return <AccountSettings user={user} onNavigate={navigateTo} onUpdateUser={handleUpdateUser} />;
            default:
                setView('dashboard');
                return <Dashboard user={user} appSettings={appSettings} onLogout={handleLogout} onNavigate={navigateTo} onUpdateUser={handleUpdateUser} onUpdateAppSettings={handleUpdateAppSettings} />;
        }
    }

    switch (view) {
        case 'landing': return <LandingPage onStart={() => setView('login')} />;
        case 'login': return <Login onLogin={handleLogin} onNavigate={navigateTo} />;
        case 'register': return <Registration onRegister={() => handleLogin({email: 'demo@user.com', password: 'password'})} onNavigate={navigateTo} />;
        default:
            setView('landing');
            return <LandingPage onStart={() => setView('login')} />;
    }
  };

  const hasYoutubeKey = Boolean(String(appSettings.apiKeys.youtube || '').trim());
  const hasGeminiKey = Boolean(String(appSettings.apiKeys.gemini || '').trim());

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {renderContent()}

      {user && (
        <button onClick={openApiKeyManager} className="fixed bottom-5 left-5 z-[60] px-4 py-3 rounded-full bg-gray-800 border border-gray-600 shadow-xl text-sm font-semibold hover:bg-gray-700" aria-label="Manage personal learning API keys">
          🔑 학습 API {hasYoutubeKey ? 'YT✓' : 'YT–'} · {hasGeminiKey ? 'Gemini✓' : 'Gemini–'}
        </button>
      )}

      {user && isApiKeyOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={() => setIsApiKeyOpen(false)}>
          <div className="w-full max-w-xl rounded-xl bg-gray-800 border border-gray-700 shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Content OS · 개인 로컬 학습 API</h2>
                <p className="mt-1 text-xs text-gray-400">로그인: {user.email}</p>
              </div>
              <button className="text-2xl text-gray-400 hover:text-white" onClick={() => setIsApiKeyOpen(false)}>×</button>
            </div>

            <p className="mt-4 text-sm text-gray-300">
              키는 이 로그인 계정과 현재 브라우저 Local Pack에만 저장됩니다. GitHub, Vercel, Drive, Learning Archive에는 키를 저장하지 않고 API 결과 JSON만 학습자료로 저장합니다.
            </p>

            <div className="mt-5">
              <label className="block text-sm font-semibold text-white mb-2">YouTube Data API v3</label>
              <div className="flex gap-2">
                <input type={showYoutubeKey ? 'text' : 'password'} value={youtubeKeyDraft} onChange={e => setYoutubeKeyDraft(e.target.value)} placeholder="AIza..." autoComplete="off" className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-3 py-3 font-mono text-sm text-white" />
                <button className="px-3 rounded-md bg-gray-700 hover:bg-gray-600" onClick={() => setShowYoutubeKey(v => !v)}>{showYoutubeKey ? '숨김' : '보기'}</button>
                <button className="px-3 rounded-md bg-red-800 hover:bg-red-700" onClick={deleteYoutubeKey}>삭제</button>
              </div>
              <p className="mt-1 text-xs text-gray-500">검색·메트릭·채널·댓글 원자료 수집 및 Queens 학습용</p>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-semibold text-white mb-2">Gemini API</label>
              <div className="flex gap-2">
                <input type={showGeminiKey ? 'text' : 'password'} value={geminiKeyDraft} onChange={e => setGeminiKeyDraft(e.target.value)} placeholder="Gemini API key" autoComplete="off" className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-3 py-3 font-mono text-sm text-white" />
                <button className="px-3 rounded-md bg-gray-700 hover:bg-gray-600" onClick={() => setShowGeminiKey(v => !v)}>{showGeminiKey ? '숨김' : '보기'}</button>
                <button className="px-3 rounded-md bg-red-800 hover:bg-red-700" onClick={deleteGeminiKey}>삭제</button>
              </div>
              <p className="mt-1 text-xs text-gray-500">YouTube 원자료 분석·분해·키워드 확장·4개 스크립트 특징·Seed 후보 생성용</p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setIsApiKeyOpen(false)} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500">취소</button>
              <button onClick={saveApiKeys} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold">이 기기에 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
