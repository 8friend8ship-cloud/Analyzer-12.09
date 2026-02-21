import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Spinner from './common/Spinner';
import { fetchRankingData } from '../services/youtubeService';
import type { User, AppSettings, ChannelRankingData, VideoRankingData, TopChartsViewState, VideoRankingMetric, ChannelRankingMetric } from '../types';
import { YOUTUBE_CATEGORY_OPTIONS, COUNTRY_FLAGS } from '../types';
import Button from './common/Button';
import HelpTooltip from './common/HelpTooltip';

interface TopChartsViewProps {
    user: User;
    appSettings: AppSettings;
    onShowChannelDetail: (channelId: string) => void;
    onShowVideoDetail: (videoId: string) => void;
    savedState: TopChartsViewState | null;
    onSaveState: (state: TopChartsViewState) => void;
}

type ActiveTab = 'channels' | 'videos' | 'performance';

const CosBadge = () => <sup className="text-[9px] font-bold text-blue-400 border border-blue-500/50 bg-blue-900/30 px-1 rounded-sm ml-1">COS</sup>;


const countryOptions = [
    { label: "전세계 (Global)", value: "WW" },
    { label: "대한민국 (Korea)", value: "KR" },
    { label: "미국 (USA)", value: "US" },
    { label: "일본 (Japan)", value: "JP" },
    { label: "영국 (UK)", value: "GB" },
    { label: "독일 (Germany)", value: "DE" },
    { label: "프랑스 (France)", value: "FR" },
    { label: "중국 (China)", value: "CN" },
    { label: "러시아 (Russia)", value: "RU" },
    { label: "캐나다 (Canada)", value: "CA" },
    { label: "호주 (Australia)", value: "AU" },
    { label: "베트남 (Vietnam)", value: "VN" },
    { label: "인도네시아 (Indonesia)", value: "ID" },
    { label: "태국 (Thailand)", value: "TH" },
    { label: "말레이시아 (Malaysia)", value: "MY" },
    { label: "싱가포르 (Singapore)", value: "SG" },
    { label: "필리핀 (Philippines)", value: "PH" },
    { label: "멕시코 (Mexico)", value: "MX" },
    { label: "브라질 (Brazil)", value: "BR" },
    { label: "인도 (India)", value: "IN" },
    { label: "대만 (Taiwan)", value: "TW" },
    { label: "홍콩 (Hong Kong)", value: "HK" },
];

const YOUTUBE_CATEGORIES_KR: { [key: string]: string } = {
    '1': '영화/애니메이션 (Film & Animation)', '2': '자동차/교통 (Autos & Vehicles)', '10': '음악 (Music)', '15': '애완동물/동물 (Pets & Animals)',
    '17': '스포츠 (Sports)', '19': '여행/이벤트 (Travel & Events)', '20': '게임 (Gaming)', '22': '인물/블로그 (People & Blogs)',
    '23': '코미디 (Comedy)', '24': '엔터테인먼트 (Entertainment)', '25': '뉴스/정치 (News & Politics)', '26': '노하우/스타일 (Howto & Style)',
    '27': '교육 (Education)', '28': '과학 기술 (Science & Technology)', '29': 'NGO/운동 (Nonprofits & Activism)',
};

const EXCLUDABLE_CATEGORIES = [
    { id: '10', label: '음악 (Music)' },
    { id: '1', label: '영화 (Film)' },
    { id: '20', label: '게임 (Gaming)' },
];

const videoRankingMetrics: { id: VideoRankingMetric, label: string }[] = [
    { id: 'daily', label: '일간 인기 동영상 (Daily)' },
    { id: 'weekly', label: '주간 인기 동영상 (Weekly)' },
    { id: 'monthly', label: '월간 인기 동영상 (Monthly)' },
];

const subsTrendMetrics: { id: ChannelRankingMetric, label: string }[] = [
    { id: 'subs_weekly', label: '주간 구독자 증감 (Weekly)' },
    { id: 'subs_monthly', label: '월간 구독자 증감 (Monthly)' },
];

const viewsTrendMetrics: { id: ChannelRankingMetric, label: string }[] = [
    { id: 'views_weekly', label: '주간 조회수 (Weekly)' },
    { id: 'views_monthly', label: '월간 조회수 (Monthly)' },
];

const totalRankMetrics: { id: ChannelRankingMetric, label: string }[] = [
    { id: 'subs_total', label: '총 구독자 수 (Total Subs)' },
    { id: 'views_total', label: '총 조회수 (Total Views)' },
];

const ShortsBadge: React.FC = () => (
    <span className="ml-2 px-1.5 py-0.5 rounded bg-red-600/80 text-white text-[10px] font-bold uppercase tracking-wider border border-red-500">
        Shorts
    </span>
);

