
import React, { useState, useEffect } from 'react';
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
    
    const planLimits = { Free: 30, Pro: 100, Biz: 200 };
    const planLimit = user.isAdmin ? Infinity : planLimits[user.plan];
    const usagePercentage = planLimit === Infinity ? 0 : Math.round((user.usage / planLimit) * 100);

    const plans = [
        { name: 'Free', description: '기본 기능을 체험해보세요.', price: 0, buttonText: '다운그레이드', features: ['월 30회 분석', '기본 데이터 조회'] },
        { name: 'Pro', description: '개인 크리에이터에게 적합합니다.', price: 19000, buttonText: 'Pro 플랜 시작', features: ['월 100회 분석', '채널 비교 분석'] },
        { name: 'Biz', description: '전문가 및 팀을 위한 플랜입니다.', price: 29000, buttonText: 'Biz 플랜 시작', features: ['월 200회 분석', '모든 기능'] }
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
                        <h2 className="text-xl font-semibold mb-2">API 키 및 문의</h2>
                        <p className="text-sm text-gray-400 mb-4">
                           본 애플리케이션은 관리자가 등록한 공용 시스템 API 키를 사용하여 모든 YouTube 데이터 분석을 수행합니다.<br/>
                           사용량 초과 또는 API 오류 등의 문제가 발생할 경우, 아래 연락처를 통해 관리자에게 문의해주세요.
                        </p>
                         <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-3">
                            <div>
                                <h3 className="font-semibold text-white">System API Key Status</h3>
                                <p className="text-sm text-green-400 font-medium">현재 시스템 키로 정상 운영 중입니다.</p>
                            </div>
                            <div className="border-t border-gray-700 pt-3">
                                <h3 className="font-semibold text-white">관리자 연락처</h3>
                                <p className="text-sm text-blue-400 font-medium mt-1">이메일: 8friend8ship@hanmail.net</p>
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
                            />
                       ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;
