import React, { useState, useCallback, useEffect } from 'react';
import Spinner from './common/Spinner';
import { fetchYouTubeData } from '../services/youtubeService';
import { getAIThumbnailAnalysis } from '../services/geminiService';
import { mockVideoData } from '../services/mockData';
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

const mockThumbnailInsights: AIThumbnailInsights = {
  analysis: {
    focalPoint: "인물 중심, 특히 얼굴 클로즈업이 많아 감정 전달에 유리합니다.",
    colorContrast: "대체로 고채도, 고대비 색상을 사용하여 시선을 사로잡습니다. 노란색과 빨간색이 자주 사용됩니다.",
    faceEmotionCTR: "놀람, 기쁨 등 극적인 표정을 통해 사용자의 호기심을 자극합니다.",
    textReadability: "크고 굵은 고딕 계열 폰트를 사용하여 모바일에서도 쉽게 읽힙니다.",
    brandingConsistency: "일부 채널은 로고나 특정 색상 팔레트를 사용하여 일관성을 유지합니다.",
    mobileReadability: "핵심 텍스트와 이미지가 중앙에 집중되어 모바일 가독성이 높습니다.",
    categoryRelevance: "썸네일만 봐도 '캠핑'이라는 주제를 명확히 알 수 있습니다.",
    titlePatterns: "'N가지 꿀팁', '절대 사지 마세요', '이거 하나로 끝' 등 정보성과 호기심을 자극하는 패턴이 많습니다.",
    titleLength: "대부분 20-30자 내외의 짧고 간결한 제목을 사용합니다.",
    titleCredibility: "일부 과장된 표현이 있으나, '내돈내산', '솔직 후기' 등의 키워드로 신뢰도를 보완합니다."
  },
  results: {
    thumbnailSummary: "성과가 좋은 '캠핑' 썸네일은 자연 풍경 속에서 인물의 행복한 표정을 강조하며, '역대급', '필수템' 같은 강력한 키워드를 텍스트로 활용합니다.",
    improvedConcepts: [
      { concept: "Before & After", description: "낡은 캠핑 장비를 새 장비로 교체하는 전후 비교를 통해 제품의 매력을 극대화합니다." },
      { concept: "문제 해결", description: "'캠핑가서 벌레 때문에 고생했다면?' 과 같이 시청자의 문제 상황을 제시하고 해결책을 암시합니다." }
    ],
    textCandidates: ["역대급 가성비", "이거 모르면 손해", "초보캠퍼 필수템"],
    designGuide: {
      colors: "따뜻한 주황색/노란색 계열을 포인트로, 자연의 녹색/파란색을 배경으로 사용하세요.",
      fonts: "굵고 시인성 좋은 고딕체 (예: G마켓 산스, Pretendard)",
      layout: "인물은 좌/우측에, 핵심 텍스트는 반대편 상단에 배치하여 시선을 유도하세요."
    },
    titleSummary: "정보의 효용성을 강조하거나, 시청자의 후회를 자극하는 방식의 제목이 효과적입니다. 구체적인 숫자나 모델명을 포함하여 전문성을 어필하는 것도 좋은 전략입니다.",
    titleSuggestions: [
      { title: "초보 캠퍼라면 절대 사지 말아야 할 캠핑용품 5가지 (내돈내산)", reason: "부정적 표현과 구체적인 숫자를 사용해 호기심을 극대화하고 신뢰도를 더합니다." },
      { title: "이 영상 하나로 캠핑 준비 끝. (초보캠핑 가이드 A to Z)", reason: "시청자가 얻을 수 있는 가치를 명확히 제시하여 클릭을 유도합니다." }
    ]
  }
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
      
      // Simulate AI analysis with mock data, as requested
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate analysis delay
      const aiInsights = mockThumbnailInsights;
      
      setThumbnails(videoData);
      setInsights(aiInsights);

    } catch (err) {
      setError("분석 중 오류가 발생하여 가상 데이터가 표시됩니다. (An error occurred during analysis. Displaying mock data.)");
      setThumbnails(mockVideoData.slice(0, 10));
      setInsights(mockThumbnailInsights);
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