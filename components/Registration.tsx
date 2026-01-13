import React, { useState } from 'react';
import TermsModal from './TermsModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';

interface RegistrationProps {
  onRegister: () => void;
  onNavigate: (view: 'login') => void;
}

const Registration: React.FC<RegistrationProps> = ({ onRegister, onNavigate }) => {
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-2xl shadow-lg">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              회원가입 (Sign Up)
            </h1>
            <p className="mt-2 text-gray-400">
              새 계정을 만들어 시작하세요. (Create a new account to get started.)
            </p>
          </div>

          <form className="space-y-4">
            <div>
              <label htmlFor="email-register" className="block text-sm font-medium text-gray-300 text-left">이메일 주소 (Email Address)</label>
              <input id="email-register" name="email" type="email" autoComplete="email" required
                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="password-register" className="block text-sm font-medium text-gray-300 text-left">비밀번호 (Password)</label>
              <input id="password-register" name="password" type="password" required
                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="password-confirm" className="block text-sm font-medium text-gray-300 text-left">비밀번호 확인 (Confirm Password)</label>
              <input id="password-confirm" name="password-confirm" type="password" required
                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <button
                type="button"
                onClick={onRegister}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
              >
                가입하기 (Sign Up)
              </button>
            </div>
          </form>

          <div className="text-sm text-center">
            <p className="text-gray-400">
              이미 계정이 있으신가요? (Already have an account?){' '}
              <button onClick={() => onNavigate('login')} className="font-medium text-blue-400 hover:text-blue-300">
                로그인 (Log In)
              </button>
            </p>
          </div>
          
          <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-700">
              <p>가입함으로써, 귀하는 Content OS의 (By signing up, you agree to the)</p>
              <div className="flex justify-center gap-4 mt-1">
                  <button onClick={() => setIsTermsOpen(true)} className="underline hover:text-gray-300">서비스 이용약관 (Terms of Service)</button>
                  <span>및 (and)</span>
                  <button onClick={() => setIsPrivacyOpen(true)} className="underline hover:text-gray-300">개인정보처리방침 (Privacy Policy)</button>
              </div>
              <p className="mt-1">에 동의하는 것으로 간주됩니다.</p>
          </div>
        </div>
      </div>
      {isTermsOpen && <TermsModal onClose={() => setIsTermsOpen(false)} />}
      {isPrivacyOpen && <PrivacyPolicyModal onClose={() => setIsPrivacyOpen(false)} />}
    </>
  );
};

export default Registration;
