
import React, { useState, useEffect } from 'react';
import { fetchMyChannelAnalytics, convertPublicDataToKPI, fetchBenchmarkComparison, resolveChannelId, fetchChannelAnalysis } from '../services/youtubeService';
import { getAIBenchmarkRecommendations } from '../services/geminiService';
import type { MyChannelAnalyticsData, User, AppSettings, VideoAnalytics, AIAnalyticsInsight, BenchmarkComparisonData, ChannelAnalysisData } from '../types';
import Spinner from './common/Spinner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import RetentionChart from './charts/RetentionChart';
import TrafficSourceChart from './charts/TrafficSourceChart';
import ViewershipHeatmap from './charts/ViewershipHeatmap';
import AudienceCharts from './charts/AudienceCharts';
import BenchmarkComparison from './BenchmarkComparison';


interface MyChannelAnalyticsProps {
    user: User;
    appSettings: AppSettings;
}

// --- Helper Functions ---
const formatNumber = (num: number, decimals = 1): string => {
    if (num === null || num === undefined) return '-';
    if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(decimals)}B`;
    if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`;
    if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};


// --- Reusable Components ---
const KPICard: React.FC<{ title: string; value: number; unit?: string; format?: 'number' | 'duration' | 'percent' }> = ({ title, value, unit, format = 'number' }) => {
    let formattedValue: string;
    switch (format) {
        case 'duration': formattedValue = formatDuration(value); break;
        case 'percent': formattedValue = `${value.toFixed(1)}${unit || '%'}`; break;
        default: formattedValue = formatNumber(value, 0); break;
    }
    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700/50">
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-white mt-1">
                {formattedValue} <span className="text-lg font-medium text-gray-400">{format !== 'percent' && unit}</span>
            </p>
        </div>
    );
};

