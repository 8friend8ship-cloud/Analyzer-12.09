
import React, { useState, useEffect } from 'react';
// FIX: Centralized types in types.ts
import type { User } from '../types';

interface AccountSettingsProps {
    user: User;
    onNavigate: (view: 'dashboard') => void;
    onUpdateUser: (updatedUser: Partial<User>) => void;
}

const CheckIcon = () => (
    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const PlanCard: React.FC<{ plan: any, isCurrent?: boolean, isRecommended?: boolean }> = ({ plan, isCurrent = false, isRecommended = false }) => (
    <div className={`relative rounded-xl border p-6 text-center h-full flex flex-col ${isCurrent ? 'border-blue-500 bg-gray-800/50 ring-2 ring-blue-500' : isRecommended ? 'border-gray-600 bg-gray-800' : 'border-gray-700 bg-gray-800/60'}`}>
        {isRecommended && !isCurrent && <div className="absolute top-0 right-6 -mt-3 inline-block rounded-full bg-blue-500 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white">추천</div>}
        {isCurrent && <div className="absolute top-0 right-6 -mt-3 inline-block rounded-full bg-green-500 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white">현재 요금제</div>}
        <h3 className="text-2xl font-semibold">{plan.name}</h3>
        <p className="mt-2 text-gray-400 text-sm flex-grow">{plan.description}</p>
        <div className="mt-6">
            <span className="text-4xl font-bold">₩{plan.price.toLocaleString()}</span>
            <span className="text-base font-medium text-gray-400">/월</span>
        </div>
        <button disabled={isCurrent} className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold ${isCurrent ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : isRecommended ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}>
            {isCurrent ? '현재 사용 중' : plan.buttonText}
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


const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onNavigate, onUpdateUser }) => {
    // Local state to manage input values
    const [apiKeyYoutube, setApiKeyYoutube] = useState('');
    const [apiKeyGemini, setApiKeyGemini] = useState('');
    
    // Toggle state for editing mode
    const [isEditingYoutube, setIsEditingYoutube] = useState(false);
    const [isEditingGemini, setIsEditingGemini] = useState(false);
    
    const [isSaving, setIsSaving] = useState(false);
    
    // 유저 정보가 변경되거나 컴포넌트가 마운트될 때 초기값 설정
    useEffect(() => {
        // 이미 저장된 키가 있으면 편집 모드 비활성화 (숨김)
        if (user.apiKeyYoutube) {
            setApiKeyYoutube(user.apiKeyYoutube);
            setIsEditingYoutube(false);
        } else {
            setIsEditingYoutube(true);
        }

        if (user.apiKeyGemini) {
            setApiKeyGemini(user.apiKeyGemini);
            setIsEditingGemini(false);
        } else {
            setIsEditingGemini(true);
        }
    }, [user.apiKeyYoutube, user.apiKeyGemini]);

    const handleSaveApiKeys = () => {
        setIsSaving(true);
        // API 키 저장 로직 수행
        onUpdateUser({ apiKeyYoutube, apiKeyGemini });
        
        // 저장 완료 피드백 및 편집 모드 종료
        setTimeout(() => {
            setIsSaving(false);
            if (apiKeyYoutube) setIsEditingYoutube(false);
            if (apiKeyGemini) setIsEditingGemini(false);
            alert('개인 API 키가 브라우저에 안전하게 저장되었습니다.\n다음 로그인 시에도 키를 다시 입력할 필요가 없습니다.');
        }, 500);
    };
    
    const planLimits = { Free: 30, Pro: 3000, Biz: Infinity };
    const planLimit = user.isAdmin ? Infinity : planLimits[user.plan];
    const usagePercentage = planLimit === Infinity ? 0 : Math.round((user.usage / planLimit) * 100);

    const plans = [
        { name: 'Free', description: '기본 기능을 체험해보세요.', price: 0, buttonText: '다운그레이드', features: ['월 30회 분석', '기본 데이터 조회'] },
        { name: 'Pro', description: '본격적인 성장을 원하는 크리에이터', price: 19000, buttonText: 'Pro 플랜 시작', features: ['월 3,000회 (사실상 무제한)', 'AI 인사이트 & 전략 코칭', '채널 비교 분석'] },
        { name: 'Biz', description: '전문가, 대행사, 팀을 위한 플랜', price: 29000, buttonText: 'Biz 플랜 시작', features: ['무제한 분석 (Infinity)', '알고리즘 파인더 (AI)', '컬렉션 관리 기능', 'Pro 플랜 모든 기능'] }
    ];

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
                           개인 API 키를 등록하면 공용 키 제한 없이 안정적으로 서비스를 이용할 수 있습니다.<br/>
                           키는 브라우저에 안전하게 저장되며, 매번 입력할 필요가 없습니다.
                        </p>
                        <div className="space-y-8">
                            {/* YouTube API Key Section */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="youtube-api-key" className="block text-sm font-medium text-gray-300">
                                        YouTube Data API v3 Key
                                    </label>
                                    <a 
                                        href="https://console.cloud.google.com/apis/credentials" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    >
                                        키 발급 받기
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                </div>
                                
                                {!isEditingYoutube && user.apiKeyYoutube ? (
                                    <div className="flex items-center justify-between bg-gray-700/50 border border-gray-600 rounded-md p-3">
                                        <div className="flex items-center gap-2 text-green-400">
                                            <CheckIcon />
                                            <span className="text-sm font-semibold">키가 저장되어 있습니다 (••••••••)</span>
                                        </div>
                                        <button 
                                            onClick={() => setIsEditingYoutube(true)}
                                            className="text-xs text-gray-400 hover:text-white underline"
                                        >
                                            수정하기
                                        </button>
                                    </div>
                                ) : (
                                    <div className="animate-fade-in">
                                        <div className="bg-gray-900/50 p-3 rounded-md mb-2 text-xs text-gray-400 leading-relaxed border border-gray-700/50">
                                            <ol className="list-decimal list-inside space-y-1">
                                                <li><span className="font-semibold text-gray-300">Google Cloud Console</span> 접속 및 프로젝트 생성</li>
                                                <li>좌측 메뉴 [API 및 서비스] &gt; [라이브러리]에서 <span className="font-semibold text-gray-300">'YouTube Data API v3'</span> 검색 후 사용 설정</li>
                                                <li>[사용자 인증 정보] &gt; [사용자 인증 정보 만들기] &gt; <span className="font-semibold text-gray-300">[API 키]</span> 선택</li>
                                                <li>생성된 키를 아래에 입력하세요.</li>
                                            </ol>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="password"
                                                id="youtube-api-key"
                                                value={apiKeyYoutube}
                                                onChange={e => setApiKeyYoutube(e.target.value)}
                                                className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                                                placeholder="AIza..."
                                            />
                                            {user.apiKeyYoutube && (
                                                <button 
                                                    onClick={() => setIsEditingYoutube(false)}
                                                    className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-xs whitespace-nowrap"
                                                >
                                                    취소
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Gemini API Key Section */}
                             <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="gemini-api-key" className="block text-sm font-medium text-gray-300">
                                        Gemini API Key
                                    </label>
                                    <a 
                                        href="https://aistudio.google.com/app/apikey" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    >
                                        키 발급 받기
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                </div>

                                {!isEditingGemini && user.apiKeyGemini ? (
                                    <div className="flex items-center justify-between bg-gray-700/50 border border-gray-600 rounded-md p-3">
                                        <div className="flex items-center gap-2 text-green-400">
                                            <CheckIcon />
                                            <span className="text-sm font-semibold">키가 저장되어 있습니다 (••••••••)</span>
                                        </div>
                                        <button 
                                            onClick={() => setIsEditingGemini(true)}
                                            className="text-xs text-gray-400 hover:text-white underline"
                                        >
                                            수정하기
                                        </button>
                                    </div>
                                ) : (
                                    <div className="animate-fade-in">
                                        <div className="bg-gray-900/50 p-3 rounded-md mb-2 text-xs text-gray-400 leading-relaxed border border-gray-700/50">
                                            <ol className="list-decimal list-inside space-y-1">
                                                <li><span className="font-semibold text-gray-300">Google AI Studio</span> 접속 및 로그인</li>
                                                <li>좌측 상단 <span className="font-semibold text-gray-300">[Get API key]</span> 클릭</li>
                                                <li><span className="font-semibold text-gray-300">[Create API key]</span> 버튼을 눌러 키 생성</li>
                                                <li>생성된 키를 아래에 입력하세요. (무료로 발급 가능)</li>
                                            </ol>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="password"
                                                id="gemini-api-key"
                                                value={apiKeyGemini}
                                                onChange={e => setApiKeyGemini(e.target.value)}
                                                className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                                                placeholder="AIza..."
                                            />
                                            {user.apiKeyGemini && (
                                                <button 
                                                    onClick={() => setIsEditingGemini(false)}
                                                    className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-xs whitespace-nowrap"
                                                >
                                                    취소
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {(isEditingYoutube || isEditingGemini) && (
                                <div className="text-right pt-2 border-t border-gray-700 animate-fade-in">
                                    <button 
                                        onClick={handleSaveApiKeys} 
                                        disabled={isSaving}
                                        className={`px-5 py-2.5 text-sm font-semibold rounded-md shadow-lg transition-all transform active:scale-95 ${isSaving ? 'bg-gray-600 cursor-wait' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                    >
                                        {isSaving ? '저장 중...' : '입력한 키 저장하기'}
                                    </button>
                                </div>
                            )}
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
                            />
                       ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;
