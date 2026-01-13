
import type { 
    VideoData, 
    ChannelAnalysisData, 
    VideoRankingData, 
    VideoDetailData, 
    VideoComment, 
    MyChannelAnalyticsData, 
    AnalysisMode, 
    FilterState,
    SimilarChannelData,
    CommentInsights,
    AI6StepReport,
    ChannelRankingData,
    ChannelVideo,
    BenchmarkComparisonData
} from '../types';
import { 
    getAICommentInsights,
    getAIDeepDiveReport
} from './geminiService';
import { mockVideoData, mockChannelAnalysisData, mockRankingData, mockVideoDetailData, mockVideoComments, mockMyChannelAnalyticsData, mockSimilarChannels } from './mockData';
import { getRawItem, set } from './cacheService';


const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const fetchChannelSearchData = async (query: string, filters: FilterState, apiKey: string): Promise<ChannelRankingData[]> => {
    console.log('[MOCK] Searching for channels with query:', { query, filters });
    
    return new Promise(resolve => {
        setTimeout(() => {
            const lowerCaseQuery = query.toLowerCase();
            const results = mockRankingData.channels
                .filter(channel => 
                    channel.name.toLowerCase().includes(lowerCaseQuery) ||
                    (channel.channelHandle && channel.channelHandle.toLowerCase().includes(lowerCaseQuery))
                )
                .slice(0, filters.resultsLimit);
            
            resolve(results);
        }, 800);
    });
};


// --- Helper Functions (kept for potential re-use, but not used in mock mode) ---
// ... (original helper functions can be kept but are not critical for mock mode)
const applySmartVideoFilter = (videos: ChannelVideo[]): ChannelVideo[] => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const recentVideos = videos.filter(v => new Date(v.publishedAt) >= oneMonthAgo);
    
    const yearlyVideos = videos.filter(v => new Date(v.publishedAt) >= oneYearAgo);
    if (yearlyVideos.length === 0) return recentVideos;

    const avgViews = yearlyVideos.reduce((sum, v) => sum + v.viewCount, 0) / yearlyVideos.length;
    
    // Using a simple percentile cutoff instead of a multiplier for more stable results
    const sortedYearlyVideos = [...yearlyVideos].sort((a, b) => b.viewCount - a.viewCount);
    const top10PercentIndex = Math.floor(sortedYearlyVideos.length * 0.1);
    const topPerformingVideos = sortedYearlyVideos.slice(0, top10PercentIndex + 1);

    const combined = [...recentVideos, ...topPerformingVideos];
    
    // Remove duplicates
    const uniqueVideos = Array.from(new Map(combined.map(v => [v.id, v])).values());
    
    return uniqueVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
};


// --- MOCK IMPLEMENTATIONS ---

export const resolveChannelId = async (query: string, apiKey: string): Promise<string | null> => {
    console.log("[MOCK] Resolving channel ID for:", query);
    // Return a consistent mock ID for testing
    return new Promise(resolve => setTimeout(() => resolve('UC-lHJZR3Gqxm24_Vd_AJ5Yw'), 300));
};

export const fetchYouTubeData = async (mode: AnalysisMode, query: string, filters: FilterState, apiKey: string): Promise<VideoData[]> => {
    console.log('[MOCK] Fetching YouTube data:', { mode, query, filters });
    return new Promise(resolve => setTimeout(() => {
        // Return pure data without estimations
        resolve(mockVideoData);
    }, 1000));
};

export const fetchChannelAnalysis = async (channelId: string, apiKey: string): Promise<ChannelAnalysisData> => {
    const cacheKey = `channel-analysis-${channelId}`;
    const cachedItem = getRawItem<ChannelAnalysisData>(cacheKey);

    if (cachedItem) {
        console.log(`[MOCK CACHE] HIT for channel: ${channelId}. Checking for updates...`);
        
        // Simulate fetching only new videos with a shorter delay
        return new Promise(resolve => setTimeout(() => {
            const updatedData = JSON.parse(JSON.stringify(cachedItem.data)); // Deep copy

            // Simulate one new video
            const newVideo = {
                ...mockVideoData[0],
                id: `new_video_${Date.now()}`,
                title: `[NEW] ${mockVideoData[0].title}`,
                publishedAt: new Date().toISOString(),
                viewCount: Math.floor(Math.random() * 500000) + 100000,
                isShorts: false,
            };
            
            updatedData.videoList.unshift(newVideo as ChannelVideo);
            
            // Recalculate some stats
            updatedData.overview.uploadPattern.last30Days += 1;
            updatedData.overview.uploadPattern.last7Days += 1;
            updatedData.overview.uploadPattern.last24Hours += 1;
            updatedData.totalVideos += 1;

            // Update timestamp and save back to cache
            updatedData.lastFetched = new Date().toISOString();
            set(cacheKey, updatedData);
            
            console.log(`[MOCK CACHE] Updated channel ${channelId} with 1 new video.`);
            resolve(updatedData);
        }, 300));
    }

    console.log(`[MOCK CACHE] MISS for channel: ${channelId}. Fetching full data.`);
    // Add some variation to mock data
    const data = { ...mockChannelAnalysisData, id: channelId };
    
    // Add lastFetched timestamp and save to cache
    data.lastFetched = new Date().toISOString();
    set(cacheKey, data);

    return new Promise(resolve => setTimeout(() => resolve(data), 1200));
};

