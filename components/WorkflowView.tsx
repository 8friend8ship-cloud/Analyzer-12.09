


import React from 'react';

// --- SVG Icons for each feature ---
const ChannelAnalyticsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const VideoAnalyticsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const SimilarChannelsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.122-1.28-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.122-1.28.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TopChartsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" /></svg>;
const ChromeExtensionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" /></svg>;
const OutliersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const ThumbnailSearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ABTestIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 00.517 3.86l2.387.477a2 2 0 001.806-.547a2 2 0 00.547-1.806l-.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 01-.517-3.86l-2.387-.477zM12 2v.01" /></svg>;
const AlgorithmIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const CollectionsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>;

const workflowSteps = [
    {
        step: 1,
        features: [
            { id: 'channel_analytics', title: "채널 분석 (Channel Analytics)", description: "채널의 구독자, 조회수, 영상 성과 등 상세 분석 및 장기/단기 추이 확인", icon: <ChannelAnalyticsIcon /> },
            { id: 'video_analytics', title: "영상 분석 (Video Analytics)", description: "특정 영상의 일일 조회수, 썸네일 테스트 결과, 랭킹(1~10점) 확인 및 성과 분석", icon: <VideoAnalyticsIcon /> }
        ]
    },
    {
        step: 2,
        features: [
            { id: 'similar_channels', title: "유사 채널 추천 (Similar Channels)", description: "채널 콘텐츠와 유사한 채널 추천을 통해 협업 및 아이디어 영감 제공", icon: <SimilarChannelsIcon /> },
            { id: 'top_charts', title: "실시간 랭킹 (Top Charts)", description: "실시간 구독자·조회수·상위 영상 랭킹을 일/주/월/연간 단위로 제공", icon: <TopChartsIcon /> }
        ]
    },
    {
        step: 3,
        features: [
            { id: 'chrome_extension', title: "크롬 확장 프로그램 (Chrome Extension)", description: "유튜브 시청 중 Content OS 오버레이로 영상별 조회수, 랭킹 등 실시간 데이터 바로 확인", icon: <ChromeExtensionIcon /> },
            { id: 'outliers', title: "아웃라이어 영상 분석 (Outliers)", description: "평균보다 월등히 높은 조회수를 기록한 바이럴 영상(아웃라이어)을 필터링하고 비결 분석", icon: <OutliersIcon /> }
        ]
    },
    {
        step: 4,
        features: [
            { id: 'thumbnail_search', title: "썸네일 검색 (Thumbnail Search)", description: "특정 키워드나 이미지로 썸네일을 검색하여 영감을 얻고 아이디어 수집", icon: <ThumbnailSearchIcon /> },
            { id: 'ab_test', title: "A/B 테스트 (A/B Test)", description: "다른 유튜버들의 썸네일 A/B 테스트 결과를 확인하여 성공 패턴 학습 및 적용", icon: <ABTestIcon /> }
        ]
    },
    {
        step: 5,
        features: [
            { id: 'algorithm_finder', title: "알고리즘 주제 찾기 (Algorithm Finder)", description: "질문 선택만으로 나만의 카테고리, 연령, 성향, 키워드 패턴을 자동 추출하여 방향성 제시", icon: <AlgorithmIcon /> },
            { id: 'collections', title: "컬렉션 (Collections)", description: "여러 도구에서 찾은 아이디어·데이터·결과물을 한 곳에 모아 체계적으로 정리", icon: <CollectionsIcon /> }
        ]
    }
];

const FeatureCard: React.FC<{ feature: typeof workflowSteps[0]['features'][0]; onNavigate: (featureId: string) => void; }> = ({ feature, onNavigate }) => (
    <button onClick={() => onNavigate(feature.id)} className="bg-gray-800/60 rounded-lg p-4 flex items-start gap-4 border border-gray-700/50 w-full text-left hover:bg-gray-700/50 transition-colors group">
        <div className="flex-shrink-0 group-hover:scale-110 transition-transform">{feature.icon}</div>
        <div>
            <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">{feature.title}</h3>
            <p className="text-sm text-gray-400 mt-1">{feature.description}</p>
        </div>
    </button>
);

interface WorkflowViewProps {
    onNavigate: (featureId: string) => void;
}


const WorkflowView: React.FC<WorkflowViewProps> = ({ onNavigate }) => {
    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-white">Content OS 워크플로우</h1>
                    <p className="text-gray-400 mt-2">데이터 분석부터 아이디어 수집까지, 기능의 흐름을 따라 최고의 성과를 만들어보세요.</p>
                </header>

                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-700 hidden md:block" aria-hidden="true"></div>

                    <div className="space-y-12">
                        {workflowSteps.map((step, index) => (
                            <div key={step.step} className="flex flex-col md:flex-row items-center justify-center relative">
                                <div className="md:w-1/2 flex md:justify-end md:pr-12 mb-4 md:mb-0 w-full">
                                    <FeatureCard feature={step.features[0]} onNavigate={onNavigate} />
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-gray-900 border-2 border-gray-600 rounded-full flex items-center justify-center font-bold text-lg text-blue-400 z-10 shadow-lg">
                                    {step.step}
                                </div>
                                <div className="md:w-1/2 flex md:justify-start md:pl-12 w-full">
                                     <FeatureCard feature={step.features[1]} onNavigate={onNavigate} />
                                </div>

                                {index < workflowSteps.length - 1 && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-6 hidden md:block">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 5V19M12 19L7 14M12 19L17 14" stroke="#4A5568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowView;