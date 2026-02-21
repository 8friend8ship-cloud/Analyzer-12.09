import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { VideoData, AIInsights, AnalysisMode, ComparisonInsights, ChannelAnalysisData, AudienceProfile, AIThumbnailInsights, MyChannelAnalyticsData, CommentInsights, AI6StepReport, VideoDetailData, VideoComment } from '../types';
import { getGeminiApiKey } from './apiKeyService';
import { get, set } from './cacheService';
import { handleGeminiError } from './errorService';

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
    'BR': 'Portuguese',
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
    // For translation, we might want to just return the original keyword instead of throwing
    return `${keyword} (${targetCountry} translation)`;
  }
};

export const getAIChannelRecommendations = async (category: string, keyword: string): Promise<{ korea: { name: string; reason: string }[]; global: { name: string; reason: string }[] }> => {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const prompt = `
    As "Content OS", based on the YouTube category "${category}" and keyword "${keyword}", recommend benchmark channels.
    - Recommend 2 fast-growing Korean channels.
    - Recommend 2 globally recognized channels.
    Provide a brief, one-sentence reason for each recommendation.
    Respond ONLY in JSON format like this: {"korea": [{"name": "channel_name", "reason": "reason_text"}], "global": [{"name": "channel_name", "reason": "reason_text"}]}`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) throw new Error("Empty response from AI");
        return JSON.parse(text);
    } catch (error) {
        console.error("Error getting AI channel recommendations:", error);
        // We don't throw here to avoid breaking the UI, but we could
        return { korea: [], global: [] };
    }
};


// Uses the Gemini API to generate insights from video data.
export const getAIInsights = async (videoData: VideoData[], query: string, mode: AnalysisMode): Promise<AIInsights> => {
    const cacheKey = `gemini-insights-${mode}-${query.toLowerCase().replace(/\s+/g, '-')}`;
    const cached = get<AIInsights>(cacheKey, 86400000); // 24-hour cache

    if (cached) {
        console.log(`[Cache] Gemini insights HIT for key: ${cacheKey}`);
        return cached;
    }
    console.log(`[Cache] Gemini insights MISS for key: ${cacheKey}`);
    
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const videoInfo = videoData.map(v => `Title: ${v.title}, Views: ${v.viewCount}`).join('\n');
    const prompt = `
    As "Content OS", analyze the following YouTube video data for the search query "${query}" (mode: ${mode}).
    Provide a concise summary, identify up to 3 common patterns, and suggest up to 3 actionable recommendations for a creator.
    Respond ONLY in JSON format: {"summary": "...", "patterns": ["...", "..."], "recommendations": ["...", "..."]}.
    Video data:\n${videoInfo}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) throw new Error("Empty AI response");
        const result = JSON.parse(text);
        set(cacheKey, result); // Set result in cache
        return result;
    } catch (error) {
        console.error("Error getting AI insights:", error);
        throw handleGeminiError(error);
    }
};

export const getAIComparisonInsights = async (channelA: {query: string, videos: VideoData[]}, channelB: {query: string, videos: VideoData[]}): Promise<ComparisonInsights> => {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const prompt = `As "Content OS", compare two YouTube channels based on their recent videos.
    Channel A (${channelA.query}): ${channelA.videos.length} videos.
    Channel B (${channelB.query}): ${channelB.videos.length} videos.
    Analyze and compare their strategies. Provide a summary, observed characteristics for each, and a final recommendation.
    Respond ONLY in JSON format: {"summary": "...", "channelA_summary": {"name": "${channelA.query}", "observedCharacteristics": [...]}, "channelB_summary": {"name": "${channelB.query}", "observedCharacteristics": [...]}, "recommendation": "..."}`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) throw new Error("Empty AI response");
        return JSON.parse(text);
    } catch (error) {
        console.error("Error in getAIComparisonInsights:", error);
        throw handleGeminiError(error);
    }
};

export const getRelatedKeywords = async (keyword: string): Promise<string[]> => {
    if (!keyword.trim()) return [];
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const prompt = `Given the YouTube keyword "${keyword}", generate a list of 5 related or niche keywords for content ideas. Respond ONLY in a JSON array of strings: ["keyword1", "keyword2", ...]`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) return [];
        return JSON.parse(text);
    } catch (error) {
        console.error("Error getting related keywords:", error);
        return [];
    }
};

export const getAITopicKeywords = async (videoData: VideoData[]): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const videoTitles = videoData.map(v => v.title).join(', ');
    const prompt = `As "Content OS", based on these YouTube video titles (${videoTitles}), generate 10 relevant topic keywords for content creation. Respond ONLY in a JSON array of strings.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) return [];
        return JSON.parse(text);
    } catch (error) {
        console.error("Error getting topic keywords:", error);
        return [];
    }
};

