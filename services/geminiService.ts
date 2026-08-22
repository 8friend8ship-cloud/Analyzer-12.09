import type {
  VideoData,
  AnalysisMode,
  VideoDetailData,
  VideoComment,
} from '../types';

/**
 * Content OS canonical runtime: deterministic metadata/backdata analytics only.
 * No Gemini SDK, no browser AI credential, no generative-language network call.
 */

const STOPWORDS = new Set([
  'the','a','an','and','or','to','of','in','on','for','with','is','are','this','that','from','how','why',
  '영상','유튜브','youtube','shorts','쇼츠','official','video','feat','ft','2026','2025'
]);

const normalizeWords = (text: string) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^0-9a-zA-Z가-힣ぁ-んァ-ヶ一-龥\s]/g, ' ')
    .split(/\s+/)
    .map(v => v.trim())
    .filter(v => v.length >= 2 && !STOPWORDS.has(v));

const topTerms = (texts: string[], limit = 10): string[] => {
  const counts = new Map<string, number>();
  texts.flatMap(normalizeWords).forEach(term => counts.set(term, (counts.get(term) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
};

const average = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
};
const number = (value: unknown) => Number(value || 0) || 0;
const engagement = (v: any) => number(v.engagementRate) || ((number(v.likeCount) + number(v.commentCount)) / Math.max(1, number(v.viewCount))) * 100;

export const translateKeyword = async (keyword: string, _targetCountry: string): Promise<string> => {
  // Translation must come from prepared language packs. Never invent a translation here.
  return String(keyword || '').trim();
};

export const getRelatedKeywords = async (keyword: string): Promise<string[]> => {
  const base = String(keyword || '').trim();
  if (!base) return [];
  return [
    `${base} 후기`,
    `${base} 추천`,
    `${base} 비교`,
    `${base} 쇼츠`,
    `${base} 최신`,
  ];
};

export const getAITopicKeywords = async (videoData: VideoData[]): Promise<string[]> =>
  topTerms((videoData || []).map(v => v.title || ''), 10);

export const getAIInsights = async (
  videoData: VideoData[],
  query: string,
  mode: AnalysisMode
): Promise<any> => {
  const videos = videoData || [];
  if (!videos.length) {
    return {
      summary: `저장된 ${query || '검색'} 데이터가 없습니다.`,
      patterns: [],
      suggestions: ['Queens/Seed 저장 범위를 먼저 확인하세요.'],
    };
  }

  const views = videos.map(v => number(v.viewCount));
  const avgViews = Math.round(average(views));
  const medViews = Math.round(median(views));
  const avgEng = average(videos.map(engagement));
  const terms = topTerms(videos.map(v => v.title || ''), 5);
  const newest = [...videos].sort((a: any, b: any) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())[0];

  return {
    summary: `${query || '현재 조건'} ${mode} 저장 데이터 ${videos.length}건 기준 평균 조회수 ${avgViews.toLocaleString()}, 중앙값 ${medViews.toLocaleString()}, 평균 참여율 약 ${avgEng.toFixed(2)}%입니다.`,
    patterns: [
      terms.length ? `제목 반복 키워드: ${terms.join(', ')}` : '반복 제목 키워드가 뚜렷하지 않습니다.',
      avgViews > medViews * 1.5 ? '소수 상위 영상이 평균 조회수를 크게 끌어올리는 분포입니다.' : '조회수가 일부 영상에 과도하게 집중되지는 않았습니다.',
      newest?.title ? `최근 저장 영상 예시: ${newest.title}` : '최근 영상 메타가 없습니다.',
    ],
    suggestions: [
      '상위 조회 영상의 제목 구조와 길이를 먼저 비교하세요.',
      '같은 키워드의 최신 영상이 Seed에 들어왔는지 확인하세요.',
      '새 외부 사실이 필요한 경우에만 중앙 YouTube 수집기를 호출하세요.',
    ],
  };
};

export const getAIComparisonInsights = async (
  channelA: { query: string; videos: VideoData[] },
  channelB: { query: string; videos: VideoData[] }
): Promise<any> => {
  const stats = (videos: VideoData[]) => ({
    count: videos.length,
    views: Math.round(average(videos.map(v => number(v.viewCount)))),
    engagement: average(videos.map(engagement)),
    terms: topTerms(videos.map(v => v.title || ''), 4),
  });
  const a = stats(channelA.videos || []);
  const b = stats(channelB.videos || []);
  const viewLead = a.views === b.views ? '평균 조회수는 비슷합니다.' : a.views > b.views ? `${channelA.query}의 평균 조회수가 더 높습니다.` : `${channelB.query}의 평균 조회수가 더 높습니다.`;

  return {
    summary: `${channelA.query} ${a.count}건과 ${channelB.query} ${b.count}건의 저장 메타데이터를 비교했습니다. ${viewLead}`,
    suggestion: '같은 기간·같은 영상 수 조건으로 다시 맞춘 뒤 제목 패턴과 참여율을 나란히 보세요.',
    channelA_summary: {
      name: channelA.query,
      observedCharacteristics: [
        `평균 조회수 ${a.views.toLocaleString()}`,
        `평균 참여율 약 ${a.engagement.toFixed(2)}%`,
        a.terms.length ? `반복 제목어: ${a.terms.join(', ')}` : '반복 제목어 부족',
      ],
    },
    channelB_summary: {
      name: channelB.query,
      observedCharacteristics: [
        `평균 조회수 ${b.views.toLocaleString()}`,
        `평균 참여율 약 ${b.engagement.toFixed(2)}%`,
        b.terms.length ? `반복 제목어: ${b.terms.join(', ')}` : '반복 제목어 부족',
      ],
    },
  };
};

export const getAIChannelRecommendations = async (
  _category: string,
  _keyword: string
): Promise<{ korea: { name: string; reason: string }[]; global: { name: string; reason: string }[] }> => ({
  korea: [],
  global: [],
});

export const getAICommentInsights = async (comments: VideoComment[]): Promise<any> => {
  const rows = (comments || []).map(c => String((c as any).text || '')).filter(Boolean);
  if (!rows.length) return { summary: '분석할 저장 댓글이 없습니다.', positivePoints: [], negativePoints: [] };
  const terms = topTerms(rows, 8);
  return {
    summary: `저장 댓글 ${rows.length}건의 반복 표현을 요약했습니다. 감정이나 의도는 추정하지 않습니다.`,
    positivePoints: terms.slice(0, 3).map(t => `반복 언급: ${t}`),
    negativePoints: terms.slice(3, 6).map(t => `추가 확인할 반복 언급: ${t}`),
  };
};

export const getAIDeepDiveReport = async (videoData: VideoDetailData): Promise<any> => {
  const views = number((videoData as any).viewCount);
  const likes = number((videoData as any).likeCount);
  const comments = number((videoData as any).commentCount);
  const er = ((likes + comments) / Math.max(1, views)) * 100;
  return {
    currentStage: '저장 메타데이터 관찰 단계',
    viewerValue: '영상 원본을 시청하지 않았으므로 제목·통계·저장 댓글에서 확인 가능한 범위만 제시합니다.',
    dataFacts: [
      `조회수 ${views.toLocaleString()}`,
      `좋아요 ${likes.toLocaleString()}`,
      `댓글 ${comments.toLocaleString()}`,
      `단순 참여율 약 ${er.toFixed(2)}%`,
    ],
    interpretation: '이 수치는 비교 기준을 만드는 참고값입니다. 알고리즘이나 시청자 의도를 단정하지 않습니다.',
    engagementLevers: [
      { type: 'comment', recommendation: '저장 댓글에서 반복 질문을 찾아 다음 콘텐츠 후보로 사용하세요.' },
      { type: 'like', recommendation: '같은 채널의 유사 주제 영상과 참여율을 비교하세요.' },
      { type: 'subscribe', recommendation: '구독 전환은 공개 영상 통계만으로 직접 판정하지 마세요.' },
    ],
    nextAction: '같은 주제의 상위/중앙값 영상을 3~5개 나란히 비교하세요.',
  };
};

export const getAIThumbnailAnalysis = async (
  videoData: { id: string; title: string; thumbnailUrl: string }[],
  query: string
): Promise<any> => {
  const titles = (videoData || []).map(v => v.title || '');
  const terms = topTerms(titles, 6);
  const lengths = titles.map(t => t.length);
  const avgLength = Math.round(average(lengths));
  const limitation = '이미지 픽셀은 분석하지 않았습니다. 저장된 제목/썸네일 URL 메타만 사용합니다.';
  const base = String(query || '').trim();

  return {
    analysis: {
      focalPoint: limitation,
      colorContrast: limitation,
      faceEmotionCTR: limitation,
      textReadability: limitation,
      brandingConsistency: '동일 채널의 반복 썸네일 URL/제목 패턴을 별도 비교해야 합니다.',
      mobileReadability: '이미지 픽셀 분석 없이 모바일 가독성을 판정하지 않습니다.',
      categoryRelevance: terms.length ? `제목 기준 반복 주제어: ${terms.join(', ')}` : '제목 반복 주제어 부족',
      titlePatterns: terms.length ? `반복어 중심: ${terms.join(', ')}` : '뚜렷한 반복 패턴 없음',
      titleLength: `평균 제목 길이 약 ${avgLength}자`,
      titleCredibility: '메타데이터만으로 과장 여부를 단정하지 않습니다.',
    },
    results: {
      thumbnailSummary: limitation,
      improvedConcepts: [
        { concept: '한 메시지', description: '제목의 핵심 주제 하나와 썸네일 메시지를 일치시키세요.' },
        { concept: '모바일 우선', description: '실제 썸네일을 확인할 때 작은 화면에서 핵심 요소가 읽히는지 검증하세요.' },
      ],
      textCandidates: terms.slice(0, 3),
      designGuide: {
        colors: '저장 이미지 픽셀 분석 없이 색상을 추천하지 않습니다.',
        fonts: '짧고 큰 핵심 문구를 우선 검토하세요.',
        layout: '핵심 피사체와 짧은 문구가 겹치지 않는 단순 배치를 검토하세요.',
      },
      titleSummary: `${base || '현재 키워드'} 상위 저장 제목 ${titles.length}건, 평균 ${avgLength}자 기준입니다.`,
      titleSuggestions: [
        { title: `${base} 핵심 정리`, reason: '검색어를 앞에 두는 기본 구조' },
        { title: `${base} 비교`, reason: '비교 의도를 명확히 하는 구조' },
      ].filter(x => base),
    },
  };
};

export const getAITrendingInsight = async (
  countryCode: string,
  trendingVideos: { title: string; channelTitle: string }[],
  _excludedCategories: string[] = [],
  _topChannelsList: string[] = []
): Promise<{ summary: string; viralFactors: string[]; topKeywords: string[] }> => {
  const titles = (trendingVideos || []).map(v => v.title || '');
  const keywords = topTerms(titles, 10);
  return {
    summary: `${countryCode} 저장 트렌드 영상 ${titles.length}건의 제목 빈도를 기준으로 정리했습니다.`,
    viralFactors: keywords.slice(0, 4).map(k => `반복 제목 신호: ${k}`),
    topKeywords: keywords,
  };
};

export const getAIBenchmarkRecommendations = async (
  _channelName: string,
  _titlePatterns: string[]
): Promise<{ name: string; reason: string }[]> => [];

export const getAIRankingAnalysis = async (
  items: any[],
  _type: 'channels' | 'videos'
): Promise<{ id: string; insight: string }[]> =>
  (items || []).slice(0, 20).map((item: any, index: number) => ({
    id: String(item.id || index),
    insight: `저장 순위 ${index + 1}; 조회/참여 지표를 동일 기간 조건에서 비교하세요.`,
  }));

export const getAIChannelComprehensiveAnalysis = async (
  channelStats: any,
  videoSnippets: { title: string; tags: string[] }[],
  _knownFirstVideoDate: string | null
): Promise<any> => {
  const terms = topTerms((videoSnippets || []).flatMap(v => [v.title || '', ...(v.tags || [])]), 8);
  return {
    overview: {
      channelFocus: {
        primaryCategory: terms[0] || 'UNKNOWN',
        description: `저장 제목/태그 기준 주요 반복어: ${terms.join(', ') || '없음'}`,
      },
    },
    audienceProfile: {
      summary: '공개 메타데이터만으로 실제 시청자 인구통계를 추정하지 않습니다.',
      interests: terms,
      genderRatio: [],
      ageGroups: [],
      topCountries: channelStats?.country ? [{ label: channelStats.country, value: 100 }] : [],
    },
  };
};

export const getAIChannelDashboardInsights = async (
  channelName: string,
  stats: { subscribers: number; totalViews: number; videoCount: number },
  recentVideos: { title: string; views: number; publishedAt: string }[]
): Promise<any> => {
  const avgViews = Math.round(average((recentVideos || []).map(v => number(v.views))));
  const terms = topTerms((recentVideos || []).map(v => v.title || ''), 6);
  const summary = `${channelName}: 구독자 ${number(stats?.subscribers).toLocaleString()}, 전체 조회수 ${number(stats?.totalViews).toLocaleString()}, 영상 ${number(stats?.videoCount).toLocaleString()}개. 최근 저장 영상 평균 조회수 ${avgViews.toLocaleString()}.`;
  const insight = { summary, positivePatterns: terms.slice(0, 2), growthAreas: ['동일 기간 중앙값 비교', '최신 Seed 갱신 여부 확인'] };
  return {
    aiExecutiveSummary: insight,
    aiGrowthInsight: insight,
    aiFunnelInsight: insight,
    contentPopularityPatterns: {
      titlePatterns: terms,
      optimalLength: '저장 데이터 분포를 직접 비교하세요.',
      thumbnailStyle: '이미지 픽셀 분석 없음',
    },
    contentIdeas: [],
    viewerPersona: {
      name: '미추정',
      description: '공개 메타데이터만으로 실제 시청자 페르소나를 생성하지 않습니다.',
      strategy: 'YouTube Analytics의 실제 시청자 데이터를 사용하세요.',
    },
  };
};

export const startChatSession = (): any => ({
  sendMessage: async ({ message }: any) => ({
    text: `Content OS 무료 모드입니다. 저장 백데이터를 기준으로 화면의 분석 지표를 확인하세요. 입력: ${String(message || '')}`,
  }),
});
