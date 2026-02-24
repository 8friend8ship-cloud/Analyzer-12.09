import React, { useState, useCallback, useEffect } from 'react';
import Spinner from './common/Spinner';
import { fetchYouTubeData } from '../services/youtubeService';
import { getAIThumbnailAnalysis } from '../services/geminiService';
import type { User, AppSettings, VideoData, AIThumbnailInsights, FilterState, ThumbnailViewState } from '../types';

interface ThumbnailAnalysisViewProps {
  user: User;
  appSettings: AppSettings;
  onBack: () => void;
  savedState: ThumbnailViewState | null;
  onSaveState: (state: ThumbnailViewState) => void;
}

const analysisFilters: FilterState = {
  minViews: 1000,
  videoLength: 'any',
  videoFormat: 'any',
  period: '30',
  sortBy: 'viewCount',
  resultsLimit: 20,
  country: 'KR',
  category: 'all',
};


const ThumbnailAnalysisView: React.FC<ThumbnailAnalysisViewProps> = ({ user, appSettings, onBack, savedState, onSaveState }) => {
  const [query, setQuery] = useState(savedState?.query || '캠핑');
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
    if (!searchQuery.trim()) {
      setError("분석할 키워드를 입력해주세요. (Please enter a keyword to analyze.)");
      return;
    }

    setIsLoading(true);
    setError(null);
    setThumbnails([]);
    setInsights(null);
    setIsInitial(false);

    try {
      const apiKey = appSettings.apiKeys.youtube;
      if (!apiKey) throw new Error("YouTube API 키가 설정되지 않았습니다.");

      const videoData = await fetchYouTubeData(
        'keyword', 
        searchQuery, 
        analysisFilters,
        apiKey
      );

      if (videoData.length === 0) {
        throw new Error("해당 키워드로 인기 동영상을 찾을 수 없습니다.");
      }
      
      const aiInsights = await getAIThumbnailAnalysis(videoData, searchQuery);
      
      setThumbnails(videoData);
      setInsights(aiInsights);

    } catch (err) {
      console.error(err);
      setError("분석 중 오류가 발생했습니다. (An error occurred during analysis.)");
    } finally {
      setIsLoading(false);
    }
  }, [user, appSettings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAnalysis(query);
  };
  
  const getScoreColor = (score: number) => {
    if (score > 85) return 'bg-green-500 border-green-400';
    if (score > 70) return 'bg-blue-500 border-blue-400';
    if (score > 50) return 'bg-yellow-500 border-yellow-400';
    return 'bg-red-500 border-red-400';
  };
  
  const AIResultsDisplay: React.FC<{ insights: AIThumbnailInsights }> = ({ insights }) => {
    const thumbAnalysisItems = [
      { title: "초점(포컬 포인트) (Focal Point)", content: insights.analysis.focalPoint },
      { title: "색상 대비 (Color Contrast)", content: insights.analysis.colorContrast },
      { title: "얼굴/감정 (Face/Emotion)", content: insights.analysis.faceEmotionCTR },
      { title: "텍스트 가독성 (Text Readability)", content: insights.analysis.textReadability },
      { title: "브랜드 일관성 (Brand Consistency)", content: insights.analysis.brandingConsistency },
      { title: "모바일 가독성 (Mobile Readability)", content: insights.analysis.mobileReadability },
      { title: "콘텐츠 부합성 (Content Relevance)", content: insights.analysis.categoryRelevance },
    ];

    const titleAnalysisItems = [
      { title: "제목 패턴 (Title Patterns)", content: insights.analysis.titlePatterns },
      { title: "제목 길이 (Title Length)", content: insights.analysis.titleLength },
      { title: "신뢰성/과장 (Credibility/Exaggeration)", content: insights.analysis.titleCredibility },
    ];

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700/50">
            <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4">AI 전략 분석 (AI Strategy Analysis)</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-gray-700/50">
            
            {/* Left Column: Thumbnail */}
            <div className="bg-gray-800 p-6 space-y-6">
                <h3 className="font-semibold text-xl text-yellow-400">🚀 썸네일 전략 (Thumbnail Strategy)</h3>
                <p className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-md">{insights.results.thumbnailSummary}</p>
                
                <div>
                <h4 className="font-semibold text-lg text-gray-200 mb-3">💡 개선 콘셉트 (Improvement Concepts)</h4>
                <div className="space-y-3">
                    {insights.results.improvedConcepts.map((item, i) => (
                    <div key={i} className="bg-gray-900/50 p-3 rounded-md">
                        <p className="font-bold text-sm text-green-400">{i + 1}. {item.concept}</p>
                        <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                    </div>
                    ))}
                </div>
                </div>

                <div>
                <h4 className="font-semibold text-lg text-gray-200 mb-3">✍️ 썸네일 텍스트 후보 (Thumbnail Text Candidates)</h4>
                <div className="space-y-2">
                    {insights.results.textCandidates.map((text, i) => (
                    <p key={i} className="text-sm p-2 bg-gray-900/50 rounded-md border-l-2 border-purple-500 font-mono">"{text}"</p>
                    ))}
                </div>
                </div>
                
                <div>
                <h4 className="font-semibold text-lg text-gray-200 mb-3">🎨 디자인 가이드 (Design Guide)</h4>
                <div className="text-sm space-y-2 text-gray-300 bg-gray-900/50 p-3 rounded-md">
                    <p><strong>색상 (Colors):</strong> {insights.results.designGuide.colors}</p>
                    <p><strong>폰트 (Fonts):</strong> {insights.results.designGuide.fonts}</p>
                    <p><strong>배치 (Layout):</strong> {insights.results.designGuide.layout}</p>
                </div>
                </div>

                <h3 className="font-semibold text-xl text-gray-300 mt-4">🔬 썸네일 상세 분석 (Detailed Thumbnail Analysis)</h3>
                <div className="space-y-3">
                {thumbAnalysisItems.map((item, i) => (
                    <div key={i} className="text-sm">
                    <p className="font-semibold text-gray-200">{item.title}</p>
                    <p className="text-gray-400">{item.content}</p>
                    </div>
                ))}
                </div>
            </div>

            {/* Right Column: Title */}
            <div className="bg-gray-800 p-6 space-y-6">
                <h3 className="font-semibold text-xl text-yellow-400">🚀 제목 전략 (Title Strategy)</h3>
                <p className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-md">{insights.results.titleSummary}</p>
                
                <div>
                <h4 className="font-semibold text-lg text-gray-200 mb-3">💡 제안 제목 (Title Suggestions)</h4>
                <div className="space-y-3">
                    {insights.results.titleSuggestions.map((item, i) => (
                    <div key={i} className="bg-gray-900/50 p-3 rounded-md">
                        <p className="font-bold text-sm text-green-400">{item.title}</p>
                        <p className="text-xs text-gray-400 mt-1">이유 (Reason): {item.reason}</p>
                    </div>
                    ))}
                </div>
                </div>

                <h3 className="font-semibold text-xl text-gray-300 mt-4">🔬 제목 상세 분석 (Detailed Title Analysis)</h3>
                <div className="space-y-3">
                {titleAnalysisItems.map((item, i) => (
                    <div key={i} className="text-sm">
                    <p className="font-semibold text-gray-200">{item.title}</p>
                    <p className="text-gray-400">{item.content}</p>
                    </div>
                ))}
                </div>
            </div>
            </div>
        </div>
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <button onClick={onBack} className="mb-4 px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
        ← 워크플로우로 돌아가기 (Back to Workflow)
      </button>

      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white">AI 썸네일 & 제목 분석 (AI Thumbnail & Title Analysis)</h1>
        <p className="text-gray-400 mt-2">키워드별 상위 영상들의 썸네일과 제목 패턴을 분석하여 클릭률 높은 콘텐츠 전략을 세워보세요. (Analyze thumbnail and title patterns of top videos by keyword to create a high-CTR content strategy.)</p>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: '캠핑용품 추천'"
          className="block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg p-3 placeholder-gray-400"
        />
        <button type="submit" disabled={isLoading} className="px-6 py-3 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          {isLoading ? "분석 중... (Analyzing...)" : "분석 (Analyze)"}
        </button>
      </form>
      
      {isLoading && <div className="flex justify-center items-center py-20"><Spinner message="AI가 썸네일을 분석하는 중입니다... (최대 30초 소요)" /></div>}
      {error && <div className="text-center text-red-400 p-4 bg-red-900/50 rounded-lg max-w-2xl mx-auto">{error}</div>}
      
      {!isLoading && (
        isInitial ? (
          <div className="text-center py-20 text-gray-500">
            <p>분석하고 싶은 키워드를 입력하고 '분석' 버튼을 누르세요.<br/>(Enter a keyword and click 'Analyze' to begin.)</p>
          </div>
        ) : (
          <div className="space-y-8">
            {insights && <AIResultsDisplay insights={insights} />}
            <div>
              <h2 className="text-xl font-bold mb-4">참고 영상 (Reference Videos)</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {thumbnails.map(video => (
                  <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="group block relative">
                    {/* FIX: The 'aiThumbnailScore' property does not exist on VideoData type. Hiding score display. */}
                    
                    <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden transition-transform group-hover:scale-105">
                      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 group-hover:text-white">{video.title}</p>
                  </a>
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