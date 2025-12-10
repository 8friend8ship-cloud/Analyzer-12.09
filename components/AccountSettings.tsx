import React, { useState, useEffect } from 'react';
// FIX: Centralized types in types.ts
import type { User, AppSettings, Plan } from '../types';

interface AccountSettingsProps {
    user: User;
    onNavigate: (view: 'dashboard') => void;
    onUpdateUser: (updatedUser: Partial<User>) => void;
    appSettings: AppSettings;
}

const CheckIcon = () => (
    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const PlanCard: React.FC<{ 
    plan: Plan & { buttonText: string }, 
    isCurrent?: boolean, 
    isRecommended?: boolean,
    onPlanSelect: (planName: string) => void
}> = ({ plan, isCurrent = false, isRecommended = false, onPlanSelect }) => (
    <div className={`relative rounded-xl border p-6 text-center h-full flex flex-col ${isCurrent ? 'border-blue-500 bg-gray-800/50 ring-2 ring-blue-500' : isRecommended ? 'border-gray-600 bg-gray-800' : 'border-gray-700 bg-gray-800/60'}`}>
        {isRecommended && !isCurrent && <div className="absolute top-0 right-6 -mt-3 inline-block rounded-full bg-blue-500 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white">추천</div>}
        {isCurrent && <div className="absolute top-0 right-6 -mt-3 inline-block rounded-full bg-green-500 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white">현재 요금제</div>}
        <h3 className="text-2xl font-semibold">{plan.name}</h3>
        <p className="mt-2 text-gray-400 text-sm flex-grow">{plan.description}</p>
        <div className="mt-6">
            <span className="text-4xl font-bold">₩{plan.price.toLocaleString()}</span>
            <span className="text-base font-medium text-gray-400">/월</span>
        </div>
        <button 
            disabled={isCurrent} 
            onClick={() => !isCurrent && onPlanSelect(plan.name)}
            className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold ${isCurrent ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : isRecommended ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}>
            {plan.buttonText}
        </button>
        <ul className="mt-6 space-y-3 text-left text-sm">
            {plan.features.map((feature: string, index: number) => (
                <li key={index} className="flex items-start">
                    <CheckIcon />
                    <span className="ml-3 text-gray-300">{feature}</span>
                </li>
            ))}
        </ul>
    </div>
);


const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onNavigate, onUpdateUser, appSettings }) => {
    const [apiKeyYoutube, setApiKeyYoutube] = useState(user.apiKeyYoutube || '');
    const [apiKeyGemini, setApiKeyGemini] = useState(user.apiKeyGemini || '');
    
    useEffect(() => {
        setApiKeyYoutube(user.apiKeyYoutube || '');
        setApiKeyGemini(user.apiKeyGemini || '');
    }, [user]);

    const handleSaveApiKeys = () => {
        onUpdateUser({ apiKeyYoutube, apiKeyGemini });
        alert('API 키가 저장되었습니다!');
    };

    const handlePlanChangeClick = (planName: string) => {
        // In a real app, this would redirect to a payment page like Stripe Checkout.
        alert(`'${planName}' 플랜으로 변경하기 위해 결제 페이지로 이동합니다.`);
    };
    
    const planLimit = user.isAdmin ? Infinity : appSettings.plans[user.plan.toLowerCase() as 'free'|'pro'|'biz'].analyses;
    const usagePercentage = planLimit === Infinity ? 0 : Math.round((user.usage / planLimit) * 100);

    // FIX: Explicitly type `plan` as `Plan` to resolve TypeScript inference issue where it's treated as `unknown`. This fixes spread operator and property access errors.
    const plans = Object.values(appSettings.plans).map((plan: Plan) => ({
        ...plan,
        buttonText: user.plan === plan.name ? '현재 사용 중' : plan.price > 0 ? `${plan.name} 플랜 시작` : '다운그레이드',
    }));

    return (
        <div className="min-h-screen bg-gray-900 p-4 md:p-6 lg:p-8 text-gray-200">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">계정 설정</h1>
                    <button onClick={() => onNavigate('dashboard')} className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
                        ← 대시보드로 돌아가기
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                         <div className="bg-gray-800/80 rounded-lg p-6 border border-gray-700/50">
                             <h2 className="text-xl font-semibold mb-4">가입자 정보</h2>
                             <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-400">이름</label>
                                    <p className="font-semibold">{user.name}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">이메일</label>
                                    <p className="font-semibold">{user.email}</p>
                                </div>
                                 <div>
                                    <label className="text-sm text-gray-400">현재 요금제</label>
                                    <p className={`font-bold text-lg ${user.plan === 'Biz' ? 'text-blue-400' : user.plan === 'Pro' ? 'text-green-400' : 'text-gray-300'}`}>{user.plan}</p>
                                </div>
                                {user.planExpirationDate && (
                                    <div>
                                        <label className="text-sm text-gray-400">요금제 만료일</label>
                                        <p className="font-semibold">{user.planExpirationDate}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-sm text-gray-400">월간 분석 사용량</label>
                                    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${usagePercentage}%` }}></div>
                                    </div>
                                    <p className="text-right text-sm mt-1">{user.usage} / {planLimit === Infinity ? '무제한' : `${planLimit} 회`}</p>
                                </div>
                             </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-gray-800/80 rounded-lg p-6 border border-gray-700/50">
                        <h2 className="text-xl font-semibold mb-2">개인 API 키 관리</h2>
                        <p className="text-sm text-gray-400 mb-6">
                           여기에 개인 API 키를 입력하면 관리자가 설정한 시스템 공용 키 대신 우선적으로 사용됩니다.
                        </p>
                         <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg text-sm text-gray-300 mb-6 space-y-2">
                            <p className="font-semibold text-blue-300">🔐 API 키 안내</p>
                            <p>API 키는 Content OS의 분석 기능을 사용하기 위해 필요한 개인 인증 정보입니다. 이 키는 브라우저의 안전한 로컬 저장 공간에만 저장되며, 외부 서버로 전송되지 않습니다.</p>
                            <p>개인의 소중한 정보이므로, 키를 다른 사람과 공유하지 마세요. 앱 재설치나 다른 브라우저 사용에 대비해, 발급받은 키를 개인적인 공간(비밀번호 관리자 등)에 별도로 저장해두시는 것을 권장합니다.</p>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="youtube-api-key" className="block text-sm font-medium text-gray-300">
                                    YouTube Data API v3 Key
                                </label>
                                <input
                                    type="password"
                                    id="youtube-api-key"
                                    value={apiKeyYoutube}
                                    onChange={e => setApiKeyYoutube(e.target.value)}
                                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="개인 YouTube Data API 키를 입력하세요"
                                />
                                <details className="mt-2 text-xs">
                                  <summary className="cursor-pointer text-gray-500 hover:text-gray-300">YouTube API 키 발급 방법</summary>
                                  <div className="mt-2 p-3 bg-gray-700 rounded-md space-y-2">
                                    <ol className="list-decimal list-inside space-y-1 text-gray-400">
                                      <li>Google Cloud Console로 이동하여 프로젝트를 선택/생성합니다.</li>
                                      <li>YouTube Data API v3를 "사용 설정"합니다.</li>
                                      <li>좌측 메뉴에서 "사용자 인증 정보"로 이동합니다.</li>
                                      <li>"사용자 인증 정보 만들기" > "API 키"를 선택하여 키를 생성합니다.</li>
                                      <li>생성된 키를 복사하여 여기에 붙여넣습니다.</li>
                                    </ol>
                                    <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener noreferrer" className="inline-block text-blue-400 hover:text-blue-300 font-semibold">
                                      API 키 발급 페이지로 바로가기 &rarr;
                                    </a>
                                  </div>
                                </details>
                            </div>
                             <div>
                                <label htmlFor="gemini-api-key" className="block text-sm font-medium text-gray-300">
                                    Gemini API Key
                                </label>
                                <input
                                    type="password"
                                    id="gemini-api-key"
                                    value={apiKeyGemini}
                                    onChange={e => setApiKeyGemini(e.target.value)}
                                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="개인 Gemini API 키를 입력하세요"
                                />
                                <details className="mt-2 text-xs">
                                  <summary className="cursor-pointer text-gray-500 hover:text-gray-300">Gemini API 키 발급 방법</summary>
                                  <div className="mt-2 p-3 bg-gray-700 rounded-md space-y-2">
                                    <ol className="list-decimal list-inside space-y-1 text-gray-400">
                                      <li>Google AI Studio로 이동하여 로그인합니다.</li>
                                      <li>"Get API key"를 클릭합니다.</li>
                                      <li>"Create API key in new project"를 선택하여 키를 생성합니다.</li>
                                      <li>생성된 키를 복사하여 여기에 붙여넣습니다.</li>
                                    </ol>
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="inline-block text-blue-400 hover:text-blue-300 font-semibold">
                                      API 키 발급 페이지로 바로가기 &rarr;
                                    </a>
                                  </div>
                                </details>
                            </div>
                            <div className="text-right">
                                <button onClick={handleSaveApiKeys} className="px-5 py-2.5 text-sm font-semibold rounded-md bg-green-600 hover:bg-green-700">
                                    개인 API 키 저장
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-12">
                     <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold tracking-tight text-white">요금제 변경</h1>
                        <p className="mt-2 max-w-2xl mx-auto text-md text-gray-400">
                            당신의 채널 성장을 위한 최고의 플랜을 선택하세요.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                       {plans.map(plan => (
                            <PlanCard 
                                key={plan.name}
                                plan={plan} 
                                isCurrent={user.plan === plan.name}
                                isRecommended={plan.name === 'Pro'}
                                onPlanSelect={handlePlanChangeClick}
                            />
                       ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;