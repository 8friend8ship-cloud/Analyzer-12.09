
declare global {
    interface Window {
        env: {
            FIREBASE_API_KEY?: string;
            FIREBASE_AUTH_DOMAIN?: string;
            FIREBASE_PROJECT_ID?: string;
            FIREBASE_STORAGE_BUCKET?: string;
            FIREBASE_MESSAGING_SENDER_ID?: string;
            FIREBASE_APP_ID?: string;
            ADMIN_EMAIL?: string;
            API_KEY?: string; // Gemini API Key
            [key: string]: string | undefined;
        };
        google?: {
            accounts: {
                id: {
                    initialize: (config: { client_id: string; callback: (response: any) => void; }) => void;
                    renderButton: (
                        parent: HTMLElement,
                        options: {
                            type: string;
                            theme: string;
                            size: string;
                            text: string;
                            shape: string;
                            logo_alignment: string;
                            width: string;
                        }
                    ) => void;
                };
            };
        };
        html2pdf?: () => { from: (element: HTMLElement) => { set: (opt: any) => { save: () => Promise<void> } } };
    }
}

export interface VideoData {
  id: string;
  channelId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  subscribers: number;
  viewCount: number;
  viewsPerHour: number;
  likeCount: number;
  commentCount: number;
  durationMinutes: number;
  engagementRate: number;
  performanceRatio: number;
  satisfactionScore: number;
  cll: number;
  cul: number;
  grade: string;
  estimatedRevenue: number;
  estimatedMonthlyRevenue: number;
  aiThumbnailScore?: number;
  aiThumbnailReason?: string;
  aiThumbnailHook?: string;
  aiKeywordScore?: number;
  channelCountry?: string;
}

export type AnalysisMode = 'keyword' | 'channel';

export type VideoLength = 'any' | 'short' | 'medium' | 'long';
export type Period = 'any' | '7' | '30' | '90';
export type SortBy = 'viewCount' | 'publishedAt' | 'viewsPerHour' | 'engagementRate' | 'performanceRatio' | 'satisfactionScore' | 'cll' | 'cul' | 'grade';
export type VideoFormat = 'any' | 'longform' | 'shorts';

export interface FilterState {
  minViews: number;
  videoLength: VideoLength;
  videoFormat: VideoFormat;
  period: Period;
  sortBy: SortBy;
  resultsLimit: number;
  country: string;
  category: string;
}

export const YOUTUBE_CATEGORY_OPTIONS = [
    { label: "전체 카테고리", value: "all" },
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
    WW: '🌍', KR: '🇰🇷', US: '🇺🇸', JP: '🇯🇵', NZ: '🇳🇿', TW: '🇹🇼', DE: '🇩🇪', RU: '🇷🇺', MY: '🇲🇾', MX: '🇲🇽', VN: '🇻🇳', BN: '🇧🇳', SG: '🇸🇬', GB: '🇬🇧', IN: '🇮🇳', ID: '🇮🇩', CN: 'CN', CL: 'CL', CA: 'CA', TH: 'TH', PG: 'PG', PE: 'PE', FR: 'FR', PH: 'PH', AU: 'AU', HK: 'HK', BR: 'BR'
};

export interface ChannelDetails {
  id: string;
  name: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  publishedAt: string;
  avgViews: number;
  recentUploads: number;
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
  viewsPerHour: number;
  estimatedRank?: string;
  estimatedRevenue: number;
  tags?: string[];
}

export interface SurgingVideos {
  monthly: { longform: ChannelVideo[]; shorts: ChannelVideo[] };
  weekly: { longform: ChannelVideo[]; shorts: ChannelVideo[] };
  threeMonths: { longform: ChannelVideo[]; shorts: ChannelVideo[] };
}

export interface FormatStats {
  totalVideos: number;
  avgViews: number;
  avgEngagementRate: number;
  avgLikes: number;
  avgComments: number;
}

export interface TrendPoint {
  date: string;
  views: number;
  engagements: number;
  likes: number;
  thumbnails?: string[];
}

export interface PerformanceTrendData {
  longFormStats: FormatStats;
  shortsStats: FormatStats;
  dailyTrends: TrendPoint[];
}

export interface AudienceProfile {
  summary: string;
  interests: string[];
  genderRatio: { label: string; value: number }[];
  ageGroups: { label: string; value: number }[];
  topCountries: { label: string; value: number }[];
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
    competitiveness: {
      categories: string[];
      tags: string[];
    };
    popularKeywords: { keyword: string; score: number }[];
  };
  videoList: ChannelVideo[];
  surgingVideos: SurgingVideos;
  performanceTrend: PerformanceTrendData;
  audienceProfile: AudienceProfile;
  estimatedTotalRevenue: number;
  estimatedMonthlyRevenue: number;
}

export interface AIInsights {
  summary: string;
  patterns: string[];
  recommendations: string[];
}

export interface ChannelSummary {
  name: string;
  strengths: string[];
  stats: {
    '평균 조회수': string;
    '평균 영상 길이': string;
  };
}

export interface ComparisonInsights {
  summary: string;
  channelA_summary: ChannelSummary;
  channelB_summary: ChannelSummary;
  recommendation: string;
}

export interface VideoComment {
  text: string;
  author: string;
  likeCount: number;
  publishedAt: string;
}

