import React, { useState, useEffect, useCallback } from 'react';
import { fetchChannelAnalysis, fetchSimilarChannels } from '../services/youtubeService';
import { addToCollection, createChannelCollectionItem } from '../services/collectionService';
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

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toISOString().split('T')[0];
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
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-3">
            <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 w-full md:w-40 group">
                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-auto md:h-[90px] object-cover rounded-md transition-transform group-hover:scale-105" />
            </a>
            <div className="flex-grow min-w-0">
                <button onClick={() => onShowVideoDetail(video.id)} className="font-semibold text-white hover:text-blue-400 transition-colors line-clamp-2 text-left">{video.title}</button>
                <p className="text-xs text-gray-400 mt-1">{new Date(video.publishedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-300">
                    <span title="조회수" className="flex items-center gap-1">👁️ {formatNumber(video.viewCount)}</span>
                    <span title="좋아요" className="flex items-center gap-1">👍 {formatNumber(video.likeCount)}</span>
                    <span title="댓글" className="flex items-center gap-1">💬 {formatNumber(video.commentCount)}</span>
                    <span title="시간당 조회수" className="flex items-center gap-1">🔥 {formatNumber(video.viewsPerHour)}</span>
                </div>
            </div>
            <button
                onClick={() => onShowVideoDetail(video.id)}
                className="w-full md:w-auto mt-2 md:mt-0 px-3 py-2 text-xs font-semibold rounded bg-gray-600 hover:bg-gray-500 text-white flex-shrink-0"
            >
                상세 분석
            </button>
        </div>
    );
};

