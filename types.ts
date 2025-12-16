
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
        // For Google Sign-In
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
        // For HTML2PDF
        html2pdf?: () => { from: (element: HTMLElement) => { set: (opt: any) => { save: () => Promise<void> } } };
    }
}

export interface VideoData {
  id: string;
  channelId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string; // ISO 8061 string
  subscribers: number;
  viewCount: number;
  viewsPerHour: number;
  likeCount: number;
  commentCount: number;
  durationMinutes: number;
  engagementRate: number; // (likes + comments) / views
  performanceRatio: number; // views / subscribers
  satisfactionScore: number; // (likes*5 + comments*10) / views
  cll: number; // Custom metric
  cul: number; // Custom metric
  grade: string; // S, A, B, C, D
  estimatedRevenue: number; // Lifetime revenue
  estimatedMonthlyRevenue: number; // Projected monthly revenue based on current VPH
  aiThumbnailScore?: number;
  channelCountry?: string; // Added for country flag display
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
  country: string; // e.g., 'KR', 'US', 'JP'
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
    WW: '🌍', KR: '🇰🇷', US: '🇺🇸', JP: '🇯🇵', NZ: '🇳🇿', TW: '🇹🇼', DE: '🇩🇪', RU: '🇷🇺', MY: '🇲🇾', MX: '🇲🇽', VN: '🇻🇳', BN: '🇧🇳', SG: '🇸🇬', GB: '🇬🇧', IN: '🇮🇳', ID: '🇮🇩', CN: '🇨🇳', CL: '🇨🇱', CA: '🇨🇦', TH: '🇹🇭', PG: '🇵🇬', PE: '🇵🇪', FR: '🇫🇷', PH: '🇵🇭', AU: '🇦🇺', HK: '🇭🇰', BR: '🇧🇷'
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
  viewsPerHour: number;
  estimatedRank?: string;
  estimatedRevenue: number;
  tags?: string[]; // Added optional tags for internal processing
}

export interface SurgingVideos {
  monthly: { longform: ChannelVideo[]; shorts: ChannelVideo[] };
  weekly: { longform: ChannelVideo[]; shorts: ChannelVideo[] };
  daily: { longform: ChannelVideo[]; shorts: ChannelVideo[] };
}

export interface FormatStats {
  totalVideos: number;
  avgViews: number;
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
  estimatedTotalRevenue: number; // Lifetime
  estimatedMonthlyRevenue: number; // Monthly
}

// FIX: Add missing AIInsights type definition.
export interface AIInsights {
  summary: string;
  patterns: string[];
  recommendations: string[];
}

// FIX: Add missing ComparisonInsights and related ChannelSummary type definitions.
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

// FIX: Move User, Plan, and AppSettings here for better organization
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
  usage: number; // monthly analyses used
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
    estimatedTotalRevenue: number; // Lifetime
    estimatedMonthlyRevenue: number; // Monthly
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
    viewCount: number; // Total views
    viewsPerHour: number;
    rankChange: number;
    channelTotalViews: number;
    channelSubscriberCount: number;
    estimatedRevenue: number; // Lifetime
    estimatedMonthlyRevenue: number; // Monthly
    categoryId?: string;
    channelHandle?: string;
    channelDescription?: string;
    durationSeconds: number;
    channelCountry?: string;
    isShorts: boolean;
}

// FIX: Add missing types for MyChannelAnalytics feature
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
  reason: string; // From AI
}

export interface AIThumbnailInsights {
  analysis: {
    // THUMBNAIL
    focalPoint: string;
    colorContrast: string;
    faceEmotionCTR: string;
    textReadability: string;
    brandingConsistency: string;
    mobileReadability: string;
    categoryRelevance: string;
    // TITLE
    titlePatterns: string;
    titleLength: string;
    titleCredibility: string;
  };
  results: {
    // THUMBNAIL
    thumbnailSummary: string;
    improvedConcepts: { concept: string; description: string; }[];
    textCandidates: string[];
    designGuide: {
      colors: string;
      fonts: string;
      layout: string;
    };
    // TITLE
    titleSummary: string;
    titleSuggestions: { title: string; reason: string; }[];
  };
  scoredThumbnails?: {
    id: string;
    totalScore: number;
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
    } | null;
    excludedCategories: string[];
    multiplier: number;
}

export interface ThumbnailViewState {
    query: string;
    thumbnails: VideoData[];
    insights: AIThumbnailInsights | null;
}

export interface RankingViewState {
    activeTab: 'channels' | 'videos' | 'performance';
    country: string;
    category: string;
    excludedCategories: string[];
    videoFormat: 'all' | 'longform' | 'shorts';
    results: (ChannelRankingData | VideoRankingData)[];
    selectedChannels: Record<string, { name: string }>;
}

// --- Algorithm Finder Types ---
export interface AlgorithmOption {
    text: string; // The "Thumbnail" text
    traits: {
        category: string; // e.g. 'Music', 'Movie', 'Comedy', 'Life', 'Knowledge'
        age: string; // e.g. '10-15', '16-19', '20-24', '30-39' (Detailed)
        tone: string; // e.g. 'Fun', 'Healing', 'Info', 'Shock'
        keyword: string; // e.g. 'Kpop', 'Vlog', 'Money'
        gender?: 'Male' | 'Female' | 'Neutral'; // New trait
    };
}

export interface AlgorithmStage {
    id: string; // A, B, C, D, E, F
    title: string;
    description: string;
    options: AlgorithmOption[];
}

export interface AlgorithmResult {
    score: number; // 0-100 Consistency Score
    profile: {
        category: string;
        age: string;
        tone: string;
        keyword: string;
        persona: string; // Detailed description
        gender?: string; // e.g. "여성향", "남성향"
    };
    seriesRecommendations: {
        title: string;
        concept: string;
    }[];
    recommendedKeywords: { // New field for Core/Side keywords
        core: string[];
        side: string[];
    };
    statusMessage: string;
    strategy: string;
    analysisLog: string[]; // Reasons for score deductions
    recommendedChannels: {
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
