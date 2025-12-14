
import React, { useState, useEffect, useCallback } from 'react';
import Spinner from './common/Spinner';
import { fetchRankingData } from '../services/youtubeService';
import type { User, AppSettings, ChannelRankingData, VideoRankingData, RankingViewState } from '../types';
import { YOUTUBE_CATEGORY_OPTIONS, COUNTRY_FLAGS } from '../types';
import ComparisonModal from './ComparisonModal';

interface RankingViewProps {
    user: User;
    appSettings: AppSettings;
    onShowChannelDetail: (channelId: string) => void;
    onShowVideoDetail: (videoId: string) => void;
    savedState: RankingViewState | null;
    onSaveState: (state: RankingViewState) => void;
}

type ActiveTab = 'channels' | 'videos' | 'performance';

const countryOptions = [
    { label: "전세계", value: "WW" },
    { label: "대한민국", value: "KR" },
    { label: "뉴질랜드", value: "NZ" },
    { label: "대만", value: "TW" },
    { label: "독일", value: "DE" },
    { label: "러시아", value: "RU" },
    { label: "말레이시아", value: "MY" },
    { label: "멕시코", value: "MX" },
    { label: "미국", value: "US" },
    { label: "베트남", value: "VN" },
    { label: "브루나이", value: "BN" },
    { label: "싱가포르", value: "SG" },
    { label: "영국", value: "GB" },
    { label: "인도", value: "IN" },
    { label: "인도네시아", value: "ID" },
    { label: "일본", value: "JP" },
    { label: "중국", value: "CN" },
    { label: "칠레", value: "CL" },
    { label: "캐나다", value: "CA" },
    { label: "태국", value: "TH" },
    { label: "파푸아뉴기니", value: "PG" },
    { label: "페루", value: "PE" },
    { label: "프랑스", value: "FR" },
    { label: "필리핀", value: "PH" },
    { label: "호주", value: "AU" },
    { label: "홍콩", value: "HK" },
];

const YOUTUBE_CATEGORIES_KR: { [key: string]: string } = {
    '1': '영화/애니메이션', '2': '자동차/교통', '10': '음악', '15': '애완동물/동물',
    '17': '스포츠', '19': '여행/이벤트', '20': '게임', '22': '인물/블로그',
    '23': '코미디', '24': '엔터테인먼트', '25': '뉴스/정치', '26': '노하우/스타일',
    '27': '교육', '28': '과학 기술', '29': 'NGO/운동',
};

const EXCLUDABLE_CATEGORIES = [
    { id: '10', label: '음악' },
    { id: '1', label: '영화' },
    { id: '20', label: '게임' },
];

const RankChange: React.FC<{ change: number }> = ({ change }) => {
    // Safety check for undefined/null change
    if (change === undefined || change === null || change === 0) {
        return <span className="text-gray-500">-</span>;
    }
    const isUp = change > 0;
    return (
        <span className={`flex items-center justify-center font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(change)}
        </span>
    );
};

const PerformanceBadge: React.FC<{ ratio: number }> = ({ ratio }) => {
    // Robust safety check to prevent rendering crashes
    if (typeof ratio !== 'number' || isNaN(ratio) || !isFinite(ratio)) {
        return <span className="text-xs text-gray-500">-</span>;
    }

    let color = 'bg-gray-600 text-gray-200';
    let icon = '';
    
    if (ratio >= 10) {
        color = 'bg-purple-600 text-white border border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]';
        icon = '🚀';
    } else if (ratio >= 5) {
        color = 'bg-red-600 text-white border border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]';
        icon = '🔥';
    } else if (ratio >= 2) {
        color = 'bg-blue-600 text-white border border-blue-400';
        icon = '💎';
    } else if (ratio >= 1) {
        color = 'bg-green-600 text-white';
        icon = '✅';
    }

    return (
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${color}`}>
            {icon && <span className="mr-1">{icon}</span>}
            {ratio.toFixed(1)}x
        </div>
    );
};

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