const SurgingVideoCard: React.FC<{video: ChannelVideo, onShowVideoDetail: (id: string) => void}> = ({ video, onShowVideoDetail }) => (
    <div className="flex items-center gap-3">
        <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 group">
          <img src={video.thumbnailUrl} alt={video.title} className="w-20 h-[45px] object-cover rounded-md flex-shrink-0 transition-transform group-hover:scale-105" />
        </a>
        <div className="min-w-0">
            <button onClick={() => onShowVideoDetail(video.id)} className="text-xs font-semibold text-white line-clamp-2 text-left hover:text-blue-400">{video.title}</button>
            <p className="text-xs text-blue-400 font-bold">🔥 시간당 {formatNumber(video.viewsPerHour)}</p>
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
        <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">급상승 영상</h3>
                <div className="flex gap-1 bg-gray-900/50 p-1 rounded-md">
                    {(Object.keys(tabs) as Array<keyof typeof tabs>).map(tabKey => (
                         <button 
                            key={tabKey} 
                            onClick={() => setActiveTab(tabKey)}
                            className={`px-3 py-1 text-xs font-semibold rounded ${activeTab === tabKey ? 'bg-gray-600 text-white' : 'bg-transparent text-gray-400 hover:bg-gray-700'}`}
                         >
                            {tabs[tabKey].label}
                         </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                    <h4 className="font-semibold text-center mb-2 text-gray-400">롱폼</h4>
                    <div className="space-y-3">
                        {currentData.longform.length > 0 ? currentData.longform.map(v => <SurgingVideoCard key={v.id} video={v} onShowVideoDetail={onShowVideoDetail} />) : <p className="text-center text-xs text-gray-500 py-4">해당 영상 없음</p>}
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold text-center mb-2 text-gray-400">숏폼</h4>
                     <div className="space-y-3">
                        {currentData.shorts.length > 0 ? currentData.shorts.map(v => <SurgingVideoCard key={v.id} video={v} onShowVideoDetail={onShowVideoDetail} />) : <p className="text-center text-xs text-gray-500 py-4">해당 영상 없음</p>}
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
            setIsLoading(true);
            setError(null);
            const apiKey = appSettings.apiKeys.youtube;

            if (!apiKey) {
                setError("시스템 YouTube API 키가 설정되지 않았습니다. 관리자에게 문의해주세요.");
                setIsLoading(false);
                return;
            }

            try {
                const data = await fetchSimilarChannels(channelId, apiKey);
                setSimilarChannels(data);
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
                        <div key={channel.id} className="bg-gray-800/60 p-4 rounded-lg border border-gray-700/50 flex flex-col items-center text-center h-full">
                            <img src={channel.thumbnailUrl} alt={channel.name} className="w-20 h-20 rounded-full mb-3" />
                            <h3 className="font-bold text-white line-clamp-2">{channel.name}</h3>
                            <div className="text-sm text-gray-400 my-2">
                                <p>구독자: {channel.subscriberCount.toLocaleString()}</p>
                                <p>영상 수: {channel.videoCount.toLocaleString()}</p>
                            </div>
                            <p className="text-xs text-gray-300 flex-grow bg-gray-900/50 p-2 rounded-md w-full">"{channel.reason}"</p>
                            <button 
                                onClick={() => onShowChannelDetail(channel.id)}
                                className="mt-3 w-full px-3 py-2 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white"
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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'similarChannels'>(initialTab);
    const [showFullDesc, setShowFullDesc] = useState(false);
    
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            const apiKey = appSettings.apiKeys.youtube;

            if (!apiKey) {
                setError("시스템 API 키가 설정되지 않았습니다. 관리자에게 문의해주세요.");
                setIsLoading(false);
                return;
            }
            try {
                const result = await fetchChannelAnalysis(channelId, apiKey);
                setData(result);
                addToCollection(createChannelCollectionItem(result));
            } catch (err) {
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
        return <div className="p-8"><Spinner message="채널 정보를 불러오는 중입니다..." /></div>;
    }
    if (error) {
        return <div className="p-8 text-center text-red-400">
            <p>{error}</p>
            <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-600 rounded-md">← 뒤로 가기</button>
        </div>;
    }
    if (!data) {
        return <div className="p-8 text-center text-gray-500">
            <p>데이터가 없습니다.</p>
             <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-600 rounded-md">← 뒤로 가기</button>
        </div>;
    }

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
        <div className="p-4 md:p-6 lg:p-8">
            <button onClick={onBack} className="mb-4 px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
              ← 뒤로 가기
            </button>
            
            <header className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                <img src={data.thumbnailUrl} alt={data.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full ring-4 ring-gray-700" />
                <div className="flex-grow text-center sm:text-left">
                    <h1 className="text-3xl md:text-4xl font-bold">{data.name}</h1>
                    <p className="text-gray-400 mt-1">{data.handle} • {formatNumber(data.totalVideos)}개 영상</p>
                    <p className="text-xs text-gray-500 mt-1">개설일: {new Date(data.publishedAt).toLocaleDateString()}</p>
                    <div className="flex items-center justify-center sm:justify-start gap-6 mt-4">
                        <div>
                            <p className="text-sm text-gray-400">구독자</p>
                            <p className="text-2xl font-bold">{formatNumber(data.subscriberCount)}</p>
                        </div>
                         <div>
                            <p className="text-sm text-gray-400">총 조회수</p>
                            <p className="text-2xl font-bold">{formatNumber(data.totalViews)}</p>
                        </div>
                    </div>
                </div>
            </header>
            
            <nav className="mb-6 border-b border-gray-700">
                <div className="flex space-x-4">
                    <button
                        onClick={() => handleTabClick('overview')}
                        className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        개요
                    </button>
                    <button
                        onClick={() => handleTabClick('similarChannels')}
                        className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'similarChannels' ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        유사 채널
                    </button>
                </div>
            </nav>

            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                     <StatCard 
                        title="최근 30일 업로드" 
                        value={`${data.overview.uploadPattern.last30Days} 개`} 
                    />
                     <StatCard 
                        title="숏폼 평균 조회수" 
                        value={formatNumber(data.performanceTrend.shortsStats.avgViews, true)} 
                        subValue="숏폼 (최근 50개)"
                    />
                </div>

                {/* Channel Profile Section */}
                <section className="bg-gray-800 rounded-lg p-5 border border-gray-700">
                    <h2 className="text-xl font-bold mb-3 flex items-center gap-2">📢 채널 프로필</h2>
                    
                    <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-400 mb-1">채널 설명</h4>
                        <div className={`text-sm text-gray-300 leading-relaxed ${!showFullDesc && 'line-clamp-3'}`}>
                            {data.description}
                        </div>
                        {data.description.length > 150 && (
                            <button 
                                onClick={() => setShowFullDesc(!showFullDesc)} 
                                className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                            >
                                {showFullDesc ? "접기" : "더보기"}
                            </button>
                        )}
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">채널 설정 키워드 (Tags)</h4>
                        {data.channelKeywords.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {data.channelKeywords.map((keyword, i) => (
                                    <span key={i} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-md border border-gray-600">
                                        #{keyword}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500">설정된 채널 키워드가 없습니다.</p>
                        )}
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4">채널 건강도 진단</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard 
                            title="업로드 빈도" 
                            value={uploadFrequencyValue}
                            subValue="최근 30일 기준"
                        />
                        <StatCard 
                            title="조회수 대비 구독 전환율" 
                            value={subConversionRateValue}
                            subValue="채널 전체 기준"
                        />
                        <StatCard 
                            title="영상당 평균 구독자" 
                            value={subsPerVideoValue}
                            subValue="영상 1개당"
                        />
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4">최근 30일 성과 트렌드</h2>
                    <div className="bg-gray-800 p-4 rounded-lg h-96">
                        <PerformanceTrendChart data={data.performanceTrend.dailyTrends} />
                    </div>
                </section>
                
                <section>
                    <SurgingVideosSection surgingVideos={data.surgingVideos} onShowVideoDetail={onShowVideoDetail} />
                </section>
                
                <section>
                     <h2 className="text-2xl font-bold mb-4">AI 추정 시청자 프로필</h2>
                     <AudienceCharts profile={data.audienceProfile} totalViews={data.totalViews} />
                     <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                         <h4 className="font-semibold text-lg mb-2 text-yellow-400">AI 요약</h4>
                         <p className="text-sm text-gray-300">{data.audienceProfile.summary}</p>
                     </div>
                </section>

                 <section>
                     <h2 className="text-2xl font-bold mb-4">채널 주요 토픽 분석 (최근 50개 영상 기준)</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="font-semibold mb-3">인기 키워드 (AI 분석 비활성화)</h3>
                             <p className="text-sm text-gray-500">이 기능은 현재 비활성화되었습니다.</p>
                        </div>
                         <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="font-semibold mb-3">주요 태그/토픽 (AI 분석 비활성화)</h3>
                             <p className="text-sm text-gray-500">이 기능은 현재 비활성화되었습니다.</p>
                        </div>
                     </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4">최근 업로드 영상 (최대 50개)</h2>
                    <div className="bg-gray-800 rounded-lg border border-gray-700">
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