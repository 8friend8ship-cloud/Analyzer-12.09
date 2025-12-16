
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchChannelAnalysis, fetchSimilarChannels } from '../services/youtubeService';
import { addToCollection, createChannelCollectionItem } from '../services/collectionService';
import { getFromCache, setInCache } from '../services/cacheService';
import type { ChannelAnalysisData, User, AppSettings, ChannelVideo, SurgingVideos, SimilarChannelData } from '../types';
import Spinner from './common/Spinner';
import PerformanceTrendChart from './charts/PerformanceTrendChart';
import AudienceCharts from './charts/AudienceCharts';
import ChannelDetailSkeleton from './skeletons/ChannelDetailSkeleton';

interface ChannelDetailViewProps {
  channelId: string;
  user: User;
  appSettings: AppSettings;
  onBack: () => void;
  onOpenCommentModal: (video: { id: string, title: string }) => void;
  onShowVideoDetail: (videoId: string) => void;
  onShowChannelDetail: (channelId: string) => void;
  initialTab?: 'overview' | 'similarChannels';
}

const formatNumber = (num: number, compact = false): string => {
    if (num === null || num === undefined) return '-';
    if (compact) {
        if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
        if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toLocaleString();
};

const StatCard: React.FC<{ title: string; value: string; subValue?: string; highlight?: boolean }> = ({ title, value, subValue, highlight }) => (
    <div className={`p-4 rounded-lg ${highlight ? 'bg-green-900/20 border border-green-500/30' : 'bg-gray-800'}`}>
        <p className={`text-sm ${highlight ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{title}</p>
        <p className={`text-3xl font-bold my-1 ${highlight ? 'text-white' : ''}`}>{value}</p>
        {subValue && <p className="text-sm text-gray-500">{subValue}</p>}
    </div>
);

const VideoListItem: React.FC<{ video: ChannelVideo; onOpenCommentModal: (video: { id: string, title: string }) => void; onShowVideoDetail: (videoId: string) => void; }> = ({ video, onOpenCommentModal, onShowVideoDetail }) => {
    return (
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-3 hover:bg-gray-700/30 rounded-lg transition-colors">
            {/* 썸네일 클릭 시 유튜브로 이동 (target="_blank") */}
            <a 
                href={`https://www.youtube.com/watch?v=${video.id}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-shrink-0 w-full md:w-40 group relative block"
            >
                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-auto md:h-[90px] object-cover rounded-md transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-md transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
            </a>
            <div className="flex-grow min-w-0 w-full">
                {/* 제목 클릭 시 내부 상세 분석 페이지로 이동 */}
                <button onClick={() => onShowVideoDetail(video.id)} className="font-semibold text-white hover:text-blue-400 transition-colors line-clamp-2 text-left w-full text-sm md:text-base">{video.title}</button>
                <p className="text-xs text-gray-400 mt-1">{new Date(video.publishedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-300">
                    <span title="조회수" className="flex items-center gap-1">👁️ {formatNumber(video.viewCount)}</span>
                    <span title="좋아요" className="flex items-center gap-1">👍 {formatNumber(video.likeCount)}</span>
                    <span title="댓글" className="flex items-center gap-1">💬 {formatNumber(video.commentCount)}</span>
                    <span title="시간당 조회수" className="flex items-center gap-1">🔥 {formatNumber(video.viewsPerHour)}</span>
                    <span title="영상 총 수익" className="flex items-center gap-1 font-semibold text-green-400">💰 ${formatNumber(video.estimatedRevenue)}</span>
                </div>
            </div>
            <button
                onClick={() => onOpenCommentModal({ id: video.id, title: video.title })}
                className="w-full md:w-auto mt-2 md:mt-0 px-3 py-2 text-xs font-semibold rounded bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 flex-shrink-0"
            >
                댓글 분석
            </button>
        </div>
    );
};

const SurgingVideoCard: React.FC<{video: ChannelVideo, onShowVideoDetail: (id: string) => void}> = ({ video, onShowVideoDetail }) => (
    <div className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => onShowVideoDetail(video.id)}>
        <div className="flex-shrink-0 group overflow-hidden rounded-md">
          <img src={video.thumbnailUrl} alt={video.title} className="w-24 h-[54px] object-cover transition-transform group-hover:scale-105" />
        </div>
        <div className="min-w-0 flex-grow">
            <p className="text-sm font-semibold text-white line-clamp-2 hover:text-blue-400 mb-1">{video.title}</p>
            <p className="text-xs text-blue-400 font-bold">🔥 시간당 {formatNumber(video.viewsPerHour)}회</p>
        </div>
    </div>
);


const SurgingVideosSection: React.FC<{surgingVideos: SurgingVideos, onShowVideoDetail: (id: string) => void}> = ({ surgingVideos, onShowVideoDetail }) => {
    const [activeTab, setActiveTab] = useState<'monthly' | 'weekly' | 'daily'>('monthly');

    const tabs = {
        monthly: { label: '월간', data: surgingVideos.monthly },
        weekly: { label: '주간', data: surgingVideos.weekly },
        daily: { label: '일간', data: surgingVideos.daily },
    };

    const currentData = tabs[activeTab].data;

    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">🚀 급상승 영상 <span className="text-xs font-normal text-gray-400 bg-gray-900 px-2 py-0.5 rounded">최근 성과</span></h3>
                <div className="flex gap-1 bg-gray-900/50 p-1 rounded-md">
                    {(Object.keys(tabs) as Array<keyof typeof tabs>).map(tabKey => (
                         <button 
                            key={tabKey} 
                            onClick={() => setActiveTab(tabKey)}
                            className={`px-3 py-1 text-xs font-semibold rounded ${activeTab === tabKey ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-400 hover:text-white'}`}
                         >
                            {tabs[tabKey].label}
                         </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-center mb-3 text-gray-400 text-sm uppercase tracking-wide">롱폼 비디오</h4>
                    <div className="space-y-2">
                        {currentData.longform.length > 0 ? currentData.longform.map(v => <SurgingVideoCard key={v.id} video={v} onShowVideoDetail={onShowVideoDetail} />) : <p className="text-center text-xs text-gray-500 py-8 bg-gray-900/30 rounded-lg">해당 기간 데이터 없음</p>}
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold text-center mb-3 text-gray-400 text-sm uppercase tracking-wide">Shorts</h4>
                     <div className="space-y-2">
                        {currentData.shorts.length > 0 ? currentData.shorts.map(v => <SurgingVideoCard key={v.id} video={v} onShowVideoDetail={onShowVideoDetail} />) : <p className="text-center text-xs text-gray-500 py-8 bg-gray-900/30 rounded-lg">해당 기간 데이터 없음</p>}
                    </div>
                </div>
            </div>
        </div>
    )
}

const SimilarChannelsTab: React.FC<{ channelId: string; user: User; appSettings: AppSettings; onShowChannelDetail: (id: string) => void }> = ({ channelId, user, appSettings, onShowChannelDetail }) => {
    const [similarChannels, setSimilarChannels] = useState<SimilarChannelData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSimilarChannels = async () => {
            const cacheKey = `similar_${channelId}`;
            const cachedData = getFromCache(cacheKey);
            if (cachedData) {
                setSimilarChannels(cachedData);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);
            const apiKey = user.isAdmin
                ? appSettings.apiKeys.youtube
                : (user.apiKeyYoutube || appSettings.apiKeys.youtube);

            if (!apiKey) {
                setError("유사 채널 추천 기능을 사용하려면 YouTube API 키가 필요합니다.");
                setIsLoading(false);
                return;
            }

            try {
                const data = await fetchSimilarChannels(channelId, apiKey);
                setSimilarChannels(data);
                setInCache(cacheKey, data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "유사 채널을 찾는 데 실패했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        loadSimilarChannels();
    }, [channelId, user, appSettings]);

    if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
    if (error) return <div className="text-center text-red-400 p-4 bg-red-900/50 rounded-lg">{error}</div>;

    return (
        <div>
            {similarChannels.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {similarChannels.map(channel => (
                        <div key={channel.id} className="bg-gray-800/60 p-4 rounded-lg border border-gray-700/50 flex flex-col items-center text-center h-full hover:border-blue-500/50 transition-colors">
                            <button onClick={() => onShowChannelDetail(channel.id)} className="flex flex-col items-center group">
                                <img src={channel.thumbnailUrl} alt={channel.name} className="w-20 h-20 rounded-full mb-3 ring-2 ring-gray-700 group-hover:ring-blue-500 transition-all" />
                                <h3 className="font-bold text-white line-clamp-2 group-hover:text-blue-400 transition-colors">{channel.name}</h3>
                            </button>
                            <div className="text-xs text-gray-400 my-3 w-full space-y-1">
                                <div className="flex justify-between px-2 bg-gray-900/30 py-1 rounded"><span>구독자</span> <span>{formatNumber(channel.subscriberCount, true)}</span></div>
                                <div className="flex justify-between px-2 bg-gray-900/30 py-1 rounded"><span>영상수</span> <span>{formatNumber(channel.videoCount)}</span></div>
                            </div>
                            <p className="text-xs text-gray-300 flex-grow bg-gray-900/50 p-2 rounded-md w-full text-left leading-relaxed mb-3">
                                <span className="block text-gray-500 text-[10px] mb-1">추천 이유</span>
                                "{channel.reason}"
                            </p>
                            <button 
                                onClick={() => onShowChannelDetail(channel.id)}
                                className="w-full px-3 py-2 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                            >
                                채널 분석
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500 py-12">AI가 추천할 만한 유사 채널을 찾지 못했습니다.</p>
            )}
        </div>
    );
};


const ChannelDetailView: React.FC<ChannelDetailViewProps> = ({ channelId, user, appSettings, onBack, onOpenCommentModal, onShowVideoDetail, onShowChannelDetail, initialTab = 'overview' }) => {
    const [data, setData] = useState<ChannelAnalysisData | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Default to true to start loading immediately
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'similarChannels'>(initialTab);
    const [showFullDesc, setShowFullDesc] = useState(false);
    
    // Auto-fetch data on mount or channelId change
    useEffect(() => {
        const loadData = async () => {
            if (!channelId) return;
            
            // Check cache first
            const cacheKey = `channel_detail_${channelId}`;
            const cachedData = getFromCache(cacheKey);
            if (cachedData) {
                setData(cachedData);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);
            
            const apiKey = user.isAdmin
              ? appSettings.apiKeys.youtube
              : (user.apiKeyYoutube || appSettings.apiKeys.youtube);

            if (!apiKey) {
                setError(user.isAdmin ? "시스템 API 키가 필요합니다." : "YouTube API 키가 설정되지 않았습니다.");
                setIsLoading(false);
                return;
            }
            
            try {
                const result = await fetchChannelAnalysis(channelId, apiKey);
                setData(result);
                setInCache(cacheKey, result); // Save to cache
                addToCollection(createChannelCollectionItem(result));
            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : "채널 정보를 불러올 수 없습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [channelId, user, appSettings]);

    const handleTabClick = (tab: 'overview' | 'similarChannels') => {
        setActiveTab(tab);
    };

    if (isLoading) {
        return <ChannelDetailSkeleton />;
    }
    
    if (error) {
        return <div className="p-8 text-center text-red-400 bg-red-900/10 rounded-lg m-4 border border-red-900/20">
            <p className="text-lg font-semibold mb-2">오류 발생</p>
            <p className="mb-6">{error}</p>
            <button onClick={onBack} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white transition-colors">← 뒤로 가기</button>
        </div>;
    }
    
    if (!data) return null; // Should not happen given logic above

    const uploadFrequencyValue = data.overview.uploadPattern.last30Days > 0
        ? `${(30 / data.overview.uploadPattern.last30Days).toFixed(1)}일/1회`
        : '없음';
    const subConversionRateValue = data.totalViews > 0
        ? `${((data.subscriberCount / data.totalViews) * 100).toFixed(2)}%`
        : 'N/A';
    const subsPerVideoValue = data.totalVideos > 0
        ? `${(data.subscriberCount / data.totalVideos).toFixed(1)}명`
        : 'N/A';

    return (
        <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
            <button onClick={onBack} className="mb-4 px-4 py-2 text-sm font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              목록으로
            </button>
            
            <header className="flex flex-col sm:flex-row items-center gap-6 mb-8 bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50">
                <a href={`https://www.youtube.com/channel/${data.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 group relative">
                    <img src={data.thumbnailUrl} alt={data.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full ring-4 ring-gray-700 group-hover:ring-blue-500 transition-all" />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </div>
                </a>
                <div className="flex-grow text-center sm:text-left w-full">
                    <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2 mb-1">
                        <h1 className="text-3xl md:text-4xl font-bold text-white">{data.name}</h1>
                        <a href={`https://www.youtube.com/${data.handle}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">{data.handle}</a>
                    </div>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-2 text-sm text-gray-400 mb-4">
                        <span>개설일: {new Date(data.publishedAt).toLocaleDateString()}</span>
                        <span>총 영상: {formatNumber(data.totalVideos)}개</span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-4">
                        <div className="bg-gray-900/60 px-4 py-2 rounded-lg text-center min-w-[100px]">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">구독자</p>
                            <p className="text-xl font-bold text-white">{formatNumber(data.subscriberCount, true)}</p>
                        </div>
                         <div className="bg-gray-900/60 px-4 py-2 rounded-lg text-center min-w-[100px]">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">총 조회수</p>
                            <p className="text-xl font-bold text-white">{formatNumber(data.totalViews, true)}</p>
                        </div>
                    </div>
                </div>
            </header>
            
            <nav className="mb-6 border-b border-gray-700">
                <div className="flex space-x-6">
                    <button
                        onClick={() => handleTabClick('overview')}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors px-2 ${activeTab === 'overview' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        종합 분석
                    </button>
                    <button
                        onClick={() => handleTabClick('similarChannels')}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors px-2 ${activeTab === 'similarChannels' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        유사 채널 탐색
                    </button>
                </div>
            </nav>

            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard 
                        title="월 추정 수익 (현재)" 
                        value={`$${formatNumber(data.estimatedMonthlyRevenue, true)}`}
                        subValue={data.subscriberCount < 1000 ? "수익 창출 미달 가능성" : "최근 조회수 기반"}
                        highlight={true}
                    />
                    <StatCard 
                        title="총 누적 수익 (추산)" 
                        value={`$${formatNumber(data.estimatedTotalRevenue, true)}`}
                        subValue={data.subscriberCount < 1000 ? "수익 창출 미달 가능성" : "전체 누적 조회수 기반"}
                    />
                     <StatCard 
                        title="최근 30일 업로드" 
                        value={`${data.overview.uploadPattern.last30Days} 개`}
                        subValue={data.overview.uploadPattern.last30Days > 0 ? "활발히 활동 중" : "활동 저조"}
                    />
                     <StatCard 
                        title="평균 조회수 (롱폼)" 
                        value={formatNumber(data.performanceTrend.longFormStats.avgViews, true)} 
                        subValue="최근 30일 영상 기준"
                    />
                </div>

                {/* Channel Profile & Health */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <section className="lg:col-span-2 bg-gray-800 rounded-lg p-5 border border-gray-700">
                        <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-white">📢 채널 정보</h2>
                        
                        <div className="mb-4 bg-gray-900/50 p-4 rounded-lg">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">채널 설명</h4>
                            <div className={`text-sm text-gray-300 leading-relaxed whitespace-pre-line ${!showFullDesc && 'line-clamp-3'}`}>
                                {data.description}
                            </div>
                            {data.description.length > 150 && (
                                <button 
                                    onClick={() => setShowFullDesc(!showFullDesc)} 
                                    className="text-xs text-blue-400 hover:text-blue-300 mt-2 font-medium"
                                >
                                    {showFullDesc ? "접기" : "더보기"}
                                </button>
                            )}
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">채널 태그 (Keywords)</h4>
                            {data.channelKeywords.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {data.channelKeywords.map((keyword, i) => (
                                        <span key={i} className="px-2.5 py-1 bg-gray-700 text-gray-300 text-xs rounded-full border border-gray-600 hover:bg-gray-600 transition-colors cursor-default">
                                            #{keyword}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500">설정된 채널 키워드가 없습니다.</p>
                            )}
                        </div>
                    </section>

                    <section className="bg-gray-800 rounded-lg p-5 border border-gray-700 flex flex-col justify-between">
                        <h2 className="text-lg font-bold mb-4 text-white">🩺 채널 건강도 진단</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                                <span className="text-sm text-gray-400">업로드 빈도</span>
                                <span className="font-bold text-white">{uploadFrequencyValue}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                                <span className="text-sm text-gray-400">구독 전환율</span>
                                <span className="font-bold text-white">{subConversionRateValue}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">영상당 평균 구독자</span>
                                <span className="font-bold text-white">{subsPerVideoValue}</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <p className="text-xs text-gray-500 text-center">
                                * 구독 전환율이 1.5% 이상이면 매우 우수합니다.
                            </p>
                        </div>
                    </section>
                </div>

                <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">📈 최근 30일 성과 트렌드</h2>
                    <div className="bg-gray-800 p-4 rounded-lg h-80 border border-gray-700">
                        <PerformanceTrendChart data={data.performanceTrend.dailyTrends} />
                    </div>
                </section>
                
                <section>
                    <SurgingVideosSection surgingVideos={data.surgingVideos} onShowVideoDetail={onShowVideoDetail} />
                </section>
                
                <section className="grid grid-cols-1 gap-6">
                     <div>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">👥 AI 시청자 분석</h2>
                        <AudienceCharts profile={data.audienceProfile} totalViews={data.totalViews} />
                     </div>
                     <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 rounded-lg border border-gray-700 relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-4 opacity-10">
                             <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
                         </div>
                         <h4 className="font-bold text-lg mb-2 text-yellow-400 flex items-center gap-2">
                             <span className="text-xl">🤖</span> AI 요약 리포트
                         </h4>
                         <p className="text-sm text-gray-300 leading-relaxed relative z-10">{data.audienceProfile.summary}</p>
                     </div>
                </section>

                 <section>
                     <h2 className="text-xl font-bold mb-4">채널 주요 토픽 (최근 10개 영상)</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
                            <h3 className="font-semibold mb-4 text-gray-200 border-b border-gray-700 pb-2">🔥 인기 키워드 (빈도)</h3>
                             <ul className="space-y-3">
                                {data.overview.popularKeywords.map(({ keyword, score }) => (
                                  <li key={keyword} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-300 font-medium">{keyword}</span>
                                    <div className="flex items-center gap-2 w-1/2">
                                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full" style={{width: `${score}%`}}></div>
                                        </div>
                                        <span className="text-xs text-gray-500 w-8 text-right">{score}%</span>
                                    </div>
                                  </li>
                                ))}
                             </ul>
                        </div>
                         <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
                            <h3 className="font-semibold mb-4 text-gray-200 border-b border-gray-700 pb-2">🏷️ 주요 태그</h3>
                             <div className="flex flex-wrap gap-2">
                                {data.overview.competitiveness.tags.slice(0, 15).map(tag => (
                                    <span key={tag} className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-md border border-gray-600">
                                        {tag}
                                    </span>
                                ))}
                             </div>
                        </div>
                     </div>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4">최근 업로드 영상</h2>
                    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                        <div className="divide-y divide-gray-700">
                            {data.videoList.map(video => (
                                <VideoListItem key={video.id} video={video} onOpenCommentModal={onOpenCommentModal} onShowVideoDetail={onShowVideoDetail} />
                            ))}
                        </div>
                    </div>
                </section>
              </div>
            )}
            {activeTab === 'similarChannels' && (
                <SimilarChannelsTab channelId={channelId} user={user} appSettings={appSettings} onShowChannelDetail={onShowChannelDetail} />
            )}
        </div>
    );
};

export default ChannelDetailView;
