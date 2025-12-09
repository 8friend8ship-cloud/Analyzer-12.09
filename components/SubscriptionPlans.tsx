import React from 'react';

interface SubscriptionPlansProps {
    onBack: () => void;
}

const CheckIcon = () => (
    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const PlanCard: React.FC<{ plan: any, isRecommended?: boolean }> = ({ plan, isRecommended = false }) => (
    <div className={`relative rounded-xl border p-6 text-center ${isRecommended ? 'border-blue-500 bg-gray-800/50' : 'border-gray-700 bg-gray-800'}`}>
        {isRecommended && <div className="absolute top-0 right-6 -mt-3 inline-block rounded-full bg-blue-500 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white">추천</div>}
        <h3 className="text-2xl font-semibold">{plan.name}</h3>
        <p className="mt-2 text-gray-400">{plan.description}</p>
        <div className="mt-6">
            <span className="text-4xl font-bold">₩{plan.price.toLocaleString()}</span>
            <span className="text-base font-medium text-gray-400">/월</span>
        </div>
        <button className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold ${isRecommended ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}>
            {plan.buttonText}
        </button>
        <ul className="mt-6 space-y-3 text-left">
            {plan.features.map((feature: string, index: number) => (
                <li key={index} className="flex items-start">
                    <CheckIcon />
                    <span className="ml-3 text-gray-300">{feature}</span>
                </li>
            ))}
        </ul>
    </div>
);

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onBack }) => {

    const plans = [
        {
            name: 'Free',
            description: '기본 기능을 체험해보세요.',
            price: 0,
            buttonText: '현재 요금제',
            features: [
                '월 10회 키워드 분석',
                '기본 영상 데이터 조회',
                '커뮤니티 지원'
            ]
        },
        {
            name: 'Pro',
            description: '개인 크리에이터에게 적합합니다.',
            price: 19000,
            buttonText: 'Pro 플랜 시작하기',
            features: [
                '월 100회 키워드/채널 분석',
                'AI 인사이트 및 추천',
                '채널 비교 분석',
                '데이터 엑셀 다운로드',
                '이메일 지원'
            ]
        },
        {
            name: 'Biz',
            description: '전문가 및 팀을 위한 플랜입니다.',
            price: 29000,
            buttonText: 'Biz 플랜 시작하기',
            features: [
                '월 200회 분석',
                'Pro 플랜의 모든 기능',
                '상세 시청자 데이터 분석',
                'API 접근 (별도 문의)',
                '우선 기술 지원'
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-gray-900 p-4 md:p-6 lg:p-8 text-gray-200">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-start mb-8">
                     <button onClick={onBack} className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
                        ← 계정 설정으로 돌아가기
                    </button>
                </div>
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-white">요금제 안내</h1>
                    <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-400">
                        당신의 채널 성장을 위한 최고의 플랜을 선택하세요.
                    </p>
                </div>
                <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
                    <PlanCard plan={plans[0]} />
                    <PlanCard plan={plans[1]} isRecommended={true} />
                    <PlanCard plan={plans[2]} />
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPlans;
