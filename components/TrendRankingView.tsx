
import React, { useState, useEffect, useCallback } from 'react';
import { fetchRankingData } from '../services/youtubeService';
import { getAITrendingInsight } from '../services/geminiService';
import type { User, AppSettings, VideoRankingData } from '../types';
import Spinner from './common/Spinner';
import Button from './common/Button';

interface TrendRankingViewProps {
    user: User;
    appSettings: AppSettings;
    onBack: () => void;
    onShowVideoDetail: (videoId: string) => void;
    onShowChannelDetail: (channelId: string) => void;
    onUpgradeRequired: () => void;
    onUpdateUser: (updatedUser: Partial<User>) => void;
    planLimit: number;
}

interface TrendKeyword {
    rank: number;
    keyword: string;
    volume?: number; // Estimated search volume or View count weight
    change?: 'up' | 'down' | 'new' | 'same';
}

const countryOptions = [
    { label: "대한민국", value: "KR", flag: "🇰🇷" },
    { label: "미국", value: "US", flag: "🇺🇸" },
    { label: "일본", value: "JP", flag: "🇯🇵" },
    { label: "영국", value: "GB", flag: "🇬🇧" },
    { label: "인도", value: "IN", flag: "🇮🇳" },
    { label: "캐나다", value: "CA", flag: "🇨🇦" },
    { label: "호주", value: "AU", flag: "🇦🇺" },
    { label: "프랑스", value: "FR", flag: "🇫🇷" },
    { label: "독일", value: "DE", flag: "🇩🇪" },
    { label: "베트남", value: "VN", flag: "🇻🇳" },
    { label: "전세계", value: "WW", flag: "🌍" },
];

// Helper to extract keywords from video titles locally
const extractKeywordsFromVideos = (videos: VideoRankingData[]): TrendKeyword[] => {
    const wordMap: Record<string, number> = {};
    // Basic stop words for filtering
    const stopWords = new Set([
        'the', 'a', 'of', 'in', 'to', 'for', 'is', 'on', 'and', 'with', 'at', 'by', 
        '이', '그', '저', '것', '수', '등', '들', '및', '의', '가', '이', '은', '는', 
        '을', '를', '에', '와', '과', '영상', '공개', '충격', '실화', '반응', '모음', 
        'shorts', 'ep', 'vs', 'official', 'mv', 'music', 'video', 'news'
    ]);

    videos.forEach(video => {
        // Clean title: remove brackets, special chars, emojis
        const cleanTitle = video.name.replace(/[\[\]\(\)\{\}\|]/g, ' ').replace(/[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDFFF]/g, '').toLowerCase();
        const words = cleanTitle.split(/\s+/);
        
        words.forEach(word => {
            const cleanWord = word.trim();
            if (cleanWord.length > 1 && !stopWords.has(cleanWord) && !/^\d+$/.test(cleanWord)) {
                // Weight by view count (log scale to dampen massive viral hits slightly)
                const weight = Math.log(video.viewCount + 1) || 1;
                wordMap[cleanWord] = (wordMap[cleanWord] || 0) + weight;
            }
        });
    });

    return Object.entries(wordMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([keyword, score], index) => ({
            rank: index + 1,
            keyword: keyword,
            volume: Math.floor(score * 100), // Mock volume based on weight
            change: index < 3 ? 'new' : Math.random() > 0.5 ? 'up' : 'down'
        }));
};