const RankingView: React.FC<RankingViewProps> = ({ user, appSettings, onShowChannelDetail, onShowVideoDetail, savedState, onSaveState }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>(savedState?.activeTab || 'channels');
    const [results, setResults] = useState<(ChannelRankingData | VideoRankingData)[]>(savedState?.results || []);
    const [isLoading, setIsLoading] = useState(!savedState?.results.length);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    const [country, setCountry] = useState(savedState?.country || 'KR');
    const [category, setCategory] = useState(savedState?.category || 'all');
    const [limit] = useState(50);
    
    const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
    const [selectedChannels, setSelectedChannels] = useState<Record<string, { name: string }>>(savedState?.selectedChannels || {});
    
    const [excludedCategories, setExcludedCategories] = useState<Set<string>>(
        savedState?.excludedCategories ? new Set(savedState.excludedCategories) : new Set()
    );
    const [videoFormat, setVideoFormat] = useState<'all' | 'longform' | 'shorts'>(savedState?.videoFormat || 'all');

    useEffect(() => {
        onSaveState({
            activeTab,
            country,
            category,
            excludedCategories: Array.from(excludedCategories),
            videoFormat,
            results,
            selectedChannels
        });
    }, [activeTab, country, category, excludedCategories, videoFormat, results, selectedChannels, onSaveState]);

    const handleChannelSelect = useCallback((channel: { id: string, name: string }, isSelected: boolean) => {
        setSelectedChannels(prev => {
            const newSelection = { ...prev };
            if (isSelected) {
                newSelection[channel.id] = { name: channel.name };
            } else {
                delete newSelection[channel.id];
            }
            return newSelection;
        });
    }, []);
    
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

    const handleOpenCompareModal = () => {
        if (Object.keys(selectedChannels).length < 2) {
            alert('비교할 채널을 2개 이상 선택해주세요.');
            return;
        }
        setIsComparisonModalOpen(true);
    };
    const handleCloseCompareModal = () => setIsComparisonModalOpen(false);
    
    const handleTabChange = (tab: ActiveTab) => {
        setActiveTab(tab);
        setSelectedChannels({});
        setVideoFormat('all');
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

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            setResults([]); 

            const filters = { 
                limit: limit, 
                country, 
                category, 
                metric: 'mostPopular', 
                excludedCategories,
                videoFormat
            };
            
            const apiKey = user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);
            
            if (!apiKey) {
                setError(user.isAdmin ? "시스템 API 키가 필요합니다." : "관리자 대시보드에서 설정해주세요.");
                setIsLoading(false);
                return;
            }

            try {
                const fetchType = activeTab === 'channels' ? 'channels' : 'videos';
                const data = await fetchRankingData(fetchType, filters, apiKey);
                
                if (data && data.length > 0 && (data[0] as any)._meta) {
                    setLastUpdated((data[0] as any)._meta.lastUpdated);
                } else {
                    setLastUpdated(new Date().toLocaleString());
                }

                if (activeTab === 'performance') {
                    setResults(processPerformanceData(data as VideoRankingData[]));
                } else {
                    setResults(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error("Failed to fetch ranking data:", err);
                setError(err instanceof Error ? err.message : "랭킹 데이터를 불러오는데 실패했습니다.");
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

    }, [activeTab, country, category, limit, user, appSettings, excludedCategories, videoFormat]);
    
    const formatNumber = (num: number): string => {
        if (num === undefined || num === null || isNaN(num)) return '-';
        if (num >= 1000000000) return `${(num / 1000000000).toFixed(1).replace('.0', '')}B`;
        if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.0', '')}M`;
        if (num >= 10000) return `${(num / 1000).toFixed(0)}K`;
        return num.toLocaleString();
    };
    
    const renderResults = () => {
        if (isLoading) return <div className="flex justify-center items-center pt-20"><Spinner message="일일 마스터 데이터를 불러오는 중입니다..." /></div>;
        if (error) return <div className="text-center text-red-400 p-4 bg-red-900/50 rounded-lg">{error}</div>;
        if (!results || results.length === 0) return <div className="text-center py-20 text-gray-500"><p>결과가 없습니다. 필터를 변경해보세요.</p></div>;

        return (
            <div>
                {/* Desktop View */}
                <div className="hidden md:block bg-gray-800/60 rounded-lg border border-gray-700/50">
                    {activeTab === 'channels' && (
                        <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-gray-400 border-b border-gray-700/50">
                            <div className="col-span-1 text-center">순위</div>
                            <div className="col-span-8">채널</div>
                            <div className="col-span-1 text-center">인기 조회수</div>
                            <div className="col-span-1 text-center">구독자</div>
                            <div className="col-span-1 text-right">월 수익(추정)</div>
                        </div>
                    )}
                    {activeTab === 'videos' && (
                        <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-gray-400 border-b border-gray-700/50">
                            <div className="col-span-1 text-center">순위</div>
                            <div className="col-span-8">영상</div>
                            <div className="col-span-1 text-center">VPH</div>
                            <div className="col-span-1 text-center">조회수</div>
                            <div className="col-span-1 text-right">총 수익(누적)</div>
                        </div>
                    )}
                    {activeTab === 'performance' && (
                        <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-gray-400 border-b border-gray-700/50">
                            <div className="col-span-1 text-center">순위</div>
                            <div className="col-span-6">급성장 영상</div>
                            <div className="col-span-2 text-center">조대전 (성과 배율)</div>
                            <div className="col-span-1 text-center">조회수</div>
                            <div className="col-span-1 text-center">구독자</div>
                            <div className="col-span-1 text-right">상세 분석</div>
                        </div>
                    )}
                
                    <div className="divide-y divide-gray-700/50">
                        {results.map((item, index) => {
                            // Safety checks
                            if (!item) return null;

                            const isChannel = 'viewsInPeriod' in item;
                            const isPerformance = activeTab === 'performance';
                            const channelInfo = isChannel
                                ? { id: item.id, name: item.name }
                                : { id: (item as VideoRankingData).channelId, name: (item as VideoRankingData).channelName };
                            
                            const categoryName = item.categoryId ? YOUTUBE_CATEGORIES_KR[item.categoryId] : null;
                            const channelCountry = (item as ChannelRankingData | VideoRankingData).channelCountry;
                            
                            const displayRank = isPerformance ? index + 1 : item.rank;
                            
                            // Safe ratio calculation
                            let performanceRatio = 0;
                            if (!isChannel) {
                                const vData = item as VideoRankingData;
                                if (vData.channelSubscriberCount > 0) {
                                    performanceRatio = vData.viewCount / vData.channelSubscriberCount;
                                }
                            }
                            
                            const isShorts = !isChannel && (item as any).isShorts;
                            const durationSeconds = !isChannel ? (item as VideoRankingData).durationSeconds : 0;

                            return (
                                <div key={item.id} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-gray-700/40">
                                    <div className="col-span-1 text-lg font-bold text-gray-500 text-center flex items-center justify-center gap-2">
                                        <span>{displayRank}</span>
                                        {!isPerformance && <RankChange change={item.rankChange} />}
                                    </div>
                                    
                                    <div className={`${isPerformance ? 'col-span-6' : 'col-span-8'} flex items-center gap-3`}>
                                        <input
                                            type="checkbox"
                                            className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                            checked={!!selectedChannels[channelInfo.id]}
                                            onChange={(e) => handleChannelSelect(channelInfo, e.target.checked)}
                                            title="채널 비교 선택"
                                        />
                                        {isChannel ? (
                                            <button onClick={() => onShowChannelDetail(item.id)} className="flex items-center gap-3 text-left min-w-0">
                                                <img src={item.thumbnailUrl} alt={item.name} className="w-16 h-16 object-cover rounded-full flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-white truncate text-sm" title={item.name}>{item.name}</p>
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate">
                                                        {channelCountry && (
                                                            <span title={countryOptions.find(c => c.value === channelCountry)?.label || channelCountry}>
                                                                {COUNTRY_FLAGS[channelCountry] || channelCountry}
                                                            </span>
                                                        )}
                                                        <span>{item.name}</span>
                                                    </div>
                                                    {categoryName && <p className="text-xs font-semibold text-cyan-400 mt-1">#{categoryName}</p>}
                                                </div>
                                            </button>
                                        ) : (
                                            <>
                                                <a href={`https://www.youtube.com/watch?v=${item.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 group relative">
                                                    <div className="relative">
                                                        <img src={item.thumbnailUrl} alt={item.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0 transition-transform group-hover:scale-105" />
                                                        <DurationBadge seconds={durationSeconds} />
                                                    </div>
                                                </a>
                                                <div className="min-w-0">
                                                    <div className="flex items-center">
                                                        <button onClick={() => onShowVideoDetail(item.id)} className="font-semibold text-white truncate text-sm text-left hover:text-blue-400 transition-colors bg-transparent border-none p-0 cursor-pointer focus:outline-none" title={item.name}>{item.name}</button>
                                                        {isShorts && <ShortsBadge />}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate">
                                                        {channelCountry && (
                                                            <span title={countryOptions.find(c => c.value === channelCountry)?.label || channelCountry}>
                                                                {COUNTRY_FLAGS[channelCountry] || channelCountry}
                                                            </span>
                                                        )}
                                                        <button onClick={() => onShowChannelDetail((item as VideoRankingData).channelId)} className="hover:text-white transition-colors">{(item as VideoRankingData).channelName}</button>
                                                    </div>
                                                    {categoryName && <p className="text-xs font-semibold text-cyan-400 mt-1">#{categoryName}</p>}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                
                                    {isChannel ? (
                                        <>
                                            <div className="col-span-1 text-center font-semibold text-sm text-blue-400">
                                                {formatNumber((item as ChannelRankingData).viewsInPeriod)}
                                            </div>
                                            <div className="col-span-1 text-center font-semibold text-sm">{formatNumber((item as ChannelRankingData).subscriberCount)}</div>
                                            <div className="col-span-1 text-right font-semibold text-green-400 text-sm">${formatNumber((item as ChannelRankingData).estimatedMonthlyRevenue)}</div>
                                        </>
                                    ) : isPerformance ? (
                                        <>
                                            <div className="col-span-2 text-center">
                                                <PerformanceBadge ratio={performanceRatio} />
                                            </div>
                                            <div className="col-span-1 text-center font-semibold text-sm text-gray-300">{formatNumber((item as VideoRankingData).viewCount)}</div>
                                            <div className="col-span-1 text-center font-semibold text-sm text-gray-400">{formatNumber((item as VideoRankingData).channelSubscriberCount)}</div>
                                            <div className="col-span-1 text-right">
                                                 <button onClick={() => onShowVideoDetail(item.id)} className="text-xs text-blue-400 hover:text-blue-300 font-semibold">분석</button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="col-span-1 text-center font-bold text-sm text-blue-400">{formatNumber((item as VideoRankingData).viewsPerHour)}</div>
                                            <div className="col-span-1 text-center font-semibold text-sm">{formatNumber((item as VideoRankingData).viewCount)}</div>
                                            <div className="col-span-1 text-right font-semibold text-green-400 text-sm">${formatNumber((item as VideoRankingData).estimatedRevenue)}</div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                    {results.map((item, index) => {
                        if (!item) return null;
                        const isChannel = 'subscriberCount' in item;
                        const isPerformance = activeTab === 'performance';
                        const channelInfo = isChannel ? { id: item.id, name: item.name } : { id: (item as VideoRankingData).channelId, name: (item as VideoRankingData).channelName };
                        const categoryName = item.categoryId ? YOUTUBE_CATEGORIES_KR[item.categoryId] : null;
                        const channelCountry = (item as ChannelRankingData | VideoRankingData).channelCountry;
                        const displayRank = isPerformance ? index + 1 : item.rank;
                        
                        let performanceRatio = 0;
                        if (!isChannel) {
                            const vData = item as VideoRankingData;
                            if (vData.channelSubscriberCount > 0) {
                                performanceRatio = vData.viewCount / vData.channelSubscriberCount;
                            }
                        }

                        const isShorts = !isChannel && (item as any).isShorts;
                        const durationSeconds = !isChannel ? (item as VideoRankingData).durationSeconds : 0;
                        
                        return (
                            <div key={item.id} className="bg-gray-800/80 rounded-lg p-3 border border-gray-700/50">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex items-center pt-1 gap-2">
                                        <div className="flex flex-col items-center">
                                            <span className="text-lg font-bold text-gray-500">{displayRank}</span>
                                            {!isPerformance && <RankChange change={item.rankChange} />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                            checked={!!selectedChannels[channelInfo.id]}
                                            onChange={(e) => handleChannelSelect(channelInfo, e.target.checked)}
                                            title="채널 비교 선택"
                                        />
                                    </div>
                                    
                                    {isChannel ? (
                                        <img src={item.thumbnailUrl} alt={item.name} className="w-12 h-12 object-cover rounded-full flex-shrink-0" />
                                    ) : (
                                        <div className="relative flex-shrink-0">
                                            <img src={item.thumbnailUrl} alt={item.name} className="w-20 h-auto object-cover rounded-md" />
                                            <DurationBadge seconds={durationSeconds} />
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-grow">
                                        <div className="flex items-center">
                                            <p className="font-semibold text-white truncate text-sm" title={item.name}>{item.name}</p>
                                            {isShorts && <ShortsBadge />}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate">
                                            {channelCountry && (
                                                <span title={countryOptions.find(c => c.value === channelCountry)?.label || channelCountry}>
                                                    {COUNTRY_FLAGS[channelCountry] || channelCountry}
                                                </span>
                                            )}
                                            <span>{!isChannel && (item as VideoRankingData).channelName}</span>
                                        </div>
                                        {categoryName && <p className="text-xs font-semibold text-cyan-400 mt-1">#{categoryName}</p>}
                                        {isPerformance && <div className="mt-1"><PerformanceBadge ratio={performanceRatio} /></div>}
                                    </div>
                                </div>

                                {isChannel ? (
                                    <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-700/50 pt-3">
                                        <div><p className="text-xs text-gray-400">인기 조회수</p><p className="font-semibold text-blue-400">{formatNumber((item as ChannelRankingData).viewsInPeriod)}</p></div>
                                        <div><p className="text-xs text-gray-400">구독자</p><p className="font-semibold">{formatNumber((item as ChannelRankingData).subscriberCount)}</p></div>
                                        <div><p className="text-xs text-gray-400">월 수익(추정)</p><p className="font-semibold text-green-400">${formatNumber((item as ChannelRankingData).estimatedMonthlyRevenue)}</p></div>
                                    </div>
                                ) : (
                                     <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-700/50 pt-3">
                                        <div><p className="text-xs text-gray-400">{isPerformance ? '구독자' : 'VPH'}</p><p className="font-semibold text-blue-400">{formatNumber(isPerformance ? (item as VideoRankingData).channelSubscriberCount : (item as VideoRankingData).viewsPerHour)}</p></div>
                                        <div><p className="text-xs text-gray-400">조회수</p><p className="font-semibold">{formatNumber((item as VideoRankingData).viewCount)}</p></div>
                                        <div><p className="text-xs text-gray-400">총 수익</p><p className="font-semibold text-green-400">${formatNumber((item as VideoRankingData).estimatedRevenue)}</p></div>
                                    </div>
                                )}
                                <div className="mt-3 flex gap-2">
                                     {isChannel ? (
                                        <button onClick={() => onShowChannelDetail(item.id)} className="w-full text-center px-3 py-2 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white">채널 분석</button>
                                     ) : (
                                        <>
                                            <button onClick={() => onShowVideoDetail(item.id)} className="flex-1 text-center px-3 py-2 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white">상세 분석</button>
                                            <a href={`https://www.youtube.com/watch?v=${item.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-center px-3 py-2 text-xs font-semibold rounded bg-gray-600 hover:bg-gray-500 text-white">영상 보기</a>
                                        </>
                                     )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }
    
    let explanation = "";
    if (activeTab === 'channels') {
        explanation = "구독자 수 기준 '기초 순위'와 현재 인기도 기반 '조회수 순위'를 비교하여 순위 변동을 보여줍니다.";
    } else if (activeTab === 'videos') {
        explanation = "영상의 '누적 조회수 순위'와 현재 화제성을 나타내는 '시간당 조회수 순위'를 비교하여 순위 변동을 보여줍니다.";
    } else if (activeTab === 'performance') {
        explanation = "'조회수 / 구독자 수' 비율이 높은 순서대로 정렬합니다. 내 채널 규모보다 훨씬 높은 성과를 낸 '알고리즘 픽' 영상을 찾아보세요.";
    }
    
    const countryLabel = countryOptions.find(c => c.value === country)?.label || country;

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <header className="mb-4">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                    <div className="flex items-center justify-center space-x-2">
                        <button 
                            onClick={() => handleTabChange('channels')}
                            className={`px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors ${activeTab === 'channels' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        >
                            인기 채널
                        </button>
                        <button 
                            onClick={() => handleTabChange('videos')}
                            className={`px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors ${activeTab === 'videos' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        >
                            인기 영상
                        </button>
                        <button 
                            onClick={() => handleTabChange('performance')}
                            className={`px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors flex items-center gap-1 ${activeTab === 'performance' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        >
                            <span className="hidden sm:inline">🚀</span> 급성장 (조대전)
                        </button>
                    </div>
                    <div className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-md border border-gray-700">
                        📅 데이터 기준: {lastUpdated || '불러오는 중...'} (일일 스냅샷)
                    </div>
                </div>
                
                <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                        <div className="flex items-center gap-2">
                            <label htmlFor="country-ranking" className="text-sm font-semibold text-gray-400">국가:</label>
                            <span className="text-xl">{COUNTRY_FLAGS[country] || '🏳️'}</span>
                            <select
                                id="country-ranking"
                                value={country}
                                onChange={e => setCountry(e.target.value)}
                                className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5"
                            >
                                {countryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="category-ranking" className="text-sm font-semibold text-gray-400">카테고리:</label>
                            <select
                                id="category-ranking"
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5"
                            >
                                {YOUTUBE_CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                         <div className="flex items-center gap-3 border-l border-gray-700 pl-4">
                            <span className="text-sm font-semibold text-gray-400">카테고리 제외 필터:</span>
                            {EXCLUDABLE_CATEGORIES.map(cat => (
                                <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-300 hover:text-white">
                                    <input
                                        type="checkbox"
                                        checked={excludedCategories.has(cat.id)}
                                        onChange={(e) => handleExcludeCategoryChange(cat.id, e.target.checked)}
                                        className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    {cat.label}
                                </label>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-400">종류:</span>
                            <div className="flex items-center gap-1 bg-gray-700/50 p-1 rounded-md">
                                <button
                                    onClick={() => setVideoFormat('all')}
                                    className={`px-3 py-1 text-xs font-semibold rounded ${videoFormat === 'all' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                                >
                                    전체
                                </button>
                                <button
                                    onClick={() => setVideoFormat('longform')}
                                    className={`px-3 py-1 text-xs font-semibold rounded ${videoFormat === 'longform' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                                >
                                    3분 초과 (Long)
                                </button>
                                <button
                                    onClick={() => setVideoFormat('shorts')}
                                    className={`px-3 py-1 text-xs font-semibold rounded ${videoFormat === 'shorts' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                                >
                                    3분 이하 (Shorts)
                                </button>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleOpenCompareModal}
                            disabled={Object.keys(selectedChannels).length < 2}
                            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed relative"
                        >
                            채널 비교
                            {Object.keys(selectedChannels).length > 0 && (
                                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{Object.keys(selectedChannels).length}</span>
                            )}
                        </button>
                    </div>
                </div>
            </header>
            
            <div className="">
                <div className="flex justify-between items-center mb-2 px-1">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {countryLabel} 실시간 
                        {activeTab === 'channels' && ' 인기 채널 순위'}
                        {activeTab === 'videos' && ' 인기 영상 순위'}
                        {activeTab === 'performance' && <span className="text-purple-400"> 조대전(급성장) 랭킹</span>}
                    </h2>
                    <p className="text-xs text-gray-500 hidden sm:block">{explanation}</p>
                </div>
                {renderResults()}
            </div>
            {isComparisonModalOpen && (
                <ComparisonModal
                    user={user}
                    appSettings={appSettings}
                    onClose={handleCloseCompareModal}
                    initialSelectedChannels={selectedChannels}
                />
            )}
        </div>
    );
};

export default RankingView;
