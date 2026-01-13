import React, { useState, useEffect } from 'react';
import Button from './common/Button';
import Spinner from './common/Spinner';
import type { User, InfluencerChannelResult, InfluencerAnalysisDetail } from '../types';

interface InfluencerMarketingViewProps {
    user: User;
    onBack: () => void;
}

// --- Mock Data ---
const mockResults: InfluencerChannelResult[] = [
    { id: 'UC-1', name: 'RYUCAMP', thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_k-3_2j3J2-z3-z3-z3-z3-z3_z3_z3=s176-c-k-c0x00ffffff-no-rj-mo', subscriberCount: 1200000, matchRate: 99, algorithmReason: "이 채널의 2030 남성 시청층은 '감성'과 '전문성'을 중시합니다. '우드 스토브'나 '티타늄 컵' 같은 고품질 장비의 쇼핑 링크를 영상에 포함시킬 경우 높은 클릭률이 예상됩니다." },
    { id: 'UC-2', name: 'Kirin Camp', thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_k-3_2j3J2-z3-z3-z3-z3-z3_z3_z3=s176-c-k-c0x00ffffff-no-rj-mo', subscriberCount: 2300000, matchRate: 98, algorithmReason: "고가 장비에 대한 신뢰도가 높은 채널입니다. '에어텐트'나 '텐트 트레일러' 등 고가의 상품을 공동구매 형태로 제안하면 높은 구매 전환율을 기대할 수 있습니다." },
];

const mockDetailReport: InfluencerAnalysisDetail = {
    channelName: "칙칙품품",
    keyword: "감성 캠핑 용품",
    coreSummary: "칙칙품품 채널은 인물 중심의 브이로그로 시청자와의 유대감이 높습니다. '감성' 키워드에 반응하는 20대 여성 구독자층을 타겟으로 디자인 중심의 상품을 제안하기에 적합합니다. 크리에이터는 이 분석을 통해 자신의 채널에 맞는 상품을 소싱할 수 있습니다.",
    audienceAlignment: {
        score: 72,
        reason: "시청자들은 기능보다 디자인과 분위기를 중시합니다. 따라서 '예쁜 캠핑 식기 세트'나 '감성 조명' 등의 상품에 대한 구매 전환율이 높을 것으로 예상됩니다."
    },
    contentSynergy: "영상 내에서 자연스럽게 상품을 사용하는 모습을 보여주고, '더보기'란과 고정 댓글에 제휴 구매 링크를 포함시키는 전략을 추천합니다. '내돈내산' 형식의 리뷰 콘텐츠가 신뢰도를 높일 것입니다.",
    kpiRecommendations: {
        core: ["제휴 링크 클릭률 (Affiliate Link CTR)", "구매 전환율 (Conversion Rate)"],
        secondary: ["영상 댓글 내 상품 질문 수", "관련 상품 키워드 검색량 증가"]
    },
    finalConclusion: "저가-중가대의 디자인 중심 상품 판매에 적합한 채널"
};


// --- Main Component ---
const InfluencerMarketingView: React.FC<InfluencerMarketingViewProps> = ({ user, onBack }) => {
    const [view, setView] = useState<'input' | 'loading' | 'results'>('input');
    const [keyword, setKeyword] = useState('');
    const [myChannelUrl, setMyChannelUrl] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({ country: 'KR', minSubs: 1000, minAvgViews: 1000 });
    const [loadingStep, setLoadingStep] = useState(0);
    const [results, setResults] = useState<InfluencerChannelResult[]>([]);
    const [myChannelResult, setMyChannelResult] = useState<InfluencerChannelResult | null>(null);
    const [topicKeywords, setTopicKeywords] = useState<string[]>([]);
    const [detailModalChannel, setDetailModalChannel] = useState<InfluencerChannelResult | null>(null);

    const handleCreditDeduction = () => {
        // Credit system disabled for compliance review.
        return true;
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyword.trim()) {
            alert("분석할 상품 키워드를 입력해주세요.");
            return;
        }
        if (!handleCreditDeduction()) return;

        setView('loading');
        setLoadingStep(0);
        setMyChannelResult(null);
        
        setTimeout(() => setLoadingStep(1), 500); 
        setTimeout(() => setLoadingStep(2), 1500); 
        setTimeout(() => setLoadingStep(3), 2800); 
        setTimeout(() => setLoadingStep(4), 4000);
        setTimeout(() => setLoadingStep(5), 5500); 
        setTimeout(() => setLoadingStep(6), 7000); 
        setTimeout(() => {
            setTopicKeywords(['우드 스토브', '빈티지 램프', '티타늄 컵', '감성 캠핑 식기', '미니멀 캠핑 용품', '애견 캠핑 용품']);
            setResults(mockResults);
            
            if (myChannelUrl) {
                const mockMyResult: InfluencerChannelResult = {
                    id: 'my-channel-id',
                    name: '내 채널 (분석 요청)',
                    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_k-3_2j3J2-z3-z3-z3-z3-z3_z3_z3=s176-c-k-c0x00ffffff-no-rj-mo',
                    subscriberCount: 550000,
                    matchRate: 75,
                    algorithmReason: "현재 채널은 '경험' 중심의 콘텐츠가 많습니다. '감성 캠핑용품'과의 적합도를 높이려면, 장비의 '스펙'과 '사용법'을 상세히 다루는 리뷰 콘텐츠 비중을 늘리는 것을 추천합니다.",
                    isMyChannel: true,
                };
                setMyChannelResult(mockMyResult);
            }

            setView('results');
        }, 8000);
    };
    
    const handleShowDetailReport = (channel: InfluencerChannelResult) => {
        if (!handleCreditDeduction()) return;
        setDetailModalChannel(channel);
    };

    const loadingSteps = ["캐시 확인", "상품 키워드 분석", "벤치마킹 채널 검색", "1차 필터링", "AI 채널 매칭", "내 채널 적합도 분석", "리포트 생성"];

    const renderInputView = () => (
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <h1 className="text-4xl font-bold">AI 상품 적합도 분석 (AI Product Fit Analysis)</h1>
            <p className="text-gray-400 mt-4 max-w-2xl mx-auto">내 채널과 특정 상품의 적합도를 분석하고, 벤치마킹 채널과 비교하여 수익화 전략을 구체화합니다.</p>
            <form onSubmit={handleSearch} className="mt-8 flex flex-col gap-4 items-center">
                <div className="w-full max-w-xl flex flex-col sm:flex-row gap-2">
                    <input 
                        type="text"
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        placeholder="분석할 상품 키워드 (예: '감성 캠핑용품')"
                        className="flex-grow bg-gray-700/50 border border-gray-600 rounded-lg py-3 px-5 text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button type="button" onClick={() => setShowFilters(!showFilters)} className="px-4 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">{showFilters ? '조건 닫기' : '상세 조건'}</button>
                    <button type="submit" className="px-5 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg">분석 시작</button>
                </div>
                {showFilters && (
                    <div className="w-full max-w-xl p-6 bg-gray-800/50 border border-gray-700 rounded-lg text-left flex flex-col gap-4 animate-fade-in">
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">내 채널 URL 또는 핸들 (선택)</label>
                            <input type="text" value={myChannelUrl} onChange={e => setMyChannelUrl(e.target.value)} placeholder="https://youtube.com/@mychannel" className="w-full p-2 bg-gray-700 rounded border-gray-600" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm text-gray-400">국가</label>
                                <select value={filters.country} onChange={e => setFilters(f => ({...f, country: e.target.value}))} className="mt-1 w-full p-2 bg-gray-700 rounded border-gray-600">
                                    <option value="KR">대한민국</option>
                                    <option value="US">미국</option>
                                    <option value="JP">일본</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">최소 구독자</label>
                                <input type="number" value={filters.minSubs} onChange={e => setFilters(f => ({...f, minSubs: Number(e.target.value)}))} className="mt-1 w-full p-2 bg-gray-700 rounded border-gray-600" />
                            </div>
                             <div>
                                <label className="text-sm text-gray-400">최소 평균 조회수</label>
                                <input type="number" value={filters.minAvgViews} onChange={e => setFilters(f => ({...f, minAvgViews: Number(e.target.value)}))} className="mt-1 w-full p-2 bg-gray-700 rounded border-gray-600" />
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
    
    const renderLoadingView = () => (
        <div className="max-w-lg mx-auto text-center animate-fade-in">
             <Spinner message="AI가 상품 적합도를 분석 중입니다..." />
             <div className="mt-8 space-y-3 text-sm">
                {loadingSteps.map((step, i) => (
                    <div key={i} className={`flex items-center gap-3 transition-opacity duration-300 ${loadingStep >= i ? 'opacity-100' : 'opacity-30'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${loadingStep > i ? 'bg-green-600' : (loadingStep === i ? 'bg-blue-600 animate-pulse' : 'bg-gray-600')}`}>
                            {loadingStep > i ? '✔' : <span className="text-xs">{i+1}</span>}
                        </div>
                        <span>{step}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    const ChannelCard: React.FC<{channel: InfluencerChannelResult}> = ({ channel }) => (
         <div className={`p-5 rounded-xl grid grid-cols-12 gap-6 items-center ${channel.isMyChannel ? 'bg-blue-900/20 border-2 border-blue-500' : 'bg-gray-800 border border-gray-700'}`}>
            {channel.isMyChannel && <div className="absolute -top-3 right-4 px-2 py-0.5 text-xs font-bold bg-blue-500 rounded-md">MY CHANNEL</div>}
            <div className="col-span-2 text-center">
                 <div className="relative w-24 h-24 mx-auto">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle className="text-gray-700" strokeWidth="8" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                        <circle className="text-green-400" strokeWidth="8" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - channel.matchRate / 100)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-white">{channel.matchRate}%</span>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">상품 적합도 (Fit)</p>
            </div>
            <div className="col-span-6">
                <div className="flex items-center gap-4">
                    <img src={channel.thumbnailUrl} alt={channel.name} className="w-16 h-16 rounded-full" />
                    <div>
                        <h3 className="text-xl font-bold">{channel.name}</h3>
                        <p className="text-sm text-gray-400">구독자 { (channel.subscriberCount / 10000).toFixed(1) }만</p>
                    </div>
                </div>
                <div className="mt-4 bg-gray-900/50 p-3 rounded-md border-l-4 border-gray-600">
                    <p className="text-sm font-semibold text-gray-300">AI 분석 요약 (AI Summary)</p>
                    <p className="text-sm text-gray-400 mt-1">{channel.algorithmReason}</p>
                </div>
            </div>
            <div className="col-span-4 space-y-3">
                 <button onClick={() => handleShowDetailReport(channel)} className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold">AI 쇼핑 연동 전략 리포트</button>
            </div>
        </div>
    );

    const renderResultsView = () => (
        <div className="max-w-5xl mx-auto w-full animate-fade-in">
            <h2 className="text-2xl font-bold mb-4 text-center">벤치마킹 채널 (Benchmark Channels)</h2>
            <div className="space-y-4">
                {results.map(channel => (
                    <ChannelCard key={channel.id} channel={channel} />
                ))}
            </div>

            {myChannelResult && (
                <>
                <div className="text-center my-8 border-t-2 border-dashed border-gray-600 pt-8">
                    <h2 className="text-2xl font-bold text-yellow-400">내 채널 분석 결과 (My Channel Analysis)</h2>
                </div>
                <div className="relative">
                    <ChannelCard channel={myChannelResult} />
                </div>
                </>
            )}

        </div>
    );

    const renderDetailModal = () => {
        if (!detailModalChannel) return null;
        return (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setDetailModalChannel(null)}>
                <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-4 border-b border-gray-700">
                        <h2 className="text-lg font-semibold">AI 쇼핑 연동 전략 리포트: {mockDetailReport.channelName}</h2>
                        <button onClick={() => setDetailModalChannel(null)} className="text-gray-400 hover:text-white">&times;</button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-6 text-sm">
                        <section>
                            <h3 className="font-bold text-lg text-white mb-2">1. 핵심 요약 (Core Summary)</h3>
                            <p className="p-3 bg-gray-900/50 rounded-md text-gray-300">{mockDetailReport.coreSummary}</p>
                        </section>
                        <section>
                            <h3 className="font-bold text-lg text-white mb-2">2. 시청자-상품 적합도 (Audience-Product Fit)</h3>
                            <div className="flex gap-4 items-center bg-gray-900/50 p-3 rounded-md">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-green-400">{mockDetailReport.audienceAlignment.score}%</p>
                                    <p className="text-xs text-gray-400">적합도 (Fit)</p>
                                </div>
                                <p className="text-gray-300">{mockDetailReport.audienceAlignment.reason}</p>
                            </div>
                        </section>
                         <section>
                            <h3 className="font-bold text-lg text-white mb-2">3. 추천 콘텐츠 전략 (Content Strategy)</h3>
                            <div className="p-3 bg-gray-900/50 rounded-md text-yellow-300 italic border-l-4 border-yellow-500">{mockDetailReport.contentSynergy}</div>
                        </section>
                         <section>
                            <h3 className="font-bold text-lg text-white mb-2">4. 예상 주요 성과 지표 (Expected KPIs)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-gray-300">핵심 지표 (Core KPIs)</h4>
                                    <ul className="list-disc list-inside mt-1 text-gray-400">
                                        {mockDetailReport.kpiRecommendations.core.map(kpi => <li key={kpi}>{kpi}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-300">보조 지표 (Secondary KPIs)</h4>
                                     <ul className="list-disc list-inside mt-1 text-gray-400">
                                        {mockDetailReport.kpiRecommendations.secondary.map(kpi => <li key={kpi}>{kpi}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </section>
                         <section>
                            <h3 className="font-bold text-lg text-white mb-2">5. 최종 결론 (Final Conclusion)</h3>
                            <p className="p-3 bg-blue-900/30 text-blue-300 rounded-md font-semibold">{mockDetailReport.finalConclusion}</p>
                        </section>
                    </div>
                     <div className="flex justify-end gap-4 p-4 border-t border-gray-700">
                        <Button variant="secondary" onClick={() => setDetailModalChannel(null)}>닫기</Button>
                        <Button variant="secondary">TXT 저장</Button>
                    </div>
                </div>
            </div>
        );
    };

    let content;
    if (view === 'loading') content = renderLoadingView();
    else if (view === 'results') content = renderResultsView();
    else content = renderInputView();
    
    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-full flex flex-col">
             <div className="flex-shrink-0 mb-6">
                <Button onClick={view === 'input' ? onBack : () => { setView('input'); setKeyword(''); setShowFilters(false); setMyChannelUrl(''); }} variant="secondary">
                    ← {view === 'input' ? '워크플로우로 돌아가기' : '새로 분석하기'}
                </Button>
            </div>
            <main className="flex-grow flex flex-col justify-center">
                {content}
            </main>
            {renderDetailModal()}
        </div>
    );
};

export default InfluencerMarketingView;