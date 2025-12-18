
import React, { useState, useCallback, useEffect } from 'react';
import Spinner from './common/Spinner';
import { fetchYouTubeData } from '../services/youtubeService';
import { getAIThumbnailAnalysis } from '../services/geminiService';
import { addToCollection, createThumbnailCollectionItem } from '../services/collectionService';
import type { User, AppSettings, VideoData, AIThumbnailInsights, FilterState, ThumbnailViewState } from '../types';

interface ThumbnailAnalysisViewProps {
  user: User;
  appSettings: AppSettings;
  onBack: () => void;
  savedState: ThumbnailViewState | null;
  onSaveState: (state: ThumbnailViewState) => void;
  onUpdateUser: (updatedUser: Partial<User>) => void;
  onUpgradeRequired: () => void;
  planLimit: number;
}

const analysisFilters: FilterState = {
  minViews: 1000,
  videoLength: 'any',
  videoFormat: 'any',
  period: '90',
  sortBy: 'viewCount',
  resultsLimit: 20,
  country: 'KR',
  category: 'all',
};

const ThumbnailAnalysisView: React.FC<ThumbnailAnalysisViewProps> = ({ 
    user, 
    appSettings, 
    onBack, 
    savedState, 
    onSaveState,
    onUpdateUser,
    onUpgradeRequired,
    planLimit
}) => {
  const [query, setQuery] = useState(savedState?.query || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitial, setIsInitial] = useState(!savedState?.thumbnails?.length);
  const [thumbnails, setThumbnails] = useState<VideoData[]>(savedState?.thumbnails || []);
  const [insights, setInsights] = useState<AIThumbnailInsights | null>(savedState?.insights || null);

  useEffect(() => {
      onSaveState({
          query,
          thumbnails,
          insights
      });
  }, [query, thumbnails, insights, onSaveState]);

  const handleAnalysis = useCallback(async (searchQuery: string) => {
    if (user.usage >= planLimit) {
        onUpgradeRequired();
        return;
    }

    if (!searchQuery.trim()) {
      setError("분석할 키워드를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setThumbnails([]);
    setInsights(null);
    setIsInitial(false);

    try {
      const apiKey = user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);
      if (!apiKey) throw new Error("YouTube API 키가 설정되지 않았습니다.");

      const videoData = await fetchYouTubeData('keyword', searchQuery, analysisFilters, apiKey);

      if (videoData.length === 0) {
        throw new Error("해당 키워드로 인기 동영상을 찾을 수 없습니다.");
      }
      
      const thumbnailInfoForAI = videoData.map(v => ({ id: v.id, title: v.title, thumbnailUrl: v.thumbnailUrl }));
      const aiInsights = await getAIThumbnailAnalysis(thumbnailInfoForAI, searchQuery);
      
      const scoredVideoData = videoData.map(video => {
        const scoreInfo = aiInsights.scoredThumbnails?.find(s => s.id === video.id);
        return {
          ...video,
          aiThumbnailScore: scoreInfo ? scoreInfo.totalScore : 0,
          aiThumbnailReason: scoreInfo ? scoreInfo.reason : "분석 누락",
          aiThumbnailHook: scoreInfo ? scoreInfo.hook : "분석 중...",
          aiKeywordScore: scoreInfo ? scoreInfo.keywordScore : 0,
        };
      }).sort((a,b) => (b.aiThumbnailScore ?? 0) - (a.aiThumbnailScore ?? 0));

      setThumbnails(scoredVideoData);
      setInsights(aiInsights);
      
      if (user.plan === 'Biz' || user.isAdmin) {
          addToCollection(createThumbnailCollectionItem(searchQuery, aiInsights));
      }

      onUpdateUser({ usage: user.usage + 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "썸네일 분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [user, appSettings, onUpgradeRequired, onUpdateUser, planLimit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAnalysis(query);
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-purple-600 border-purple-400';
    if (score >= 70) return 'bg-blue-600 border-blue-400';
    if (score >= 50) return 'bg-yellow-600 border-yellow-400';
    return 'bg-red-600 border-red-400';
  };
  
  const AIResultsDisplay: React.FC<{ insights: AIThumbnailInsights }> = ({ insights }) => {
    const thumbAnalysisItems = [
      { title: "초점(포컬 포인트)", content: insights.analysis.focalPoint },
      { title: "색상 대비", content: insights.analysis.colorContrast },
      { title: "얼굴/감정", content: insights.analysis.faceEmotionCTR },
      { title: "텍스트 가독성", content: insights.analysis.textReadability },
      { title: "브랜드 일관성", content: insights.analysis.brandingConsistency },
      { title: "모바일 가독성", content: insights.analysis.mobileReadability },
      { title: "콘텐츠 부합성", content: insights.analysis.categoryRelevance },
    ];

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700/50">
            <div className="p-6 border-b border-gray-700/50">
                <h2 className="text-2xl font-bold text-white mb-2">🤖 AI 최적화 전략 리포트</h2>
                <p className="text-sm text-gray-400">데이터 기반의 상위 노출 및 클릭 유도 전략입니다.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-gray-700/50">
            <div className="bg-gray-800 p-6 space-y-6">
                <h3 className="font-semibold text-xl text-yellow-400 flex items-center gap-2">🖼️ 썸네일 개선 전략</h3>
                <p className="text-sm text-gray-300 bg-gray-900/50 p-4 rounded-md border-l-4 border-yellow-500">{insights.results.thumbnailSummary}</p>
                <div>
                <h4 className="font-semibold text-lg text-gray-200 mb-3">💡 핵심 개선 포인트</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.results.improvedConcepts.map((item, i) => (
                    <div key={i} className="bg-gray-900/50 p-3 rounded-md border border-gray-700">
                        <p className="font-bold text-sm text-green-400 mb-1">{item.concept}</p>
                        <p className="text-xs text-gray-400 leading-relaxed">{item.description}</p>
                    </div>
                    ))}
                </div>
                </div>
                <div>
                <h4 className="font-semibold text-lg text-gray-200 mb-3">🎨 디자인 요소 추천</h4>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-900/50 p-3 rounded-md text-center"><p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Color</p><p className="text-xs text-white truncate">{insights.results.designGuide.colors}</p></div>
                    <div className="bg-gray-900/50 p-3 rounded-md text-center"><p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Font</p><p className="text-xs text-white truncate">{insights.results.designGuide.fonts}</p></div>
                    <div className="bg-gray-900/50 p-3 rounded-md text-center"><p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Layout</p><p className="text-xs text-white truncate">{insights.results.designGuide.layout}</p></div>
                </div>
                </div>
                <div>
                    <h4 className="font-semibold text-sm text-gray-400 mb-3 uppercase tracking-wider">상세 요소 분석</h4>
                    <div className="space-y-2">
                    {thumbAnalysisItems.map((item, i) => (
                        <div key={i} className="flex justify-between items-start gap-4 text-xs py-1 border-b border-gray-700/30">
                            <span className="text-gray-500 font-medium whitespace-nowrap">{item.title}</span>
                            <span className="text-gray-300 text-right">{item.content}</span>
                        </div>
                    ))}
                    </div>
                </div>
            </div>
            <div className="bg-gray-800 p-6 space-y-6">
                <h3 className="font-semibold text-xl text-blue-400 flex items-center gap-2">✍️ 고효율 제목 전략</h3>
                <p className="text-sm text-gray-300 bg-gray-900/50 p-4 rounded-md border-l-4 border-blue-500">{insights.results.titleSummary}</p>
                <div>
                <h4 className="font-semibold text-lg text-gray-200 mb-3">💡 클릭을 부르는 추천 제목</h4>
                <div className="space-y-3">
                    {insights.results.titleSuggestions.map((item, i) => (
                    <div key={i} className="bg-gray-900/50 p-4 rounded-md border border-gray-700 group hover:border-blue-500 transition-colors">
                        <p className="font-bold text-base text-white mb-2">"{item.title}"</p>
                        <p className="text-xs text-gray-400">이유: {item.reason}</p>
                    </div>
                    ))}
                </div>
                </div>
                <div>
                    <h4 className="font-semibold text-lg text-gray-200 mb-3">🏷️ 썸네일 후크 문구 후보</h4>
                    <div className="flex flex-wrap gap-2">
                        {insights.results.textCandidates.map((text, i) => (
                        <span key={i} className="px-3 py-1.5 bg-gray-900 text-purple-400 font-bold rounded-lg border border-purple-500/30 text-sm">#{text}</span>
                        ))}
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <button onClick={onBack} className="mb-4 px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
        ← 워크플로우로 돌아가기
      </button>
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white">AI 썸네일 & 제목 최적화</h1>
        <p className="text-gray-400 mt-2">상위 노출 영상의 전략을 분석하여 당신만의 '승리하는 공식'을 찾아보세요.</p>
      </header>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: '주식 투자 입문', '제주도 여행 코스'"
          className="block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg p-3 placeholder-gray-400"
        />
        <button type="submit" disabled={isLoading} className="px-8 py-3 text-sm font-bold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-lg">
          {isLoading ? "분석 중..." : "최적화 분석"}
        </button>
      </form>

      {isLoading && <div className="flex justify-center items-center py-20"><Spinner message="AI가 성공한 썸네일의 패턴을 분석하고 있습니다..." /></div>}
      {error && <div className="text-center text-red-400 p-4 bg-red-900/50 rounded-lg max-w-2xl mx-auto border border-red-500/30">{error}</div>}
      
      {!isLoading && !error && (
        isInitial ? (
          <div className="text-center py-24 text-gray-500 border-2 border-dashed border-gray-800 rounded-3xl">
            <p className="text-xl">분석할 키워드를 입력하고 조회를 시작하세요.</p>
          </div>
        ) : (
          <div className="space-y-12 animate-fade-in">
            {insights && <AIResultsDisplay insights={insights} />}
            
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="text-3xl">🎯</span> 참고 영상별 전략 분석 리포트
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {thumbnails.map(video => (
                  <div key={video.id} className="group relative bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 hover:border-blue-500 transition-all flex flex-col shadow-xl">
                    {/* Floating Score Badge */}
                    <div className={`absolute top-3 left-3 z-10 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-white shadow-2xl border ${getScoreColor(video.aiThumbnailScore || 0)}`}>
                        <span className="text-[10px] opacity-80 uppercase">Score</span>
                        <span className="text-lg leading-tight">{video.aiThumbnailScore}</span>
                    </div>

                    <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="block aspect-video bg-black overflow-hidden relative">
                      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                      </div>
                    </a>
                    
                    <div className="p-4 flex-grow flex flex-col">
                      <div className="mb-4">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">원본 제목</p>
                        <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">{video.title}</h4>
                      </div>

                      <div className="space-y-4 flex-grow">
                        <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
                           <p className="text-[10px] text-purple-400 font-black uppercase mb-1">썸네일 후크 문구</p>
                           <p className="text-sm font-black text-white italic truncate">"{video.aiThumbnailHook}"</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-900/50 p-2 rounded-lg text-center">
                                <p className="text-[9px] text-gray-500 font-bold uppercase">키워드 점수</p>
                                <p className="text-base font-black text-blue-400">{video.aiKeywordScore}점</p>
                            </div>
                            <div className="bg-gray-900/50 p-2 rounded-lg text-center">
                                <p className="text-[9px] text-gray-500 font-bold uppercase">조회수 성과</p>
                                <p className="text-base font-black text-white">{video.performanceRatio.toFixed(1)}x</p>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-700">
                          <p className="text-[10px] text-green-400 font-black uppercase mb-1">AI 전략 평가</p>
                          <p className="text-[11px] text-gray-300 leading-relaxed italic">
                            "{video.aiThumbnailReason}"
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default ThumbnailAnalysisView;