export interface CommentInsights {
  summary: string;
  positivePoints: string[];
  negativePoints: string[];
}

export interface AIVideoDeepDiveInsights {
  topicAnalysis: {
    summary: string;
    successFactors: string[];
  };
  audienceAnalysis: {
    summary: string;
    engagementPoints: string[];
  };
  performanceAnalysis: {
    summary: string;
    trafficSources: string[];
    subscriberImpact: string;
  };
  retentionStrategy: {
    summary: string;
    improvementPoints: {
        point: string;
        reason: string;
        productionTip: string;
        editingTip: string;
    }[];
  };
  strategicRecommendations: {
    contentStrategy: string;
    newTopics: string[];
    growthStrategy: string;
    bestUploadTime?: {
        day: string;
        time: string;
        reason: string;
        weeklySchedule: { day: string; hour: number; reason: string }[];
    };
  };
  thumbnailAnalysis?: {
      score: number;
      reason: string;
  };
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
  commentInsights: CommentInsights;
  deepDiveInsights: AIVideoDeepDiveInsights;
  estimatedRevenue: number;
  estimatedMonthlyRevenue: number;
  benchmarks?: {
      title: string;
      views: number;
      thumbnailUrl: string;
  }[];
}

export interface Plan {
    name: string;
    analyses: number;
    price: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  plan: 'Free' | 'Pro' | 'Biz';
  usage: number;
  apiKeyYoutube?: string;
  apiKeyGemini?: string;
  password?: string;
  planExpirationDate?: string;
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
    viewsInPeriod: number;
    videoCount: number;
    viewCount: number;
    rank: number;
    rankChange: number;
    estimatedTotalRevenue: number;
    estimatedMonthlyRevenue: number;
    categoryId?: string;
    description?: string;
    channelCountry?: string;
}

export interface VideoRankingData {
    id: string;
    rank: number;
    name: string;
    channelName: string;
    channelId: string;
    thumbnailUrl: string;
    publishedDate: string;
    viewCount: number;
    viewsPerHour: number;
    rankChange: number;
    channelTotalViews: number;
    channelSubscriberCount: number;
    estimatedRevenue: number;
    estimatedMonthlyRevenue: number;
    categoryId?: string;
    channelHandle?: string;
    channelDescription?: string;
    durationSeconds: number;
    channelCountry?: string;
    isShorts: boolean;
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
    strengths: string[];
    opportunities: string[];
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
    dailyStats: { date: string; netSubscribers: number; }[];
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

export interface BenchmarkComparisonData {
    myChannelKpi: MyChannelAnalyticsData['kpi'];
    benchmarkChannelKpi: MyChannelAnalyticsData['kpi'];
    dailyComparison: {
        date: string;
        myChannelViews: number;
        benchmarkViews: number;
    }[];
    aiInsight: {
        summary: string;
        strength: string;
        weakness: string;
        recommendation: string;
    };
}

export interface SimilarChannelData {
  id: string;
  name: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  reason: string;
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
  scoredThumbnails?: {
    id: string;
    totalScore: number;
    hook: string;
    keywordScore: number;
    reason: string;
  }[];
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
        sources?: { title: string; url: string }[];
    } | null;
    excludedCategories: string[];
    multiplier: number;
}

export interface ThumbnailViewState {
    query: string;
    thumbnails: VideoData[];
    insights: AIThumbnailInsights | null;
}

export interface RankingTabCache {
    results: (ChannelRankingData | VideoRankingData)[];
    params: any;
}

export interface RankingViewState {
    activeTab: 'channels' | 'videos' | 'performance';
    country: string;
    category: string;
    excludedCategories: string[];
    videoFormat: 'all' | 'longform' | 'shorts';
    results: (ChannelRankingData | VideoRankingData)[];
    selectedChannels: Record<string, { name: string }>;
    tabCache: {
        channels?: RankingTabCache;
        videos?: RankingTabCache;
        performance?: RankingTabCache;
    };
}

export interface AlgorithmOption {
    text: string;
    traits: {
        category: string;
        age: string;
        tone: string;
        keyword: string;
        gender?: 'Male' | 'Female' | 'Neutral';
    };
}

export interface AlgorithmStage {
    id: string;
    title: string;
    description: string;
    options: AlgorithmOption[];
}

export interface AlgorithmResult {
    score: number;
    profile: {
        category: string;
        age: string;
        tone: string;
        keyword: string;
        persona: string;
        gender?: string;
    };
    seriesRecommendations: {
        title: string;
        concept: string;
    }[];
    recommendedKeywords: {
        core: string[];
        side: string[];
    };
    statusMessage: string;
    strategy: string;
    analysisLog: string[];
    recommendedChannels: {
        korea: { name: string; reason: string; }[];
        global: { name: string; reason: string; }[];
    };
}

export type CollectionType = 'channel' | 'video' | 'outlier' | 'trend' | 'thumbnail' | 'algorithm' | 'myChannel';

export interface CollectionItem {
    id: string;
    type: CollectionType;
    title: string;
    thumbnailUrl: string;
    metric1: string; // Dynamic label based on type
    metric2: string; // Dynamic label based on type
    date: string; // ISO String of saved time
    url: string; // Direct link if available
    raw: any; // Full analysis object for point-in-time rendering
}
