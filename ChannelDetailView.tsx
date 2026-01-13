import React, { useState, useMemo, useEffect } from 'react';
import { fetchChannelAnalysis, fetchSimilarChannels, analyzeChannelDeeply } from '../services/youtubeService';
import { addToCollection, createChannelCollectionItem } from '../services/collectionService';
import type { ChannelAnalysisData, User, AppSettings, ChannelVideo, SimilarChannelData } from '../types';
import Spinner from './common/Spinner';
import ChannelDetailSkeleton from './skeletons/ChannelDetailSkeleton';
import HelpTooltip from './common/HelpTooltip';
import AdAnalysis from './AdAnalysis';
import LengthChart from './charts/LengthChart';
import ViewsDistributionChart from './charts/ViewsDistributionChart';
import AIReportView from './AIReportView';


// --- Reusable Components within this view ---
const formatNumber = (num: number): string => {
    if (num === undefined || num === null) return '0';
    if (num >= 100000000) return `${(num / 100000000).toFixed(1).replace('.0', '')}억`;
    if (num >= 10000) return `${(num / 10000).toFixed(0)}만`;
    return num.toLocaleString();
};

const StatCard: React.FC<{ title: React.ReactNode; value: string; subValue?: string; highlight?: boolean }> = ({ title, value, subValue, highlight }) => (
    <div className={`p-4 rounded-lg ${highlight ? 'bg-green-900/20 border border-green-500/30' : 'bg-gray-800'}`}>
        <p className={`text-sm ${highlight ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{title}</p>
        <p className={`text-3xl font-bold my-1 ${highlight ? 'text-white' : ''}`}>{value}</p>
        {subValue && <p className="text-sm text-gray-500">{subValue}</p>}
    </div>
);

const LimitedDataMessage: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <p className="text-sm">{message}</p>
    </div>
);

const SurgingVideoCard: React.FC<{ video: ChannelVideo, onShowVideoDetail: (id: string) => void }> = ({ video, onShowVideoDetail }) => (
    <button onClick={() => onShowVideoDetail(video.id)} className="w-full text-left flex items-center gap-3 p-2 bg-gray-900/50 hover:bg-gray-700/50 rounded-md transition-colors">
        <img src={video.thumbnailUrl} alt={video.title} className="w-20 h-auto object-cover rounded flex-shrink-0" />
        <div className="min-w-0">
            <p className="text-xs text-white line-clamp-2">{video.title}</p>
            <p className="text-xs text-gray-400 mt-1">{formatNumber(video.viewCount)} Views</p>
        </div>
    </button>
);

const DataSummaryView = ({ data }: { data: ChannelVideo[] }) => (
    <div className="mb-8 animate-fade-in">
        <h3 className="text-xl font-bold mb-4">채널 데이터 요약 (Channel Data Summary)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 h-72"><ViewsDistributionChart data={data as any} /></div>
            <div className="lg:col-span-1 h-72"><LengthChart data={data as any} /></div>
            <div className="lg:col-span-1 h-72">
                <AdAnalysis videos={data as any} />
            </div>
        </div>
    </div>
);

// --- Tab Content Components ---

const OverviewTab: React.FC<{ data: ChannelAnalysisData; onShowVideoDetail: (id: string) => void; onStartAnalysis: () => void; isAnalyzing: boolean; }> = ({ data, onShowVideoDetail, onStartAnalysis, isAnalyzing }) => {
    const [showFullDesc, setShowFullDesc] = useState(false);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <StatCard 
                    title={<span title="최근 30일 업로드">Uploads (30d)</span>} 
                    value={`${data.overview.uploadPattern.last30Days} 개`} 
                />
                 <StatCard 
                    title={<span title="최근 7일 업로드">Uploads (7d)</span>} 
                    value={`${data.overview.uploadPattern.last7Days} 개`} 
                />
                <StatCard 
                    title={<span title="최근 24시간 업로드">Uploads (24h)</span>}
                    value={`${data.overview.uploadPattern.last24Hours} 개`}
                />
                <StatCard 
                    title={<span title="영상당 평균 구독자">Avg. Subs/Video</span>}
                    value={`${(data.subscriberCount / data.totalVideos).toFixed(1)}`}
                    subValue="All-time"
                />
            </div>

            <DataSummaryView data={data.videoList} />
            
             {!data.deepDiveReport ? (
                <div className="bg-gray-800/40 p-8 rounded-lg border border-dashed border-gray-600 flex flex-col items-center justify-center text-center">
                    {isAnalyzing ? (
                        <div className="py-8">
                            <Spinner message="AI가 채널 정체성과 성장 전략을 심층 분석하고 있습니다..." />
                        </div>
                    ) : (
                        <>
                            <h3 className="text-xl font-bold text-white mb-2">🚀 AI 채널 심층 분석 (AI Channel Deep-Dive)</h3>
                            <p className="text-gray-400 mb-4 max-w-md">
                                채널의 방향성, 강점/약점, 시청자 가치, 다음 액션 플랜 등을 담은 종합 리포트를 받아보세요.
                            </p>
                            <p className="text-xs text-gray-500 mb-6">※ 이 AI 분석은 YouTube 데이터 기반 가이드입니다.</p>
                            <button 
                                onClick={onStartAnalysis}
                                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-full shadow-lg transform transition hover:scale-105"
                            >
                                Start AI Analysis
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div className="animate-fade-in">
                    <AIReportView report={data.deepDiveReport} type="channel" />
                </div>
            )}
            
            <section>
                <h2 className="text-2xl font-bold mb-4"><span title="최근 30일 급상승 영상">Surging Videos (30 Days)</span></h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3">Long-form</h3>
                        <div className="space-y-2">
                            {data.surgingVideos.monthly.longform.length > 0 ? (
                                data.surgingVideos.monthly.longform.map(v => <SurgingVideoCard key={v.id} video={v} onShowVideoDetail={onShowVideoDetail} />)
                            ) : <p className="text-sm text-gray-500 text-center py-4">No data</p>}
                        </div>
                    </div>
                     <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3">Shorts</h3>
                         <div className="space-y-2">
                             {data.surgingVideos.monthly.shorts.length > 0 ? (
                                data.surgingVideos.monthly.shorts.map(v => <SurgingVideoCard key={v.id} video={v} onShowVideoDetail={onShowVideoDetail} />)
                            ) : <p className="text-sm text-gray-500 text-center py-4">No data</p>}
                        </div>
                    </div>
                </div>
            </section>
            
            <section className="bg-gray-800 rounded-lg p-5 border border-gray-700">
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2"><span title="채널 프로필">Channel Profile</span></h2>
                
                <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-400 mb-1" title="채널 설명">Description</h4>
                    <div className={`text-sm text-gray-300 leading-relaxed whitespace-pre-wrap ${!showFullDesc && 'line-clamp-5'}`}>
                        {data.description || "No description."}
                    </div>
                    {data.description && data.description.length > 200 && (
                        <button 
                            onClick={() => setShowFullDesc(!showFullDesc)} 
                            className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                        >
                            {showFullDesc ? "Collapse" : "Read More"}
                        </button>
                    )}
                </div>

                <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-2" title="채널 설정 키워드">Channel Keywords</h4>
                    {data.channelKeywords.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {data.channelKeywords.map((keyword, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-md border border-gray-600">
                                    #{keyword}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500">No keywords set.</p>
                    )}
                </div>
            </section>
        </div>
    );
};

const VideosTab: React.FC<{ data: ChannelAnalysisData; onShowVideoDetail: (id: string) => void }> = ({ data, onShowVideoDetail }) => {
    const [sort, setSort] = useState<'publishedAt' | 'viewCount' | 'engagementRate'>('publishedAt');
    const [searchTerm, setSearchTerm] = useState('');
    
    const sortedAndFilteredVideos = useMemo(() => {
        return data.videoList
            .filter(v => v.title.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                if (sort === 'publishedAt') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
                return b[sort] - a[sort];
            });
    }, [data.videoList, sort, searchTerm]);

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row gap-4 mb-4 p-3 bg-gray-800/50 rounded-lg">
                <input 
                    type="text"
                    placeholder="Search by title..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-grow bg-gray-700 border-gray-600 rounded-md p-2 text-sm"
                />
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Sort:</span>
                    <select value={sort} onChange={e => setSort(e.target.value as any)} className="bg-gray-700 border-gray-600 rounded-md p-2 text-sm">
                        <option value="publishedAt">Latest</option>
                        <option value="viewCount">Popular</option>
                        <option value="engagementRate">E.Rate</option>
                    </select>
                </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg divide-y divide-gray-700/50">
                {sortedAndFilteredVideos.map(video => (
                    <div key={video.id} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-3">
                        <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 w-full md:w-40 group">
                            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-auto md:h-[90px] object-cover rounded-md transition-transform group-hover:scale-105" />
                        </a>
                        <div className="flex-grow min-w-0">
                            <button onClick={() => onShowVideoDetail(video.id)} className="font-semibold text-white hover:text-blue-400 transition-colors line-clamp-2 text-left">{video.title}</button>
                            <p className="text-xs text-gray-400 mt-1">{new Date(video.publishedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-300">
                                <span className="flex items-center gap-1"><span title="조회수">Views:</span> <span className="font-mono">{formatNumber(video.viewCount)}</span></span>
                                <span className="flex items-center gap-1"><span title="좋아요">Likes:</span> <span className="font-mono">{formatNumber(video.likeCount)}</span></span>
                                <span className="flex items-center gap-1"><span title="댓글">Comments:</span> <span className="font-mono">{formatNumber(video.commentCount)}</span></span>
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            <button
                                onClick={() => onShowVideoDetail(video.id)}
                                className="w-24 px-3 py-2 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SimilarChannelsTab: React.FC<{ channelId: string; appSettings: AppSettings; onShowChannelDetail: (id: string) => void }> = ({ channelId, appSettings, onShowChannelDetail }) => {
    const [similarChannels, setSimilarChannels] = useState<SimilarChannelData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSimilarChannels = async () => {
            setIsLoading(true);
            setError(null);
            const apiKey = appSettings.apiKeys.youtube;

            if (!apiKey) {
                setError("System YouTube API key is not set.");
                setIsLoading(false);
                return;
            }
            try {
                const data = await fetchSimilarChannels(channelId, apiKey);
                setSimilarChannels(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to find similar channels.");
            } finally {
                setIsLoading(false);
            }
        };
        loadSimilarChannels();
    }, [channelId, appSettings]);

    const formatStat = (num: number): string => {
        if (num === undefined || num === null) return '0';
        if (num >= 100000000) return `${(num / 100000000).toFixed(1).replace('.0', '')}억`;
        if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.0', '')}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
        return num.toString();
    };

    const getScoreColorClass = (score: number) => {
        if (score >= 95) return 'bg-green-500 text-white';
        if (score >= 90) return 'bg-green-600 text-white';
        if (score >= 85) return 'bg-yellow-500 text-black';
        return 'bg-gray-600 text-gray-200';
    };

    const getScoreTextColor = (score: number) => {
        if (score >= 95) return 'text-white';
        if (score >= 90) return 'text-white';
        if (score >= 85) return 'text-black';
        return 'text-gray-200';
    };


    if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
    if (error) return <LimitedDataMessage message={error} />;
    
    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50 animate-fade-in">
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-900/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <div className="col-span-5">Channel</div>
                <div className="col-span-2 text-right"><span title="구독자">Subs</span></div>
                <div className="col-span-2 text-right"><span title="총 조회수">Total Views</span></div>
                <div className="col-span-1 text-right"><span title="업로드">Uploads</span></div>
                <div className="col-span-2 text-center flex items-center justify-center">
                    <span title="채널 연관도 점수">연관도 (Relevance)</span>
                     <HelpTooltip text="채널의 주제, 키워드, 규모 등 공개 데이터를 기반으로 Content OS가 계산한 참고용 '연관도' 지표입니다. YouTube의 공식 추천 점수가 아닙니다.\n\n[For Reviewers]\nThis is a proprietary 'Relevance' metric calculated by Content OS based on public data like channel topic, keywords, and size. It is NOT an official YouTube recommendation score." />
                </div>
            </div>
            <div className="divide-y divide-gray-700/50">
                {similarChannels.map(channel => (
                    <button 
                        key={channel.id} 
                        onClick={() => onShowChannelDetail(channel.id)}
                        className="w-full text-left p-4 hover:bg-gray-700/40 transition-colors"
                    >
                        <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-12 md:col-span-5 flex items-center gap-3 min-w-0">
                                <img src={channel.thumbnailUrl} alt={channel.name} className="w-10 h-10 rounded-full flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-bold text-white truncate">{channel.name}</p>
                                    <p className="text-xs text-gray-400 truncate">{channel.handle}</p>
                                </div>
                            </div>
                            <div className="hidden md:block col-span-2 text-right font-semibold">{formatStat(channel.subscriberCount)}</div>
                            <div className="hidden md:block col-span-2 text-right font-semibold">{formatStat(channel.totalViews)}</div>
                            <div className="hidden md:block col-span-1 text-right font-semibold">{formatStat(channel.videoCount)}</div>
                            <div className="hidden md:flex col-span-2 justify-center items-center">
                                 <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${getScoreColorClass(channel.similarityScore)}`}>
                                    {channel.similarityScore}
                                 </div>
                            </div>
                            <div className="md:hidden col-span-12 mt-2 pt-2 border-t border-gray-700">
                                 <div className="flex justify-around text-center">
                                    <div><p className="text-xs text-gray-400" title="구독자">Subs</p><p className="font-semibold">{formatStat(channel.subscriberCount)}</p></div>
                                    <div><p className="text-xs text-gray-400" title="총 조회수">Views</p><p className="font-semibold">{formatStat(channel.totalViews)}</p></div>
                                    <div><p className="text-xs text-gray-400" title="연관도 점수">Relevance</p><p className={`font-bold text-lg ${getScoreTextColor(channel.similarityScore)}`}>{channel.similarityScore}</p></div>
                                 </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- Main Component ---

interface ChannelDetailViewProps {
    channelId: string;
    user: User;
    appSettings: AppSettings;
    onBack: () => void;
    onShowVideoDetail: (id: string) => void;
    onShowChannelDetail: (id: string) => void;
    initialTab?: 'overview' | 'similarChannels';
}

const ChannelDetailView: React.FC<ChannelDetailViewProps> = ({ channelId, user, appSettings, onBack, onShowVideoDetail, onShowChannelDetail, initialTab = 'overview' }) => {
    const [data, setData] = useState<ChannelAnalysisData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'similarChannels'>(initialTab);
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            
            setActiveTab(initialTab);
            
            const apiKey = appSettings.apiKeys.youtube;
            
            if (!apiKey) {
                setError("System YouTube API key is not set.");
                setIsLoading(false);
                return;
            }

            try {
                const result = await fetchChannelAnalysis(channelId, apiKey);
                setData(result);
                addToCollection(createChannelCollectionItem(result));
            } catch (err) {
                setError(err instanceof Error ? err.message : "Could not load channel data.");
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, [channelId, user, appSettings, initialTab]);
    
    const handleStartAnalysis = async () => {
        if (!data) return;
        
        setIsAnalyzing(true);
        const apiKey = appSettings.apiKeys.youtube; // Though mock, pass it for consistency
        
        try {
            const { deepDiveReport } = await analyzeChannelDeeply(data, apiKey!);
            setData(prev => prev ? { ...prev, deepDiveReport } : null);
        } catch (err) {
            console.error("Channel analysis failed", err);
            setError("AI 채널 분석 중 오류가 발생했습니다.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const TabButton: React.FC<{ tabId: typeof activeTab; title: string; }> = ({ tabId, title }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === tabId ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
            {title}
        </button>
    );

    if (isLoading) {
        return <ChannelDetailSkeleton />;
    }
    if (error) {
        return <div className="p-8 text-center text-red-400">
            <p>{error}</p>
            <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-600 rounded-md">← Back</button>
        </div>;
    }
    if (!data) {
        return <div className="p-8 text-center text-gray-500">
            <p>No data.</p>
            <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-600 rounded-md">← Back</button>
        </div>;
    }

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <button onClick={onBack} className="mb-4 px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
              ← Back
            </button>
            
            <header className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                <img src={data.thumbnailUrl} alt={data.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full ring-4 ring-gray-700 flex-shrink-0" />
                <div className="flex-grow w-full text-center sm:text-left">
                    <h1 className="text-3xl md:text-4xl font-bold">{data.name}</h1>
                    <p className="text-gray-400">{data.handle}</p>
                    {data.lastFetched && (
                        <p className="text-xs text-gray-500 mt-1">
                            Last updated: {new Date(data.lastFetched).toLocaleString('ko-KR')}
                        </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2 text-lg">
                        <div className="flex items-baseline gap-1.5"><strong className="text-xl">{formatNumber(data.subscriberCount)}</strong><span className="text-sm text-gray-500" title="구독자">Subs</span></div>
                        <div className="flex items-baseline gap-1.5"><strong className="text-xl">{formatNumber(data.totalViews)}</strong><span className="text-sm text-gray-500" title="총 조회수">Views</span></div>
                        <div className="flex items-baseline gap-1.5"><strong className="text-xl">{formatNumber(data.totalVideos)}</strong><span className="text-sm text-gray-500" title="총 영상">Videos</span></div>
                    </div>
                </div>
            </header>
            
            <nav className="border-b border-gray-700 mb-6">
                <div className="-mb-px flex space-x-8" aria-label="Tabs">
                    <TabButton tabId="overview" title="개요 (Overview)" />
                    <TabButton tabId="videos" title="영상 (Videos)" />
                    <TabButton tabId="similarChannels" title="연관 채널 (Related)" />
                </div>
            </nav>

            <main>
                {activeTab === 'overview' && <OverviewTab data={data} onShowVideoDetail={onShowVideoDetail} onStartAnalysis={handleStartAnalysis} isAnalyzing={isAnalyzing} />}
                {activeTab === 'videos' && <VideosTab data={data} onShowVideoDetail={onShowVideoDetail} />}
                {activeTab === 'similarChannels' && <SimilarChannelsTab channelId={data.id} appSettings={appSettings} onShowChannelDetail={onShowChannelDetail} />}
            </main>
        </div>
    );
};

export default ChannelDetailView;