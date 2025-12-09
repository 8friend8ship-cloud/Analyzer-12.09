
import React, { useCallback, useEffect, useState } from 'react';

// FIX: Add global type declaration for window.google to fix TypeScript errors.
// The Google Identity Services script is loaded externally and attaches the `google` object to the window.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: any) => void; }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type: string;
              theme: string;
              size: string;
              text: string;
              shape: string;
              logo_alignment: string;
              width: string;
            }
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = "42793942510-6i4s5u15npqeh676ih7bhdg91g23rl7j.apps.googleusercontent.com";

interface LoginProps {
  onLogin: (credentials: { googleUser?: { name: string; email: string }; email?: string; password?: string }) => void;
  onNavigate: (view: 'register') => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = useCallback((response: any) => {
    try {
        const token = response.credential;
        // Basic JWT decoding (no signature verification, which is fine for getting basic info client-side)
        const userObject = JSON.parse(atob(token.split('.')[1]));
        const { name, email } = userObject;
        if(name && email) {
            onLogin({ googleUser: { name, email } });
        }
    } catch (e) {
        console.error("Error decoding Google token", e);
        alert("Google 로그인에 실패했습니다. 다시 시도해주세요.");
    }
  }, [onLogin]);
  
  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    onLogin({ email, password });
  };


  useEffect(() => {
    // Google's script is loaded async, so we poll for its availability.
    const checkGoogleInterval = setInterval(() => {
        if (typeof window.google !== 'undefined' && window.google.accounts) {
            clearInterval(checkGoogleInterval);
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleLogin,
            });
            const parent = document.getElementById('google-signin-button');
            if (parent) {
                window.google.accounts.id.renderButton(parent, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'rectangular',
                    logo_alignment: 'left',
                    width: '352', // To match the form width
                });
            }
        }
    }, 100);

    return () => clearInterval(checkGoogleInterval);
  }, [handleGoogleLogin]);


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-2xl shadow-lg">
        <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">
                콘텐츠 OS 로그인
            </h1>
            <p className="mt-2 text-gray-400">
                유튜브 데이터 분석을 시작하세요.
            </p>
        </div>

        <form className="space-y-4" onSubmit={handleFormLogin}>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 text-left">이메일 주소</label>
                <input id="email" name="email" type="email" autoComplete="email" required 
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div>
                <label htmlFor="password"className="block text-sm font-medium text-gray-300 text-left">비밀번호</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required 
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div className="text-right text-sm">
                <a href="#" className="font-medium text-blue-400 hover:text-blue-300">비밀번호를 잊으셨나요?</a>
            </div>
            <div>
                 <button
                    type="submit"
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
                >
                    로그인
                </button>
            </div>
        </form>

        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">또는</span>
            </div>
        </div>

        <div>
            <div id="google-signin-button" className="w-full flex justify-center"></div>
        </div>
        
        <div className="text-sm text-center">
            <p className="text-gray-400">
                계정이 없으신가요?{' '}
                <button onClick={() => onNavigate('register')} className="font-medium text-blue-400 hover:text-blue-300">
                    가입하기
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;