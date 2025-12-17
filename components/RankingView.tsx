
import React, { useState, useEffect } from 'react';
import Spinner from './common/Spinner';
import { fetchRankingData } from '../services/youtubeService';
import type { User, AppSettings, ChannelRankingData, VideoRankingData, RankingViewState, RankingTabCache } from '../types';
import { YOUTUBE_CATEGORY_OPTIONS } from '../types';
import ComparisonModal from './ComparisonModal';

interface RankingViewProps {
    user: User;
    appSettings: AppSettings;
    onShowChannelDetail: (channelId: string) => void;
    onShowVideoDetail: (videoId: string) => void;
    savedState: RankingViewState | null;
    onSaveState: (state: RankingViewState) => void;
    onUpdateUser: (updatedUser: Partial<User>) => void;
    onUpgradeRequired: () => void;
    planLimit: number;
}

type ActiveTab = 'channels' | 'videos' | 'performance';

const countryOptions = [
    { label: "전세계", value: "WW" },
    { label: "대한민국", value: "KR" },
    { label: "미국", value: "US" },
    { label: "일본", value: "JP" },
    { label: "영국", value: "GB" },
    { label: "인도", value: "IN" },
    { label: "캐나다", value: "CA" },
    { label: "호주", value: "AU" },
    { label: "독일", value: "DE" },
    { label: "프랑스", value: "FR" },
    { label: "베트남", value: "VN" },
];

const EXCLUDABLE_CATEGORIES = [
    { id: '10', label: '음악' },
    { id: '1', label: '영화/애니' },
    { id: '20', label: '게임' },
];

// --- Utility Components ---

const PerformanceBadge: React.FC<{ ratio: number }> = ({ ratio }) => {
    if (!ratio || !isFinite(ratio)) return <span className="text-xs text-gray-500">-</span>;
    let color = 'bg-gray-600 text-gray-200';
    let icon = '';
    if (ratio >= 10) { color = 'bg-purple-600 text-white'; icon = '🚀'; }
    else if (ratio >= 5) { color = 'bg-red-600 text-white'; icon = '🔥'; }
    else if (ratio >= 2) { color = 'bg-blue-600 text-white'; icon = '💎'; }
    else if (ratio >= 1) { color = 'bg-green-600 text-white'; icon = '✅'; }
    return (
        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
            {icon} {ratio.toFixed(1)}x
        </div>
    );
};

const formatNumber = (num: number): string => {
    if (num === undefined || num === null) return '-';
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 10000) return `${(num / 1000).toFixed(0)}K`;
    return num.toLocaleString();
};

