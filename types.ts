
export interface VideoData {
  id: string;
  channelId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string; // ISO 8061 string
  subscribers: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  durationMinutes: number;
  engagementRate: number; // (likes + comments) / views
  channelCountry?: string; // Added for country flag display
}

export type AnalysisMode = 'keyword' | 'channel';

export type VideoLength = 'any' | 'short' | 'medium' | 'long';
export type Period = 'any' | '7' | '30' | '90';
export type SortBy = 'viewCount' | 'publishedAt' | 'engagementRate' | 'relevance';
export type VideoFormat = 'any' | 'longform' | 'shorts';

export interface FilterState {
  minViews: number;
  videoLength: VideoLength;
  videoFormat: VideoFormat;
  period: Period;
  sortBy: SortBy;
  resultsLimit: number;
  country: string; // e.g., 'KR', 'US', 'JP'
  category: string;
}

export const YOUTUBE_CATEGORY_OPTIONS = [
    { label: "전체 카테고리 (All)", value: "all" },
    { label: "Entertainment (24)", value: "24" },
    { label: "People & Blogs (22)", value: "22" },
    { label: "Gaming (20)", value: "20" },
    { label: "Music (10)", value: "10" },
    { label: "Howto & Style (26)", value: "26" },
    { label: "Education (27)", value: "27" },
    { label: "Sports (17)", value: "17" },
    { label: "Comedy (23)", value: "23" },
    { label: "Science & Technology (28)", value: "28" },
    { label: "News & Politics (25)", value: "25" },
];

export const COUNTRY_FLAGS: { [key: string]: string } = {
    WW: '🌍', KR: '🇰🇷', US: '🇺🇸', JP: '🇯🇵', NZ: '🇳🇿', TW: '🇹🇼', DE: '🇩🇪', RU: '🇷🇺', MY: '🇲🇾', MX: '🇲🇽', VN: '🇻🇳', BN: '🇧🇳', SG: '🇸🇬', GB: '🇬🇧', IN: '🇮🇳', ID: '🇮🇩', CN: '🇨🇳', CL: '🇨🇱', CA: '🇨🇦', TH: '🇹🇭', PG: '🇵🇬', PE: '🇵🇪', FR: '🇫🇷', PH: '🇵🇭', AU: '🇦🇺', HK: '🇭🇰', BR: '🇧🇷'
};


export const YOUTUBE_CATEGORIES_KR: { [key: string]: string } = {
    '1': '영화/애니메이션 (Film & Animation)', '2': '자동차/교통 (Autos & Vehicles)', '10': '음악 (Music)', '15': '애완동물/동물 (Pets & Animals)',
    '17': '스포츠 (Sports)', '19': '여행/이벤트 (Travel & Events)', '20': '게임 (Gaming)', '22': '인물/블로그 (People & Blogs)',
    '23': '코미디 (Comedy)', '24': '엔터테인먼트 (Entertainment)', '25': '뉴스/정치 (News & Politics)', '26': '노하우/스타일 (Howto & Style)',
    '27': '교육 (Education)', '28': '과학 기술 (Science & Technology)', '29': 'NGO/운동 (Nonprofits & Activism)',
};

export interface ChannelDetails {
  id: string;
  name: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  publishedAt: string; // ISO 8601 string for channel creation
  avgViews: number;
  recentUploads: number; // e.g., in the last 30 days
}

export interface ChannelVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  engagementRate: number;
  isShorts: boolean;
  durationMinutes: number;
  tags?: string[]; // Added optional tags for internal processing
}

export interface SurgingVideos {
  monthly: { longform: ChannelVideo[]; shorts: ChannelVideo[] };
  weekly: { longform: ChannelVideo[]; shorts: ChannelVideo[] };
  daily: { longform: ChannelVideo[]; shorts: ChannelVideo[] };
}

export interface FormatStats {
  totalVideos: number;
  totalViewsInPeriod: number;
  avgEngagementRate: number;
  avgLikes: number;
  avgComments: number;
}

export interface TrendPoint {
  date: string; // e.g., '10/26'
  views: number;
  engagements: number;
  likes: number;
  thumbnails?: string[];
  subscribers?: number;
  subscriberChange?: number;
}

export interface AudienceProfile {
  summary: string;
  interests: string[];
  genderRatio: { label: string; value: number }[];
  ageGroups: { label: string; value: number }[];
  topCountries: { label: string; value: number }[];
}

export interface MonthlyStat {
    month: string;
    views?: number;
    subscribers?: number;
}

export interface ChannelAnalysisData {
  id: string;
  name: string;
  handle?: string;
  thumbnailUrl: string;
  subscriberCount: number;
  totalViews: number;
  totalVideos: number;
  publishedAt: string;
  description: string;
  channelKeywords: string[];
  overview: {
    uploadPattern: {
      last30Days: number;
      last7Days: number;
      last24Hours: number;
    };
    channelFocus: {
      categories: string[];
      tags: string[];
    };
    popularKeywords: { keyword: string; score: number }[];
  };
  videoList: ChannelVideo[];
  surgingVideos: SurgingVideos;
  audienceProfile: AudienceProfile;
  lastFetched?: string; // ISO timestamp
  deepDiveReport?: AI6StepReport;
}

