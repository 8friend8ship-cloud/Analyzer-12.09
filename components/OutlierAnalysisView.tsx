


import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { fetchYouTubeData, fetchRankingData } from '../services/youtubeService';
import { getAITrendingInsight, translateKeyword } from '../services/geminiService';
import type { User, AppSettings, VideoData, AnalysisMode, FilterState, OutlierViewState, VideoRankingData } from '../types';
import Spinner from './common/Spinner';
import Button from './common/Button';
import HelpTooltip from './common/HelpTooltip';

interface OutlierAnalysisViewProps {
  user: User;
  appSettings: AppSettings;
  onBack: () => void;
  onShowVideoDetail: (videoId: string) => void;
  onShowChannelDetail: (channelId: string) => void;
  onUpgradeRequired: () => void;
  onUpdateUser: (updatedUser: Partial<User>) => void;
  savedState: OutlierViewState | null;
  onSaveState: (state: OutlierViewState) => void;
}

interface OutlierStats {
  totalVideos: number;
  averageViews: number;
  outlierThreshold: number;
  outlierCount: number;
}

const countryOptions = [
    { label: "대한민국", value: "KR", flag: "🇰🇷" },
    { label: "미국", value: "US", flag: "🇺🇸" },
    { label: "일본", value: "JP", flag: "🇯🇵" },
    { label: "영국", value: "GB", flag: "🇬🇧" },
    { label: "인도", value: "IN", flag: "🇮🇳" },
    { label: "캐나다", value: "CA", flag: "🇨🇦" },
    { label: "호주", value: "AU", flag: "🇦🇺" },
    { label: "독일", value: "DE", flag: "🇩🇪" },
    { label: "프랑스", value: "FR", flag: "🇫🇷" },
    { label: "브라질", value: "BR", flag: "🇧🇷" },
    { label: "베트남", value: "VN", flag: "🇻🇳" },
    { label: "전세계", value: "WW", flag: "🌍" },
];

const EXCLUDABLE_CATEGORIES = [
    { id: '10', label: '음악' },
    { id: '1', label: '영화/애니/드라마' },
    { id: '20', label: '게임' },
];

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toLocaleString();
};

const OutlierVideoRow: React.FC<{ video: VideoData; averageViews: number; onShowVideoDetail: (id: string) => void; onShowChannelDetail: (id: string) => void }> = ({ video, averageViews, onShowVideoDetail, onShowChannelDetail }) => {
    return (
        <div className="grid grid-cols-12 items-center gap-4 px-4 py-3 hover:bg-gray-700/40">
            <div className="col-span-12 md:col-span-8 flex items-center gap-4">
                <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 group">
                    <img src={video.thumbnailUrl} alt={video.title} className="w-24 h-[54px] object-cover rounded-md flex-shrink-0 transition-transform group-hover:scale-105" />
                </a>
                <div className="min-w-0">
                    <button onClick={() => onShowVideoDetail(video.id)} className="font-semibold text-white line-clamp-2 text-sm text-left hover:text-blue-400">{video.title}</button>
                    <button onClick={() => onShowChannelDetail(video.channelId)} className="text-xs text-gray-400 hover:text-white">{video.channelTitle}</button>
                </div>
            </div>
            <div className="col-span-12 md:col-span-4 text-center">
                <p className="font-bold text-lg text-white">{formatNumber(video.viewCount)}</p>
                <p className="text-xs text-gray-400" title="조회수">Views</p>
            </div>
        </div>
    );
};