export const fetchRankingData = async (
    type: 'channels' | 'videos', 
    filters: any, 
    apiKey: string
): Promise<(ChannelRankingData | VideoRankingData)[]> => {
    console.log('[MOCK] Fetching ranking data:', { type, filters });
    const data = type === 'channels' ? mockRankingData.channels : mockRankingData.videos;
    return new Promise(resolve => setTimeout(() => resolve(data), 800));
};

export const fetchVideoComments = async (videoId: string, apiKey: string): Promise<VideoComment[]> => {
    console.log("[MOCK] Fetching comments for video:", videoId);
    return new Promise(resolve => setTimeout(() => resolve(mockVideoComments), 500));
};

export const fetchVideoDetails = async (videoId: string, apiKey: string): Promise<VideoDetailData> => {
    console.log("[MOCK] Fetching details for video:", videoId);
    const data = { ...mockVideoDetailData, id: videoId, comments: mockVideoComments };
    return new Promise(resolve => setTimeout(() => resolve(data), 700));
};

export const analyzeVideoDeeply = async (videoData: VideoDetailData, apiKey: string): Promise<{ commentInsights: CommentInsights, deepDiveReport: AI6StepReport }> => {
    console.log("[MOCK] Deeply analyzing video with SIMULATED results:", videoData.id);

    const mockCommentInsights: CommentInsights = {
        summary: "시청자들은 영상의 유용한 정보와 친절한 설명 방식에 매우 긍정적입니다. 다만, 일부는 영상 길이가 조금 더 길었으면 하는 아쉬움을 표했습니다.\n(Viewers are very positive about the useful information and friendly explanation style. However, some expressed a desire for the video to be a bit longer.)",
        positivePoints: [
            "설명이 귀에 쏙쏙 들어와요! (The explanation is very clear and easy to understand!)",
            "이런 꿀팁을 무료로 알려주시다니 감사합니다. (Thank you for sharing these great tips for free.)",
            "목소리가 좋아서 집중이 잘돼요. (Your voice is nice, so it's easy to focus.)"
        ],
        negativePoints: [
            "영상이 조금 짧아서 아쉬워요. 더 길게 만들어주세요. (The video is a bit short, which is a shame. Please make it longer.)",
            "중간에 나오는 배경음악 소리가 조금 큰 것 같아요. (I think the background music in the middle is a bit loud.)"
        ]
    };

    const mockDeepDiveReport: AI6StepReport = {
        currentStage: "4. 몰입 유지 추정 (Viewer Retention Estimation)",
        viewerValue: "이 영상을 통해 '아침 루틴'을 개선하고 하루를 더 생산적으로 시작할 수 있다는 희망을 얻습니다.\n(This video gives viewers hope that they can improve their 'morning routine' and start their day more productively.)",
        dataFacts: [
            "영상은 12분 길이로, 채널 평균(10분)보다 약간 깁니다.\n(The video is 12 minutes long, slightly longer than the channel average of 10 minutes.)",
            "조회수 대비 좋아요 비율이 4.3%로 채널 평균(3.5%)보다 높습니다.\n(The like-to-view ratio is 4.3%, higher than the channel average of 3.5%.)",
            "댓글에서 '실천', '도전', '감사합니다' 키워드가 반복적으로 발견됩니다.\n(Keywords like 'practice', 'challenge', and 'thank you' are repeatedly found in the comments.)"
        ],
        interpretation: "지표상, 시청자들은 영상의 정보가 실용적이라고 느끼며 강한 긍정적 반응을 보이고 있습니다. 댓글 반응을 볼 때, 시청자들은 단순히 정보를 소비하는 것을 넘어 실제 행동으로 연결하려는 의지가 높은 것으로 추정됩니다.\n(Metrics indicate that viewers find the video's information practical and are showing a strong positive reaction. Based on comment responses, it's presumed that viewers are highly motivated to translate information into action, rather than just consuming it.)",
        engagementLevers: [
            { type: 'comment', recommendation: "영상 마지막에 '여러분만의 아침 루틴 꿀팁이 있다면 댓글로 공유해주세요!'라고 질문을 던져 댓글 참여를 유도해보세요.\n(At the end of the video, ask 'Please share your own morning routine tips in the comments!' to encourage comment participation.)" },
            { type: 'like', recommendation: "영상 중간에 '오늘 내용이 유용했다면 좋아요를 눌러 알려주세요!' 라고 언급하여 시청자의 긍정적 반응을 행동으로 전환시키세요.\n(In the middle of the video, say 'If you found today's content useful, please let me know by liking the video!' to convert positive reactions into actions.)" },
            { type: 'subscribe', recommendation: "영상 끝에 '더 많은 자기계발 팁을 원한다면 구독하고 다음 영상을 놓치지 마세요.'라고 말하며 다음 콘텐츠에 대한 기대감을 주세요.\n(At the end of the video, create anticipation for the next content by saying, 'If you want more self-development tips, subscribe so you don't miss the next video.')" }
        ],
        nextAction: "다음 영상 기획 시, '저녁 루틴'이나 '주말 루틴'과 같이 이번 영상의 성과가 좋았던 포맷을 확장하는 아이디어를 가장 먼저 검토하세요.\n(When planning the next video, first consider ideas that expand on the high-performing format of this video, such as 'evening routine' or 'weekend routine'.)"
    };
    
    const insights = {
        commentInsights: mockCommentInsights,
        deepDiveReport: mockDeepDiveReport,
    };

    // Keep the simulated delay for better UX
    return new Promise(resolve => setTimeout(() => resolve(insights), 1500));
};