export interface AIInsights {
  summary: string;
  patterns: string[];
  suggestions: string[];
}

export interface ChannelSummary {
  name: string;
  observedCharacteristics: string[];
  stats: {
    '평균 조회수 (Avg Views)': string;
    '평균 영상 길이 (Avg Length)': string;
  };
}

export interface ComparisonInsights {
  summary: string;
  channelA_summary: ChannelSummary;
  channelB_summary: ChannelSummary;
  suggestion: string;
}

export interface SimilarChannelData {
  id: string;
  name: string;
  handle: string;
  thumbnailUrl: string;
  subscriberCount: number;
  totalViews: number;
  videoCount: number;
  similarityScore: number;
}

export interface CommentInsights {
  summary: string;
  positivePoints: string[];
  negativePoints: string[];
}

export interface EngagementLever {
    type: 'comment' | 'like' | 'subscribe';
    recommendation: string;
}

export interface AI6StepReport {
    currentStage: string;
    viewerValue: string;
    dataFacts: string[];
    interpretation: string;
    engagementLevers: EngagementLever[];
    nextAction: string;
    hybridFormulaAnalysis?: { [key: string]: string };
}

export interface VideoComment {
  text: string;
  author: string;
  likeCount: number;
  publishedAt: string;
}

export interface VideoDetailData {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationMinutes: number;
  channelId: string;
  channelTitle: string;
  channelSubscriberCount: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  embedHtml: string;
  embeddable: boolean;
  comments: VideoComment[];
  benchmarks?: {
      title: string;
      views: number;
      thumbnailUrl: string;
  }[];
  commentInsights?: CommentInsights;
  deepDiveReport?: AI6StepReport;
}

export interface Plan {
    name: string;
    analyses: number;
    price: number;
}

export interface FeatureUsage {
  used: number;
  limit: number;
}

export interface UserUsage {
  search: FeatureUsage;
  channelDetail: FeatureUsage;
  videoDetail: FeatureUsage;
  aiInsight: FeatureUsage;
  aiContentMaker: FeatureUsage;
  outlierAnalysis: FeatureUsage;
  credits: FeatureUsage;
}

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  plan: 'Free' | 'Pro' | 'Biz';
  usage: UserUsage;
  password?: string;
  planExpirationDate?: string;
  apiKeys?: {
    analytics?: string;
  };
}

export interface AnalyticsConnection {
    connected: boolean;
    channelName: string;
    channelId: string;
    thumbnailUrl: string;
}

export interface AppSettings {
    freePlanLimit: number;
    plans: Record<'pro' | 'biz', Plan>;
    apiKeys: {
        youtube: string;
        analytics: string;
        reporting: string;
        gemini: string;
    };
    analyticsConnection: AnalyticsConnection | null;
}

export interface ChannelRankingData {
    id: string;
    name: string;
    channelHandle?: string;
    thumbnailUrl: string;
    subscriberCount: number;
    newSubscribersInPeriod: number;
    newViewsInPeriod: number;
    videoCount: number;
    viewCount: number;
    rank: number;
    rankChange: number;
    categoryId?: string;
    description?: string;
    channelCountry?: string;
    tags?: string[];
    grade?: string;
    categoryTags?: string[];
    latestVideoThumbnailUrl?: string;
}

export interface VideoRankingData {
    id: string;
    rank: number;
    name: string;
    channelName: string;
    channelId: string;
    thumbnailUrl: string;
    publishedAt: string;
    viewCount: number; // Total views
    rankChange: number;
    channelTotalViews: number;
    channelSubscriberCount: number;
    categoryId?: string;
    channelHandle?: string;
    channelDescription?: string;
    durationSeconds: number;
    channelCountry?: string;
    isShorts: boolean;
    description?: string;
    tags?: string[];
    channelThumbnailUrl?: string;
    channelCategoryTags?: string[];
}

export interface RetentionDataPoint {
  time: number;
  retention: number;
}

export interface TrafficSource {
  name: string;
  percentage: number;
  views: number;
}

export interface VideoAnalytics {
    id: string;
    thumbnailUrl: string;
    title: string;
    publishedAt: string;
    views: number;
    ctr: number;
    avgViewDurationSeconds: number;
}

export interface AIAnalyticsInsight {
    summary: string;
    positivePatterns: string[];
    growthAreas: string[];
}

export interface BenchmarkComparisonData {
    myChannelName: string;
    benchmarkChannelName: string;
    comparison: {
        metric: string;
        myValue: string;
        benchmarkValue: string;
    }[];
    aiSummary: string;
}

export interface DailyStat {
    date: string;
    views: number;
    subscribersGained: number;
    subscribersLost: number;
}