const OutlierAnalysisView: React.FC<OutlierAnalysisViewProps> = ({ user, appSettings, onBack, onShowVideoDetail, onShowChannelDetail, onUpgradeRequired, onUpdateUser, savedState, onSaveState }) => {
    const [query, setQuery] = useState(savedState?.query || '');
    const [mode, setMode] = useState<AnalysisMode>(savedState?.mode || 'keyword');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitial, setIsInitial] = useState(!savedState?.analysisResult && !savedState?.trendingData);
    
    const [analysisResult, setAnalysisResult] = useState<{ videos: VideoData[]; avgViews: number } | null>(savedState?.analysisResult || null);
    const [multiplier, setMultiplier] = useState(savedState?.multiplier || 5);

    const [trendingCountry, setTrendingCountry] = useState(savedState?.trendingCountry || 'KR');
    const [isTrendingLoading, setIsTrendingLoading] = useState(false);
    const [excludedCategories, setExcludedCategories] = useState<Set<string>>(
        savedState?.excludedCategories 
            ? new Set(savedState.excludedCategories) 
            : new Set()
    );
    const [trendingData, setTrendingData] = useState<{
        summary: string;
        viralFactors: string[];
        topKeywords: string[];
        topChannels: string[];
    } | null>(savedState?.trendingData || null);

    useEffect(() => {
        onSaveState({
            query,
            mode,
            analysisResult,
            trendingCountry,
            trendingData,
            excludedCategories: Array.from(excludedCategories),
            multiplier,
        });
    }, [query, mode, analysisResult, trendingCountry, trendingData, excludedCategories, multiplier, onSaveState]);


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

    const handleFetchTrending = useCallback(async () => {
        setIsTrendingLoading(true);
        setError(null);
        try {
            const apiKey = appSettings.apiKeys.youtube;
             if (!apiKey) throw new Error("YouTube API 키가 설정되지 않았습니다.");

             const trendingVideos = await fetchRankingData('videos', {
                 limit: 50,
                 country: trendingCountry,
                 category: 'all',
                 metric: 'mostPopular',
                 excludedCategories: excludedCategories
             }, apiKey);
             
             if (trendingVideos.length === 0) {
                 throw new Error("트렌드 데이터를 가져올 수 없습니다. 필터를 변경해보세요.");
             }

             const channelStats = new Map<string, { name: string, count: number, totalViews: number }>();
             
             trendingVideos.forEach(video => {
                const v = video as any;
                const channelName = v.channelName || 'Unknown';
                const viewCount = v.viewCount || 0;
                
                if (channelStats.has(channelName)) {
                    const stats = channelStats.get(channelName)!;
                    stats.count += 1;
                    stats.totalViews += viewCount;
                } else {
                    channelStats.set(channelName, { name: channelName, count: 1, totalViews: viewCount });
                }
             });

             const calculatedTopChannels = Array.from(channelStats.values())
                .sort((a, b) => {
                    if (b.count !== a.count) return b.count - a.count;
                    return b.totalViews - a.totalViews;
                })
                .slice(0, 10)
                .map(stat => stat.name);


             const videoTitles = trendingVideos.map(v => {
                const video = v as VideoData | VideoRankingData;
                return {
                    title: 'name' in video ? video.name : video.title,
                    channelTitle: ('channelName' in video ? video.channelName : video.channelTitle) || ''
                }
             });

             const excludedLabels = EXCLUDABLE_CATEGORIES
                .filter(cat => excludedCategories.has(cat.id))
                .map(cat => cat.label);

             const insight = await getAITrendingInsight(trendingCountry, videoTitles, excludedLabels, calculatedTopChannels);
             
             setTrendingData({
                 ...insight,
                 topChannels: calculatedTopChannels
             });

        } catch (err) {
             console.error(err);
             setError(err instanceof Error ? err.message : "트렌드 분석 중 오류가 발생했습니다.");
        } finally {
            setIsTrendingLoading(false);
        }
    }, [trendingCountry, appSettings, excludedCategories]);

    const handleKeywordClick = (keyword: string) => {
        setQuery(keyword);
        setMode('keyword');
    };

    const handleAnalysis = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        if (user.usage.outlierAnalysis.used >= user.usage.outlierAnalysis.limit) {
            onUpgradeRequired();
            return;
        }

        if (!query.trim()) {
            setError("분석할 키워드 또는 채널을 입력해주세요.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        setIsInitial(false);

        try {
            const apiKey = appSettings.apiKeys.youtube;
            if (!apiKey) throw new Error("YouTube API 키가 설정되지 않았습니다.");

            let searchQuery = query;
            if (mode === 'keyword' && trendingCountry !== 'KR' && trendingCountry !== 'WW') {
                if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(query)) {
                    try {
                        const translated = await translateKeyword(query, trendingCountry);
                        searchQuery = translated;
                    } catch (err) {
                        console.warn("Keyword translation failed, using original query.", err);
                    }
                }
            }

            const filters: FilterState = {
                resultsLimit: 100,
                sortBy: 'viewCount',
                period: '30',
                country: trendingCountry,
                minViews: 1000,
                videoLength: 'any',
                videoFormat: 'any',
                category: 'all',
            };

            const videoData = await fetchYouTubeData(mode, searchQuery, filters, apiKey);
            onUpdateUser({ 
                usage: {
                    ...user.usage,
                    outlierAnalysis: {
                        ...user.usage.outlierAnalysis,
                        used: user.usage.outlierAnalysis.used + 1,
                    }
                }
            });

            if (videoData.length === 0) {
                setAnalysisResult({ videos: [], avgViews: 0 });
                return;
            }
            
            const totalViews = videoData.reduce((sum, v) => sum + v.viewCount, 0);
            const averageViews = totalViews / videoData.length;
            
            setAnalysisResult({ videos: videoData, avgViews: averageViews });

        } catch (err) {
            setError(err instanceof Error ? err.message : "아웃라이어 분석 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    }, [user, appSettings, query, mode, onUpgradeRequired, onUpdateUser, trendingCountry]);

    const { outlierVideos, displayStats } = useMemo(() => {
        if (!analysisResult) {
            return { outlierVideos: [], displayStats: null };
        }
        const { videos, avgViews } = analysisResult;
        if (videos.length === 0) {
            const stats: OutlierStats = { totalVideos: 0, averageViews: 0, outlierThreshold: 0, outlierCount: 0 };
            return { outlierVideos: [], displayStats: stats };
        }

        const outlierThreshold = avgViews * multiplier;
        const filtered = videos.filter(v => v.viewCount >= outlierThreshold).sort((a, b) => b.viewCount - a.viewCount);

        const stats: OutlierStats = {
            totalVideos: videos.length,
            averageViews: avgViews,
            outlierThreshold,
            outlierCount: filtered.length,
        };

        return { outlierVideos: filtered, displayStats: stats };
    }, [analysisResult, multiplier]);

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <button onClick={onBack} className="mb-4 px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
                ← Back to Workflow
            </button>
            <header className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white">Outlier & Trend Analysis</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">Discover today's trends and analyze the patterns of 'outlier' videos that outperform the average.</p>
            </header>

            {/* Trend Discovery Section */}
            <div className="mb-10 bg-gray-800/40 border border-gray-700 rounded-xl p-6">
                 <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-2">
                         <span className="text-xl">🌍</span>
                         <h2 className="text-xl font-bold text-white">Today's Trend Discovery</h2>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        {/* Category Filters */}
                        <div className="flex items-center gap-3 bg-gray-700/50 px-3 py-1.5 rounded-md border border-gray-600/50">
                            <span className="text-xs font-semibold text-gray-400">Exclude:</span>
                            {EXCLUDABLE_CATEGORIES.map(cat => (
                                <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-300 hover:text-white select-none">
                                    <input
                                        type="checkbox"
                                        checked={excludedCategories.has(cat.id)}
                                        onChange={(e) => handleExcludeCategoryChange(cat.id, e.target.checked)}
                                        className="form-checkbox h-3.5 w-3.5 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    {cat.label}
                                </label>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <select 
                                value={trendingCountry} 
                                onChange={(e) => setTrendingCountry(e.target.value)}
                                className="bg-gray-700 border-gray-600 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                {countryOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.flag} {opt.label}</option>
                                ))}
                            </select>
                            <Button onClick={handleFetchTrending} disabled={isTrendingLoading} className="text-sm py-2 whitespace-nowrap">
                                {isTrendingLoading ? 'Analyzing...' : 'Analyze Trends'}
                            </Button>
                        </div>
                    </div>
                 </div>

                 {trendingData && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                         {/* AI Insight */}
                         <div className="lg:col-span-3 bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg mb-2">
                             <h3 className="font-bold text-blue-400 mb-2 flex items-center gap-2"><span className="text-xl">🔑</span> Key Factors (주요 동인)</h3>
                             <p className="text-gray-200 text-sm leading-relaxed mb-3">{trendingData.summary}</p>
                             <div className="flex flex-wrap gap-2 mb-3">
                                 {trendingData.viralFactors.map((factor, i) => (
                                     <span key={i} className="px-2 py-1 bg-blue-800/50 text-blue-200 text-xs rounded-full border border-blue-600/50">
                                         #{factor}
                                     </span>
                                 ))}
                             </div>
                             <p className="text-right text-xs text-gray-500">
                                Source: Analysis based on YouTube Data API & Google Trends
                            </p>
                         </div>

                         {/* Top Keywords */}
                         <div className="bg-gray-800/80 p-4 rounded-lg">
                             <h3 className="font-bold text-yellow-400 mb-3 flex items-center gap-2"><span className="text-lg">🔥</span> Top 10 Surging Keywords</h3>
                             <p className="text-xs text-gray-500 mb-3">Click to set keyword</p>
                             <div className="flex flex-wrap gap-2">
                                 {trendingData.topKeywords.map((kw, i) => (
                                     <button 
                                        key={i} 
                                        onClick={() => handleKeywordClick(kw)}
                                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors text-left"
                                     >
                                         <span className="text-yellow-500 font-bold mr-2">{i+1}.</span> {kw}
                                     </button>
                                 ))}
                             </div>
                         </div>

                          {/* Top Channels */}
                         <div className="bg-gray-800/80 p-4 rounded-lg lg:col-span-2">
                             <h3 className="font-bold text-green-400 mb-3 flex items-center gap-2"><span className="text-lg">📺</span> Top 10 Trend-Leading Channels <span className="text-xs font-normal text-gray-400 ml-2">(by trending share)</span></h3>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                 {trendingData.topChannels.map((ch, i) => (
                                     <div key={i} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                                         <span className="font-medium text-gray-200 truncate"><span className="text-green-500 font-bold mr-2">{i+1}.</span> {ch}</span>
                                         <button onClick={() => { setQuery(ch); setMode('channel'); }} className="text-xs text-blue-400 hover:underline flex-shrink-0 ml-2">Select</button>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     </div>
                 )}
                 {!trendingData && !isTrendingLoading && (
                     <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-700 rounded-lg">
                         <p className="mb-2 text-lg">Curious about what's trending in {countryOptions.find(c => c.value === trendingCountry)?.label} today?</p>
                         <p className="text-sm mb-4">You can analyze real trends by excluding major corporate content (music, movies, etc.).</p>
                         <p className="text-sm font-semibold text-blue-400 cursor-pointer" onClick={handleFetchTrending}>Click 'Analyze Trends' to begin.</p>
                     </div>
                 )}
                 {isTrendingLoading && (
                     <div className="py-10 flex justify-center"><Spinner message="Analyzing top videos to extract keywords..." /></div>
                 )}
            </div>


            {/* Outlier Analysis Form */}
            <form id="outlier-search-form" onSubmit={handleAnalysis} className="max-w-3xl mx-auto mb-8 flex flex-col sm:flex-row gap-2 bg-gray-900 p-4 rounded-lg relative border border-gray-700 shadow-lg">
                <div className="flex-shrink-0 grid grid-cols-2 gap-1 rounded-md bg-gray-700/50 p-1">
                    <button type="button" onClick={() => setMode('keyword')} className={`px-3 py-1.5 text-sm font-medium rounded ${mode === 'keyword' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Keyword</button>
                    <button type="button" onClick={() => setMode('channel')} className={`px-3 py-1.5 text-sm font-medium rounded ${mode === 'channel' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Channel</button>
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={mode === 'keyword' ? "Keyword (e.g., 'AI Art')" : "Channel URL or ID"}
                    className="flex-grow block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg p-3 placeholder-gray-400"
                />
                <Button type="submit" disabled={isLoading} className="px-6 py-3 text-sm flex-shrink-0">
                    {isLoading ? "Analyzing..." : "Deep Dive"}
                </Button>
            </form>

            {isLoading && <div className="flex justify-center items-center py-20"><Spinner /></div>}
            {error && <div className="text-center text-red-400 p-4 bg-red-900/50 rounded-lg max-w-2xl mx-auto">{error}</div>}
            
            {!isLoading && !error && (
                isInitial && !trendingData ? (
                    <div className="text-center py-10 text-gray-500">
                        <p>Discover trends above, or enter a keyword to start your analysis.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {displayStats && (
                             <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700/50 animate-fade-in">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div><p className="text-sm text-gray-400" title="총 분석 영상">Total Videos Analyzed</p><p className="text-2xl font-bold">{displayStats.totalVideos}</p></div>
                                    <div><p className="text-sm text-gray-400" title="평균 조회수">Average Views</p><p className="text-2xl font-bold">{formatNumber(displayStats.averageViews)}</p></div>
                                    <div><p className="text-sm text-gray-400 flex items-center justify-center" title="아웃라이어 기준">Outlier Threshold<HelpTooltip text="평균 조회수 × 설정된 배수. 이 값보다 높은 조회수를 기록한 영상이 '아웃라이어'로 간주됩니다.\n\n[For Reviewers]\nOutlier Threshold: Average Views × Multiplier. This is an internal calculation to identify high-performing videos relative to the average." /></p><p className="text-2xl font-bold text-blue-400">&gt; {formatNumber(displayStats.outlierThreshold)}</p></div>
                                    <div><p className="text-sm text-gray-400" title="발견된 아웃라이어">Outliers Found</p><p className="text-2xl font-bold text-green-400">{displayStats.outlierCount}</p></div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-700/50 flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <label htmlFor="multiplier" className="text-sm font-semibold text-gray-300">Outlier Multiplier: <span className="text-lg text-white font-bold">{multiplier}x</span></label>
                                    <input
                                        id="multiplier"
                                        type="range"
                                        min="2"
                                        max="20"
                                        step="1"
                                        value={multiplier}
                                        onChange={e => setMultiplier(parseInt(e.target.value, 10))}
                                        className="w-full max-w-xs h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                        )}

                        {outlierVideos.length > 0 && (
                            <div>
                                 <h2 className="text-xl font-bold mb-4">Outlier Video List</h2>
                                 <div className="bg-gray-800/60 rounded-lg border border-gray-700/50">
                                    <div className="hidden md:grid grid-cols-12 items-center gap-4 px-4 py-3 text-xs font-semibold text-gray-400 border-b border-gray-700/50">
                                        <div className="col-span-8">Video</div>
                                        <div className="col-span-4 text-center">Views</div>
                                    </div>
                                    <div className="divide-y divide-gray-700/50">
                                        {outlierVideos.map(video => (
                                            <OutlierVideoRow key={video.id} video={video} averageViews={displayStats?.averageViews || 0} onShowVideoDetail={onShowVideoDetail} onShowChannelDetail={onShowChannelDetail}/>
                                        ))}
                                    </div>
                                 </div>
                            </div>
                        )}
                         {displayStats && outlierVideos.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                <p>No outlier videos found with the current criteria.</p>
                                <p className="text-sm">Try lowering the multiplier or searching for a different keyword.</p>
                            </div>
                         )}
                    </div>
                )
            )}
        </div>
    );
};

export default OutlierAnalysisView;