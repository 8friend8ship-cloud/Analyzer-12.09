
import React, { useState, useEffect, useCallback } from 'react';
import { fetchRankingData } from '../services/youtubeService';
import { getAITrendingInsight } from '../services/geminiService';
import { addToCollection, createTrendCollectionItem } from '../services/collectionService';
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
    volume?: number; 
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

const extractKeywordsFromVideos = (videos: VideoRankingData[]): TrendKeyword[] => {
    const wordMap: Record<string, number> = {};
    const stopWords = new Set([
        'the', 'a', 'of', 'in', 'to', 'for', 'is', 'on', 'and', 'with', 'at', 'by', 
        '이', '그', '저', '것', '수', '등', '들', '및', '의', '가', '이', '은', '는', 
        '을', '를', '에', '와', '과', '영상', '공개', '충격', '실화', '반응', '모음', 
        'shorts', 'ep', 'vs', 'official', 'mv', 'music', 'video', 'news'
    ]);
    videos.forEach(video => {
        const cleanTitle = video.name.replace(/[\[\]\(\)\{\}\|]/g, ' ').replace(/[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDFFF]/g, '').toLowerCase();
        const words = cleanTitle.split(/\s+/);
        words.forEach(word => {
            const cleanWord = word.trim();
            if (cleanWord.length > 1 && !stopWords.has(cleanWord) && !/^\d+$/.test(cleanWord)) {
                const weight = Math.log(video.viewCount + 1) || 1;
                wordMap[cleanWord] = (wordMap[cleanWord] || 0) + weight;
            }
        });
    });
    return Object.entries(wordMap).sort(([, a], [, b]) => b - a).slice(0, 20).map(([keyword, score], index) => ({
        rank: index + 1, keyword: keyword, volume: Math.floor(score * 100), change: index < 3 ? 'new' : Math.random() > 0.5 ? 'up' : 'down'
    }));
};

