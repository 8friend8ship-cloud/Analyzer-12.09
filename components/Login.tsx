import React from 'react';

interface LoginProps {
  onLogin: () => void;
  onNavigate: (view: 'register') => void;
}

const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.487-11.182-8.169l-6.571,4.819C9.656,39.663,16.318,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.021,35.596,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);


const Login: React.FC<LoginProps> = ({ onLogin, onNavigate }) => {
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

        <form className="space-y-4">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 text-left">이메일 주소</label>
                <input id="email" name="email" type="email" autoComplete="email" required 
                       className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                       defaultValue="admin@corp.com"
                />
            </div>
            <div>
                <label htmlFor="password"className="block text-sm font-medium text-gray-300 text-left">비밀번호</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required 
                       className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                       defaultValue="password"
                />
            </div>
            <div className="text-right text-sm">
                <a href="#" className="font-medium text-blue-400 hover:text-blue-300">비밀번호를 잊으셨나요?</a>
            </div>
            <div>
                 <button
                    type="button"
                    onClick={onLogin}
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
            <button
                type="button"
                onClick={onLogin}
                className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500"
            >
                <GoogleIcon />
                Google 계정으로 로그인
            </button>
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