export const analyzeChannelDeeply = async (channelData: ChannelAnalysisData, apiKey: string): Promise<{ deepDiveReport: AI6StepReport }> => {
    console.log("[MOCK] Deeply analyzing CHANNEL with SIMULATED results:", channelData.id);

    const mockDeepDiveReport: AI6StepReport = {
        currentStage: "3. 채널 경쟁력 분석 (Channel Competitiveness Analysis)",
        viewerValue: `이 채널을 통해 '${channelData.name}'이(가) 제공하는 전문적인 정보와 일관된 콘텐츠를 신뢰하고 시청합니다.\n(Viewers trust and watch this channel for the professional information and consistent content provided by '${channelData.name}'.)`,
        dataFacts: [
            `총 ${channelData.totalVideos}개의 영상 중 최근 30일간 ${channelData.overview.uploadPattern.last30Days}개의 영상을 업로드하여 꾸준함을 유지하고 있습니다.\n(Out of ${channelData.totalVideos} total videos, ${channelData.overview.uploadPattern.last30Days} were uploaded in the last 30 days, maintaining consistency.)`,
            `채널의 주요 키워드는 '${channelData.channelKeywords.slice(0, 2).join(', ')}' 등으로, 정체성이 명확합니다.\n(The main channel keywords are '${channelData.channelKeywords.slice(0, 2).join(', ')}', etc., indicating a clear identity.)`,
            `최근 영상들은 주로 '[${channelData.videoList[0]?.title.substring(0, 5)}...]'와 같은 주제에 집중되어 있습니다.\n(Recent videos have mainly focused on topics like '[${channelData.videoList[0]?.title.substring(0, 5)}...]'.)`
        ],
        interpretation: `데이터상, 이 채널은 특정 주제에 대한 전문성을 바탕으로 명확한 타겟 시청자층을 구축하고 있는 것으로 보입니다. 꾸준한 업로드 주기는 시청자와의 신뢰를 형성하는 데 긍정적인 영향을 미치고 있을 가능성이 높습니다.\n(Based on the data, this channel appears to be building a clear target audience based on expertise in a specific topic. The consistent upload schedule is likely having a positive impact on building trust with viewers.)`,
        engagementLevers: [
            { type: 'comment', recommendation: "가장 인기 있었던 영상의 주제에 대해 시청자들의 질문이나 의견을 구하는 커뮤니티 포스트를 작성하여 소통을 강화해보세요.\n(Strengthen communication by creating a community post asking for viewers' questions or opinions on the most popular video's topic.)" },
            { type: 'like', recommendation: "영상 인트로에서 '이번 영상이 도움이 될 것 같다면 미리 좋아요를 눌러주세요'라고 언급하여 초기 참여를 유도하세요.\n(Encourage initial engagement by mentioning 'If you think this video will be helpful, please give it a like in advance' in the intro.)" },
            { type: 'subscribe', recommendation: "채널의 핵심 주제와 관련된 콘텐츠 시리즈를 기획하고, 이를 예고하며 구독을 통해 다음 영상을 놓치지 말라고 강조하세요.\n(Plan a content series related to the channel's core theme, announce it, and emphasize that subscribing will ensure they don't miss the next video.)" }
        ],
        nextAction: "현재 채널의 정체성과 가장 잘 맞는 키워드를 2-3개 선정하고, 해당 키워드를 중심으로 한 다음 콘텐츠 시리즈 3편의 제목을 기획해보세요.\n(Select 2-3 keywords that best match the channel's current identity and plan the titles for the next 3-part content series centered around them.)"
    };
    
    return new Promise(resolve => setTimeout(() => resolve({ deepDiveReport: mockDeepDiveReport }), 1500));
};


