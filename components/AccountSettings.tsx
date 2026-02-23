
import React, { useState } from 'react';
import type { User, FeatureUsage } from '../types';
import HelpTooltip from './common/HelpTooltip';

interface AccountSettingsProps {
    user: User;
    onNavigate: (view: 'dashboard') => void;
    onUpdateUser: (updatedUser: Partial<User>) => void;
}

const planNameToKorean: Record<string, string> = {
    'Free': '베이직',
    'Pro': '프로',
    'Biz': '비즈니스'
};

const UsageCard: React.FC<{ title: string; tooltip: string; usage: FeatureUsage; nextResetDate: Date; }> = ({ title, tooltip, usage, nextResetDate }) => {
    const { used, limit } = usage;
    const isUnlimited = limit === Infinity;
    const percentage = isUnlimited ? 100 : Math.min((used / limit) * 100, 100);
    const isMaxedOut = !isUnlimited && used >= limit;

    const resetDateString = nextResetDate.toLocaleString('ko-KR', {
        year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).replace(/\. /g, '.').replace('오전', '오전 ').replace('오후', '오후 ');

    return (
        <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700/50">
            <h4 className="font-semibold text-white flex items-center">
                {title}
                <HelpTooltip text={tooltip} />
            </h4>
            <div className="mt-3 text-xs text-gray-400 flex justify-between">
                <span>일일 사용 제한 (Daily Limit)</span>
                <span>{resetDateString}에 사용량 초기화</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4 mt-1 border border-gray-600">
                <div
                    className={`h-full rounded-full ${isMaxedOut ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <p className="text-right text-sm font-bold mt-1">
                {isUnlimited ? '무제한' : `${used} / ${limit}`}
            </p>
        </div>
    );
};

const MemberInfoTab: React.FC<{ user: User }> = ({ user }) => (
    <div className="space-y-6">
        <div className="p-4 bg-gray-800 rounded-lg">
            <label className="text-sm text-gray-400">이메일 (Email)</label>
            <p className="text-lg font-mono bg-gray-700 p-2 rounded mt-1">{user.email}</p>
        </div>
        <div className="p-4 bg-gray-800 rounded-lg">
            <label className="text-sm text-gray-400">회원 코드 (Member Code)</label>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-lg font-mono bg-gray-700 p-2 rounded flex-grow">CGCDFQ37</p>
                <button className="px-3 py-2 bg-gray-600 rounded hover:bg-gray-500 text-sm">복사</button>
            </div>
        </div>
        <div className="p-4 bg-gray-800 rounded-lg">
            <label className="text-sm text-gray-400">닉네임 (Nickname)</label>
             <div className="flex items-center gap-2 mt-1">
                <p className="text-lg bg-gray-700 p-2 rounded flex-grow">{user.name}</p>
                <button className="px-3 py-2 bg-red-600 rounded hover:bg-red-500 text-sm">변경</button>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800 rounded-lg">
                <label className="text-sm text-gray-400">회원 등급 (Plan)</label>
                <p className="text-lg font-semibold">{planNameToKorean[user.plan]}</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg">
                <label className="text-sm text-gray-400">이용 기간 (Period)</label>
                <p className="text-lg font-semibold">{user.planExpirationDate ? `~ ${user.planExpirationDate}` : 'N/A'}</p>
            </div>
        </div>
        <div className="p-4 bg-gray-800 rounded-lg">
            <label className="text-sm text-gray-400">결제 정보 (Payment)</label>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-lg font-mono bg-gray-700 p-2 rounded flex-grow tracking-widest">**** **** **** 1234</p>
                <button className="px-3 py-2 bg-gray-600 rounded hover:bg-gray-500 text-sm">카드 변경</button>
            </div>
        </div>
    </div>
);

const VerifiedChannelsTab: React.FC = () => (
    <div className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center text-gray-500 hover:border-blue-500 hover:text-blue-400 transition-colors cursor-pointer">
        <span className="text-4xl">+</span>
        <p className="mt-2 font-semibold">내 채널 추가하기 (Add My Channel)</p>
    </div>
);

const TeamManagementTab: React.FC<{user: User}> = ({user}) => (
    <div>
        <button className="w-full border-2 border-dashed border-gray-700 rounded-lg p-4 text-center text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors">
            + 팀원 초대 (Invite Team Member)
        </button>
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-4 flex justify-between">
                <span>8friend8ship's Team</span>
                <span className="text-gray-400 font-normal">(1/1명)</span>
            </h3>
            <div className="text-sm">
                <div className="grid grid-cols-3 gap-4 text-gray-400 font-semibold border-b border-gray-700 pb-2 mb-2">
                    <span>이름</span>
                    <span>이메일</span>
                    <span>권한</span>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                    <span className="truncate">{user.name}</span>
                    <span className="truncate text-gray-300">{user.email}</span>
                    <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold text-center w-fit">Admin</span>
                </div>
            </div>
        </div>
    </div>
);

const SubscriptionManagementTab: React.FC = () => (
    <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex border-b border-gray-700 mb-4">
            <button className="px-4 py-2 text-sm font-semibold border-b-2 border-blue-500 text-white">구독 내역</button>
            <button className="px-4 py-2 text-sm text-gray-400 hover:text-white">자동 결제 정보</button>
        </div>
        <div className="text-center text-gray-500 py-20">
            <p>구독 내역이 없습니다.</p>
        </div>
    </div>
);

const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onNavigate }) => {
    const [activeTab, setActiveTab] = useState('usage');

    const tabs = [
        { id: 'info', label: '회원 정보', enLabel: 'Member Info' },
        { id: 'channels', label: '인증 채널', enLabel: 'Verified Channels' },
        { id: 'usage', label: '이용 내역', enLabel: 'Usage History' },
        { id: 'team', label: '팀원 관리', enLabel: 'Team Management' },
        { id: 'subscription', label: '구독 관리', enLabel: 'Subscription' },
    ];

    const nextResetDate = new Date();
    nextResetDate.setDate(nextResetDate.getDate() + 1);
    nextResetDate.setHours(0, 0, 0, 0);

    const usageFeatures = [
        { key: 'search', title: '검색 횟수 (Search Count)', tooltip: '메인 대시보드에서 키워드 또는 채널을 검색한 횟수입니다.' },
        { key: 'channelDetail', title: '채널 상세 조회 (Channel Detail View)', tooltip: '채널 상세 분석 페이지를 조회한 횟수입니다.' },
        { key: 'videoDetail', title: '영상 상세 조회 (Video Detail View)', tooltip: '영상 상세 분석 페이지를 조회한 횟수입니다.' },
        { key: 'aiInsight', title: 'AI 인사이트 (AI Insight)', tooltip: '검색 결과에 대한 AI 분석 요약을 생성한 횟수입니다.' },
        { key: 'aiContentMaker', title: 'AI 유튜브 콘텐츠 메이커 (AI Content Maker)', tooltip: '워크플로우의 AI 기반 콘텐츠 생성 도구를 사용한 횟수입니다.' },
        { key: 'outlierAnalysis', title: '아웃라이어 분석 (Outlier Analysis)', tooltip: '아웃라이어 및 트렌드 분석 기능을 사용한 횟수입니다.' },
    ];
    
    return (
        <div className="min-h-screen bg-gray-900 p-4 md:p-6 lg:p-8 text-gray-200">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => onNavigate('dashboard')} className="mb-6 px-4 py-2 text-sm font-semibold rounded-md bg-gray-700 hover:bg-gray-600 flex items-center gap-2">
                    ← 대시보드로 돌아가기
                </button>
                
                <header className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                    <div className="w-16 h-16 flex items-center justify-center bg-orange-500 rounded-full font-bold text-3xl text-white flex-shrink-0">
                        {user.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{user.name}</h1>
                        <p className="text-gray-400">{user.email}</p>
                    </div>
                </header>

                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-sm text-gray-400">현재 플랜 (Current Plan)</span>
                            <p className="text-xl font-bold text-blue-400">{planNameToKorean[user.plan]}</p>
                        </div>
                         {user.planExpirationDate && (
                            <div className="text-right">
                                <span className="text-sm text-gray-400">만료일 (Expires on)</span>
                                <p className="text-lg font-semibold">{user.planExpirationDate}</p>
                            </div>
                        )}
                    </div>
                </div>


                <div className="border-b border-gray-700 mb-6">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`whitespace-nowrap pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-400'
                                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <main className="animate-fade-in">
                    {activeTab === 'info' && <MemberInfoTab user={user} />}
                    {activeTab === 'channels' && <VerifiedChannelsTab />}
                    {activeTab === 'usage' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {usageFeatures.map(({ key, title, tooltip }) => (
                                <UsageCard 
                                    key={key} 
                                    title={title} 
                                    tooltip={tooltip} 
                                    usage={user.usage[key as keyof typeof user.usage]} 
                                    nextResetDate={nextResetDate}
                                />
                            ))}
                        </div>
                    )}
                    {activeTab === 'team' && <TeamManagementTab user={user}/>}
                    {activeTab === 'subscription' && <SubscriptionManagementTab />}
                </main>
            </div>
        </div>
    );
};

export default AccountSettings;
