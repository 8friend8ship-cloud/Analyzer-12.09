import React, { useState, useEffect } from 'react';
import * as youtubeService from '../services/youtubeService';
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
    onShowChannelDetail: (channelId: string) => void;
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

const AIInsightCard: React.FC<{ title: string; insight: AIAnalyticsInsight }> = ({ title, insight }) => (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 h-full">
        <h3 className="font-semibold text-lg mb-3">{title}</h3>
        <div className="space-y-4">
            <div>
                <h4 className="font-semibold text-sm text-yellow-400 mb-1">AI 요약 (AI Summary)</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{insight.summary}</p>
            </div>
            <div>
                <h4 className="font-semibold text-sm text-green-400 mb-1">✅ 긍정적 패턴 (Positive Patterns)</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                    {insight.positivePatterns.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
            </div>
            <div>
                <h4 className="font-semibold text-sm text-blue-400 mb-1">💡 성장 기회 (Growth Areas)</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                    {insight.growthAreas.map((o, i) => <li key={i}>{o}</li>)}
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
        "순증 구독자": d.subscribersGained - d.subscribersLost,
    }));

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg text-sm text-blue-200">
                <p>ℹ️ <strong>안내:</strong> 현재 분석 결과는 공개 YouTube API 데이터를 기반으로 한 <strong>추정치</strong>입니다. 수익 및 상세 시청자 통계와 같은 비공개 데이터는 향후 Google OAuth2 연동을 통해 제공될 예정입니다.</p>
            </div>
            <AIInsightCard title="AI 월간 리포트 (AI Monthly Report)" insight={data.aiExecutiveSummary} />
            
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
                         <h3 className="font-semibold mb-2 text-gray-300 flex-shrink-0">일별 구독자 순증 추이 (Daily Net Subscriber Trend)</h3>
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
                     <AIInsightCard title="AI 성장 분석 (AI Growth Analysis)" insight={data.aiGrowthInsight} />
                </div>
                <div className="space-y-6">
                     <div className="p-6 bg-gray-800 rounded-lg flex flex-col items-center justify-between gap-4 h-[400px]">
                        <h3 className="font-semibold text-gray-300 self-start">시청자 성장 퍼널 (Viewer Growth Funnel)</h3>
                        <FunnelStep title="노출수" value={formatNumber(data.funnelMetrics.impressions, 1)} isFirst />
                        <FunnelStep title="클릭률" value={`${data.funnelMetrics.ctr.toFixed(1)}%`} conversion={`${data.funnelMetrics.ctr.toFixed(1)}%`} />
                        <FunnelStep title="조회수" value={formatNumber(data.funnelMetrics.views, 1)} conversion={`${(data.funnelMetrics.views / (data.funnelMetrics.impressions * (data.funnelMetrics.ctr / 100)) * 100).toFixed(0)}%`} />
                        <FunnelStep title="평균 시청 시간" value={formatDuration(data.funnelMetrics.avgViewDuration)} isLast />
                    </div>
                    <AIInsightCard title="AI 퍼널 분석 (AI Funnel Analysis)" insight={data.aiFunnelInsight} />
                </div>
            </div>
        </div>
    );
};