const RankingView: React.FC<RankingViewProps> = ({ 
    user, 
    appSettings, 
    onShowChannelDetail, 
    onShowVideoDetail, 
    savedState, 
    onSaveState,
    onUpdateUser,
    onUpgradeRequired,
    planLimit
}) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>(savedState?.activeTab || 'channels');
    const [results, setResults] = useState<(ChannelRankingData | VideoRankingData)[]>(savedState?.results || []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(!!savedState?.results.length);

    // Filters
    const [country, setCountry] = useState(savedState?.country || 'KR');
    const [category, setCategory] = useState(savedState?.category || 'all');
    const [excludedCategories, setExcludedCategories] = useState<Set<string>>(
        savedState?.excludedCategories ? new Set(savedState.excludedCategories) : new Set()
    );
    const [videoFormat, setVideoFormat] = useState<'all' | 'longform' | 'shorts'>(savedState?.videoFormat || 'all');
    
    // UI State
    const [selectedChannels, setSelectedChannels] = useState<Record<string, { name: string }>>(savedState?.selectedChannels || {});
    const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

    // Cache per tab
    const [tabCache, setTabCache] = useState<{
        channels?: RankingTabCache;
        videos?: RankingTabCache;
        performance?: RankingTabCache;
    }>(savedState?.tabCache || {});

    // Save State on Change
    useEffect(() => {
        onSaveState({
            activeTab,
            country,
            category,
            excludedCategories: Array.from(excludedCategories),
            videoFormat,
            results,
            selectedChannels,
            tabCache // Persist the cache
        });
    }, [activeTab, country, category, excludedCategories, videoFormat, results, selectedChannels, tabCache, onSaveState]);

    const handleSearchClick = async () => {
        // Usage Limit Check
        if (user.usage >= planLimit) {
            onUpgradeRequired();
            return;
        }

        // Current parameters snapshot
        const currentParams = {
            limit: 50,
            country,
            category,
            excludedCategories: Array.from(excludedCategories).sort(), // Sort for consistent comparison
            videoFormat,
            metric: 'mostPopular',
            tab: activeTab // Include tab in params to differentiate
        };

        // 1. Check for Duplicate Search (Prevent Credit Deduction)
        // If the parameters are exactly the same as the last successful search for this tab, skip API call.
        const cached = tabCache[activeTab];
        if (cached && JSON.stringify(cached.params) === JSON.stringify(currentParams)) {
            // Already have these results, just show them (even if they are already showing)
            // This prevents usage deduction on repeated clicks
            console.log("Duplicate search detected. Using cached results.");
            if (results !== cached.results) {
                setResults(cached.results);
            }
            return; 
        }

        // 2. Proceed with API Call
        setIsLoading(true);
        setError(null);
        setResults([]);
        setHasSearched(true);

        const apiKey = user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);
        
        if (!apiKey) {
            setError("YouTube API 키가 설정되지 않았습니다. 설정 페이지를 확인해주세요.");
            setIsLoading(false);
            return;
        }

        try {
            const apiFilters = { 
                limit: 50,
                country,
                category,
                excludedCategories: Array.from(excludedCategories),
                videoFormat,
                metric: 'mostPopular',
                skipCache: activeTab === 'performance' 
            };
            
            const fetchType = activeTab === 'channels' ? 'channels' : 'videos';
            const data = await fetchRankingData(fetchType, apiFilters, apiKey);

            let finalResults = data || [];

            if (activeTab === 'performance') {
                finalResults = (data as VideoRankingData[])
                    .filter(v => v.viewCount > 10000)
                    .sort((a, b) => {
                        const ratioA = a.viewCount / (a.channelSubscriberCount || 1);
                        const ratioB = b.viewCount / (b.channelSubscriberCount || 1);
                        return ratioB - ratioA;
                    });
            }
            
            setResults(finalResults);
            
            // Update Cache with new results and the exact params used
            setTabCache(prev => ({
                ...prev,
                [activeTab]: {
                    results: finalResults,
                    params: currentParams // Store params to compare later
                }
            }));
            
            // Deduct usage only on successful fresh fetch
            onUpdateUser({ usage: user.usage + 1 });

        } catch (err) {
            console.error("Ranking fetch error:", err);
            setError("데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTabChange = (tab: ActiveTab) => {
        if (tab === activeTab) return;
        setActiveTab(tab);
        setSelectedChannels({});

        // Restore from cache if available (Maintains state between tabs)
        if (tabCache[tab]) {
            setResults(tabCache[tab]!.results);
            setHasSearched(true);
            // We do NOT update the filter UI (Country/Category) to match the cache here,
            // to allow users to apply current filters to the new tab easily.
            // But the displayed results will match the *previous search* on that tab until they click 'Search' again.
        } else {
            setResults([]);
            setHasSearched(false);
        }
    };

    const handleCheckboxChange = (id: string, name: string, checked: boolean) => {
        setSelectedChannels(prev => {
            const next = { ...prev };
            if (checked) next[id] = { name };
            else delete next[id];
            return next;
        });
    };

    // Mobile Card Components
    const MobileChannelCard: React.FC<{ item: ChannelRankingData; rank: number }> = ({ item, rank }) => (
        <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700/50 w-full overflow-hidden">
            <div className="flex items-center gap-3 mb-3">
                <span className="text-lg font-bold text-gray-500 w-6 text-center flex-shrink-0">{rank}</span>
                <input 
                    type="checkbox" 
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                    checked={!!selectedChannels[item.id]}
                    onChange={e => handleCheckboxChange(item.id, item.name, e.target.checked)}
                />
                <button onClick={() => onShowChannelDetail(item.id)} className="flex items-center gap-3 flex-grow text-left min-w-0">
                    <img src={item.thumbnailUrl} alt="" className="w-10 h-10 rounded-full flex-shrink-0 object-cover" />
                    <div className="min-w-0 flex-grow">
                        <p className="font-semibold text-white truncate text-sm">{item.name}</p>
                        <p className="text-xs text-gray-400">구독자 {formatNumber(item.subscriberCount)}</p>
                    </div>
                </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-gray-700/50 pt-3">
                <div className="truncate">
                    <span className="text-gray-500 block mb-1">인기 조회수</span>
                    <span className="font-semibold text-white">{formatNumber(item.viewsInPeriod)}</span>
                </div>
                <div className="truncate">
                    <span className="text-gray-500 block mb-1">총 조회수</span>
                    <span className="font-semibold text-white">{formatNumber(item.viewCount)}</span>
                </div>
                <div className="truncate">
                    <span className="text-gray-500 block mb-1">월 수익</span>
                    <span className="font-semibold text-green-400">${formatNumber(item.estimatedMonthlyRevenue)}</span>
                </div>
            </div>
            <button 
                onClick={() => onShowChannelDetail(item.id)}
                className="w-full mt-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold rounded transition-colors"
            >
                채널 상세 분석
            </button>
        </div>
    );

    const MobileVideoCard: React.FC<{ item: VideoRankingData; rank: number }> = ({ item, rank }) => {
        const ratio = item.channelSubscriberCount > 0 ? item.viewCount / item.channelSubscriberCount : 0;
        return (
            <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700/50 w-full overflow-hidden">
                <div className="flex gap-3 mb-3">
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <span className="text-lg font-bold text-gray-500">{rank}</span>
                        <input 
                            type="checkbox" 
                            className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                            checked={!!selectedChannels[item.channelId]}
                            onChange={e => handleCheckboxChange(item.channelId, item.channelName, e.target.checked)}
                        />
                    </div>
                    <div className="flex-grow min-w-0">
                        <div className="relative mb-2 w-full aspect-video bg-black rounded overflow-hidden">
                            <a href={`https://www.youtube.com/watch?v=${item.id}`} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            </a>
                            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                                {Math.floor(item.durationSeconds / 60)}:{(item.durationSeconds % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                        <button onClick={() => onShowVideoDetail(item.id)} className="font-semibold text-white text-sm line-clamp-2 text-left mb-1 w-full hover:text-blue-400">
                            {item.name}
                        </button>
                        <div className="flex justify-between items-center text-xs">
                            <button onClick={() => onShowChannelDetail(item.channelId)} className="text-gray-400 truncate block text-left hover:text-white max-w-[120px]">
                                {item.channelName}
                            </button>
                            <span className="text-gray-500">구독 {formatNumber(item.channelSubscriberCount)}</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-gray-700/50 pt-3">
                    <div className="truncate">
                        <span className="text-gray-500 block mb-1">조회수</span>
                        <span className="font-semibold text-white">{formatNumber(item.viewCount)}</span>
                    </div>
                    <div className="truncate flex flex-col items-center">
                        <span className="text-gray-500 block mb-1">{activeTab === 'performance' ? '성과지표' : '예상수익'}</span>
                        {activeTab === 'performance' ? (
                            <PerformanceBadge ratio={ratio} />
                        ) : (
                            <span className="font-semibold text-green-400">${formatNumber(item.estimatedRevenue)}</span>
                        )}
                    </div>
                    <div className="truncate">
                        <span className="text-gray-500 block mb-1">VPH</span>
                        <span className="font-semibold text-blue-400">{formatNumber(item.viewsPerHour)}</span>
                    </div>
                </div>
                <div className="flex gap-2 mt-3">
                    <button onClick={() => onShowVideoDetail(item.id)} className="flex-1 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-xs font-semibold rounded transition-colors">
                        영상 분석
                    </button>
                    <button onClick={() => onShowChannelDetail(item.channelId)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded transition-colors">
                        채널 분석
                    </button>
                </div>
            </div>
        );
    };

    const renderResults = () => {
        if (isLoading) return <div className="py-20 flex justify-center"><Spinner message="데이터 분석 중..." /></div>;
        
        if (error) return (
            <div className="py-20 text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <button onClick={handleSearchClick} className="px-4 py-2 bg-gray-700 rounded text-sm hover:bg-gray-600">다시 시도</button>
            </div>
        );

        if (!hasSearched) return (
            <div className="py-20 text-center text-gray-500 border-2 border-dashed border-gray-700/50 rounded-lg">
                <p className="text-lg mb-2">👆 상단 필터를 확인하고 '순위 조회'를 눌러주세요.</p>
                <p className="text-sm">국가별, 카테고리별 실시간 랭킹을 확인할 수 있습니다.</p>
            </div>
        );

        if (results.length === 0) return (
            <div className="py-20 text-center text-gray-500">
                <p>조건에 맞는 결과가 없습니다.</p>
            </div>
        );

        return (
            <div>
                {/* Desktop View */}
                <div className="hidden md:block bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                                <tr>
                                    <th className="px-4 py-3 text-center w-16">순위</th>
                                    <th className="px-4 py-3">{activeTab === 'channels' ? '채널 정보' : '영상 정보'}</th>
                                    <th className="px-4 py-3 text-center">구독자</th>
                                    <th className="px-4 py-3 text-center">조회수</th>
                                    <th className="px-4 py-3 text-center">{activeTab === 'performance' ? '성과지표' : '추정 수익'}</th>
                                    <th className="px-4 py-3 text-center">분석</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {results.map((item, index) => {
                                    const rank = index + 1;
                                    
                                    if (activeTab === 'channels') {
                                        const ch = item as ChannelRankingData;
                                        return (
                                            <tr key={ch.id} className="hover:bg-gray-700/30 transition-colors">
                                                <td className="px-4 py-3 text-center font-bold text-gray-500">{rank}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                                                            checked={!!selectedChannels[ch.id]}
                                                            onChange={e => handleCheckboxChange(ch.id, ch.name, e.target.checked)}
                                                        />
                                                        <button onClick={() => onShowChannelDetail(ch.id)} className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
                                                            <img src={ch.thumbnailUrl} alt="" className="w-10 h-10 rounded-full" />
                                                            <div>
                                                                <div className="font-semibold text-white hover:text-blue-400 transition-colors">{ch.name}</div>
                                                                {/* Move view info to Views column for clarity */}
                                                            </div>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center font-medium">{formatNumber(ch.subscriberCount)}</td>
                                                <td className="px-4 py-3 text-center font-medium text-gray-300">{formatNumber(ch.viewCount)}</td>
                                                <td className="px-4 py-3 text-center text-green-400 font-medium">${formatNumber(ch.estimatedMonthlyRevenue)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => onShowChannelDetail(ch.id)} className="text-blue-400 hover:text-blue-300 text-xs border border-blue-500/30 px-2 py-1 rounded">상세</button>
                                                </td>
                                            </tr>
                                        );
                                    } else {
                                        const vd = item as VideoRankingData;
                                        const ratio = vd.channelSubscriberCount > 0 ? vd.viewCount / vd.channelSubscriberCount : 0;
                                        return (
                                            <tr key={vd.id} className="hover:bg-gray-700/30 transition-colors">
                                                <td className="px-4 py-3 text-center font-bold text-gray-500">{rank}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                                                            checked={!!selectedChannels[vd.channelId]}
                                                            onChange={e => handleCheckboxChange(vd.channelId, vd.channelName, e.target.checked)}
                                                        />
                                                        <a href={`https://www.youtube.com/watch?v=${vd.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 group">
                                                            <img src={vd.thumbnailUrl} alt="" className="w-16 h-9 object-cover rounded transition-transform group-hover:scale-105" />
                                                        </a>
                                                        <div className="min-w-0 max-w-xs">
                                                            <button onClick={() => onShowVideoDetail(vd.id)} className="font-semibold text-white truncate text-left hover:text-blue-400 transition-colors block w-full" title={vd.name}>{vd.name}</button>
                                                            <button onClick={() => onShowChannelDetail(vd.channelId)} className="text-xs text-gray-400 truncate hover:text-white block">{vd.channelName}</button>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center font-medium text-gray-400">{formatNumber(vd.channelSubscriberCount)}</td>
                                                <td className="px-4 py-3 text-center font-medium text-white">{formatNumber(vd.viewCount)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {activeTab === 'performance' ? (
                                                        <PerformanceBadge ratio={ratio} />
                                                    ) : (
                                                        <span className="text-green-400 font-medium">${formatNumber(vd.estimatedRevenue)}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={() => onShowVideoDetail(vd.id)} className="text-blue-400 hover:text-blue-300 text-xs border border-blue-500/30 px-2 py-1 rounded">영상</button>
                                                        <button onClick={() => onShowChannelDetail(vd.channelId)} className="text-gray-400 hover:text-white text-xs border border-gray-600 px-2 py-1 rounded">채널</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                    {results.map((item, index) => {
                        if (activeTab === 'channels') {
                            return <MobileChannelCard key={item.id} item={item as ChannelRankingData} rank={index + 1} />;
                        } else {
                            return <MobileVideoCard key={item.id} item={item as VideoRankingData} rank={index + 1} />;
                        }
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <header className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="text-3xl">🏆</span> 랭킹 & 트렌드
                    </h1>
                    <div className="flex bg-gray-800 p-1 rounded-lg">
                        {(['channels', 'videos', 'performance'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                {tab === 'channels' && '인기 채널'}
                                {tab === 'videos' && '인기 영상'}
                                {tab === 'performance' && '급성장 (조대전)'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-gray-800/60 p-4 rounded-xl border border-gray-700/50 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-400">국가</label>
                        <select 
                            value={country} 
                            onChange={e => setCountry(e.target.value)}
                            className="bg-gray-700 border-gray-600 rounded text-sm py-1.5 px-3 focus:ring-blue-500"
                        >
                            {countryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-400">카테고리</label>
                        <select 
                            value={category} 
                            onChange={e => setCategory(e.target.value)}
                            className="bg-gray-700 border-gray-600 rounded text-sm py-1.5 px-3 focus:ring-blue-500"
                        >
                            {YOUTUBE_CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    
                    <div className="h-6 w-px bg-gray-700 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">제외:</span>
                        {EXCLUDABLE_CATEGORIES.map(cat => (
                            <label key={cat.id} className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer hover:text-white">
                                <input 
                                    type="checkbox" 
                                    checked={excludedCategories.has(cat.id)}
                                    onChange={e => {
                                        const newSet = new Set(excludedCategories);
                                        if (e.target.checked) newSet.add(cat.id);
                                        else newSet.delete(cat.id);
                                        setExcludedCategories(newSet);
                                    }}
                                    className="rounded border-gray-600 bg-gray-700 text-blue-600"
                                />
                                {cat.label}
                            </label>
                        ))}
                    </div>

                    <div className="flex-grow"></div>

                    <button 
                        onClick={handleSearchClick}
                        disabled={isLoading}
                        className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? '조회 중...' : '순위 조회'}
                    </button>
                </div>
            </header>

            <main>
                <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-400">
                        {activeTab === 'performance' ? '💡 구독자 대비 조회수가 높은 "알고리즘 픽" 영상입니다.' : '💡 실시간 인기 데이터를 기준으로 정렬됩니다.'}
                    </p>
                    {Object.keys(selectedChannels).length > 1 && (
                        <button 
                            onClick={() => setIsComparisonModalOpen(true)}
                            className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                        >
                            선택한 채널 비교하기 ({Object.keys(selectedChannels).length})
                        </button>
                    )}
                </div>
                {renderResults()}
            </main>

            {isComparisonModalOpen && (
                <ComparisonModal 
                    user={user} 
                    appSettings={appSettings} 
                    initialSelectedChannels={selectedChannels} 
                    onClose={() => setIsComparisonModalOpen(false)} 
                />
            )}
        </div>
    );
};

export default RankingView;