export const getAIChannelComprehensiveAnalysis = async (
    channelStats: { name: string; publishedAt: string; subscriberCount: number; totalViews: number; totalVideos: number; description: string },
    videoSnippets: { title: string; tags: string[] }[],
    knownFirstVideoDate: string | null
): Promise<{
    overview: Omit<ChannelAnalysisData['overview'], 'uploadPattern'>;
    audienceProfile: AudienceProfile;
}> => {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const prompt = `As "Content OS", analyze the provided channel data.
    IMPORTANT: For the 'audienceProfile', this is a creative exercise. Create a *hypothetical marketing persona*. DO NOT present it as factual statistics. Infer interests and create a plausible, fictional demographic breakdown for this persona.
    Respond ONLY in JSON format: {"overview": {"channelFocus": {...}}, "audienceProfile": {"summary": "...", "interests": [...], "genderRatio": [{"label": "Male", "value": ...}], "ageGroups": [{"label": "18-24", "value": ...}], "topCountries": [{"label": "KR", "value": ...}]}}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) throw new Error("Empty AI response");
        return JSON.parse(text);
    } catch(e) {
        console.error("Error in getAIChannelComprehensiveAnalysis", e);
        throw handleGeminiError(e);
    }
};

export const getAIChannelDashboardInsights = async (
    channelName: string,
    stats: { subscribers: number; totalViews: number; videoCount: number },
    recentVideos: { title: string; views: number; publishedAt: string }[]
): Promise<Partial<MyChannelAnalyticsData>> => {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    // This prompt asks for strategic advice, not calculation.
    const prompt = `As "Content OS", generate strategic insights for the YouTube channel "${channelName}".
    - aiExecutiveSummary: A summary, 2 positive patterns, 2 growth areas.
    - aiGrowthInsight: A summary of growth potential, 2 positive patterns, 2 growth areas.
    - aiFunnelInsight: A summary of the user journey, 2 positive patterns, 2 growth areas.
    - contentPopularityPatterns: Infer title patterns, optimal length, and thumbnail style.
    - contentIdeas: Suggest 2 new video ideas with titles and reasons.
    - viewerPersona: Create a *hypothetical* viewer persona with a name, description, and strategy.
    Respond ONLY in the specified JSON structure.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) throw new Error("Empty AI response");
        return JSON.parse(text);
    } catch(e) {
        console.error("Error in getAIChannelDashboardInsights", e);
        throw handleGeminiError(e);
    }
};

// Re-enabled AI Comment Insights
export const getAICommentInsights = async (comments: VideoComment[]): Promise<CommentInsights> => {
    if (comments.length === 0) {
        return {
            summary: "분석할 댓글이 없습니다.",
            positivePoints: [],
            negativePoints: [],
        };
    }

    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const commentTexts = comments.slice(0, 50).map(c => c.text).join('\n---\n');
    const prompt = `As "Content OS", based on the following YouTube comments, analyze the viewers' reactions.
    1.  Provide a concise one-sentence summary of the overall sentiment.
    2.  Extract up to 3 key positive points or compliments.
    3.  Extract up to 3 key negative points or suggestions for improvement.
    
    Return the response ONLY in JSON format, following this schema. Do not add any extra text or markdown.
    
    Comments:
    ${commentTexts}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        positivePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                        negativePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                },
            },
        });
        const text = response.text;
        if (!text) {
            throw new Error("Received empty response from Gemini API.");
        }
        const jsonResponse = JSON.parse(text);
        return jsonResponse;
    } catch (error) {
        console.error("Error in getAICommentInsights:", error);
        return {
            summary: "Content OS 댓글 분석 중 오류가 발생했습니다.",
            positivePoints: [],
            negativePoints: [],
        };
    }
};

export const getAIDeepDiveReport = async (videoData: VideoDetailData): Promise<AI6StepReport> => {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

    const prompt = `
    Based on the provided YouTube video data, generate a deep-dive analysis report.
    Video Title: "${videoData.title}"
    Channel: "${videoData.channelTitle}"
    Metrics: ${videoData.viewCount.toLocaleString()} views, ${videoData.likeCount.toLocaleString()} likes, ${videoData.commentCount.toLocaleString()} comments.
    Published: ${videoData.publishedAt}
    Duration: ${videoData.durationMinutes} minutes
    Description: "${videoData.description}"
    Top Comments:
    ${videoData.comments.slice(0, 5).map(c => `- ${c.text}`).join('\n')}
    `;

    const systemInstruction = `You are 'Johnson', an expert YouTube analyst for 'Content OS'. Your role is to be a GUIDE, not a definitive ANSWER. You MUST follow these rules:
1.  **Policy First:** Comply strictly with YouTube API policies. You have NOT watched the video; your analysis is based only on provided metadata (title, comments, stats).
2.  **No Definitive Statements:** Use phrases of possibility like "it seems", "it's likely", "this pattern suggests". NEVER claim to know the algorithm or viewer intent.
3.  **Handle Missing Data:** If comments are missing, explicitly state "Comment data is unavailable, so this interpretation is based on metrics and metadata alone."
4.  **Strict JSON Output:** Your entire response must be ONLY the JSON object defined in the schema.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        currentStage: { type: Type.STRING },
                        viewerValue: { type: Type.STRING },
                        dataFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
                        interpretation: { type: Type.STRING },
                        engagementLevers: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING, enum: ['comment', 'like', 'subscribe'] },
                                    recommendation: { type: Type.STRING },
                                },
                                required: ["type", "recommendation"]
                            },
                        },
                        nextAction: { type: Type.STRING },
                    },
                    required: ["currentStage", "viewerValue", "dataFacts", "interpretation", "engagementLevers", "nextAction"]
                },
            },
        });
        
        const text = response.text;
        if (!text) {
            throw new Error("Received empty response from Gemini API.");
        }
        const jsonResponse = JSON.parse(text);
        return jsonResponse as AI6StepReport;
    } catch (error) {
        console.error("Error in getAIDeepDiveReport:", error);
        throw new Error("AI 분석 리포트를 생성하는 중 오류가 발생했습니다.");
    }
};

export const getAIThumbnailAnalysis = async (
  videoData: { id: string; title: string; thumbnailUrl: string }[],
  query: string
): Promise<AIThumbnailInsights> => {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const prompt = `As "Content OS", analyze the YouTube thumbnails and titles for the keyword "${query}".
    Provide a detailed strategic analysis. Respond ONLY in the specified JSON format.
    - analysis: Qualitative analysis of common patterns.
    - results: Actionable recommendations including concepts, text candidates, design guides, and title suggestions.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) throw new Error("Empty AI response");
        return JSON.parse(text);
    } catch (e) {
        console.error("Error in getAIThumbnailAnalysis:", e);
        throw handleGeminiError(e);
    }
};

export const getAIRankingAnalysis = async (
  items: any[],
  type: 'channels' | 'videos'
): Promise<{ id: string; insight: string }[]> => {
    // This function is disabled as it's not currently used in the UI.
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
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const prompt = `As "Content OS", analyze today's YouTube trends in ${countryCode}, excluding categories: [${excludedCategories.join(', ')}].
    Based on the top video titles and top channels provided, generate:
    1. A summary of the main trend.
    2. 3-4 key viral factors.
    3. The top 10 most relevant keywords from these trends.
    Respond ONLY in JSON format: {"summary": "...", "viralFactors": [...], "topKeywords": [...]}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) throw new Error("Empty AI response");
        return JSON.parse(text);
    } catch (e) {
        console.error("Error in getAITrendingInsight", e);
        throw handleGeminiError(e);
    }
};

export const getAIBenchmarkRecommendations = async (
    channelName: string,
    titlePatterns: string[]
): Promise<{ name: string; reason: string }[]> => {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const prompt = `For a YouTube channel named "${channelName}" which often uses title patterns like "${titlePatterns.join(', ')}", recommend 3 other fast-growing YouTube channels to benchmark. Provide a one-sentence reason for each. Respond ONLY in JSON format: [{"name": "...", "reason": "..."}]`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) return [];
        return JSON.parse(text);
    } catch (e) {
        console.error("Error getting benchmark recommendations:", e);
        return [];
    }
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
    const systemInstruction = `You are 'Johnson', the AI guide for 'Content OS'.

### **Johnson's Official Definition (Your Core Identity)**
Your role is **not** an AI that knows the answers. You are a **tutor who asks good questions**. Your purpose is to guide the user to their own "aha!" moments.
- You do NOT provide answers, predictions, or judgments.
- You DO ask guiding questions, connect the dots for the user, and present the next logical viewpoint.
- Your entire conversational principle is: "We don't know the answer, but let's look at this together."

### **Workflow Stage Awareness (Your Judgment Target)**
You do **not** judge the user. You only observe the **workflow stage** they are in (what they have seen vs. what they haven't seen yet).
- **After Channel Analysis:** You assume "The user has seen the big picture."
- **After Video Analysis:** You assume "The user has seen a specific example."
- **After Channel Comparison:** You assume "The user is ready to see their relative position."
This is **not** an evaluation of the user; it is a check of the learning step.

### **Mandatory Conversational Flow & Language (Strict Rules)**

**1. Guiding Language Principle (The One-Line Rule):**
- **FORBIDDEN (❌):** "We analyzed...", "We understood...", "We judged..."
- **ALLOWED (✅):** "Looking at this so far, we can see...", "If we look at this next part together, it becomes clearer...", "This is usually what people get curious about next."

**2. Conversational Tone:**
- **FORBIDDEN (❌ - Judgmental):** "You understand now.", "You are still lacking.", "You must compare now."
- **ALLOWED (✅ - Reactive/Guiding):**
    - After Channel Analysis: "이제 채널의 큰 흐름은 잡혔네요." (Now we've got the general flow of the channel.)
    - After Video Analysis: "이제 왜 이런 흐름이 나왔는지 조금 보이기 시작해요." (Now it's starting to become a bit clearer why this flow occurred.)
    - Guiding to Comparison: "이걸 다른 채널과 나란히 보면, 이게 '정말 잘 된 건지'가 더 또렷해져요." (If we look at this side-by-side with another channel, it becomes much clearer if this is 'truly good'.)

**3. Word Choice Rules:**
- **ABSOLUTELY FORBIDDEN WORDS:** "정답" (the answer), "분석했다" (we analyzed), "판단했다" (we judged), "성공" (success), "실패" (failure).
- **MANDATORY WORDS (to create a journey):** "아직" (not yet), "하나" (one more thing), "조금 더" (a little more), "같이 보시죠" (let's see together).

### **GOVERNANCE & POLICY**
- You operate strictly within YouTube API guidelines. You have NOT watched any videos. You only have access to metadata, statistics, and text. You must disclose this limitation if a user assumes you have watched a video.
- When asked about features, explain them in the context of this "tutoring" journey. For example, explain 'Outlier Analysis' as a way to "find the 'main character' in the story of their channel's data together."`;

    chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction },
    });
    return chat;
}