export interface MyChannelAnalyticsData {
    name: string;
    thumbnailUrl: string;
    aiExecutiveSummary: AIAnalyticsInsight;
    kpi: {
        viewsLast30d: number;
        netSubscribersLast30d: number;
        watchTimeHoursLast30d: number;
        ctrLast30d: number;
        avgViewDurationSeconds: number;
        impressionsLast30d: number;
    };
    dailyStats: DailyStat[];
    aiGrowthInsight: AIAnalyticsInsight;
    funnelMetrics: {
        impressions: number;
        ctr: number;
        views: number;
        avgViewDuration: number;
    };
    aiFunnelInsight: AIAnalyticsInsight;
    contentSuccessFormula: {
        titlePatterns: string[];
        optimalLength: string;
        thumbnailStyle: string;
    };
    contentIdeas: { title: string; reason: string; }[];
    retentionData: {
        average: RetentionDataPoint[];
        topVideo: RetentionDataPoint[];
    };
    trafficSources: TrafficSource[];
    videoAnalytics: VideoAnalytics[];
    viewerPersona: {
        name: string;
        description: string;
        strategy: string;
    };
    viewershipData: {
        bestUploadTime: string;
        heatmap: number[][];
    };
    audienceProfile: AudienceProfile;
}

export interface AIThumbnailInsights {
  analysis: {
    focalPoint: string;
    colorContrast: string;
    faceEmotionCTR: string;
    textReadability: string;
    brandingConsistency: string;
    mobileReadability: string;
    categoryRelevance: string;
    titlePatterns: string;
    titleLength: string;
    titleCredibility: string;
  };
  results: {
    thumbnailSummary: string;
    improvedConcepts: { concept: string; description: string; }[];
    textCandidates: string[];
    designGuide: {
      colors: string;
      fonts: string;
      layout: string;
    };
    titleSummary: string;
    titleSuggestions: { title: string; reason: string; }[];
  };
}


export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isLoading?: boolean;
}

export interface PopularQuery {
    query: string;
    mode: AnalysisMode;
}

export interface GameScore {
  name: string;
  score: number;
  date: string;
  keyword: string;
}

export interface OutlierViewState {
    query: string;
    mode: AnalysisMode;
    analysisResult: { videos: VideoData[]; avgViews: number } | null;
    trendingCountry: string;
    trendingData: {
        summary: string;
        viralFactors: string[];
        topKeywords: string[];
        topChannels: string[];
    } | null;
    excludedCategories: string[];
    multiplier: number;
}

export interface ThumbnailViewState {
    query: string;
    thumbnails: VideoData[];
    insights: AIThumbnailInsights | null;
}

export type VideoRankingMetric = 'daily' | 'weekly' | 'monthly';

export type ChannelRankingMetric = 
  'subs_daily' | 'subs_weekly' | 'subs_monthly' | 'subs_total' |
  'views_daily' | 'views_weekly' | 'views_monthly' | 'views_total';

export interface TopChartsViewState {
    activeTab: 'channels' | 'videos' | 'performance';
    country: string;
    category: string;
    excludedCategories: string[];
    videoFormat: 'all' | 'longform' | 'shorts';
    results: (ChannelRankingData | VideoRankingData)[];
    selectedChannels: Record<string, { name: string; }>;
    videoRankingMetric?: VideoRankingMetric;
    channelRankingMetric?: ChannelRankingMetric;
}

// --- Identity Finder Types ---
export interface IdentityOption {
    text: string; // The "Thumbnail" text
    traits: {
        category: string;
        age: string;
        tone: string;
        keyword: string;
        gender?: 'Male' | 'Female' | 'Neutral';
    };
}

export interface IdentityStage {
    id: string; // A, B, C, D, E, F
    title: string;
    description: string;
    options: IdentityOption[];
}

export interface IdentityResult {
    score: number;
    profile: {
        category: string;
        age: string;
        tone: string;
        keyword: string;
        persona: string;
        gender?: string;
    };
    seriesIdeas: {
        title: string;
        concept: string;
        concept_en: string;
    }[];
    suggestedKeywords: {
        core: string[];
        side: string[];
    };
    statusMessage: string;
    statusMessage_en: string;
    strategy: string;
    strategy_en: string;
    analysisLog: string[];
    analysisLog_en: string[];
    suggestedChannels: {
        korea: { name: string; reason: string; }[];
        global: { name: string; reason: string; }[];
    };
}

export interface CollectionItem {
    id: string;
    type: 'channel' | 'video';
    title: string;
    thumbnailUrl: string;
    metric1: string; // e.g. Subscribers or Views
    metric2: string; // e.g. Video Count or Likes
    date: string; // ISO String
    url: string;
    raw: any; // Store raw data for potential re-analysis or detail view
}

// --- Influencer Marketing Types ---
export interface InfluencerChannelResult {
    id: string;
    name: string;
    thumbnailUrl: string;
    subscriberCount: number;
    matchRate: number; // Renamed from algorithmScore
    algorithmReason: string;
    email?: string;
    emailRevealed?: boolean;
    isMyChannel?: boolean;
}

export interface InfluencerAnalysisDetail {
    channelName: string;
    keyword: string;
    coreSummary: string;
    audienceAlignment: {
        score: number;
        reason: string;
    };
    contentSynergy: string;
    kpiRecommendations: {
        core: string[];
        secondary: string[];
    };
    finalConclusion: string;
}

// FIX: Add type alias for RankingViewState to maintain compatibility with older components.
export type RankingViewState = TopChartsViewState;