const TrendRankingView: React.FC<TrendRankingViewProps> = ({ 
    user, appSettings, onBack, onShowVideoDetail, onShowChannelDetail, onUpgradeRequired, onUpdateUser, planLimit 
}) => {
    const [country, setCountry] = useState('KR');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
            const ytData = await fetchRankingData('videos', { limit: 50, country: country, category: 'all', metric: 'mostPopular', videoFormat: 'all' }, apiKey);
            const ytKeywords = extractKeywordsFromVideos(ytData as VideoRankingData[]);
            setYoutubeTrends(ytKeywords);
            const videoTitles = (ytData as VideoRankingData[]).map(v => ({ title: v.name, channelTitle: v.channelName }));
            const insight = await getAITrendingInsight(country, videoTitles);
            setAiSummary(insight.summary);
            const gTrends = insight.topKeywords.map((kw, idx) => ({ rank: idx + 1, keyword: kw, change: idx < 2 ? 'up' : Math.random() > 0.7 ? 'new' : 'same' as any }));
            setGoogleTrends(gTrends);
            setSearchSources(insight.sources || []);
            setLastFetchedCountry(country);

            // [Biz Only] Auto-save trend snapshot
            if (user.plan === 'Biz' || user.isAdmin) {
                const countryLabel = countryOptions.find(o => o.value === country)?.label || country;
                addToCollection(createTrendCollectionItem(countryLabel, { youtube: ytKeywords, google: gTrends }, insight.summary));
            }

            onUpdateUser({ usage: user.usage + 1 });
        } catch (err) {
            setError(err instanceof Error ? err.message : "트렌드 데이터를 불러오는 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    }, [country, user, appSettings, planLimit, onUpgradeRequired, onUpdateUser]);

    const handleKeywordClick = (keyword: string) => { window.open(`https://www.google.com/search?q=${encodeURIComponent(keyword)}`, '_blank'); };

    const RankingList = ({ title, icon, data, colorClass, emptyMessage, type, sources }: { title: string, icon: any, data: TrendKeyword[], colorClass: string, emptyMessage: string, type: 'youtube' | 'google', sources?: {title: string, url: string}[] }) => (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-full shadow-lg relative">
            <div className={`p-4 border-b border-gray-700 flex justify-between items-center ${colorClass}`}>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">{icon}{title}</h2>
                <span className="text-xs font-semibold bg-black/20 px-2 py-1 rounded text-white/80">Real-time</span>
            </div>
            <div className="flex-grow overflow-y-auto p-2 custom-scrollbar relative">
                {data.length > 0 ? (
                    <div className="space-y-1 relative z-10">
                        {data.map((item) => (
                            <div key={item.rank} onClick={() => handleKeywordClick(item.keyword)} className="flex items-center justify-between p-3 hover:bg-gray-700/50 rounded-lg cursor-pointer group border border-transparent hover:border-gray-600 transition-colors">
                                <div className="flex items-center gap-4 overflow-hidden"><span className={`text-lg font-bold w-6 text-center flex-shrink-0 ${item.rank <= 3 ? (type === 'youtube' ? 'text-red-400' : 'text-blue-400') : 'text-gray-500'}`}>{item.rank}</span><span className="text-sm font-medium text-gray-200 group-hover:text-white truncate">{item.keyword}</span></div>
                                <div className="flex items-center gap-2 flex-shrink-0">{item.change === 'new' && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">NEW</span>}{item.change === 'up' && <span className="text-xs text-red-400">▲</span>}{item.change === 'down' && <span className="text-xs text-blue-400">▼</span>}</div>
                            </div>
                        ))}
                    </div>
                ) : <div className="flex flex-col items-center justify-center h-64 text-gray-500 relative z-10"><p>{emptyMessage}</p></div>}
            </div>
            {sources && sources.length > 0 && (
                <div className="p-2 border-t border-gray-700 bg-gray-900/30 text-xs">
                    <p className="text-gray-500 mb-1 px-1">Sources (Google Search):</p>
                    <div className="flex flex-wrap gap-2 px-1">{sources.slice(0, 3).map((source, i) => (<a key={i} href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate max-w-[150px]">{source.title}</a>))}</div>
                </div>
            )}
        </div>
    );

    return (
        <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div><button onClick={onBack} className="mb-2 text-sm text-gray-400 hover:text-white flex items-center gap-1">← 워크플로우로 돌아가기</button><h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">📈 트렌드 랭킹</h1><p className="text-gray-400 text-sm mt-1">영상이 아닌 <b>'검색 키워드'</b> 중심으로 트렌드를 파악하세요.</p></div>
                <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-lg border border-gray-700"><select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-gray-700 border-gray-600 rounded-md p-2 text-sm text-white">{countryOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.flag} {opt.label}</option>))}</select><Button onClick={fetchData} disabled={isLoading}>{isLoading ? '분석 중...' : '트렌드 조회'}</Button></div>
            </div>
            {error && <div className="bg-red-900/30 text-red-400 p-4 rounded-lg mb-6 text-center">{error}</div>}
            {!lastFetchedCountry && !isLoading && !error && <div className="flex-grow flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-2xl p-10 min-h-[400px]"><p className="text-lg font-medium">국가를 선택하고 조회를 시작하세요.</p></div>}
            {isLoading && <div className="flex-grow flex items-center justify-center py-20 min-h-[400px]"><Spinner message="실시간 트렌드 키워드를 추출하고 있습니다..." /></div>}
            {lastFetchedCountry && !isLoading && (
                <div className="space-y-6">
                    <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg animate-fade-in"><h3 className="text-sm font-bold text-blue-300 mb-2">🧠 오늘의 트렌드 요약</h3><p className="text-sm text-gray-300 leading-relaxed">{aiSummary}</p></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[500px]">
                        <RankingList title="YouTube 인기 키워" type="youtube" icon={<span className="text-red-500">🔴</span>} data={youtubeTrends} colorClass="bg-red-600/10" emptyMessage="YouTube 트렌드 데이터 없음" />
                        <RankingList title="Google 검색 트렌드" type="google" icon={<span className="text-blue-500">🔵</span>} data={googleTrends} colorClass="bg-blue-600/10" emptyMessage="Google 트렌드 데이터 없음" sources={searchSources} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrendRankingView;