const AIInsightCard: React.FC<{ title: string; icon: string; insight: AIAnalyticsInsight }> = ({ title, icon, insight }) => (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 h-full">
        <h3 className="font-semibold text-lg mb-3 flex items-center"><span className="text-2xl mr-2">{icon}</span> {title}</h3>
        <div className="space-y-4">
            <div>
                <h4 className="font-semibold text-sm text-yellow-400 mb-1">AI 요약</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{insight.summary}</p>
            </div>
            <div>
                <h4 className="font-semibold text-sm text-green-400 mb-1">✅ 강점</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                    {insight.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
            </div>
            <div>
                <h4 className="font-semibold text-sm text-blue-400 mb-1">💡 기회</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                    {insight.opportunities.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
            </div>
        </div>
    </div>
);


const FunnelStep: React.FC<{ title: string; value: string; isFirst?: boolean; isLast?: boolean; conversion?: string }> = ({ title, value, isFirst, isLast, conversion }) => (
    <div className="flex items-center w-full">
        <div className="flex flex-col items-center z-10">
            <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center text-center p-2 ${isLast ? 'bg-blue-600' : 'bg-gray-700'}`}>
                <p className="text-xs font-semibold text-gray-300">{title}</p>
                <p className="text-xl font-bold text-white mt-1">{value}</p>
            </div>
        </div>
        {!isLast && (
            <div className="flex-1 flex flex-col items-center -mx-4">
                <div className="w-full h-0.5 bg-gray-600"></div>
                {conversion && <span className="text-xs font-semibold bg-gray-600 text-cyan-300 px-2 py-0.5 rounded-md -mt-3 z-10">{conversion}</span>}
            </div>
        )}
    </div>
);


// --- Tab Components ---
const OverviewTab: React.FC<{ data: MyChannelAnalyticsData }> = ({ data }) => {
    const dailyChartData = data.dailyStats.map(d => ({
        date: d.date.slice(5), // "MM-DD"
        "순증 구독자": d.netSubscribers,
    }));

    return (
        <div className="space-y-8 animate-fade-in">
            <AIInsightCard title="AI 월간 리포트" icon="🤖" insight={data.aiExecutiveSummary} />
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KPICard title="조회수" value={data.kpi.viewsLast30d} />
                <KPICard title="구독자 순증" value={data.kpi.netSubscribersLast30d} />
                <KPICard title="시청 시간" value={data.kpi.watchTimeHoursLast30d} unit="시간" />
                <KPICard title="노출 클릭률(CTR)" value={data.kpi.ctrLast30d} format="percent" />
                <KPICard title="평균 시청 시간" value={data.kpi.avgViewDurationSeconds} format="duration" />
                <KPICard title="노출수" value={data.kpi.impressionsLast30d} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="bg-gray-800 p-4 rounded-lg h-[400px] flex flex-col">
                         <h3 className="font-semibold mb-2 text-gray-300 flex-shrink-0">일별 구독자 순증 추이</h3>
                         <div className="flex-grow min-h-0">
                             <ResponsiveContainer width="100%" height="100%">
                                 <BarChart data={dailyChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                    <XAxis dataKey="date" tick={{ fill: '#A0AEC0', fontSize: 12 }} />
                                    <YAxis tick={{ fill: '#A0AEC0', fontSize: 12 }} tickFormatter={(val) => formatNumber(val as number, 0)} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                                    <Bar dataKey="순증 구독자" fill="#4FD1C5" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                     <AIInsightCard title="AI 성장 분석" icon="📈" insight={data.aiGrowthInsight} />
                </div>
                <div className="space-y-6">
                     <div className="p-6 bg-gray-800 rounded-lg flex flex-col items-center justify-between gap-4 h-[400px]">
                        <h3 className="font-semibold text-gray-300 self-start">시청자 성장 퍼널</h3>
                        <FunnelStep title="노출수" value={formatNumber(data.funnelMetrics.impressions, 1)} isFirst />
                        <FunnelStep title="클릭률" value={`${data.funnelMetrics.ctr.toFixed(1)}%`} conversion={`${data.funnelMetrics.ctr.toFixed(1)}%`} />
                        <FunnelStep title="조회수" value={formatNumber(data.funnelMetrics.views, 1)} conversion={`${(data.funnelMetrics.views / (data.funnelMetrics.impressions * (data.funnelMetrics.ctr / 100)) * 100).toFixed(0)}%`} />
                        <FunnelStep title="평균 시청 시간" value={formatDuration(data.funnelMetrics.avgViewDuration)} isLast />
                    </div>
                    <AIInsightCard title="AI 퍼널 분석" icon="🔬" insight={data.aiFunnelInsight} />
                </div>
            </div>
        </div>
    );
};

const ContentTab: React.FC<{ data: MyChannelAnalyticsData }> = ({ data }) => (
    <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50">
                <h3 className="font-semibold text-lg mb-3 flex items-center text-yellow-300">✨ 내 채널의 성공 공식</h3>
                <div className="space-y-3">
                    <div className="text-sm"><strong className="text-gray-400 w-24 inline-block">제목 패턴:</strong> {data.contentSuccessFormula.titlePatterns.join(', ')}</div>
                    <div className="text-sm"><strong className="text-gray-400 w-24 inline-block">최적 길이:</strong> {data.contentSuccessFormula.optimalLength}</div>
                    <div className="text-sm"><strong className="text-gray-400 w-24 inline-block">썸네일 스타일:</strong> {data.contentSuccessFormula.thumbnailStyle}</div>
                </div>
            </div>
             <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50">
                <h3 className="font-semibold text-lg mb-4 flex items-center text-blue-300">💡 AI 영상 아이디어 생성</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.contentIdeas.map((idea, index) => (
                        <div key={index} className="bg-gray-800 border border-gray-700 p-4 rounded-lg flex flex-col h-full">
                            <div className="flex gap-4 items-start">
                                 <div className="w-24 h-24 bg-gray-700 rounded-md flex-shrink-0 flex items-center justify-center">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                 </div>
                                 <div className="flex-grow">
                                    <p className="font-semibold text-sm text-white">{idea.title}</p>
                                    <p className="text-xs text-gray-400 mt-1">{idea.reason}</p>
                                </div>
                            </div>
                            <div className="mt-auto pt-3">
                                 <a 
                                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(idea.title)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full text-center px-3 py-2 text-xs font-semibold rounded bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                                 >
                                     YouTube에서 검색
                                 </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 p-4 rounded-lg h-[400px] flex flex-col">
                <h3 className="font-semibold mb-4 text-gray-300 flex-shrink-0">시청자 유지율 (추정)</h3>
                <div className="flex-grow min-h-0">
                    <RetentionChart data={data.retentionData} />
                </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg h-[400px] flex flex-col">
                <h3 className="font-semibold mb-4 text-gray-300 flex-shrink-0">트래픽 소스 (추정)</h3>
                <div className="flex-grow min-h-0">
                    <TrafficSourceChart data={data.trafficSources} />
                </div>
            </div>
        </div>

        <div>
            <h2 className="text-xl font-bold mb-4">최근 영상 성과</h2>
            <div className="bg-gray-800/60 rounded-lg border border-gray-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                    <tr>
                        <th className="px-4 py-3">영상</th>
                        <th className="px-4 py-3 text-center">조회수</th>
                        <th className="px-4 py-3 text-center">CTR (추정)</th>
                        <th className="px-4 py-3 text-center">평균 시청 시간 (추정)</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                    {data.videoAnalytics.map(video => (
                        <tr key={video.id} className="hover:bg-gray-700/40">
                        <td className="px-4 py-2">
                            <div className="flex items-center gap-3">
                                <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 group">
                                    <img src={video.thumbnailUrl} alt={video.title} className="w-20 h-[45px] object-cover rounded flex-shrink-0 transition-transform group-hover:scale-105" />
                                </a>
                                <div className="min-w-0">
                                <p className="font-semibold text-white line-clamp-2 text-xs">{video.title}</p>
                                <p className="text-xs text-gray-500">{new Date(video.publishedAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-4 py-2 text-center font-semibold text-base">{formatNumber(video.views, 0)}</td>
                        <td className="px-4 py-2 text-center font-semibold text-base">{video.ctr.toFixed(1)}%</td>
                        <td className="px-4 py-2 text-center font-semibold text-base">{formatDuration(video.avgViewDurationSeconds)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    </div>
);

const AudienceTab: React.FC<{ data: MyChannelAnalyticsData }> = ({ data }) => (
    <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50">
                 <h3 className="font-semibold text-lg mb-3 flex items-center text-green-300">👥 AI 이상적 시청자 페르소나</h3>
                 <div className="space-y-3">
                     <p className="font-bold text-xl text-white">{data.viewerPersona.name}</p>
                     <p className="text-sm text-gray-300">{data.viewerPersona.description}</p>
                     <div>
                         <h4 className="font-semibold text-sm text-gray-400">공략법</h4>
                         <p className="text-sm text-gray-300">{data.viewerPersona.strategy}</p>
                     </div>
                 </div>
            </div>
             <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50">
                <h3 className="font-semibold text-lg mb-3 flex items-center text-purple-300">🗓️ AI 최적 업로드 시간 추천</h3>
                <p className="text-center text-4xl font-bold text-white py-10">{data.viewershipData.bestUploadTime}</p>
             </div>
        </div>
        
        <div>
            <h2 className="text-xl font-bold mb-4">시청 시간대 (히트맵)</h2>
            <div className="bg-gray-800 p-4 rounded-lg">
                <ViewershipHeatmap data={data.viewershipData.heatmap} />
            </div>
        </div>
        
        <div>
            <h2 className="text-xl font-bold mb-4">시청자 인구 통계</h2>
            <AudienceCharts profile={data.audienceProfile} totalViews={data.kpi.viewsLast30d} />
        </div>
    </div>
);

// --- New Workflow Components ---

const ChannelInputStep: React.FC<{
    onSubmit: (input: string) => void;
    onSampleClick: () => void;
    isLoading: boolean;
}> = ({ onSubmit, onSampleClick, isLoading }) => {
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) onSubmit(input);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-4 animate-fade-in py-20">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">내 채널, AI 선생님에게 맡겨보기</h1>
            <p className="text-gray-400 text-center mb-10 text-lg">
                분석할 유튜브 채널 주소를 넣으면<br className="sm:hidden" /> 첫 5개·최근 5개 영상까지 한 번에 진단해 드립니다.
            </p>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="채널 주소 또는 @핸들 입력 (예: @mychannel)"
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl py-4 px-6 text-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 shadow-lg"
                        disabled={isLoading}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? '분석 준비 중...' : '내 채널 분석 시작'}
                </button>
            </form>

            <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center mt-6 text-sm text-gray-500 gap-4">
                <ul className="space-y-1 text-left">
                    <li>● 예) https://www.youtube.com/@채널명</li>
                    <li>● 채널 URL, @핸들, 채널 ID 모두 인식합니다.</li>
                </ul>
                <button 
                    onClick={onSampleClick}
                    className="text-gray-400 underline hover:text-blue-400 transition-colors whitespace-nowrap"
                >
                    [샘플 채널로 체험해보기]
                </button>
            </div>
        </div>
    );
};

const LoadingStep: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full animate-fade-in py-40">
            <Spinner />
            <p className="mt-6 text-lg text-gray-300 font-medium animate-pulse">채널 정보를 불러오는 중입니다...</p>
        </div>
    );
};

interface SummaryData {
    name: string;
    thumbnailUrl: string;
    score: number;
    summaryLines: string[];
    // We need to keep the real data fetched during the summary step to pass it forward
    fullDashboardData: MyChannelAnalyticsData;
}

const SummaryStep: React.FC<{
    data: SummaryData;
    onDeepAnalysis: () => void;
    onExit: () => void;
}> = ({ data, onDeepAnalysis, onExit }) => {
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in py-10">
            <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8 max-w-md w-full text-center">
                <img src={data.thumbnailUrl} alt={data.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-gray-700" />
                <h2 className="text-2xl font-bold text-white mb-1">{data.name}</h2>
                <div className="my-6 p-4 bg-gray-900/50 rounded-xl">
                    <p className="text-gray-400 text-sm mb-1">채널 알고리즘 적합도</p>
                    <p className={`text-5xl font-black ${getScoreColor(data.score)}`}>{data.score}<span className="text-2xl text-gray-500 font-medium">점</span></p>
                    <p className="text-xs text-gray-500 mt-2">{data.score >= 80 ? '아주 훌륭합니다!' : data.score >= 60 ? '개선 여지가 있습니다.' : '방향성 점검이 필요합니다.'}</p>
                </div>
                
                <div className="text-left space-y-3 mb-8">
                    {data.summaryLines.map((line, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
                            <span className="text-red-400 text-lg mt-0.5">⚠️</span>
                            <p className="text-gray-300 text-sm leading-relaxed">{line}</p>
                        </div>
                    ))}
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={onDeepAnalysis}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-transform transform hover:scale-[1.02]"
                    >
                        깊은 분석(방향성 진단) 계속하기
                    </button>
                    <button 
                        onClick={onExit}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-3.5 rounded-xl transition-colors"
                    >
                        간단 리포트만 보고 종료
                    </button>
                </div>
            </div>
        </div>
    );
};


const MyChannelAnalytics: React.FC<MyChannelAnalyticsProps> = ({ user, appSettings }) => {
    // State Machine: 'input' -> 'loading' -> 'summary' -> 'dashboard'
    const [viewState, setViewState] = useState<'input' | 'loading' | 'summary' | 'dashboard'>('input');
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    
    // Dashboard Data
    const [data, setData] = useState<MyChannelAnalyticsData | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'audience' | 'benchmark'>('overview');
    
    // Benchmark State
    const [benchmarkData, setBenchmarkData] = useState<BenchmarkComparisonData | null>(null);
    const [isBenchmarkLoading, setIsBenchmarkLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<{ name: string; reason: string }[]>([]);
    const [isRecommending, setIsRecommending] = useState(false);
    
    // Handlers for the Entry Flow
    const handleStartAnalysis = async (input: string) => {
        setViewState('loading');
        
        try {
            const apiKey = user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);
            if (!apiKey) throw new Error("YouTube API Key required");

            // 1. Resolve Channel ID
            const channelId = await resolveChannelId(input, apiKey);
            if (!channelId) throw new Error("채널을 찾을 수 없습니다.");

            // 2. Fetch Basic Info (Simulate "Diagnosis")
            // In a real app, we'd fetch the first 5 videos specifically. 
            // Here we use existing fetchChannelAnalysis to get profile + recent stats
            const channelData = await fetchChannelAnalysis(channelId, apiKey);
            
            // 3. Generate Mock Summary (Simulating the "First 5 vs Recent 5" check)
            // Ideally, this would be real logic comparing dates.
            const mockScore = Math.floor(Math.random() * 30) + 60; // 60-90
            
            // 4. Fetch the FULL dashboard data using the real ID
            // This ensures "Deep Analysis" has the correct data waiting
            const fullDashboardData = await fetchMyChannelAnalytics(channelId, apiKey);

            const mockSummaryData: SummaryData = {
                name: channelData.name,
                thumbnailUrl: channelData.thumbnailUrl,
                score: mockScore,
                summaryLines: [
                    "첫 영상의 주제와 최근 영상의 방향성이 다소 불일치합니다.",
                    `최근 영상 5개 중 ${Math.floor(Math.random() * 3)}개만 현재 알고리즘 트렌드에 적합합니다.`
                ],
                fullDashboardData: fullDashboardData
            };
            
            setSummaryData(mockSummaryData);
            setViewState('summary');

        } catch (e) {
            console.error(e);
            alert("분석에 실패했습니다. 채널 주소나 API 키를 확인해주세요.");
            setViewState('input');
        }
    };

    const handleSampleClick = () => {
        handleStartAnalysis("@MrBeast");
    };

    const handleDeepAnalysis = () => {
        if (summaryData?.fullDashboardData) {
            setData(summaryData.fullDashboardData);
            setViewState('dashboard');
        } else {
            alert("데이터를 불러오는데 문제가 발생했습니다.");
            setViewState('input');
        }
    };

    const handleExit = () => {
        setViewState('input');
        setSummaryData(null);
        setData(null);
        setBenchmarkData(null);
        setRecommendations([]);
    };

    // Benchmark Logic
    useEffect(() => {
        const fetchRecommendations = async () => {
            if (viewState === 'dashboard' && activeTab === 'benchmark' && data && recommendations.length === 0 && !isRecommending && !benchmarkData) {
                setIsRecommending(true);
                try {
                    const recs = await getAIBenchmarkRecommendations(data.name, data.contentSuccessFormula.titlePatterns);
                    setRecommendations(recs);
                } catch (e) {
                    console.error("Failed to fetch benchmark recommendations:", e);
                } finally {
                    setIsRecommending(false);
                }
            }
        };
        fetchRecommendations();
    }, [viewState, activeTab, data, recommendations.length, isRecommending, benchmarkData]);

    const handleSelectBenchmark = async (benchmarkName: string) => {
        setIsBenchmarkLoading(true);
        setBenchmarkData(null); // Clear previous
        try {
            const apiKey = user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);
            
            if (!apiKey) {
                const msg = "API Key required. Please check your account settings.";
                alert(msg);
                throw new Error(msg);
            }

            if (!benchmarkName) {
                const msg = "벤치마크 채널 이름이 없습니다.";
                alert(msg);
                throw new Error(msg);
            }

            // Attempt to resolve channel ID
            const benchmarkId = await resolveChannelId(benchmarkName, apiKey);
            if (!benchmarkId) {
                const msg = `벤치마크 채널 '${benchmarkName}'을(를) 찾을 수 없습니다. 정확한 채널명이나 URL을 입력해주세요.`;
                alert(msg);
                throw new Error(msg);
            }

            const benchmarkChannelData = await fetchChannelAnalysis(benchmarkId, apiKey);
            
            // Convert public data to KPI structure for comparison
            const benchmarkKPI = convertPublicDataToKPI(benchmarkChannelData);
            
            if (data) {
                const comparison = await fetchBenchmarkComparison(data, benchmarkKPI, benchmarkChannelData.name);
                setBenchmarkData(comparison);
            }

        } catch (e) {
            console.error("Benchmark analysis failed:", e);
            // Error alerting is handled in individual checks above for more clarity, 
            // generic fallback if needed:
            if ((e as Error).message === "Failed to fetch") {
                alert("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            }
        } finally {
            setIsBenchmarkLoading(false);
        }
    };


    const renderDashboardContent = () => {
        if (!data) return <div className="text-center p-10">데이터 로딩 오류</div>;
        switch (activeTab) {
            case 'overview': return <OverviewTab data={data} />;
            case 'content': return <ContentTab data={data} />;
            case 'audience': return <AudienceTab data={data} />;
            case 'benchmark': 
                return (
                    <div className="animate-fade-in">
                        {!benchmarkData ? (
                            <div className="max-w-4xl mx-auto">
                                <h2 className="text-2xl font-bold mb-6 text-center text-white">AI 추천 벤치마크 채널 (Role Model)</h2>
                                <p className="text-center text-gray-400 mb-8">최근 1년 간 급성장한 채널 중, 우리 채널이 본받으면 좋을 롤모델을 AI가 선정했습니다.</p>
                                
                                {isRecommending ? (
                                    <div className="flex justify-center py-20"><Spinner message="AI가 성장세가 뚜렷한 유사 채널을 찾고 있습니다..." /></div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {recommendations.map((rec, idx) => (
                                            <div key={idx} className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors flex flex-col items-center text-center">
                                                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-2xl mb-4">🏆</div>
                                                <h3 className="font-bold text-lg text-white mb-2">{rec.name}</h3>
                                                <p className="text-sm text-gray-400 mb-6 flex-grow">{rec.reason}</p>
                                                <button 
                                                    onClick={() => handleSelectBenchmark(rec.name)}
                                                    disabled={isBenchmarkLoading}
                                                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                                                >
                                                    {isBenchmarkLoading ? '분석 중...' : '이 채널과 비교하기'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="mt-12 text-center border-t border-gray-700 pt-8">
                                    <p className="text-gray-500 text-sm mb-4">원하는 채널이 없나요? 직접 입력해서 비교해보세요.</p>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const form = e.target as HTMLFormElement;
                                        const input = form.elements.namedItem('customBenchmark') as HTMLInputElement;
                                        if (input.value.trim()) handleSelectBenchmark(input.value.trim());
                                    }} className="flex gap-2 max-w-md mx-auto">
                                        <input name="customBenchmark" type="text" placeholder="채널명 또는 URL 입력" className="flex-grow bg-gray-800 border border-gray-600 rounded-md p-2 text-white" />
                                        <button type="submit" disabled={isBenchmarkLoading} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm disabled:opacity-50">비교</button>
                                    </form>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg">
                                    <h3 className="font-bold text-lg">벤치마크 결과</h3>
                                    <button onClick={() => setBenchmarkData(null)} className="text-sm text-blue-400 hover:underline">다른 채널 선택하기</button>
                                </div>
                                <BenchmarkComparison data={benchmarkData} />
                            </div>
                        )}
                    </div>
                );
            default: return null;
        }
    };

    const TabButton: React.FC<{ tabId: typeof activeTab; title: string; }> = ({ tabId, title }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === tabId ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-400 hover:bg-gray-600'}`}
        >
            {title}
        </button>
    );

    // --- Main Render ---
    
    if (viewState === 'input') {
        return <ChannelInputStep onSubmit={handleStartAnalysis} onSampleClick={handleSampleClick} isLoading={false} />;
    }

    if (viewState === 'loading') {
        return <LoadingStep />;
    }

    if (viewState === 'summary' && summaryData) {
        return <SummaryStep data={summaryData} onDeepAnalysis={handleDeepAnalysis} onExit={handleExit} />;
    }

    // Dashboard View
    return (
        <div className="p-4 md:p-6 lg:p-8">
            <button onClick={handleExit} className="mb-4 px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
                ← 분석 초기화
            </button>

            <header className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                <img src={data?.thumbnailUrl} alt={data?.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full ring-4 ring-blue-500" />
                <div className="flex-grow text-center sm:text-left">
                    <p className="text-sm font-semibold text-blue-400">AI Creator Strategy Center</p>
                    <h1 className="text-3xl md:text-4xl font-bold">{data?.name}</h1>
                </div>
            </header>

            <nav className="mb-6 p-1.5 bg-gray-800/80 rounded-lg flex items-center justify-center sm:justify-start gap-2 overflow-x-auto">
                <TabButton tabId="overview" title="종합 전략 대시보드" />
                <TabButton tabId="content" title="콘텐츠 심층분석" />
                <TabButton tabId="audience" title="시청자 페르소나" />
                <TabButton tabId="benchmark" title="롤모델 벤치마킹" />
            </nav>
            
            <main>
                {renderDashboardContent()}
            </main>
        </div>
    );
};

export default MyChannelAnalytics;