const DurationBadge: React.FC<{ seconds: number }> = ({ seconds }) => {
    if (!seconds || isNaN(seconds)) return null;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeString = `${minutes}:${secs.toString().padStart(2, '0')}`;
    
    return (
        <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-white text-[10px] font-medium">
            {timeString}
        </div>
    );
};

const getGradeColor = (grade?: string) => {
    switch (grade) {
        case 'S': return 'bg-purple-600 text-purple-100 border-purple-400';
        case 'A': return 'bg-blue-600 text-blue-100 border-blue-400';
        case 'B': return 'bg-green-600 text-green-100 border-green-400';
        case 'C': return 'bg-yellow-600 text-yellow-100 border-yellow-400';
        case 'D': return 'bg-gray-600 text-gray-100 border-gray-400';
        default: return 'bg-gray-700 text-gray-300';
    }
};

const SparklineGraph: React.FC = () => {
    const points = [0, 0.05, 0.15, 0.4, 0.7, 0.85, 0.95, 0.98, 1];
    const width = 80;
    const height = 30;
    const pathData = points.map((p, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = height - (p * height);
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <path d={pathData} fill="none" stroke="#FF5757" strokeWidth="2" />
        </svg>
    );
};

const TopChartsView: React.FC<TopChartsViewProps> = ({ user, appSettings, onShowChannelDetail, onShowVideoDetail, savedState, onSaveState }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>(savedState?.activeTab || 'channels');
    const [results, setResults] = useState<(ChannelRankingData | VideoRankingData)[]>(savedState?.results || []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitial, setIsInitial] = useState(savedState?.results && savedState.results.length > 0 ? false : true);

    const [country, setCountry] = useState(savedState?.country || 'KR');
    const [category, setCategory] = useState(savedState?.category || 'all');
    const [limit] = useState(100);
    
    const [excludedCategories, setExcludedCategories] = useState<Set<string>>(
        savedState?.excludedCategories ? new Set(savedState.excludedCategories) : new Set()
    );
    const [videoFormat, setVideoFormat] = useState<'all' | 'longform' | 'shorts'>(savedState?.videoFormat || 'all');
    const [videoRankingMetric, setVideoRankingMetric] = useState<VideoRankingMetric>(savedState?.videoRankingMetric || 'weekly');
    const [channelRankingMetric, setChannelRankingMetric] = useState<ChannelRankingMetric>(savedState?.channelRankingMetric || 'subs_weekly');

    const lastUpdateTimestamp = useMemo(() => {
        const today = new Date();
        const lastSunday = new Date(today);
        lastSunday.setDate(today.getDate() - today.getDay());
        lastSunday.setHours(4, 0, 0, 0);

        if (today.getDay() === 0 && today.getHours() < 4) {
            lastSunday.setDate(lastSunday.getDate() - 7);
        }
        
        return lastSunday.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

    useEffect(() => {
        onSaveState({
            activeTab,
            country,
            category,
            excludedCategories: Array.from(excludedCategories),
            videoFormat,
            results,
            selectedChannels: {}, // Feature removed
            videoRankingMetric,
            channelRankingMetric
        });
    }, [activeTab, country, category, excludedCategories, videoFormat, results, videoRankingMetric, channelRankingMetric, onSaveState]);

    const handleExcludeCategoryChange = useCallback((categoryId: string, checked: boolean) => {
        setExcludedCategories(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(categoryId);
            } else {
                newSet.delete(categoryId);
            }
            return newSet;
        });
    }, []);
    
    const handleTabChange = (tab: ActiveTab) => {
        setResults([]);
        setActiveTab(tab);
        setVideoFormat('all');
        setIsInitial(true);
        setError(null);
    };

    const processPerformanceData = (rawData: VideoRankingData[]) => {
        if (!Array.isArray(rawData)) return [];
        return rawData
            .filter(video => 
                video && 
                typeof video.channelSubscriberCount === 'number' && 
                video.channelSubscriberCount >= 1000 && 
                typeof video.viewCount === 'number' &&
                video.viewCount >= 10000
            )
            .sort((a, b) => {
                const subA = a.channelSubscriberCount || 1;
                const subB = b.channelSubscriberCount || 1;
                const ratioA = a.viewCount / subA;
                const ratioB = b.viewCount / subB;
                return ratioB - ratioA;
            });
    };
    
    const handleSearch = useCallback(async () => {
        setIsInitial(false);
        setIsLoading(true);
        setError(null);
        setResults([]);

        const filters = { 
            limit: limit, 
            country, 
            category, 
            metric: activeTab === 'channels' ? channelRankingMetric : (activeTab === 'videos' ? videoRankingMetric : 'mostPopular'), 
            excludedCategories: Array.from(excludedCategories),
            videoFormat,
            skipCache: activeTab === 'performance'
        };
        
        const apiKey = appSettings.apiKeys.youtube;
        
        if (!apiKey) {
            setError("System API key is required.");
            setIsLoading(false);
            return;
        }

        try {
            const fetchType = activeTab === 'channels' ? 'channels' : 'videos';
            const data = await fetchRankingData(fetchType, filters, apiKey);
            
            if (activeTab === 'performance') {
                setResults(processPerformanceData(data as VideoRankingData[]));
            } else {
                setResults(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Failed to fetch ranking data:", err);
            setError(err instanceof Error ? err.message : "Failed to load ranking data.");
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, country, category, limit, appSettings, excludedCategories, videoFormat, videoRankingMetric, channelRankingMetric]);
    
    const formatNumber = (num?: number): string => {
        if (num === undefined || num === null || isNaN(num)) return '-';
        return num.toLocaleString();
    };
    
    const formatSubscribers = (num?: number): string => {
        if (num === undefined || num === null || isNaN(num)) return '-';
        if (num >= 10000) return `${(num / 10000).toFixed(1).replace('.0', '')}만`;
        return num.toLocaleString();
    }
    
    const renderResults = () => {
        if (isInitial) {
            return (
                <div className="text-center py-20 text-gray-500">
                    <p className="text-lg">Please set your desired conditions and press 'Search'.</p>
                    <p className="text-sm mt-2">You can select country, category, exclusion filters, and detailed metrics from the left menu.</p>
                </div>
            );
        }
        if (isLoading) return <div className="flex justify-center items-center pt-20"><Spinner message={activeTab === 'performance' ? "Analyzing performance..." : "Loading data..."} /></div>;
        if (error) return <div className="text-center text-red-400 p-4 bg-red-900/50 rounded-lg">{error}</div>;
        if (!results || results.length === 0) return <div className="text-center py-20 text-gray-500"><p>No results. Try changing filters.</p></div>;

        return (
             <div className="bg-gray-800/60 rounded-lg border border-gray-700/50">
                {activeTab === 'channels' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                                <tr>
                                    <th className="p-3">#</th>
                                    <th className="p-3 w-1/3">채널 상세 (Channel)</th>
                                    <th className="p-3 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            구독자 수 (Subs)
                                            <HelpTooltip text={"현재 채널의 총 구독자 수입니다.\n\n(Total number of subscribers for the channel.)"} />
                                        </div>
                                    </th>
                                    <th className="p-3 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            구독자 증감 (Growth)
                                            <HelpTooltip text={"선택된 기간(주간/월간) 동안 순수하게 증가한 구독자 수입니다.\n\n(The net increase in subscribers during the selected period (weekly/monthly).)"} />
                                        </div>
                                    </th>
                                    <th className="p-3">분석 (Analysis)</th>
                                    <th className="p-3">최신 영상 (Latest)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {results.map(item => {
                                    const channel = item as ChannelRankingData;
                                    
                                    return (
                                        <tr key={channel.id} className="hover:bg-gray-700/40">
                                            <td className="p-3 font-semibold text-gray-400">{channel.rank}</td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <img src={channel.thumbnailUrl} alt={channel.name} className="w-10 h-10 rounded-full" />
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-white truncate">{channel.name}</p>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {(channel.categoryTags || []).map(tag => <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-gray-700 text-gray-300 rounded">{tag}</span>)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-white font-semibold">{formatSubscribers(channel.subscriberCount)}</td>
                                            <td className="p-3 text-green-400 font-semibold">+{formatNumber(channel.newSubscribersInPeriod)}</td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => onShowChannelDetail(channel.id)} className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white w-24 text-center">
                                                    시청자 분석
                                                </button>
                                            </td>
                                            <td className="p-3">
                                                {channel.latestVideoThumbnailUrl && <img src={channel.latestVideoThumbnailUrl} className="w-24 h-auto rounded-md" alt="latest video"/>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {(activeTab === 'videos' || activeTab === 'performance') && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                           <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                                <tr>
                                    <th className="p-3 w-6">#</th>
                                    <th className="p-3" style={{width: activeTab === 'performance' ? '40%' : '50%'}}>제목 (Title)</th>
                                    <th className="p-3 text-center">업로드 일자 (Date)</th>
                                    <th className="p-3 text-center">조회수 (Views)</th>
                                    {activeTab === 'performance' && 
                                        <th className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                성과 배수 (Ratio)
                                                <HelpTooltip text={"이 값은 YouTube API 정책 준수를 위해 공개 데이터를 기반으로 단순 계산된 참고용 지표입니다.\n계산법: 영상 조회수 ÷ 채널 구독자 수\n\nThis is a reference metric simply calculated from public data to comply with YouTube API Policies.\nFormula: Video Views ÷ Channel Subscribers"} />
                                            </div>
                                        </th>
                                    }
                                    <th className="p-3 w-[20%]">채널 (Channel)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50 align-middle">
                                {results.map((item, index) => {
                                    const video = item as VideoRankingData;
                                    
                                    return (
                                        <tr key={video.id} className="hover:bg-gray-700/40">
                                            <td className="p-3 text-center font-semibold text-gray-400">{index + 1}</td>
                                            <td className="p-3">
                                                <div className="flex items-start gap-3">
                                                    <img src={video.thumbnailUrl} alt={video.name} className="w-24 h-auto rounded flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <button onClick={() => onShowVideoDetail(video.id)} className="font-semibold text-white line-clamp-2 text-sm text-left hover:text-blue-400">{video.name}</button>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {(video.tags || []).slice(0, 3).map(tag => <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-gray-700 text-gray-300 rounded">{tag}</span>)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center text-gray-300">{video.publishedDate.split('T')[0]}</td>
                                            <td className="p-3 text-center font-semibold text-white">{formatNumber(video.viewCount)}</td>
                                            {activeTab === 'performance' && 
                                                <td className="p-3 text-center font-bold text-purple-400 text-base">
                                                    {(video.channelSubscriberCount && video.viewCount && video.channelSubscriberCount > 0) ?
                                                        <>
                                                            {(video.viewCount / video.channelSubscriberCount).toFixed(1)}
                                                            <span className="text-xs font-normal">x</span>
                                                        </>
                                                        : '-'
                                                    }
                                                </td>
                                            }
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <img src={video.channelThumbnailUrl} alt={video.channelName} className="w-8 h-8 rounded-full" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-white truncate font-semibold">{video.channelName}</p>
                                                        <p className="text-xs text-gray-400">{formatSubscribers(video.channelSubscriberCount)}</p>
                                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                                            {(video.channelCategoryTags || []).slice(0,1).map(tag => <span key={tag} className="px-1 py-0.5 text-[9px] bg-gray-600 text-gray-300 rounded">{tag}</span>)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )
    }

    const countryLabel = countryOptions.find(c => c.value === country)?.label || country;
    const trendTooltipText = "동향 데이터는 Content OS가 API를 통해 얻은 값을 기반으로 한 단순 계산치입니다. 주간은 직전 주와의 증감이며, 월간은 28일 정책에 따라 폐기 전 데이터를 합산하여 계산합니다. 모든 데이터는 YouTube API 정책을 준수합니다.\n\n[For Reviewers]\nTrend data is a calculated value based on data obtained by Contents OS and is not directly from YouTube Analytics. It complies with YouTube API policies.";
    
    return (
        <div className="p-4 md:p-6 lg:p-8">
            <header className="mb-4">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                    <div className="flex items-center justify-center space-x-2">
                        <button onClick={() => handleTabChange('channels')} className={`px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors ${activeTab === 'channels' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Channels</button>
                        <button onClick={() => handleTabChange('videos')} className={`px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors ${activeTab === 'videos' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Videos</button>
                        <button onClick={() => handleTabChange('performance')} className={`px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors flex items-center gap-1 ${activeTab === 'performance' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Performance</button>
                    </div>
                    <div className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-md border border-gray-700">📅 Data Update: {lastUpdateTimestamp}</div>
                </div>
                <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                        <div className="flex items-center gap-2"><label htmlFor="country-ranking" className="text-sm font-semibold text-gray-400">Country:</label><span className="text-xl">{COUNTRY_FLAGS[country] || '🏳️'}</span><select id="country-ranking" value={country} onChange={e => setCountry(e.target.value)} className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5">{countryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
                        <div className="flex items-center gap-2"><label htmlFor="category-ranking" className="text-sm font-semibold text-gray-400">Category:</label><select id="category-ranking" value={category} onChange={e => setCategory(e.target.value)} className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5">{YOUTUBE_CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
                        <div className="flex items-center gap-3 border-l border-gray-700 pl-4"><span className="text-sm font-semibold text-gray-400">Exclusions:</span>{EXCLUDABLE_CATEGORIES.map(cat => (<label key={cat.id} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-300 hover:text-white select-none"><input type="checkbox" checked={excludedCategories.has(cat.id)} onChange={(e) => handleExcludeCategoryChange(cat.id, e.target.checked)} className="form-checkbox h-3.5 w-3.5 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500" />{cat.label}</label>))}</div>
                        <div className="flex items-center gap-2 border-l border-gray-700 pl-4">
                           <Button onClick={handleSearch} disabled={isLoading} className="text-sm py-2 px-6 whitespace-nowrap">
                               {isLoading ? 'Searching...' : 'Search'}
                           </Button>
                        </div>
                    </div>
                </div>
            </header>
            
            <div className="flex flex-col md:flex-row gap-6">
                {(activeTab === 'videos' || activeTab === 'channels') && (
                     <aside className="w-full md:w-64 flex-shrink-0 bg-gray-800/60 p-3 rounded-lg border border-gray-700/50 self-start">
                        {activeTab === 'videos' && (<>
                            <div className="flex justify-center gap-1 p-1 bg-gray-700/50 rounded-md mb-3">
                                <button onClick={() => setVideoFormat('all')} className={`flex-1 py-1 text-xs font-semibold rounded ${videoFormat === 'all' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>All</button>
                                <button onClick={() => setVideoFormat('longform')} className={`flex-1 py-1 text-xs font-semibold rounded ${videoFormat === 'longform' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Long</button>
                                <button onClick={() => setVideoFormat('shorts')} className={`flex-1 py-1 text-xs font-semibold rounded ${videoFormat === 'shorts' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Shorts</button>
                            </div>
                            <nav className="space-y-1">
                                {videoRankingMetrics.map(metric => (
                                    <button key={metric.id} onClick={() => setVideoRankingMetric(metric.id)} className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${videoRankingMetric === metric.id ? 'bg-gray-700 text-white font-semibold' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}>
                                        {metric.label}
                                    </button>
                                ))}
                            </nav>
                        </>)}
                         {activeTab === 'channels' && (
                            <nav>
                                <div className="mb-4">
                                    <h3 className="font-semibold text-gray-400 px-3 mb-2 text-sm flex items-center">
                                        Subscriber Trends
                                        <HelpTooltip text={trendTooltipText} />
                                    </h3>
                                    <div className="space-y-1">
                                        {subsTrendMetrics.map(metric => (
                                            <button key={metric.id} onClick={() => setChannelRankingMetric(metric.id)} className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${channelRankingMetric === metric.id ? 'bg-gray-700 text-white font-semibold' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}>
                                                {metric.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                 <div className="mb-4">
                                    <h3 className="font-semibold text-gray-400 px-3 mb-2 text-sm flex items-center">
                                        View Trends
                                         <HelpTooltip text={trendTooltipText} />
                                    </h3>
                                    <div className="space-y-1">
                                        {viewsTrendMetrics.map(metric => (
                                            <button key={metric.id} onClick={() => setChannelRankingMetric(metric.id)} className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${channelRankingMetric === metric.id ? 'bg-gray-700 text-white font-semibold' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}>
                                                {metric.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-400 px-3 mb-2 text-sm">Overall Rank</h3>
                                     <div className="space-y-1">
                                        {totalRankMetrics.map(metric => (
                                            <button key={metric.id} onClick={() => setChannelRankingMetric(metric.id)} className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${channelRankingMetric === metric.id ? 'bg-gray-700 text-white font-semibold' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}>
                                                {metric.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </nav>
                         )}
                    </aside>
                )}
                <main className="flex-grow min-w-0">
                    <div className="text-center">
                        <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                          {countryLabel} {activeTab === 'channels' && 'Top Channels'}{activeTab === 'videos' && 'Top Videos'}
                          {activeTab === 'performance' && 
                            <>
                                <span className="text-purple-400"> 성과 배수 (Performance Ratio)</span>
                                <HelpTooltip text={"이 값은 YouTube API 정책 준수를 위해 공개 데이터를 기반으로 단순 계산된 참고용 지표입니다.\n계산법: 영상 조회수 ÷ 채널 구독자 수\n\nThis is a reference metric simply calculated from public data to comply with YouTube API Policies.\nFormula: Video Views ÷ Channel Subscribers"} />
                            </>
                          }
                        </h2>
                        <p className="text-xs text-yellow-300 bg-yellow-900/30 p-3 rounded-md border border-yellow-500/30 mt-1 mb-2">
                            <strong>Note:</strong> This is NOT an official YouTube ranking. In compliance with YouTube API Policies, Content OS provides this statistical reference by analyzing recent data (up to 28 days) from the API using our own criteria.
                        </p>
                    </div>
                    {renderResults()}
                </main>
            </div>
        </div>
    );
};

export default TopChartsView;