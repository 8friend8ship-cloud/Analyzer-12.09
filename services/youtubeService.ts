
import type { 
    VideoData, 
    ChannelAnalysisData, 
    VideoRankingData, 
    VideoDetailData, 
    VideoComment, 
    MyChannelAnalyticsData, 
    AnalysisMode, 
    FilterState,
    BenchmarkComparisonData,
    SimilarChannelData,
    CommentInsights,
    DeepDiveInsights
} from '../types';
import { 
    getAICommentInsights,
    getAIDeepDiveInsights
} from './geminiService';
import { mockVideoData, mockChannelAnalysisData, mockRankingData, mockVideoDetailData, mockVideoComments, mockMyChannelAnalyticsData, mockBenchmarkComparisonData, mockSimilarChannels } from './mockData';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// --- Helper Functions (kept for potential re-use, but not used in mock mode) ---
// ... (original helper functions can be kept but are not critical for mock mode)

// --- MOCK IMPLEMENTATIONS ---

export const resolveChannelId = async (query: string, apiKey: string): Promise<string | null> => {
    console.log("[MOCK] Resolving channel ID for:", query);
    // Return a consistent mock ID for testing
    return new Promise(resolve => setTimeout(() => resolve('UC-lHJZR3Gqxm24_Vd_AJ5Yw'), 300));
};

export const fetchYouTubeData = async (mode: AnalysisMode, query: string, filters: FilterState, apiKey: string): Promise<VideoData[]> => {
    console.log(`[MOCK] Fetching YouTube data for mode: ${mode}, query: ${query}`);
    return new Promise(resolve => setTimeout(() => resolve(mockVideoData), 500));
};

export const fetchChannelAnalysis = async (channelId: string, apiKey: string): Promise<ChannelAnalysisData> => {
    console.log(`[MOCK] Fetching channel analysis for ID: ${channelId}`);
    return new Promise(resolve => setTimeout(() => resolve(mockChannelAnalysisData), 800));
};

export const fetchRankingData = async (type: 'channels' | 'videos', filters: any, apiKey: string): Promise<(VideoRankingData | VideoData)[]> => {
    console.log(`[MOCK] Fetching ranking data for type: ${type}`);
    const data = mockRankingData[type] || [];
    return new Promise(resolve => setTimeout(() => resolve(data as any), 600));
};

export const fetchVideoDetails = async (videoId: string, apiKey: string): Promise<VideoDetailData> => {
    console.log(`[MOCK] Fetching video details for ID: ${videoId}`);
    return new Promise(resolve => setTimeout(() => resolve(mockVideoDetailData), 400));
};

export const fetchVideoComments = async (videoId: string, apiKey: string): Promise<VideoComment[]> => {
    console.log(`[MOCK] Fetching video comments for ID: ${videoId}`);
    return new Promise(resolve => setTimeout(() => resolve(mockVideoComments), 300));
};

export const fetchMyChannelAnalytics = async (channelId: string, apiKey: string): Promise<MyChannelAnalyticsData> => {
    console.log(`[MOCK] Fetching 'My Channel' analytics for ID: ${channelId}`);
    return new Promise(resolve => setTimeout(() => resolve(mockMyChannelAnalyticsData), 1000));
};

export const convertPublicDataToKPI = (publicData: ChannelAnalysisData): MyChannelAnalyticsData['kpi'] => {
    // This can still be a real function as it operates on data, even mock data
    return {
        viewsLast30d: publicData.videoList
            .filter(v => new Date(v.publishedAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
            .reduce((sum, v) => sum + v.viewCount, 0),
        netSubscribersLast30d: Math.round(publicData.subscriberCount * 0.02),
        watchTimeHoursLast30d: 0,
        ctrLast30d: 0,
        avgViewDurationSeconds: 0,
        impressionsLast30d: 0
    };
};

export const fetchBenchmarkComparison = async (
    myChannel: MyChannelAnalyticsData, 
    benchmarkKPI: MyChannelAnalyticsData['kpi'],
    benchmarkName: string
): Promise<BenchmarkComparisonData> => {
    console.log(`[MOCK] Fetching benchmark comparison against: ${benchmarkName}`);
    return new Promise(resolve => setTimeout(() => resolve(mockBenchmarkComparisonData), 700));
};

export const fetchSimilarChannels = async (channelId: string, apiKey: string): Promise<SimilarChannelData[]> => {
    console.log(`[MOCK] Fetching similar channels for ID: ${channelId}`);
    return new Promise(resolve => setTimeout(() => resolve(mockSimilarChannels), 500));
};

export const analyzeVideoDeeply = async (videoData: VideoDetailData, apiKey: string): Promise<{
    commentInsights: CommentInsights;
    deepDiveInsights: DeepDiveInsights;
}> => {
    console.log(`[MOCK] Deeply analyzing video: ${videoData.title}`);
    // These call Gemini which is already mocked to be compliant, so we can call them.
    const commentInsights = await getAICommentInsights(mockVideoComments);
    const deepDiveInsights = await getAIDeepDiveInsights(videoData);

    return new Promise(resolve => setTimeout(() => resolve({ commentInsights, deepDiveInsights }), 1200));
};