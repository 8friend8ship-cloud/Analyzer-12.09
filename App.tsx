
import React, { useState, useCallback, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Registration from './components/Registration';
import AccountSettings from './components/AccountSettings';
import { clearCache } from './services/cacheService';
import { getStoredSettings, saveStoredSettings, getStoredUsers, upsertUser, findUserByEmail, saveStoredUsers } from './services/storageService';
import type { User, AppSettings } from './types';
import { setSystemGeminiApiKey, setUserGeminiApiKey } from './services/apiKeyService';
import Spinner from './components/common/Spinner';

// Helper to safely get environment variables (Runtime > Build)
const getEnvVar = (key: string): string => {
    const runtimeEnv = (window as any).env;
    
    if (runtimeEnv) {
        if (runtimeEnv[key]) return runtimeEnv[key];
        if (runtimeEnv[`VITE_${key}`]) return runtimeEnv[`VITE_${key}`];
        const strippedKey = key.replace(/^VITE_/, '');
        if (runtimeEnv[strippedKey]) return runtimeEnv[strippedKey];
    }

    // @ts-ignore
    if (import.meta && import.meta.env) {
        // @ts-ignore
        if (import.meta.env[key]) return import.meta.env[key];
        // @ts-ignore
        if (import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`];
    }
    
    return "";
}

// Default settings (used if nothing in storage)
const defaultAppSettings: AppSettings = {
    freePlanLimit: 30,
    plans: {
        pro: { name: 'Pro', analyses: 3000, price: 19000 }, // Increased to 3000 (virtual unlimited)
        biz: { name: 'Biz', analyses: Infinity, price: 29000 }, // Truly unlimited
    },
    apiKeys: {
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
  // Initialize from storage or default
  const [appSettings, setAppSettings] = useState<AppSettings>(() => getStoredSettings(defaultAppSettings));
  const [initializing, setInitializing] = useState(true);

  // Save settings whenever they change
  useEffect(() => {
      saveStoredSettings(appSettings);
      setSystemGeminiApiKey(appSettings.apiKeys.gemini);
  }, [appSettings]);

  // Initialize App & Restore Session
  useEffect(() => {
    const initializeApp = () => {
      // 1. Ensure Admin User exists in "Database" (Storage)
      const adminEmail = getEnvVar('ADMIN_EMAIL') || '8friend8ship@hanmail.net';
      let adminUser = findUserByEmail(adminEmail);
      
      if (!adminUser) {
          adminUser = {
            id: 'admin_001',
            name: 'Master Admin',
            email: adminEmail,
            isAdmin: true,
            plan: 'Biz',
            usage: 0,
            planExpirationDate: '2099-12-31'
          };
          upsertUser(adminUser);
      } else if (!adminUser.isAdmin) {
          // Fix admin rights if lost
          adminUser.isAdmin = true;
          upsertUser(adminUser);
      }

      // 2. Restore Session
      const savedSession = localStorage.getItem('content_os_user_session');
      if (savedSession) {
          try {
              const sessionUser = JSON.parse(savedSession);
              // Re-fetch fresh user data from storage to get latest plan/usage info
              const freshUser = getStoredUsers().find(u => u.id === sessionUser.id);
              
              if (freshUser) {
                  setUser(freshUser);
                  setView('dashboard');
              } else {
                  // Session invalid (user deleted?)
                  localStorage.removeItem('content_os_user_session');
                  setUser(null);
                  setView('landing');
              }
          } catch (e) {
              console.error("Failed to restore session", e);
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

  // Update Gemini Key based on user
  useEffect(() => {
    setUserGeminiApiKey(user?.apiKeyGemini || null);
  }, [user?.apiKeyGemini]);


  const handleLogin = useCallback((credentials: { googleUser?: { name: string; email: string }; email?: string; password?: string }) => {
    let targetUser: User | null = null;
    
    // 1. Google Login
    if (credentials.googleUser) {
        const { name, email } = credentials.googleUser;
        const existingUser = findUserByEmail(email);

        if (existingUser) {
            targetUser = existingUser;
        } else {
            // Register new Google user
            const newUser: User = {
                id: 'gu_' + email.replace(/@.*/, '') + '_' + Date.now().toString(36),
                name: name,
                email: email,
                isAdmin: false,
                plan: 'Free',
                usage: 0,
            };
            targetUser = upsertUser(newUser);
        }
    } 
    // 2. Email/Password Login
    else if (credentials.email && credentials.password) {
        const { email, password } = credentials;
        const existingUser = findUserByEmail(email);
        
        if (existingUser) {
            // In a real app, verify password hash here. 
            // For this demo, we assume match if user exists (or simple check if we stored pwd)
            if (existingUser.password && existingUser.password !== password) {
                alert("비밀번호가 일치하지 않습니다.");
                return;
            }
            targetUser = existingUser;
        } else {
            // Admin backdoor for hardcoded admin email if not in storage yet (fallback)
            const adminEmail = getEnvVar('ADMIN_EMAIL') || '8friend8ship@hanmail.net';
            if (email === adminEmail || email === 'admin@corp.com') {
                 targetUser = {
                    id: 'admin_temp',
                    name: 'Admin',
                    email: email,
                    isAdmin: true,
                    plan: 'Biz',
                    usage: 0
                };
                upsertUser(targetUser);
            } else {
                alert("등록되지 않은 사용자입니다. 회원가입을 진행해주세요.");
                return;
            }
        }
    }

    if (targetUser) {
        setUser(targetUser);
        localStorage.setItem('content_os_user_session', JSON.stringify(targetUser));
        setView('dashboard');
    }
  }, []);

  const handleRegister = useCallback((userInfo: { email: string; password: string }) => {
      const existingUser = findUserByEmail(userInfo.email);
      if (existingUser) {
          alert("이미 가입된 이메일입니다. 로그인해주세요.");
          setView('login');
          return;
      }

      const newUser: User = {
          id: 'user_' + Date.now().toString(36),
          name: userInfo.email.split('@')[0],
          email: userInfo.email,
          password: userInfo.password, // In real app, hash this!
          isAdmin: false,
          plan: 'Free',
          usage: 0,
          planExpirationDate: undefined
      };

      upsertUser(newUser);
      
      // Auto login
      setUser(newUser);
      localStorage.setItem('content_os_user_session', JSON.stringify(newUser));
      setView('dashboard');
      alert("회원가입이 완료되었습니다!");
  }, []);

  const handleUpdateUser = useCallback((updatedUser: Partial<User>) => {
      setUser(prevUser => {
          if (!prevUser) return null;
          const newUser = { ...prevUser, ...updatedUser };
          
          // Update in storage ("Database")
          upsertUser(newUser);
          
          // Update Session
          localStorage.setItem('content_os_user_session', JSON.stringify(newUser));
          
          return newUser;
      });
  }, []);

  const handleUpdateAppSettings = useCallback((updatedSettings: Partial<AppSettings>) => {
      setAppSettings(prev => {
          const next = { ...prev, ...updatedSettings };
          saveStoredSettings(next);
          return next;
      });
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
                return <Registration onRegister={handleRegister} onNavigate={navigateTo} />;
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
