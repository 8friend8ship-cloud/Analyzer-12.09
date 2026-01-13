import React from 'react';

// Icons for each feature card, matching the new design
const OutlierIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const ThumbnailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ABTestIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>;
const AlgorithmIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const CollectionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>;
const MarketingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const DiagnosisIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
const ComparisonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V9a2 2 0 012-2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 3H5a2 2 0 00-2 2v11" /></svg>;


const features = [
  {
    id: 'outliers',
    icon: <OutlierIcon />,
    title: '아웃라이어 & 트렌드 분석 (Outlier & Trend Analysis)',
    description: '평균을 뛰어넘는 바이럴 영상을 필터링하고, 실시간 트렌드를 분석하여 기회를 포착합니다. (Filter viral videos that outperform the average and analyze real-time trends to seize opportunities.)',
  },
  {
    id: 'thumbnail_search',
    icon: <ThumbnailIcon />,
    title: '썸네일 & 제목 분석 (Thumbnail & Title Analysis)',
    description: '특정 키워드의 상위 영상들을 분석하여 가장 효과적인 썸네일과 제목의 패턴을 찾습니다. (Analyze top videos for a specific keyword to find effective patterns for thumbnails and titles.)',
  },
  {
    id: 'ab_test',
    icon: <ABTestIcon />,
    title: 'A/B 테스트 게임 (A/B Test Game)',
    description: '어떤 썸네일과 제목이 더 높은 성과를 냈는지 맞추는 게임을 통해 성과가 좋은 콘텐츠에 대한 감을 기릅니다. (Sharpen your intuition for high-performing content by playing a game to guess which thumbnail and title performed better.)',
  },
  {
    id: 'identity_finder',
    icon: <AlgorithmIcon />,
    title: '채널 정체성 진단 (Identity Finder)',
    description: '6단계 질문으로 채널의 정체성을 분석하고, 맞춤형 콘텐츠 시리즈와 키워드 전략에 대한 아이디어를 얻습니다. (Analyze your channel\'s identity through a 6-step diagnosis and get ideas for custom content series and keyword strategies.)',
    tag: { text: 'PRO', color: 'purple' as const },
  },
  {
    id: 'channel_comparison',
    icon: <ComparisonIcon />,
    title: '채널 데이터 비교 (Channel Comparison)',
    description: '선택한 채널들의 데이터를 나란히 비교하여 강점, 약점, 차별화 포인트를 발견합니다. (Compare data from selected channels side-by-side to discover strengths, weaknesses, and points of differentiation.)',
    tag: { text: 'PRO', color: 'purple' as const },
  },
  {
    id: 'collections',
    icon: <CollectionIcon />,
    title: '컬렉션 (Collections)',
    description: '분석 과정에서 발견한 중요한 채널이나 영상을 자동으로 저장하고 관리합니다. (Automatically save and manage important channels or videos discovered during your analysis.)',
    tag: { text: 'PRO', color: 'purple' as const },
  },
  {
    id: 'my_channel_analytics',
    icon: <DiagnosisIcon />,
    title: 'AI 채널 진단 (AI Channel Diagnosis)',
    description: '채널 데이터를 심층 분석하고, AI로부터 맞춤형 성장 전략을 진단받는 공간입니다. (A space to deeply analyze channel data and receive a personalized growth strategy diagnosis from AI.)',
    tag: { text: 'AGENCY', color: 'teal' as const },
  },
  {
    id: 'influencer_marketing',
    icon: <MarketingIcon />,
    title: 'AI 상품 적합도 분석 (AI Product Fit Analysis)',
    description: '내 채널과 특정 상품의 적합도를 분석하고, 벤치마킹 채널과 비교하여 수익화 전략을 구체화합니다. (Analyze your channel\'s fit with a specific product and compare it with benchmark channels to refine your monetization strategy.)',
    tag: { text: 'AGENCY', color: 'teal' as const },
  },
];

const getTagClasses = (color: 'purple' | 'teal') => {
    switch (color) {
        case 'purple':
            return 'bg-purple-600/80 text-purple-200 border-purple-500/50';
        case 'teal':
            return 'bg-teal-600/80 text-teal-200 border-teal-500/50';
    }
}

interface FeatureCardProps {
  feature: typeof features[0];
  align: 'left' | 'right';
  onClick: (id: string) => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, align, onClick }) => (
  <button
    onClick={() => onClick(feature.id)}
    className={`bg-[#1E222B] p-6 rounded-lg border border-gray-700/80 text-left w-full h-full transition-all hover:border-blue-500/50 hover:bg-[#252a33] transform hover:-translate-y-1`}
  >
    <div className={`flex items-center gap-3 mb-3`}>
      {feature.icon}
      <h3 className="text-lg font-bold text-white">{feature.title}</h3>
      {feature.tag && (
        <span className={`px-2 py-0.5 text-xs font-bold rounded-md border ${getTagClasses(feature.tag.color)}`}>
            {feature.tag.text}
        </span>
      )}
    </div>
    <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
  </button>
);


interface WorkflowViewProps {
  onNavigate: (featureId: string) => void;
}

const WorkflowView: React.FC<WorkflowViewProps> = ({ onNavigate }) => {
  const featurePairs = [];
  for (let i = 0; i < features.length; i += 2) {
      featurePairs.push(features.slice(i, i + 2));
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <header className="text-center mb-16">
        <h1 className="text-3xl md:text-4xl font-bold text-white">워크플로우 (Workflow)</h1>
        <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
          아이디어 발상부터 전략 수립까지, 전문가의 노하우가 담긴 분석 도구 모음입니다.<br/>(A suite of expert analysis tools to guide you from ideation to strategy.)
        </p>
      </header>

      <div className="relative max-w-5xl mx-auto">
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-700 -translate-x-1/2" aria-hidden="true"></div>

        <div>
          {featurePairs.map((pair, index) => (
            <div key={index} className="relative mb-24 last:mb-0">
              <div className="grid md:grid-cols-2 gap-x-24">
                <div className="md:text-right">
                  {pair[0] && <FeatureCard feature={pair[0]} align="right" onClick={onNavigate} />}
                </div>
                <div>
                  {pair[1] && <FeatureCard feature={pair[1]} align="left" onClick={onNavigate} />}
                </div>
              </div>
              
              {index < featurePairs.length - 1 && (
                <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center font-bold text-blue-400 shadow-lg z-10">
                  {index + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkflowView;