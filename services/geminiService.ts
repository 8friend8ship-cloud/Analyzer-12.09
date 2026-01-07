
import { GoogleGenAI, Type, Chat } from "@google/genai";
// FIX: Add missing types for comment and deep dive analysis
import type { VideoData, AIInsights, AnalysisMode, ComparisonInsights, ChannelAnalysisData, AudienceProfile, AIThumbnailInsights, MyChannelAnalyticsData, CommentInsights, DeepDiveInsights, VideoDetailData } from '../types';
import { getGeminiApiKey } from './apiKeyService';

const countryToLanguageMap: { [key: string]: string } = {
    'US': 'English',
    'JP': 'Japanese',
    'GB': 'English',
    'DE': 'German',
    'FR': 'French',
    'CN': 'Chinese (Simplified)',
    'RU': 'Russian',
    'CA': 'English',
    'AU': 'English',
    'VN': 'Vietnamese',
    'ID': 'Indonesian',
    'TH': 'Thai',
    'MY': 'Malay',
    'SG': 'English',
    'PH': 'English',
    'MX': 'Spanish',
    'CL': 'Spanish',
    'PE': 'Spanish',
    'NZ': 'English',
    'HK': 'Chinese (Traditional)',
    'TW': 'Chinese (Traditional)',
    'IN': 'Hindi',
    'BN': 'Malay',
    'PG': 'English',
    'KR': 'Korean',
};


// Uses the Gemini API to translate a keyword.
export const translateKeyword = async (keyword: string, targetCountry: string): Promise<string> => {
  const targetLanguage = countryToLanguageMap[targetCountry];
  if (!targetLanguage) {
    console.log(`No language mapping for country ${targetCountry}, returning original keyword.`);
    return keyword;
  }

  console.log(`Translating "${keyword}" to ${targetLanguage} for country ${targetCountry}`);

  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const translationPrompt = `Translate the following Korean keyword into ${targetLanguage}. Return only the translated keyword and nothing else.\nKorean keyword: "${keyword}"`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: translationPrompt
    });

    const translatedText = response.text.trim().replace(/"/g, ''); // Clean up quotes
    console.log(`Translation successful: ${translatedText}`);
    return translatedText;

  } catch (error) {
    console.error("Error calling Gemini API for translation:", error);
    return `${keyword} (${targetCountry} translation)`;
  }
};

export const getAIBenchmarkRecommendations = async (channelName: string, topics: string[]): Promise<{ name: string; reason: string }[]> => {
    // This feature is disabled for compliance.
    return [];
};

export const getAIChannelRecommendations = async (category: string, keyword: string): Promise<{ korea: { name: string; reason: string }[]; global: { name: string; reason: string }[] }> => {
    // This feature is disabled for compliance.
    return { korea: [], global: [] };
};


// Uses the Gemini API to generate insights from video data.
export const getAIInsights = async (videoData: VideoData[], query: string, mode: AnalysisMode): Promise<AIInsights> => {
  // This feature is disabled for compliance.
  return generateMockInsights(query);
};

export const getAIComparisonInsights = async (channelA: {query: string, videos: VideoData[]}, channelB: {query: string, videos: VideoData[]}): Promise<ComparisonInsights> => {
    // This feature is disabled for compliance.
    return generateMockComparisonInsights(channelA.query, channelB.query);
};

export const getRelatedKeywords = async (keyword: string): Promise<string[]> => {
  if (!keyword.trim()) {
    return [];
  }
  // This feature is disabled for compliance.
  return [];
};

export const getAIAdKeywords = async (videoData: VideoData[]): Promise<string[]> => {
  // This feature is disabled for compliance.
  return [];
};

export const getAIChannelComprehensiveAnalysis = async (
    channelStats: { name: string; publishedAt: string; subscriberCount: number; totalViews: number; totalVideos: number; description: string },
    videoSnippets: { title: string; tags: string[] }[],
    knownFirstVideoDate: string | null
): Promise<{
    overview: Omit<ChannelAnalysisData['overview'], 'uploadPattern'>;
    audienceProfile: AudienceProfile;
}> => {
    // This feature is disabled for compliance.
    return {
        overview: { competitiveness: { categories: [], tags: [] }, popularKeywords: [] },
        audienceProfile: generateMockAudienceProfile(),
    };
};

export const getAIChannelDashboardInsights = async (
    channelName: string,
    stats: { subscribers: number; totalViews: number; videoCount: number },
    recentVideos: { title: string; views: number; publishedAt: string }[]
): Promise<Partial<MyChannelAnalyticsData>> => {
    // This feature is disabled for compliance.
    return {};
};

// FIX: Add missing mock function for comment insights
export const getAICommentInsights = async (comments: any[]): Promise<CommentInsights> => {
    // This feature is disabled for compliance.
    return {
        summary: "AI 댓글 분석 기능이 비활성화되었습니다.",
        positivePoints: [],
        negativePoints: [],
    };
};

// FIX: Add missing mock function for deep dive video analysis
export const getAIDeepDiveInsights = async (videoData: VideoDetailData): Promise<DeepDiveInsights> => {
    // This feature is disabled for compliance.
    return {
        topicAnalysis: {
            summary: "AI 분석 비활성화. 주제는 영상 제목과 설명 기반으로 유추됩니다.",
            successFactors: ["분석 비활성화"],
        },
        audienceAnalysis: {
            summary: "AI 분석 비활성화. 시청자 분석은 채널 데이터를 기반으로 합니다.",
            engagementPoints: ["분석 비활성화"],
        },
        performanceAnalysis: {
            summary: "AI 분석 비활성화. 성과 지표는 공개된 데이터를 기반으로 합니다.",
            trafficSources: ["분석 비활성화"],
            subscriberImpact: "분석 비활성화",
        },
        retentionStrategy: {
            summary: "AI 분석 비활성화. 일반적인 유지율 전략을 따릅니다.",
            improvementPoints: [{
                point: "분석 비활성화",
                reason: "AI 기능이 비활성화되었습니다.",
                productionTip: "팁 없음",
                editingTip: "팁 없음"
            }],
        },
        strategicRecommendations: {
            contentStrategy: "AI 분석 비활성화.",
            growthStrategy: "AI 분석 비활성화.",
            newTopics: ["분석 비활성화"],
        },
    };
};

const generateMockInsights = (query: string): AIInsights => {
    return {
        summary: `AI 분석 기능이 비활성화되었습니다.`,
        patterns: [],
        recommendations: [],
    };
};

const generateMockComparisonInsights = (queryA: string, queryB: string): ComparisonInsights => {
    return {
        summary: `AI 분석 기능이 비활성화되었습니다.`,
        channelA_summary: {
            name: queryA,
            strengths: [],
            stats: { "평균 조회수": "N/A", "평균 영상 길이": "N/A" }
        },
        channelB_summary: {
            name: queryB,
            strengths: [],
            stats: { "평균 조회수": "N/A", "평균 영상 길이": "N/A" }
        },
        recommendation: "AI 분석 기능이 비활성화되었습니다."
    };
};

export const getAIThumbnailAnalysis = async (
  videoData: { id: string; title: string; thumbnailUrl: string }[],
  query: string
): Promise<AIThumbnailInsights> => {
  // This feature is disabled for compliance.
  const fallbackInsights: AIThumbnailInsights = {
    analysis: { focalPoint: "AI 분석 비활성화", colorContrast: "", faceEmotionCTR: "", textReadability: "", brandingConsistency: "", mobileReadability: "", categoryRelevance: "", titlePatterns: "", titleLength: "", titleCredibility: "", },
    results: { thumbnailSummary: "", improvedConcepts: [], textCandidates: [], designGuide: { colors: "", fonts: "", layout: "" }, titleSummary: "", titleSuggestions: [], },
  };
  return fallbackInsights;
};

export const getAIRankingAnalysis = async (
  items: any[],
  type: 'channels' | 'videos'
): Promise<{ id: string; insight: string }[]> => {
  // This feature is disabled for compliance.
  return [];
};

export const getAITrendingInsight = async (
    countryCode: string,
    trendingVideos: { title: string; channelTitle: string }[],
    excludedCategories: string[] = [],
    topChannelsList: string[] = []
): Promise<{
  summary: string;
  viralFactors: string[];
  topKeywords: string[];
}> => {
    // This feature is disabled for compliance.
    const fallback = {
        summary: "AI 트렌드 분석 기능이 비활성화되었습니다.",
        viralFactors: [],
        topKeywords: [],
    };
    return fallback;
};


let chat: Chat | null = null;
let chatApiKey: string | null = null;

export const startChatSession = (): Chat => {
    const currentApiKey = getGeminiApiKey();
    if (chat && chatApiKey === currentApiKey) {
        return chat;
    }
    
    console.log("Initializing new chat session.");
    chatApiKey = currentApiKey;
    const ai = new GoogleGenAI({ apiKey: chatApiKey });
    chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: `You are 'Johnson', an expert YouTube analyst. Help users with YouTube data. Be concise. IMPORTANT: Do not mention user API keys. State that all API keys are managed by the administrator.`,
        },
    });
    return chat;
}

const generateMockAudienceProfile = (): AudienceProfile => ({
    summary: "AI 분석 기능이 비활성화되었습니다.",
    interests: [],
    genderRatio: [],
    ageGroups: [],
    topCountries: []
});