

import React, { useState, useEffect } from 'react';
// FIX: Centralized types in types.ts
import type { User } from '../types';
import SubscriptionPlans from './SubscriptionPlans';

interface AccountSettingsProps {
    user: User;
    onNavigate: (view: 'dashboard') => void;
    onUpdateUser: (updatedUser: Partial<User>) => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onNavigate, onUpdateUser }) => {
    const [apiKeyYoutube, setApiKeyYoutube] = useState(user.apiKeyYoutube || '');
    const [apiKeyAnalytics, setApiKeyAnalytics] = useState(user.apiKeyAnalytics || '');
    const [apiKeyReporting, setApiKeyReporting] = useState(user.apiKeyReporting || '');
    const [showPlans, setShowPlans] = useState(false);
    
    // Sync local state with user prop when it changes
    useEffect(() => {
        setApiKeyYoutube(user.apiKeyYoutube || '');
        setApiKeyAnalytics(user.apiKeyAnalytics || '');
        setApiKeyReporting(user.apiKeyReporting || '');
    }, [user]);

    const handleSaveApiKeys = () => {
        onUpdateUser({ apiKeyYoutube, apiKeyAnalytics, apiKeyReporting });
        alert('API 키가 저장되었습니다!');
    };

    if (showPlans) {
        return <SubscriptionPlans onBack={() => setShowPlans(false)} />;
    }
    
    const planLimits = { Free: 10, Pro: 100, Biz: 200 };
    const usagePercentage = Math.round((user.usage / planLimits[user.plan]) * 100);

    return (
        <div className="min-h-screen bg-gray-900 p-4 md:p-6 lg:p-8 text-gray-200">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">계정 설정</h1>
                    <button onClick={() => onNavigate('dashboard')} className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
                        ← 대시보드로 돌아가기
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Profile & Subscription */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gray-800/80 rounded-lg p-6 border border-gray-700/50">
                             <h2 className="text-xl font-semibold mb-4">프로필</h2>
                             <div className="space-y-3">
                                <div>
                                    <label className="text-sm text-gray-400">이메일</label>
                                    <p className="font-semibold">{user.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">비밀번호</label>
                                    <p><button className="text-sm text-blue-400 hover:underline">비밀번호 변경</button></p>
                                </div>
                             </div>
                        </div>
                        <div className="bg-gray-800/80 rounded-lg p-6 border border-gray-700/50">
                             <h2 className="text-xl font-semibold mb-4">요금제 및 사용량</h2>
                             <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-400">현재 요금제</label>
                                    <p className={`font-bold text-lg ${user.plan === 'Biz' ? 'text-blue-400' : 'text-green-400'}`}>{user.plan}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">월간 분석 사용량</label>
                                    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${usagePercentage}%` }}></div>
                                    </div>
                                    <p className="text-right text-sm mt-1">{user.usage} / {planLimits[user.plan]} 회</p>
                                </div>
                                <button onClick={() => setShowPlans(true)} className="w-full px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 hover:bg-blue-700">
                                    요금제 변경 또는 업그레이드
                                </button>
                             </div>
                        </div>
                    </div>

                    {/* Right Column - API Keys */}
                    <div className="lg:col-span-2 bg-gray-800/80 rounded-lg p-6 border border-gray-700/50">
                        <h2 className="text-xl font-semibold mb-2">개인 API 키 관리</h2>
                        <p className="text-sm text-gray-400 mb-6">
                           여기에 개인 API 키를 입력하면 관리자가 설정한 시스템 공용 키 대신 우선적으로 사용됩니다.
                        </p>
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
                                <p className="mt-1 text-xs text-gray-500">
                                    데이터 수집에 필요합니다.
                                </p>
                            </div>
                             <div>
                                <label htmlFor="analytics-api-key" className="block text-sm font-medium text-gray-300">
                                    YouTube Analytics API Key
                                </label>
                                <input
                                    type="password"
                                    id="analytics-api-key"
                                    value={apiKeyAnalytics}
                                    onChange={e => setApiKeyAnalytics(e.target.value)}
                                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="개인 YouTube Analytics API 키를 입력하세요"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    '내 채널 분석' 등 심층 분석 기능에 사용됩니다.
                                </p>
                            </div>
                             <div>
                                <label htmlFor="reporting-api-key" className="block text-sm font-medium text-gray-300">
                                    YouTube Reporting API Key
                                </label>
                                <input
                                    type="password"
                                    id="reporting-api-key"
                                    value={apiKeyReporting}
                                    onChange={e => setApiKeyReporting(e.target.value)}
                                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="개인 YouTube Reporting API 키를 입력하세요"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    대규모 데이터 자동 리포팅 기능에 사용됩니다.
                                </p>
                            </div>
                            <div className="text-right">
                                <button onClick={handleSaveApiKeys} className="px-5 py-2.5 text-sm font-semibold rounded-md bg-green-600 hover:bg-green-700">
                                    개인 API 키 저장
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;