
import React, { useState, useEffect } from 'react';
import { fetchMyChannelAnalytics, convertPublicDataToKPI, fetchBenchmarkComparison, resolveChannelId, fetchChannelAnalysis } from '../services/youtubeService';
import { getAIBenchmarkRecommendations } from '../services/geminiService';
import { addToCollection, createMyChannelCollectionItem } from '../services/collectionService';
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
    onUpdateUser: (updatedUser: Partial<User>) => void;
    onUpgradeRequired: () => void;
    planLimit: number;
}

// ... (formatNumber, formatDuration, KPICard, AIInsightCard, FunnelStep, OverviewTab, ContentTab, AudienceTab, ChannelInputStep, LoadingStep, SummaryStep remain the same) ...
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
            <p className="text-3xl font-bold text-white mt-1">{formattedValue} <span className="text-lg font-medium text-gray-400">{format !== 'percent' && unit}</span></p>
        </div>
    );
};
const AIInsightCard: React.FC<{ title: string; icon: string; insight: AIAnalyticsInsight }> = ({ title, icon, insight }) => (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 h-full">
        <h3 className="font-semibold text-lg mb-3 flex items-center"><span className="text-2xl mr-2">{icon}</span> {title}</h3>
        <div className="space-y-4">
            <div><h4 className="font-semibold text-sm text-yellow-400 mb-1">AI 요약</h4><p className="text-sm text-gray-300 leading-relaxed">{insight.summary}</p></div>
            <div><h4 className="font-semibold text-sm text-green-400 mb-1">✅ 강점</h4><ul className="list-disc list-inside space-y-1 text-sm text-gray-300">{insight.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
            <div><h4 className="font-semibold text-sm text-blue-400 mb-1">💡 기회</h4><ul className="list-disc list-inside space-y-1 text-sm text-gray-300">{insight.opportunities.map((o, i) => <li key={i}>{o}</li>)}</ul></div>
        </div>
    </div>
);
const FunnelStep: React.FC<{ title: string; value: string; isFirst?: boolean; isLast?: boolean; conversion?: string }> = ({ title, value, isFirst, isLast, conversion }) => (
    <div className="flex items-center w-full">
        <div className="flex flex-col items-center z-10"><div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center text-center p-2 ${isLast ? 'bg-blue-600' : 'bg-gray-700'}`}><p className="text-xs font-semibold text-gray-300">{title}</p><p className="text-xl font-bold text-white mt-1">{value}</p></div></div>
        {!isLast && (<div className="flex-1 flex flex-col items-center -mx-4"><div className="w-full h-0.5 bg-gray-600"></div>{conversion && <span className="text-xs font-semibold bg-gray-600 text-cyan-300 px-2 py-0.5 rounded-md -mt-3 z-10">{conversion}</span>}</div>)}
    </div>
);
const OverviewTab: React.FC<{ data: MyChannelAnalyticsData }> = ({ data }) => {
    const dailyChartData = data.dailyStats.map(d => ({ date: d.date.slice(5), "순증 구독자": d.netSubscribers }));
    return (
        <div className="space-y-8 animate-fade-in">
            <AIInsightCard title="AI 월간 리포트" icon="🤖" insight={data.aiExecutiveSummary} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KPICard title="조회수" value={data.kpi.viewsLast30d} /><KPICard title="구독자 순증" value={data.kpi.netSubscribersLast30d} /><KPICard title="시청 시간" value={data.kpi.watchTimeHoursLast30d} unit="시간" /><KPICard title="노출 클릭률(CTR)" value={data.kpi.ctrLast30d} format="percent" /><KPICard title="평균 시청 시간" value={data.kpi.avgViewDurationSeconds} format="duration" /><KPICard title="노출수" value={data.kpi.impressionsLast30d} />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-6"><div className="bg-gray-800 p-4 rounded-lg h-[400px] flex flex-col"><h3 className="font-semibold mb-2 text-gray-300">일별 구독자 순증 추이</h3><div className="flex-grow min-h-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={dailyChartData}><CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /><XAxis dataKey="date" tick={{ fill: '#A0AEC0', fontSize: 12 }} /><YAxis tick={{ fill: '#A0AEC0', fontSize: 12 }} /><Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} /><Bar dataKey="순증 구독자" fill="#4FD1C5" /></BarChart></ResponsiveContainer></div></div><AIInsightCard title="AI 성장 분석" icon="📈" insight={data.aiGrowthInsight} /></div>
                <div className="space-y-6"><div className="p-6 bg-gray-800 rounded-lg flex flex-col items-center justify-between gap-4 h-[400px]"><h3 className="font-semibold text-gray-300 self-start">시청자 성장 퍼널</h3><FunnelStep title="노출수" value={formatNumber(data.funnelMetrics.impressions, 1)} isFirst /><FunnelStep title="클릭률" value={`${data.funnelMetrics.ctr.toFixed(1)}%`} conversion={`${data.funnelMetrics.ctr.toFixed(1)}%`} /><FunnelStep title="조회수" value={formatNumber(data.funnelMetrics.views, 1)} conversion={`${(data.funnelMetrics.views / (data.funnelMetrics.impressions * (data.funnelMetrics.ctr / 100)) * 100).toFixed(0)}%`} /><FunnelStep title="평균 시청 시간" value={formatDuration(data.funnelMetrics.avgViewDuration)} isLast /></div><AIInsightCard title="AI 퍼널 분석" icon="🔬" insight={data.aiFunnelInsight} /></div>
            </div>
        </div>
    );
};
const ContentTab: React.FC<{ data: MyChannelAnalyticsData }> = ({ data }) => (
    <div className="space-y-8 animate-fade-in"><div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50"><h3 className="font-semibold text-lg mb-3 flex items-center text-yellow-300">✨ 성공 공식</h3><div className="space-y-3"><div className="text-sm"><strong className="text-gray-400 w-24 inline-block">제목 패턴:</strong> {data.contentSuccessFormula.titlePatterns.join(', ')}</div><div className="text-sm"><strong className="text-gray-400 w-24 inline-block">최적 길이:</strong> {data.contentSuccessFormula.optimalLength}</div><div className="text-sm"><strong className="text-gray-400 w-24 inline-block">썸네일 스타일:</strong> {data.contentSuccessFormula.thumbnailStyle}</div></div></div><div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50"><h3 className="font-semibold text-lg mb-4 flex items-center text-blue-300">💡 AI 영상 아이디어</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{data.contentIdeas.map((idea, index) => (<div key={index} className="bg-gray-800 border border-gray-700 p-4 rounded-lg flex flex-col h-full"><div className="flex gap-4 items-start"><div className="w-12 h-12 bg-gray-700 rounded-md flex-shrink-0 flex items-center justify-center">💡</div><div><p className="font-semibold text-sm text-white">{idea.title}</p><p className="text-xs text-gray-400 mt-1">{idea.reason}</p></div></div></div>))}</div></div></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8"><div className="bg-gray-800 p-4 rounded-lg h-[400px] flex flex-col"><h3 className="font-semibold mb-4 text-gray-300">시청자 유지율</h3><div className="flex-grow min-h-0"><RetentionChart data={data.retentionData} /></div></div><div className="bg-gray-800 p-4 rounded-lg h-[400px] flex flex-col"><h3 className="font-semibold mb-4 text-gray-300">트래픽 소스</h3><div className="flex-grow min-h-0"><TrafficSourceChart data={data.trafficSources} /></div></div></div></div>
);
const AudienceTab: React.FC<{ data: MyChannelAnalyticsData }> = ({ data }) => (
    <div className="space-y-8 animate-fade-in"><div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50"><h3 className="font-semibold text-lg mb-3 flex items-center text-green-300">👥 시청자 페르소나</h3><div className="space-y-3"><p className="font-bold text-xl text-white">{data.viewerPersona.name}</p><p className="text-sm text-gray-300">{data.viewerPersona.description}</p></div></div><div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50"><h3 className="font-semibold text-lg mb-3 flex items-center text-purple-300">🗓️ 최적 업로드 시간</h3><p className="text-center text-4xl font-bold text-white py-10">{data.viewershipData.bestUploadTime}</p></div></div><div><h2 className="text-xl font-bold mb-4">시청자 인구 통계</h2><AudienceCharts profile={data.audienceProfile} totalViews={data.kpi.viewsLast30d} /></div></div>
);
const ChannelInputStep: React.FC<{ onSubmit: (input: string) => void; onSampleClick: () => void; isLoading: boolean; }> = ({ onSubmit, onSampleClick, isLoading }) => {
    const [input, setInput] = useState('');
    return (<div className="flex flex-col items-center justify-center py-20 max-w-2xl mx-auto px-4"><h1 className="text-3xl font-bold mb-10">내 채널 진단 시작하기</h1><form onSubmit={(e) => { e.preventDefault(); if (input.trim()) onSubmit(input); }} className="w-full space-y-4"><input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="채널 주소 또는 @핸들 입력" className="w-full bg-gray-800 border border-gray-600 rounded-xl py-4 px-6 text-lg" disabled={isLoading} /><button type="submit" disabled={isLoading || !input.trim()} className="w-full bg-blue-600 font-bold py-4 rounded-xl text-lg">내 채널 분석 시작</button></form><button onClick={onSampleClick} className="text-gray-400 underline mt-6">샘플 채널 체험</button></div>);
};
const LoadingStep: React.FC = () => (<div className="flex flex-col items-center justify-center py-40"><Spinner message="채널 DNA 해독 중..." /></div>);
interface SummaryData { name: string; thumbnailUrl: string; score: number; summaryLines: string[]; fullDashboardData: MyChannelAnalyticsData; }
const SummaryStep: React.FC<{ data: SummaryData; onDeepAnalysis: () => void; onExit: () => void; }> = ({ data, onDeepAnalysis, onExit }) => (
    <div className="flex flex-col items-center justify-center py-10 px-4"><div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center"><img src={data.thumbnailUrl} alt={data.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-gray-700" /><h2 className="text-2xl font-bold mb-6">{data.name}</h2><div className="bg-gray-900/50 p-4 rounded-xl mb-8"><p className="text-gray-400 text-sm">알고리즘 적합도</p><p className="text-5xl font-black text-blue-400">{data.score}점</p></div><div className="space-y-3 mb-8">{data.summaryLines.map((line, i) => (<div key={i} className="text-left p-3 bg-gray-700/30 rounded-lg text-sm text-gray-300">⚠️ {line}</div>))}</div><button onClick={onDeepAnalysis} className="w-full bg-blue-600 font-bold py-4 rounded-xl mb-3">상세 리포트 보기 (1회 차감)</button><button onClick={onExit} className="w-full bg-gray-700 py-3 rounded-xl">종료</button></div></div>
);

const MyChannelAnalytics: React.FC<MyChannelAnalyticsProps> = ({ user, appSettings, onUpdateUser, onUpgradeRequired, planLimit }) => {
    const [viewState, setViewState] = useState<'input' | 'loading' | 'summary' | 'dashboard'>('input');
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [data, setData] = useState<MyChannelAnalyticsData | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'audience' | 'benchmark'>('overview');
    const [benchmarkData, setBenchmarkData] = useState<BenchmarkComparisonData | null>(null);
    const [isBenchmarkLoading, setIsBenchmarkLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<{ name: string; reason: string }[]>([]);
    const [isRecommending, setIsRecommending] = useState(false);
    
    const handleStartAnalysis = async (input: string) => {
        setViewState('loading');
        try {
            const apiKey = user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);
            const channelId = await resolveChannelId(input, apiKey!);
            const channelData = await fetchChannelAnalysis(channelId!, apiKey!);
            const fullDashboardData = await fetchMyChannelAnalytics(channelId!, apiKey!);
            const mockSummaryData: SummaryData = {
                name: channelData.name, thumbnailUrl: channelData.thumbnailUrl, score: Math.floor(Math.random() * 30) + 60,
                summaryLines: ["첫 영상과 최근 영상의 방향성 불일치"], fullDashboardData: fullDashboardData
            };
            setSummaryData(mockSummaryData);
            setViewState('summary');
        } catch (e) { alert("분석 실패"); setViewState('input'); }
    };

    const handleDeepAnalysis = () => {
        if (summaryData?.fullDashboardData) {
            if (user.usage >= planLimit) { onUpgradeRequired(); return; }
            setData(summaryData.fullDashboardData);
            // [Biz Only] Auto-save to Vault
            if (user.plan === 'Biz' || user.isAdmin) {
                addToCollection(createMyChannelCollectionItem(summaryData.fullDashboardData));
            }
            onUpdateUser({ usage: user.usage + 1 });
            setViewState('dashboard');
        }
    };

    const handleExit = () => { setViewState('input'); setData(null); };

    useEffect(() => {
        const fetchRecs = async () => {
            if (viewState === 'dashboard' && activeTab === 'benchmark' && data && recommendations.length === 0) {
                setIsRecommending(true);
                try { const recs = await getAIBenchmarkRecommendations(data.name, data.contentSuccessFormula.titlePatterns); setRecommendations(recs); } 
                catch (e) {} finally { setIsRecommending(false); }
            }
        };
        fetchRecs();
    }, [viewState, activeTab, data]);

    const handleSelectBenchmark = async (benchmarkName: string) => {
        setIsBenchmarkLoading(true);
        try {
            const apiKey = user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);
            const benchmarkId = await resolveChannelId(benchmarkName, apiKey!);
            const benchmarkChannelData = await fetchChannelAnalysis(benchmarkId!, apiKey!);
            const benchmarkKPI = convertPublicDataToKPI(benchmarkChannelData);
            if (data) { const comparison = await fetchBenchmarkComparison(data, benchmarkKPI, benchmarkChannelData.name); setBenchmarkData(comparison); }
        } catch (e) { alert("비교 실패"); } finally { setIsBenchmarkLoading(false); }
    };

    if (viewState === 'input') return <ChannelInputStep onSubmit={handleStartAnalysis} onSampleClick={() => handleStartAnalysis("@MrBeast")} isLoading={false} />;
    if (viewState === 'loading') return <LoadingStep />;
    if (viewState === 'summary' && summaryData) return <SummaryStep data={summaryData} onDeepAnalysis={handleDeepAnalysis} onExit={handleExit} />;
    if (!data) return null;

    return (
        <div className="p-4 md:p-6 lg:p-8"><button onClick={handleExit} className="mb-4 px-4 py-2 bg-gray-700 rounded-md text-sm">← 초기화</button>
            <header className="flex items-center gap-6 mb-6"><img src={data.thumbnailUrl} className="w-20 h-20 rounded-full border-2 border-blue-500" /><div><p className="text-blue-400 text-xs font-bold uppercase">AI Strategy Center</p><h1 className="text-2xl font-bold">{data.name}</h1></div></header>
            <nav className="mb-6 flex gap-2 overflow-x-auto"><button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-bold rounded-md ${activeTab === 'overview' ? 'bg-blue-600' : 'bg-gray-800'}`}>전략 대시보드</button><button onClick={() => setActiveTab('content')} className={`px-4 py-2 text-sm font-bold rounded-md ${activeTab === 'content' ? 'bg-blue-600' : 'bg-gray-800'}`}>콘텐츠 분석</button><button onClick={() => setActiveTab('audience')} className={`px-4 py-2 text-sm font-bold rounded-md ${activeTab === 'audience' ? 'bg-blue-600' : 'bg-gray-800'}`}>시청자 분석</button><button onClick={() => setActiveTab('benchmark')} className={`px-4 py-2 text-sm font-bold rounded-md ${activeTab === 'benchmark' ? 'bg-blue-600' : 'bg-gray-800'}`}>벤치마킹</button></nav>
            {activeTab === 'overview' && <OverviewTab data={data} />}
            {activeTab === 'content' && <ContentTab data={data} />}
            {activeTab === 'audience' && <AudienceTab data={data} />}
            {activeTab === 'benchmark' && (
                <div className="animate-fade-in">
                    {!benchmarkData ? (
                        <div className="max-w-4xl mx-auto text-center">
                            <h2 className="text-xl font-bold mb-8">AI 추천 롤모델 채널</h2>
                            {isRecommending ? <Spinner /> : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {recommendations.map((rec, i) => (
                                        <div key={i} className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition-all">
                                            <h3 className="font-bold mb-2">{rec.name}</h3><p className="text-xs text-gray-400 mb-4">{rec.reason}</p>
                                            <button onClick={() => handleSelectBenchmark(rec.name)} className="w-full bg-blue-600 text-xs py-2 rounded">이 채널과 비교</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : <BenchmarkComparison data={benchmarkData} />}
                </div>
            )}
        </div>
    );
};

export default MyChannelAnalytics;