const ContentTab: React.FC<{ data: MyChannelAnalyticsData }> = ({ data }) => (
    <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50">
                <h3 className="font-semibold text-lg mb-3 flex items-center text-yellow-300">콘텐츠 패턴 분석 (Content Pattern Analysis)</h3>
                <div className="space-y-3">
                    <div className="text-sm"><strong className="text-gray-400 w-24 inline-block">제목 패턴:</strong> {data.contentSuccessFormula.titlePatterns.join(', ')}</div>
                    <div className="text-sm"><strong className="text-gray-400 w-24 inline-block">최적 길이:</strong> {data.contentSuccessFormula.optimalLength}</div>
                    <div className="text-sm"><strong className="text-gray-400 w-24 inline-block">썸네일 스타일:</strong> {data.contentSuccessFormula.thumbnailStyle}</div>
                </div>
            </div>
             <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50">
                <h3 className="font-semibold text-lg mb-4 flex items-center text-blue-300">AI 영상 아이디어 생성 (AI-Generated Video Ideas)</h3>
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
                <h3 className="font-semibold text-gray-300 flex-shrink-0 mb-1">시청자 유지율 (Analytics 데이터)</h3>
                <p className="text-xs text-gray-500 mb-3">YouTube Analytics 데이터 기준의 시청 지속 시간 분포를 그래프로 제공합니다.</p>
                <div className="flex-grow min-h-0">
                    <RetentionChart data={data.retentionData} />
                </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg h-[400px] flex flex-col">
                <h3 className="font-semibold text-gray-300 flex-shrink-0 mb-1">트래픽 소스 (Analytics 데이터)</h3>
                <p className="text-xs text-gray-500 mb-3">시청자가 영상을 발견한 경로의 분포를 Analytics 데이터 기준으로 시각화합니다.</p>
                <div className="flex-grow min-h-0">
                    <TrafficSourceChart data={data.trafficSources} />
                </div>
            </div>
        </div>

        <div>
            <h2 className="text-xl font-bold mb-4">최근 영상 성과 (Recent Video Performance)</h2>
            <div className="bg-gray-800/60 rounded-lg border border-gray-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                    <tr>
                        <th className="px-4 py-3">영상</th>
                        <th className="px-4 py-3 text-center">조회수</th>
                        <th className="px-4 py-3 text-center">CTR</th>
                        <th className="px-4 py-3 text-center">평균 시청 시간</th>
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
                 <h3 className="font-semibold text-lg mb-3 text-green-300">AI 이상적 시청자 페르소나 (AI Ideal Audience Persona)</h3>
                 <div className="space-y-3">
                     <p className="font-bold text-xl text-white">{data.viewerPersona.name}</p>
                     <p className="text-sm text-gray-300">{data.viewerPersona.description}</p>
                     <div>
                         <h4 className="font-semibold text-sm text-gray-400">콘텐츠 방향성 (Content Direction)</h4>
                         <p className="text-sm text-gray-300">{data.viewerPersona.strategy}</p>
                     </div>
                 </div>
            </div>
             <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50">
                <h3 className="font-semibold text-lg mb-3 text-purple-300">AI 최적 업로드 시간 제안 (AI Optimal Upload Time Suggestion)</h3>
                <p className="text-center text-4xl font-bold text-white py-10">{data.viewershipData.bestUploadTime}</p>
             </div>
        </div>
        
        <div>
            <h2 className="text-xl font-bold mb-4">시청 시간대 분포 (Analytics 데이터) (Viewing Time Distribution (Analytics Data))</h2>
            <div className="bg-gray-800 p-4 rounded-lg">
                <ViewershipHeatmap data={data.viewershipData.heatmap} />
            </div>
        </div>
        
        <div>
            <h2 className="text-xl font-bold mb-2">시청자 인구통계 (Audience Demographics)</h2>
            <div className="text-sm text-yellow-300 bg-yellow-900/30 p-3 rounded-md border border-yellow-500/30 mb-4">
              <strong>데이터 출처 (Data Source):</strong> 이 데이터는 YouTube Analytics API를 통해 제공된 실제 측정값입니다.<br/>
              (This data represents actual measurements provided via the YouTube Analytics API.)
            </div>
            <AudienceCharts profile={data.audienceProfile} totalViews={data.kpi.viewsLast30d} />
        </div>
    </div>
);


// --- New Workflow Components ---

const getMockUserChannels = (user: User) => [
    {
        id: 'mock-channel-1',
        name: `${user.name}의 브이로그`,
        thumbnailUrl: `https://i.pravatar.cc/150?u=${user.id}_1`,
        subscribers: '1.23M'
    },
    {
        id: 'mock-channel-2',
        name: `${user.name}의 게임 채널`,
        thumbnailUrl: `https://i.pravatar.cc/150?u=${user.id}_2`,
        subscribers: '154K'
    }
];