export const fetchSimilarChannels = async (channelId: string, apiKey: string): Promise<SimilarChannelData[]> => {
    console.log("[MOCK] Fetching similar channels for:", channelId);
    return new Promise(resolve => setTimeout(() => resolve(mockSimilarChannels), 900));
};

export const fetchMyChannelAnalytics = async (channelId: string, dataApiKey: string, analyticsApiKey: string): Promise<MyChannelAnalyticsData> => {
    console.log("[MOCK] Fetching 'My Channel' analytics for:", channelId);
    console.log("Using Data API Key:", !!dataApiKey, "Using Analytics API Key:", !!analyticsApiKey);
    // In a real app, you would make authenticated calls to the YouTube Analytics API here.
    // For now, we return rich mock data that simulates an Analytics API response.
    return new Promise(resolve => setTimeout(() => resolve(mockMyChannelAnalyticsData), 1000));
};

export const convertPublicDataToKPI = (channelData: ChannelAnalysisData): MyChannelAnalyticsData['kpi'] => {
    console.log("[MOCK] Converting public data to KPI for:", channelData.name);
    // This is a rough simulation and should be used cautiously, as it's not real analytics.
    const estimatedViewsLast30d = (channelData.totalViews / ((new Date().getTime() - new Date(channelData.publishedAt).getTime()) / (1000 * 60 * 60 * 24))) * 30;
    
    return {
        viewsLast30d: estimatedViewsLast30d,
        netSubscribersLast30d: channelData.subscriberCount > 1000 ? Math.round(channelData.subscriberCount * (0.01 + Math.random() * 0.02)) : 0,
        watchTimeHoursLast30d: Math.round(estimatedViewsLast30d * 0.0001),
        ctrLast30d: 4.5 + Math.random(),
        avgViewDurationSeconds: 120 + Math.random() * 60,
        impressionsLast30d: Math.round(estimatedViewsLast30d / 0.05),
    };
};

export const fetchBenchmarkComparison = async (
    myChannelData: MyChannelAnalyticsData,
    benchmarkKPI: MyChannelAnalyticsData['kpi'],
    benchmarkChannelName: string
): Promise<BenchmarkComparisonData> => {
    console.log(`[MOCK] Fetching benchmark comparison: ${myChannelData.name} vs ${benchmarkChannelName}`);
    const data: BenchmarkComparisonData = {
        myChannelName: myChannelData.name,
        benchmarkChannelName: benchmarkChannelName,
        comparison: [
            { metric: '월 조회수 (Monthly Views)', myValue: myChannelData.kpi.viewsLast30d.toLocaleString(), benchmarkValue: benchmarkKPI.viewsLast30d.toLocaleString() },
            { metric: '월 구독자 증감 (Monthly Sub Growth)', myValue: myChannelData.kpi.netSubscribersLast30d.toLocaleString(), benchmarkValue: benchmarkKPI.netSubscribersLast30d.toLocaleString() },
        ],
        aiSummary: `Content OS analysis is disabled. The benchmark channel, ${benchmarkChannelName}, shows notable performance in views and subscriber growth.`
    };
    return new Promise(resolve => setTimeout(() => resolve(data), 800));
};