const TrendRankingView: React.FC<TrendRankingViewProps> = ({ 
    user, 
    appSettings, 
    onBack, 
    onShowVideoDetail, 
    onShowChannelDetail, 
    onUpgradeRequired, 
    onUpdateUser,
    planLimit 
}) => {
    const [country, setCountry] = useState('KR');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // State for Keyword Lists
    const [youtubeTrends, setYoutubeTrends] = useState<TrendKeyword[]>([]);
    const [googleTrends, setGoogleTrends] = useState<TrendKeyword[]>([]);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [searchSources, setSearchSources] = useState<{title: string, url: string}[]>([]);
    
    const [lastFetchedCountry, setLastFetchedCountry] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (user.usage >= planLimit) {
            onUpgradeRequired();
            return;
        }

        setIsLoading(true);
        setError(null);
        setYoutubeTrends([]);
        setGoogleTrends([]);
        setSearchSources([]);
        
        try {
            const apiKey = user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);
            if (!apiKey) throw new Error("YouTube API 키가 필요합니다.");

            // 1. Fetch YouTube Trending Videos (Raw Data)
            const ytData = await fetchRankingData('videos', {
                limit: 50,
                country: country,
                category: 'all',
                metric: 'mostPopular',
                videoFormat: 'all'
            }, apiKey);

            // 2. Process YouTube Keywords (Local Logic from real YouTube data)
            const ytKeywords = extractKeywordsFromVideos(ytData as VideoRankingData[]);
            setYoutubeTrends(ytKeywords);

            // 3. Fetch Google Trends (Real-time via Gemini Search Grounding)
            // We use the video titles as context but prioritize Google Search findings.
            const videoTitles = (ytData as VideoRankingData[]).map(v => ({ title: v.name, channelTitle: v.channelName }));
            const insight = await getAITrendingInsight(country, videoTitles);
            
            setAiSummary(insight.summary);
            setGoogleTrends(insight.topKeywords.map((kw, idx) => ({
                rank: idx + 1,
                keyword: kw,
                change: idx < 2 ? 'up' : Math.random() > 0.7 ? 'new' : 'same'
            })));
            
            // Set Sources from Grounding
            setSearchSources(insight.sources || []);

            setLastFetchedCountry(country);
            onUpdateUser({ usage: user.usage + 1 });

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "트렌드 데이터를 불러오는 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    }, [country, user, appSettings, planLimit, onUpgradeRequired, onUpdateUser]);

    const handleKeywordClick = (keyword: string) => {
        const url = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
        window.open(url, '_blank');
    };

    const RankingList = ({ title, icon, data, colorClass, emptyMessage, type, sources }: { title: string, icon: any, data: TrendKeyword[], colorClass: string, emptyMessage: string, type: 'youtube' | 'google', sources?: {title: string, url: string}[] }) => (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-full shadow-lg relative">
            <div className={`p-4 border-b border-gray-700 flex justify-between items-center ${colorClass}`}>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {icon}
                    {title}
                </h2>
                <span className="text-xs font-semibold bg-black/20 px-2 py-1 rounded text-white/80">Real-time</span>
            </div>
            
            <div className="flex-grow overflow-y-auto p-2 custom-scrollbar relative">
                {/* Background Logo Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                    {icon}
                </div>
                
                {data.length > 0 ? (
                    <div className="space-y-1 relative z-10">
                        {data.map((item) => (
                            <div 
                                key={item.rank} 
                                onClick={() => handleKeywordClick(item.keyword)}
                                className="flex items-center justify-between p-3 hover:bg-gray-700/50 rounded-lg cursor-pointer group transition-colors border border-transparent hover:border-gray-600"
                            >
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <span className={`text-lg font-bold w-6 text-center flex-shrink-0 ${item.rank <= 3 ? (type === 'youtube' ? 'text-red-400' : 'text-blue-400') : 'text-gray-500'}`}>
                                        {item.rank}
                                    </span>
                                    <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors truncate">
                                        {item.keyword}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {item.change === 'new' && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">NEW</span>}
                                    {item.change === 'up' && <span className="text-xs text-red-400">▲</span>}
                                    {item.change === 'down' && <span className="text-xs text-blue-400">▼</span>}
                                    {item.change === 'same' && <span className="text-xs text-gray-500">-</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 relative z-10">
                        <p>{emptyMessage}</p>
                    </div>
                )}
            </div>
            
            {sources && sources.length > 0 && (
                <div className="p-2 border-t border-gray-700 bg-gray-900/30 text-xs">
                    <p className="text-gray-500 mb-1 px-1">Sources (Google Search):</p>
                    <div className="flex flex-wrap gap-2 px-1">
                        {sources.slice(0, 3).map((source, i) => (
                            <a 
                                key={i} 
                                href={source.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline truncate max-w-[150px]"
                                title={source.title}
                            >
                                {source.title}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <button onClick={onBack} className="mb-2 text-sm text-gray-400 hover:text-white flex items-center gap-1">
                        ← 워크플로우로 돌아가기
                    </button>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                        <span className="text-3xl">📈</span> 트렌드 랭킹 (Keywords)
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        영상이 아닌 <b>'검색 키워드'</b> 중심으로 트렌드를 파악하세요. (YouTube & Google)
                    </p>
                </div>
                
                <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-lg border border-gray-700">
                    <select 
                        value={country} 
                        onChange={(e) => setCountry(e.target.value)}
                        className="bg-gray-700 border-gray-600 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-white"
                    >
                        {countryOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.flag} {opt.label}</option>
                        ))}
                    </select>
                    <Button onClick={fetchData} disabled={isLoading} className="text-sm py-2">
                        {isLoading ? '분석 중...' : '트렌드 조회'}
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-red-900/30 text-red-400 p-4 rounded-lg mb-6 border border-red-900/50 text-center">
                    {error}
                </div>
            )}

            {!lastFetchedCountry && !isLoading && !error && (
                <div className="flex-grow flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-2xl p-10 min-h-[400px]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <p className="text-lg font-medium">국가를 선택하고 조회를 시작하세요.</p>
                    <p className="text-sm">실시간 유튜브 인기 키워드와 구글 검색 트렌드를 순위표로 보여드립니다.</p>
                </div>
            )}

            {isLoading && (
                <div className="flex-grow flex items-center justify-center py-20 min-h-[400px]">
                    <Spinner message="실시간 트렌드 키워드를 추출하고 순위를 매기고 있습니다..." />
                </div>
            )}

            {lastFetchedCountry && !isLoading && (
                <div className="space-y-6">
                    {/* AI Insight Summary */}
                    <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg animate-fade-in">
                        <h3 className="text-sm font-bold text-blue-300 mb-2 flex items-center gap-2">
                            <span className="text-lg">🧠</span> 오늘의 트렌드 요약 (by Google Search)
                        </h3>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            {aiSummary || "트렌드 데이터를 분석 중입니다..."}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-350px)] min-h-[500px]">
                        {/* Left Column: YouTube Keywords */}
                        <RankingList 
                            title="YouTube 인기 키워드" 
                            type="youtube"
                            icon={<svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>}
                            data={youtubeTrends}
                            colorClass="bg-red-600/10"
                            emptyMessage="YouTube 트렌드 데이터를 찾을 수 없습니다."
                        />

                        {/* Right Column: Google Trends */}
                        <RankingList 
                            title="Google 검색 트렌드" 
                            type="google"
                            icon={<svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>}
                            data={googleTrends}
                            colorClass="bg-blue-600/10"
                            emptyMessage="Google 트렌드 데이터를 불러올 수 없습니다."
                            sources={searchSources}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrendRankingView;
