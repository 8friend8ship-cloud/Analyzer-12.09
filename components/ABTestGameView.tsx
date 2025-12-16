
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
  period: '90', sortBy: 'viewCount', resultsLimit: 100,
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
  onUpdateUser: (updatedUser: Partial<User>) => void;
  onUpgradeRequired: () => void;
}

const ABTestGameView: React.FC<ABTestGameViewProps> = ({ user, appSettings, onBack, onUpdateUser, onUpgradeRequired }) => {
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
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
        };
    }, [gameState, nextRound, handleChoice]);

    const startGame = async () => {
        // Note: A/B Test Game is free - No usage check or deduction here.
        if (!keyword.trim()) {
            setError("키워드를 입력해주세요.");
            return;
        }

        setGameState('fetching');
        setError(null);
        setScore(0);
        setRound(1);
        seenVideoIdsRef.current.clear();

        try {
            const apiKey = user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);
            if (!apiKey) throw new Error("API Key Missing");

            const videos = await fetchYouTubeData('keyword', keyword, gameFilters, apiKey);
            if (videos.length < 10) {
                throw new Error("영상이 부족합니다. 다른 키워드로 시도해주세요.");
            }
            
            setVideoPool(videos);
            setupNewRound(videos);

        } catch (err) {
            console.error(err);
            setError("데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.");
            setGameState('welcome');
        }
    };

    const handleSaveScore = () => {
        if (!playerName.trim()) return;
        
        const newScore: GameScore = {
            name: playerName,
            score: score,
            date: new Date().toISOString(),
            keyword: keyword
        };
        
        const newLeaderboard = [...leaderboard, newScore]
            .sort((a, b) => b.score - a.score)
            .slice(0, LEADERBOARD_SIZE);
            
        setLeaderboard(newLeaderboard);
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(newLeaderboard));
        setScoreSubmitted(true);
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col items-center">
            <div className="w-full max-w-4xl">
                <button onClick={onBack} className="mb-4 px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
                    ← 워크플로우로 돌아가기
                </button>
            </div>

            {gameState === 'welcome' && (
                <div className="text-center max-w-lg bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 animate-fade-in">
                    <h1 className="text-3xl font-bold text-white mb-2">썸네일 A/B 테스트 게임</h1>
                    <p className="text-gray-400 mb-6">어떤 썸네일이 더 조회수가 높을까요? 당신의 '감'을 테스트해보세요!</p>
                    
                    <div className="mb-6">
                        <label className="block text-left text-sm text-gray-400 mb-1">게임 테마 키워드</label>
                        <input 
                            type="text" 
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            className="w-full bg-gray-700 border-gray-600 rounded-lg p-3 text-white focus:ring-blue-500 focus:border-blue-500"
                            placeholder="예: 먹방, 여행, 주식..."
                        />
                    </div>

                    {error && <p className="text-red-400 mb-4">{error}</p>}

                    <Button onClick={startGame} className="w-full py-4 text-lg font-bold shadow-lg">
                        게임 시작 (20 라운드)
                    </Button>
                    
                    {leaderboard.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-gray-700">
                            <h3 className="font-bold text-yellow-400 mb-4">🏆 명예의 전당</h3>
                            <ul className="space-y-2 text-sm text-left">
                                {leaderboard.map((entry, i) => (
                                    <li key={i} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                                        <span className="flex items-center gap-2">
                                            <span className="font-bold text-gray-500 w-4">{i+1}.</span>
                                            <span className="text-white truncate max-w-[120px]">{entry.name}</span>
                                            <span className="text-xs text-gray-500">({entry.keyword})</span>
                                        </span>
                                        <span className="font-bold text-yellow-400">{entry.score}점</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {gameState === 'fetching' && (
                <div className="flex flex-col items-center justify-center h-64">
                    <Spinner message="게임 데이터를 준비하고 있습니다..." />
                </div>
            )}

            {(gameState === 'playing' || gameState === 'result') && currentPair && (
                <div className="w-full max-w-5xl animate-fade-in">
                    <div className="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-lg">
                        <div className="text-xl font-bold">Round {round} / {TOTAL_ROUNDS}</div>
                        <div className={`text-2xl font-black ${timer <= 3 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                            {timer}s
                        </div>
                        <div className="text-xl font-bold text-yellow-400">Score: {score}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 relative">
                        {/* VS Badge */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-red-600 text-white font-black text-2xl rounded-full w-14 h-14 flex items-center justify-center border-4 border-gray-900 shadow-xl transform rotate-12">
                            VS
                        </div>

                        {currentPair.map((video, idx) => {
                            const isSelected = userChoice === video.id;
                            const isCorrect = correctAnswerId === video.id;
                            let cardClass = "relative cursor-pointer group transform transition-all duration-200 hover:scale-[1.02] active:scale-95 rounded-xl overflow-hidden border-4 border-transparent";
                            
                            if (gameState === 'result') {
                                if (isCorrect) cardClass += " border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)]";
                                else if (isSelected && !isCorrect) cardClass += " border-red-500 opacity-60";
                                else cardClass += " opacity-60"; // Not selected, not correct
                            }

                            return (
                                <div 
                                    key={video.id} 
                                    onClick={() => handleChoice(video.id)}
                                    className={cardClass}
                                >
                                    <div className="aspect-video bg-black relative">
                                        <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                                        {/* Result Overlay */}
                                        {gameState === 'result' && (
                                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center animate-fade-in">
                                                <p className="text-3xl font-black text-white mb-2">{formatNumber(video.viewCount)}회</p>
                                                {isCorrect ? (
                                                    <span className="bg-green-600 text-white px-3 py-1 rounded font-bold">WINNER</span>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">{Math.round((video.viewCount / (currentPair[0].viewCount + currentPair[1].viewCount)) * 100)}% 점유율</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 bg-gray-800">
                                        <h3 className="font-bold text-white text-lg line-clamp-2 leading-snug">{video.title}</h3>
                                        <p className="text-sm text-gray-400 mt-2">{video.channelTitle}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {gameState === 'result' && (
                        <div className="text-center mt-8">
                            <p className="text-gray-400 text-sm animate-pulse">다음 라운드로 넘어갑니다...</p>
                        </div>
                    )}
                </div>
            )}

            {gameState === 'end' && (
                <div className="text-center max-w-lg bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 animate-fade-in">
                    <h2 className="text-4xl font-bold text-white mb-4">게임 종료!</h2>
                    <div className="bg-gray-900/50 p-6 rounded-lg mb-8">
                        <p className="text-gray-400 mb-2">최종 점수</p>
                        <p className="text-6xl font-black text-yellow-400">{score} / {TOTAL_ROUNDS}</p>
                        <p className="text-sm text-gray-500 mt-2">
                            {score >= 18 ? "당신은 유튜브 알고리즘 그 자체입니다! 😲" : 
                             score >= 12 ? "상당히 감각이 있으시네요! 👍" : 
                             "조금 더 분발하세요! 😅"}
                        </p>
                    </div>

                    {!scoreSubmitted ? (
                        <div className="space-y-4">
                            <input 
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="이름을 입력하세요"
                                className="w-full bg-gray-700 border-gray-600 rounded-lg p-3 text-white text-center"
                                maxLength={10}
                            />
                            <Button onClick={handleSaveScore} className="w-full py-3 bg-green-600 hover:bg-green-700">
                                점수 저장하기
                            </Button>
                        </div>
                    ) : (
                        <p className="text-green-400 font-bold mb-4">점수가 저장되었습니다!</p>
                    )}

                    <div className="mt-6 flex gap-4">
                        <Button onClick={() => setGameState('welcome')} variant="secondary" className="flex-1 py-3">
                            처음으로
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ABTestGameView;
