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

const initialAppSettings: AppSettings = {
    plans: {
        free: { name: 'Free', analyses: 200, price: 0, description: '행사2달 프로기능 동일한 조건 테스트', features: ['월 200회 분석', 'Pro 플랜 모든 기능', '아웃라이어 분석', '썸네일/알고리즘 진단', '컬렉션 기능'] },
        pro: { name: 'Pro', analyses: 100, price: 19000, description: '개인 크리에이터에게 적합합니다.', features: ['월 100회 분석', 'AI 인사이트', '채널 비교 분석'] },
        biz: { name: 'Biz', analyses: 200, price: 29000, description: '전문가 및 팀을 위한 플랜입니다.', features: ['월 200회 분석', 'Pro 플랜 모든 기능', '아웃라이어 분석', '썸네일/알고리즘 진단', '컬렉션 기능'] },
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

  useEffect(() => {
    const initializeApp = () => {
      clearCache();
      // Old daily cache cleaning removed as we moved to Firestore
      setUser(null);
      setView('landing');
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
    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '8friend8ship@hanmail.net').toLowerCase();
    
    if (credentials.googleUser) {
        const { name, email } = credentials.googleUser;
        const normalizedEmail = email.toLowerCase();
        const userId = 'gu_' + normalizedEmail.replace(/@.*/, '');
        const isAdmin = normalizedEmail === ADMIN_EMAIL;
        const plan = isAdmin ? 'Biz' : 'Free';
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);

        userToSet = {
            id: userId,
            name: name,
            email: normalizedEmail,
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
        const normalizedEmail = email.toLowerCase();
        const isAdmin = normalizedEmail === 'admin@corp.com' || normalizedEmail === ADMIN_EMAIL;
        const plan = isAdmin ? 'Biz' : 'Free';
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);
        
        const userId = 'form_' + normalizedEmail.replace(/@.*/, '');

        userToSet = {
            id: userId,
            name: normalizedEmail.split('@')[0],
            email: normalizedEmail,
            password: password,
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

          // Persist API keys for all user types (Google and Form)
          if (newUser.id && (newUser.id.startsWith('gu_') || newUser.id.startsWith('form_'))) {
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
                return <AccountSettings user={user} appSettings={appSettings} onNavigate={navigateTo} onUpdateUser={handleUpdateUser} />;
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
                return <LandingPage appSettings={appSettings} onStart={() => setView('login')} />;
            case 'login':
                return <Login onLogin={handleLogin} onNavigate={navigateTo} />;
            case 'register':
                return <Registration onRegister={() => handleLogin({email: 'new@user.com', password: 'password'})} onNavigate={navigateTo} />;
            default:
                setView('landing');
                return <LandingPage appSettings={appSettings} onStart={() => setView('login')} />;
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