const ChannelSelectionStep: React.FC<{
    user: User;
    onSelectAndStart: () => void;
    isLoading: boolean;
}> = ({ user, onSelectAndStart, isLoading }) => {
    const userChannels = getMockUserChannels(user);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(userChannels[0]?.id || null);

    return (
        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-4 animate-fade-in py-20">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">AI 채널 진단</h1>
            <p className="text-gray-400 text-center mb-6 text-lg">
                분석을 원하는 본인 소유의 YouTube 채널을 선택하세요.
            </p>

            <div className="w-full text-center text-sm text-yellow-300 bg-yellow-900/30 p-3 rounded-md border border-yellow-500/30 mb-8">
              <strong>데이터 출처 안내 (Data Source Notice):</strong>
              <p className="mt-1">
                현재 로그인된 Google 계정에 연결된 채널 목록만 표시됩니다. 본 서비스는 YouTube API 정책을 준수하여 사용자 본인 소유의 채널에 대한 분석만 지원합니다.
                <br/>
                <span className="text-yellow-500 text-xs">
                  (Only channels linked to the currently logged-in Google account are displayed. In compliance with YouTube API policies, this service only supports analysis of channels you own.)
                </span>
              </p>
            </div>

            <div className="w-full space-y-4 mb-8">
                {userChannels.map(channel => (
                    <button
                        key={channel.id}
                        onClick={() => setSelectedChannelId(channel.id)}
                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left ${selectedChannelId === channel.id ? 'bg-blue-900/50 border-blue-500 ring-2 ring-blue-500/50' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}`}
                    >
                        <img src={channel.thumbnailUrl} alt={channel.name} className="w-16 h-16 rounded-full flex-shrink-0" />
                        <div>
                            <p className="font-bold text-lg text-white">{channel.name}</p>
                            <p className="text-sm text-gray-400">{channel.subscribers} subscribers</p>
                        </div>
                        {selectedChannelId === channel.id && (
                             <div className="ml-auto flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </button>
                ))}
                 <div className="text-center text-sm text-gray-500 p-4 border-2 border-dashed border-gray-700 rounded-xl">
                    <p>+ 채널 추가 (준비 중)</p>
                    <p className="text-xs mt-1">Google 계정에 연결된 다른 채널을 추가할 수 있습니다.</p>
                </div>
            </div>

            <button
                onClick={onSelectAndStart}
                disabled={isLoading || !selectedChannelId}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? '분석 준비 중...' : '선택 채널로 진단 시작'}
            </button>
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

const MyChannelAnalytics: React.FC<MyChannelAnalyticsProps> = ({ user, appSettings, onShowChannelDetail }) => {
    const [viewState, setViewState] = useState<'channel_selection' | 'loading' | 'dashboard'>('channel_selection');
    const [data, setData] = useState<MyChannelAnalyticsData | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'audience' | 'benchmark'>('overview');
    
    // Benchmark State
    const [benchmarkData, setBenchmarkData] = useState<BenchmarkComparisonData | null>(null);
    const [isBenchmarkLoading, setIsBenchmarkLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<{ name: string; reason: string }[]>([]);
    const [isRecommending, setIsRecommending] = useState(false);
    
    const handleStartAnalysis = async () => {
        setViewState('loading');
        try {
            const dataApiKey = appSettings.apiKeys.youtube;
            const analyticsApiKey = appSettings.apiKeys.analytics;
            if (!dataApiKey || !analyticsApiKey) throw new Error("YouTube API and Analytics API keys are required.");
            
            // In a real app, this ID would come from the channel selection step.
            // For this simulation, "me" is a placeholder to fetch the mock data.
            const channelId = "me"; 

            const fullDashboardData = await youtubeService.fetchMyChannelAnalytics(channelId, dataApiKey, analyticsApiKey);
            
            setData(fullDashboardData);
            setViewState('dashboard');
        } catch (e) {
            console.error(e);
            alert("분석에 실패했습니다. API 키를 확인해주세요.");
            setViewState('channel_selection');
        }
    };

    const handleExit = () => {
        setViewState('channel_selection');
        setData(null);
        setBenchmarkData(null);
        setRecommendations([]);
    };

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
            const apiKey = appSettings.apiKeys.youtube;
            
            if (!apiKey) throw new Error("API Key required.");
            if (!benchmarkName) throw new Error("Benchmark channel name is missing.");

            const benchmarkId = await youtubeService.resolveChannelId(benchmarkName, apiKey);
            if (!benchmarkId) throw new Error(`Benchmark channel '${benchmarkName}' not found.`);

            const benchmarkChannelData = await youtubeService.fetchChannelAnalysis(benchmarkId, apiKey);
            const benchmarkKPI = youtubeService.convertPublicDataToKPI(benchmarkChannelData);
            
            if (data) {
                const comparison = await youtubeService.fetchBenchmarkComparison(data, benchmarkKPI, benchmarkChannelData.name);
                setBenchmarkData(comparison);
            }

        } catch (e) {
            console.error("Benchmark analysis failed:", e);
            alert((e as Error).message || "An unknown error occurred during benchmark analysis.");
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
                                <h2 className="text-2xl font-bold mb-6 text-center text-white">AI 제안 벤치마크 채널 (Role Model)</h2>
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

    const TabButton: React.FC<{ tabId: typeof activeTab; title: string; enTitle: string }> = ({ tabId, title, enTitle }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === tabId ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-400 hover:bg-gray-600'}`}
        >
            {title} <span className="hidden sm:inline">({enTitle})</span>
        </button>
    );
    
    if (viewState === 'channel_selection') {
        return <ChannelSelectionStep user={user} onSelectAndStart={handleStartAnalysis} isLoading={viewState === 'loading'} />;
    }
    if (viewState === 'loading') {
        return <LoadingStep />;
    }

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <button onClick={handleExit} className="mb-4 px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
                ← 분석 초기화
            </button>

            <header className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                <img src={data?.thumbnailUrl} alt={data?.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full ring-4 ring-blue-500" />
                <div className="flex-grow text-center sm:text-left">
                    <p className="text-sm font-semibold text-blue-400">AI Creator Strategy Center</p>
                    <h1 className="text-3xl md:text-4xl font-bold">AI 채널 진단: {data?.name}</h1>
                </div>
            </header>

            <nav className="mb-6 p-1.5 bg-gray-800/80 rounded-lg flex items-center justify-center sm:justify-start gap-2 overflow-x-auto">
                <TabButton tabId="overview" title="종합 전략 대시보드" enTitle="Overall Strategy" />
                <TabButton tabId="content" title="콘텐츠 분석" enTitle="Content" />
                <TabButton tabId="audience" title="시청자 분석" enTitle="Audience" />
                <TabButton tabId="benchmark" title="롤모델 벤치마킹" enTitle="Benchmarking" />
            </nav>
            
            <main>
                {renderDashboardContent()}
            </main>
        </div>
    );
};

export default MyChannelAnalytics;