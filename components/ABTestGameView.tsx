import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchYouTubeData } from '../services/youtubeService';
import type { User, AppSettings, VideoData, FilterState, GameScore } from '../types';
import Spinner from './common/Spinner';
import Button from './common/Button';

const TOTAL_ROUNDS = 20;
const ROUND_TIME = 10;
const RESULT_DELAY = 3000; // 3 seconds
const LEADERBOARD_KEY = 'abTestGameLeaderboard';
const LEADERBOARD_SIZE = 10;

const gameFilters: FilterState = {
  minViews: 1000, videoLength: 'any', videoFormat: 'any',
  period: 'any', sortBy: 'viewCount', resultsLimit: 100,
  country: 'KR', category: 'all',
};

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toLocaleString();
};

interface ABTestGameViewProps {
  user: User;
  appSettings: AppSettings;
  onBack: () => void;
}

const ABTestGameView: React.FC<ABTestGameViewProps> = ({ user, appSettings, onBack }) => {
    const [gameState, setGameState] = useState<'welcome' | 'fetching' | 'playing' | 'result' | 'end'>('welcome');
    const [keyword, setKeyword] = useState('캠핑');
    const [videoPool, setVideoPool] = useState<VideoData[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [round, setRound] = useState(1);
    const [score, setScore] = useState(0);
    const [timer, setTimer] = useState(ROUND_TIME);
    
    const [currentPair, setCurrentPair] = useState<[VideoData, VideoData] | null>(null);
    const [userChoice, setUserChoice] = useState<string | null>(null);
    const [correctAnswerId, setCorrectAnswerId] = useState<string | null>(null);

    const [leaderboard, setLeaderboard] = useState<GameScore[]>([]);
    const [playerName, setPlayerName] = useState('');
    const [scoreSubmitted, setScoreSubmitted] = useState(false);

    // Tracks video IDs shown in the current session (across restarts) to prevent duplicates
    const seenVideoIdsRef = useRef<Set<string>>(new Set());
    const timerIntervalRef = useRef<number | null>(null);
    const nextRoundTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const storedLeaderboard = localStorage.getItem(LEADERBOARD_KEY);
        if (storedLeaderboard) {
            setLeaderboard(JSON.parse(storedLeaderboard));
        }
    }, []);
    
    const stopTimer = useCallback(() => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    }, []);
    
    const setupNewRound = useCallback((pool: VideoData[]) => {
        // 1. Filter out videos that have already been seen
        let availablePool = pool.filter(v => !seenVideoIdsRef.current.has(v.id));

        // If we run out of new videos, reset the history and use the full pool again
        if (availablePool.length < 4) {
             seenVideoIdsRef.current.clear();
             availablePool = pool;
        }

        // 2. Split available videos into Shorts and Long-form
        const shortsPool = availablePool.filter(v => v.durationMinutes <= 1);
        const longformPool = availablePool.filter(v => v.durationMinutes > 1);

        const canPlayShorts = shortsPool.length >= 2; // Need at least 2 to compare
        const canPlayLongform = longformPool.length >= 2;

        if (!canPlayShorts && !canPlayLongform) {
            setError("게임에 필요한 영상이 부족합니다. 다른 키워드를 시도해주세요.");
            setGameState('welcome');
            return;
        }

        // 3. Select Format (Shorts vs Longs)
        let selectedPool: VideoData[];
        if (canPlayShorts && !canPlayLongform) {
            selectedPool = shortsPool;
        } else if (!canPlayShorts && canPlayLongform) {
            selectedPool = longformPool;
        } else {
            // Both are playable, choose randomly
            selectedPool = Math.random() < 0.5 ? shortsPool : longformPool;
        }

        // 4. Sort by views to establish "Tiers" for comparison
        // We want to compare High vs Mid/Low to make it a bit challenging but logical
        const sortedPool = [...selectedPool].sort((a, b) => b.viewsPerHour - a.viewsPerHour);
        
        const topTierEndIndex = Math.floor(sortedPool.length * 0.3); // Top 30%
        const midTierStartIndex = topTierEndIndex;
        const midTierEndIndex = sortedPool.length;

        // Ensure we have enough items in the tiers
        if (topTierEndIndex === 0 || midTierEndIndex <= midTierStartIndex) {
             // Fallback: just pick any two different videos from the selected pool if tiers fail
             if (selectedPool.length >= 2) {
                const i1 = Math.floor(Math.random() * selectedPool.length);
                let i2 = Math.floor(Math.random() * selectedPool.length);
                while(i1 === i2) i2 = Math.floor(Math.random() * selectedPool.length);
                
                const v1 = selectedPool[i1];
                const v2 = selectedPool[i2];
                
                const pair: [VideoData, VideoData] = Math.random() < 0.5 ? [v1, v2] : [v2, v1];
                setCurrentPair(pair);
                setCorrectAnswerId(pair[0].viewCount > pair[1].viewCount ? pair[0].id : pair[1].id);
                setUserChoice(null);
                setTimer(ROUND_TIME);
                setGameState('playing');

                // Mark as seen
                seenVideoIdsRef.current.add(v1.id);
                seenVideoIdsRef.current.add(v2.id);
                return;
             }

             setError("영상 풀이 너무 작아 라운드를 구성할 수 없습니다. 다른 키워드로 시도해주세요.");
             setGameState('welcome');
             return;
        }

        // 5. Pick one from Top Tier and one from Mid/Lower Tier
        const index1 = Math.floor(Math.random() * topTierEndIndex);
        const index2 = midTierStartIndex + Math.floor(Math.random() * (midTierEndIndex - midTierStartIndex));
        
        const videoA = sortedPool[index1];
        const videoB = sortedPool[index2];

        if (!videoA || !videoB) {
            setError("라운드 구성 중 오류가 발생했습니다. 다시 시도해주세요.");
            setGameState('welcome');
            return;
        }
        
        const pair: [VideoData, VideoData] = Math.random() < 0.5 ? [videoA, videoB] : [videoB, videoA];

        setCurrentPair(pair);
        setCorrectAnswerId(pair[0].viewCount > pair[1].viewCount ? pair[0].id : pair[1].id);
        setUserChoice(null);
        setTimer(ROUND_TIME);
        setGameState('playing');

        // 6. Add selected videos to history so they aren't picked again
        seenVideoIdsRef.current.add(videoA.id);
        seenVideoIdsRef.current.add(videoB.id);

    }, []);
    
    const nextRound = useCallback(() => {
        if (nextRoundTimeoutRef.current) {
            clearTimeout(nextRoundTimeoutRef.current);
        }
        if (round < TOTAL_ROUNDS) {
            setRound(prev => prev + 1);
            setupNewRound(videoPool);
        } else {
            setGameState('end');
            setScoreSubmitted(false);
            setPlayerName('');
        }
    }, [round, setupNewRound, videoPool]);

    const handleChoice = useCallback((chosenVideoId: string | null) => {
        if (gameState !== 'playing') return;
        stopTimer();
        setUserChoice(chosenVideoId);
        if (chosenVideoId === correctAnswerId) {
            setScore(prev => prev + 1);
        }
        setGameState('result');
    }, [gameState, correctAnswerId, stopTimer]);

    useEffect(() => {
        if (gameState === 'playing') {
            timerIntervalRef.current = window.setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) {
                        handleChoice(null);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (gameState === 'result') {
            nextRoundTimeoutRef.current = window.setTimeout(nextRound, RESULT_DELAY);
        }
        
        return () => {
            stopTimer();
            if (nextRoundTimeoutRef.current) {
                clearTimeout(nextRoundTimeoutRef.current);
            }
        };
    }, [gameState, handleChoice, nextRound, stopTimer]);
    
    const startGame = useCallback(async () => {
        if (!keyword.trim()) {
            setError("키워드를 입력해주세요.");
            return;
        }
        setGameState('fetching');
        setError(null);
        setScore(0);
        setRound(1);
        
        // Important: Only clear history if the keyword has changed significantly.
        // For now, we assume if the user clicks start, they might want to continue with the same pool
        // BUT since we are re-fetching, we should probably reset history if the pool changes completely.
        // Strategy: We keep the history to support "Playing multiple games with the same keyword without duplicates".
        // If the fetch returns a completely different set, the ID check handles it.
        // If the user explicitly wants to reset, they can reload the page.
        
        try {
            const apiKey = user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);
            if (!apiKey) throw new Error("YouTube API 키가 필요합니다.");
            
            // Check if we already have data for this keyword to avoid re-fetching API quota if possible
            // For simplicity in this version, we always fetch to ensure freshness, 
            // but logically, if we already have 'videoPool' and keyword matches, we could skip fetch.
            // However, keeping the fetch allows getting updated view counts.
            
            const data = await fetchYouTubeData('keyword', keyword, gameFilters, apiKey);
            const validData = data.filter(v => v.viewCount > 10000);
            
            if (validData.length < 10) {
                 throw new Error("분석할 영상이 부족합니다. 더 대중적인 키워드를 시도해보세요.");
            }
            
            setVideoPool(validData);
            // Reset seen history only if we got a fresh batch that might overlap differently
            // Actually, simply clearing it on new search is safer to avoid 'stuck' state if the API results shift slightly.
            // But the user requested "even if played multiple times".
            // So we DO NOT clear `seenVideoIdsRef` here unless the keyword changed.
            
            setupNewRound(validData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "데이터를 가져오는 데 실패했습니다.");
            setGameState('welcome');
        }
    }, [keyword, user, appSettings, setupNewRound]);

    // Reset history when keyword changes (user types something new)
    useEffect(() => {
        seenVideoIdsRef.current.clear();
    }, [keyword]);
    
    const handleLeaderboardSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalName = playerName.trim() || '익명';
        const newScore: GameScore = { name: finalName, score, date: new Date().toISOString().split('T')[0], keyword };
        const newLeaderboard = [...leaderboard, newScore]
            .sort((a, b) => b.score - a.score)
            .slice(0, LEADERBOARD_SIZE);
        
        setLeaderboard(newLeaderboard);
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(newLeaderboard));
        setScoreSubmitted(true);
    };

    const isHighScore = score > 0 && (leaderboard.length < LEADERBOARD_SIZE || score > (leaderboard[leaderboard.length - 1]?.score || 0));

    const renderWelcome = () => (
        <div className="text-center">
            <h1 className="text-3xl font-bold text-white">썸네일 A/B 테스트 게임</h1>
            <p className="text-gray-400 mt-2 max-w-xl mx-auto">어떤 썸네일이 더 높은 조회수를 기록했을까요? 당신의 감을 테스트해보세요!</p>
            <form onSubmit={(e) => { e.preventDefault(); startGame(); }} className="max-w-md mx-auto my-8 flex gap-2">
                <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="게임 주제 키워드 (예: 캠핑)" className="flex-grow bg-gray-700 border-gray-600 rounded-md p-3 text-lg" />
                <Button type="submit">게임 시작</Button>
            </form>
            {error && <p className="text-red-400 mt-2">{error}</p>}
        </div>
    );

    const renderGameUI = () => {
      const isResultState = gameState === 'result';
      const [video1, video2] = currentPair!;
      
      const getBorderStyle = (videoId: string) => {
          if (!isResultState) return 'border-transparent group-hover:border-blue-500';
          if (videoId === correctAnswerId) return 'border-green-500 ring-4 ring-green-500/50';
          if (videoId === userChoice && videoId !== correctAnswerId) return 'border-red-500 ring-4 ring-red-500/50';
          return 'border-transparent';
      };

      return (
        <div className="flex flex-col items-center h-full w-full max-w-5xl mx-auto">
            {/* Header - Reduced font sizes */}
            <header className="w-full flex justify-between items-center mb-2">
                <div><span className="font-bold text-lg">{score}</span> 점</div>
                <div className="text-center">
                    <div className="text-xs text-gray-400">ROUND</div>
                    <div className="font-bold text-xl">{round}/{TOTAL_ROUNDS}</div>
                </div>
                <div className="font-bold text-lg text-yellow-400">{timer}초</div>
            </header>

            {/* Timer Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-1.5 mb-4">
                <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${(timer / ROUND_TIME) * 100}%`, transition: timer === ROUND_TIME ? 'none' : 'width 1s linear' }} />
            </div>
            
            {/* Question (Desktop position) */}
            <h2 className="hidden md:block text-xl font-bold my-2 text-center">어떤 영상의 조회수가 더 높을까요?</h2>
            
            {/* Main Content Area */}
            <div className="flex-grow w-full flex flex-col items-center justify-center">
                {/* Thumbnails container */}
                <div className="w-full flex flex-col md:flex-row items-stretch justify-center gap-4 md:gap-8">
                    {[video1, video2].map(video => (
                        <div key={video.id} className="w-full md:w-1/2 max-w-md flex flex-col items-center gap-2">
                            {/* Result view count (smaller) */}
                            <div className="h-16 flex items-center justify-center">
                                {isResultState && (
                                    <div className="text-center bg-gray-900/50 py-1 px-3 rounded-lg animate-fade-in">
                                        <p className="text-xl md:text-2xl font-bold">{formatNumber(video.viewCount)}</p>
                                        <p className="text-xs text-gray-400">조회수</p>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handleChoice(video.id)}
                                disabled={isResultState}
                                className={`group relative w-full aspect-video rounded-lg overflow-hidden border-4 transition-all duration-300 ${getBorderStyle(video.id)} disabled:cursor-default`}
                            >
                                <img src={video.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                {isResultState && userChoice === video.id && <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white font-bold text-4xl">👆</div>}
                            </button>
                        </div>
                    ))}
                </div>
                
                {/* Question (Mobile position) */}
                <h2 className="md:hidden text-lg font-bold mt-4 text-center">어떤 영상의 조회수가 더 높을까요?</h2>
            </div>

            {/* Next Round Progress Bar */}
            <div className="h-16 flex items-center justify-center w-full flex-shrink-0 mt-2">
                {isResultState && (
                     <div className="w-full max-w-xs">
                        <p className="text-center text-gray-400 text-sm mb-1">
                            {round < TOTAL_ROUNDS ? "다음 라운드로 이동합니다..." : "게임이 종료됩니다..."}
                        </p>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div key={round} className="bg-blue-500 h-1.5 rounded-full animate-progress" />
                        </div>
                    </div>
                )}
            </div>
        </div>
      );
    };

    const renderEnd = () => (
        <div className="text-center">
            <h2 className="text-2xl font-bold text-white">게임 종료!</h2>
            <p className="text-6xl font-bold my-4">{score} / {TOTAL_ROUNDS}</p>
            {isHighScore && !scoreSubmitted && (
                <form onSubmit={handleLeaderboardSubmit} className="max-w-sm mx-auto my-6">
                    <p className="text-green-400 font-semibold mb-2">🎉 최고 기록 달성! 랭킹에 이름을 남기세요.</p>
                    <div className="flex gap-2">
                        <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="이름 (3글자 이상)" minLength={3} required className="flex-grow bg-gray-700 border-gray-600 rounded-md p-2"/>
                        <Button type="submit">등록</Button>
                    </div>
                </form>
            )}
            <div className="flex justify-center gap-4 mt-8">
                <Button onClick={() => setGameState('welcome')}>다른 키워드로 시작</Button>
                <Button onClick={onBack} variant="secondary">워크플로우로 돌아가기</Button>
            </div>
        </div>
    );
    
    const Leaderboard: React.FC = () => (
        <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700/50">
            <h3 className="font-bold text-lg text-yellow-300 mb-3 text-center">🏆 명예의 전당 (Top 10)</h3>
            {leaderboard.length > 0 ? (
                <ol className="space-y-2">
                    {leaderboard.map((entry, i) => (
                        <li key={i} className="flex justify-between items-center text-sm p-2 bg-gray-900/50 rounded-md">
                            <span className="font-semibold"><span className="text-gray-500 w-6 inline-block">{i+1}.</span>{entry.name}</span>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-gray-400 hidden sm:inline">"{entry.keyword}"</span>
                                <span className="font-bold text-blue-400 text-base">{entry.score}점</span>
                            </div>
                        </li>
                    ))}
                </ol>
            ) : <p className="text-center text-sm text-gray-500 py-4">아직 랭킹이 없습니다.</p>}
        </div>
    );

    const renderContent = () => {
        switch (gameState) {
            case 'welcome': return <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"><div className="lg:col-span-1">{renderWelcome()}</div><div className="lg:col-span-1"><Leaderboard/></div></div>;
            case 'fetching': return <Spinner message={`'${keyword}' 관련 영상을 불러오는 중...`} />;
            case 'playing':
            case 'result': return renderGameUI();
            case 'end': return <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"><div className="lg:col-span-1">{renderEnd()}</div><div className="lg:col-span-1"><Leaderboard/></div></div>;
            default: return null;
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col">
            <div className="flex-shrink-0">
                <Button onClick={onBack} variant="secondary" className="mb-4">← 워크플로우로 돌아가기</Button>
            </div>
            <main className="flex-grow flex items-center justify-center bg-gray-800/40 rounded-lg p-2 sm:p-6">
                {renderContent()}
            </main>
        </div>
    );
};

export default ABTestGameView;