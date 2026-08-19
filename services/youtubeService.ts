
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
    getAIDeepDiveReport,
    getAIChannelDashboardInsights
} from './geminiService';
import { mockVideoData, mockChannelAnalysisData, mockRankingData, mockVideoDetailData, mockVideoComments, mockMyChannelAnalyticsData, mockSimilarChannels } from './mockData';
import { getRawItem, set } from './cacheService';


const countryToLangCode: Record<string, string> = {
    US: 'en', GB: 'en', CA: 'en', AU: 'en', SG: 'en', PH: 'en', NZ: 'en', PG: 'en',
    KR: 'ko', JP: 'ja', DE: 'de', FR: 'fr', CN: 'zh-Hans', HK: 'zh-Hant', TW: 'zh-Hant',
    RU: 'ru', VN: 'vi', ID: 'id', TH: 'th', MY: 'ms', BN: 'ms', MX: 'es', CL: 'es',
    PE: 'es', IN: 'hi', BR: 'pt',
};

const fetchFromYouTube = async (
    _endpoint: string,
    _params: Record<string, string>,
    _apiKey: string,
): Promise<any> => {
    throw new Error(
        'BROWSER_YOUTUBE_DISABLED: direct provider requests and browser-supplied API keys are forbidden; use an audited stored-source or backend adapter.'
    );
};
export const fetchChannelSearchData = async (query: string, filters: FilterState, apiKey: string): Promise<ChannelRankingData[]> => {
    console.log('Searching for channels with query:', { query, filters });
    
    try {
        const params: any = {
            part: 'snippet',
            q: query,
            type: 'channel',
            maxResults: filters.resultsLimit.toString(),
        };

        if (filters.country && filters.country !== 'WW') {
            params.regionCode = filters.country;
            const lang = countryToLangCode[filters.country];
            if (lang) params.relevanceLanguage = lang;
        } else if (filters.country === 'WW') {
            params.relevanceLanguage = 'en'; // Default global to English results
        }

        const searchData = await fetchFromYouTube('search', params, apiKey);

        const items = searchData.items || [];
        const channelIds = items
            .filter((item: any) => item.id && item.id.channelId)
            .map((item: any) => item.id.channelId)
            .join(',');
        if (!channelIds) return [];

        const channelsData = await fetchFromYouTube('channels', {
            part: 'snippet,statistics',
            id: channelIds
        }, apiKey);

        return (channelsData.items || []).map((item: any, index: number): ChannelRankingData => ({
            id: item.id,
            name: item.snippet.title,
            channelHandle: item.snippet.customUrl,
            thumbnailUrl: item.snippet.thumbnails.default.url,
            subscriberCount: parseInt(item.statistics.subscriberCount) || 0,
            newSubscribersInPeriod: 0, // Not directly available from public API
            newViewsInPeriod: 0, // Not directly available from public API
            videoCount: parseInt(item.statistics.videoCount) || 0,
            viewCount: parseInt(item.statistics.viewCount) || 0,
            rank: index + 1,
            rankChange: 0,
            channelCountry: item.snippet.country,
            description: item.snippet.description,
        }));
    } catch (error) {
        console.error("Error fetching channel search data:", error);
        throw error;
    }
};

export const resolveChannelId = async (query: string, apiKey: string): Promise<string | null> => {
    console.log("Resolving channel ID for:", query);
    try {
        // If it looks like a channel ID already
        if (query.startsWith('UC') && query.length === 24) return query;

        // Try searching for the channel
        const searchData = await fetchFromYouTube('search', {
            part: 'snippet',
            q: query,
            type: 'channel',
            maxResults: '1'
        }, apiKey);

        if (searchData.items && searchData.items.length > 0 && searchData.items[0].id) {
            return searchData.items[0].id.channelId || null;
        }
        return null;
    } catch (error) {
        console.error("Error resolving channel ID:", error);
        return null;
    }
};

export const fetchYouTubeData = async (mode: AnalysisMode, query: string, filters: FilterState, apiKey: string): Promise<VideoData[]> => {
    console.log('Fetching YouTube data:', { mode, query, filters });
    try {
        const searchParams: any = {
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: filters.resultsLimit.toString(),
            order: filters.sortBy === 'relevance' ? 'relevance' : filters.sortBy === 'publishedAt' ? 'date' : 'viewCount',
        };

        if (filters.country && filters.country !== 'WW') {
            searchParams.regionCode = filters.country;
            const lang = countryToLangCode[filters.country];
            if (lang) searchParams.relevanceLanguage = lang;
        } else if (filters.country === 'WW') {
            // For global, we don't force English anymore as it might filter out local content too aggressively
            // Or we can set it to 'en' but allow other languages. 
            // Actually, if the user searches in Korean with WW, they expect Korean results globally.
            // So we should only set relevanceLanguage if the query is detected as English? 
            // For now, let's remove the forced 'en' for WW to let YouTube decide based on query language.
            // searchParams.relevanceLanguage = 'en'; 
        }

        if (filters.videoFormat !== 'any') {
            searchParams.videoDuration = filters.videoFormat === 'shorts' ? 'short' : 'medium';
        }

        if (filters.period !== 'any') {
            const date = new Date();
            date.setDate(date.getDate() - parseInt(filters.period));
            searchParams.publishedAfter = date.toISOString();
        }

        const searchData = await fetchFromYouTube('search', searchParams, apiKey);
        const videoIds = (searchData.items || [])
            .filter((item: any) => item.id.kind === 'youtube#video')
            .map((item: any) => item.id.videoId)
            .join(',');
        
        if (!videoIds) return [];

        const videosData = await fetchFromYouTube('videos', {
            part: 'snippet,statistics,contentDetails',
            id: videoIds
        }, apiKey);

        const items = videosData.items || [];
        const channelIds = Array.from(new Set(items.map((v: any) => v.snippet.channelId))).join(',');
        const channelsData = await fetchFromYouTube('channels', {
            part: 'statistics',
            id: channelIds
        }, apiKey);

        const channelStatsMap = (channelsData.items || []).reduce((acc: any, curr: any) => {
            acc[curr.id] = parseInt(curr.statistics.subscriberCount) || 0;
            return acc;
        }, {});

        return items.map((item: any): VideoData => {
            const views = parseInt(item.statistics.viewCount) || 0;
            const likes = parseInt(item.statistics.likeCount) || 0;
            const comments = parseInt(item.statistics.commentCount) || 0;
            
            // Parse ISO 8601 duration
            const durationMatch = item.contentDetails?.duration?.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
            const hours = parseInt(durationMatch?.[1] || '0') || 0;
            const minutes = parseInt(durationMatch?.[2] || '0') || 0;
            const seconds = parseInt(durationMatch?.[3] || '0') || 0;
            const totalMinutes = (hours * 60) + minutes + (seconds / 60);

            return {
                id: item.id,
                channelId: item.snippet.channelId,
                title: item.snippet.title,
                thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
                channelTitle: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                subscribers: channelStatsMap[item.snippet.channelId] || 0,
                viewCount: views,
                likeCount: likes,
                commentCount: comments,
                durationMinutes: totalMinutes,
                engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0,
            };
        });
    } catch (error) {
        console.error("Error fetching YouTube data:", error);
        throw error;
    }
};

export const fetchChannelAnalysis = async (channelId: string, apiKey: string): Promise<ChannelAnalysisData> => {
    const cacheKey = `channel-analysis-${channelId}`;
    const cachedItem = getRawItem<ChannelAnalysisData>(cacheKey);

    if (cachedItem) {
        console.log(`Cache HIT for channel: ${channelId}`);
        // In a real app, we might check if it's stale and re-fetch.
        // For now, return cached if it's less than 1 hour old.
        const oneHour = 3600000;
        if (new Date().getTime() - new Date(cachedItem.timestamp).getTime() < oneHour) {
            return cachedItem.data;
        }
    }

    console.log(`Cache MISS for channel: ${channelId}. Fetching full data.`);
    
    try {
        const channelData = await fetchFromYouTube('channels', {
            part: 'snippet,statistics,brandingSettings',
            id: channelId
        }, apiKey);

        if (!channelData.items || channelData.items.length === 0) {
            throw new Error("Channel not found");
        }

        const channel = channelData.items[0];
        
        // Fetch recent videos
        const searchData = await fetchFromYouTube('search', {
            part: 'snippet',
            channelId: channelId,
            order: 'date',
            type: 'video',
            maxResults: '50'
        }, apiKey);

        const videoIds = (searchData.items || [])
            .filter((item: any) => item.id.kind === 'youtube#video')
            .map((item: any) => item.id.videoId)
            .join(',');
        const videosData = await fetchFromYouTube('videos', {
            part: 'snippet,statistics,contentDetails',
            id: videoIds
        }, apiKey);

        const videoList: ChannelVideo[] = (videosData.items || []).map((item: any): ChannelVideo => {
            const views = parseInt(item.statistics.viewCount) || 0;
            const likes = parseInt(item.statistics.likeCount) || 0;
            const comments = parseInt(item.statistics.commentCount) || 0;

            const durationMatch = item.contentDetails?.duration?.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
            const hours = parseInt(durationMatch?.[1] || '0') || 0;
            const minutes = parseInt(durationMatch?.[2] || '0') || 0;
            const seconds = parseInt(durationMatch?.[3] || '0') || 0;
            const totalMinutes = (hours * 60) + minutes + (seconds / 60);

            return {
                id: item.id,
                title: item.snippet.title,
                thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
                publishedAt: item.snippet.publishedAt,
                viewCount: views,
                likeCount: likes,
                commentCount: comments,
                engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0,
                isShorts: totalMinutes <= 1,
                durationMinutes: totalMinutes,
                tags: item.snippet.tags || []
            };
        });

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const uploadPattern = {
            last30Days: videoList.filter(v => new Date(v.publishedAt) >= thirtyDaysAgo).length,
            last7Days: videoList.filter(v => new Date(v.publishedAt) >= sevenDaysAgo).length,
            last24Hours: videoList.filter(v => new Date(v.publishedAt) >= twentyFourHoursAgo).length,
        };

        const data: ChannelAnalysisData = {
            id: channel.id,
            name: channel.snippet.title,
            handle: channel.snippet.customUrl,
            thumbnailUrl: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default.url,
            subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
            totalViews: parseInt(channel.statistics.viewCount) || 0,
            totalVideos: parseInt(channel.statistics.videoCount) || 0,
            publishedAt: channel.snippet.publishedAt,
            description: channel.snippet.description,
            channelKeywords: channel.brandingSettings?.channel?.keywords?.split(' ') || [],
            overview: {
                uploadPattern,
                channelFocus: {
                    categories: [], // Would need more API calls to resolve category IDs
                    tags: Array.from(new Set(videoList.flatMap(v => v.tags || []))).slice(0, 10)
                },
                popularKeywords: []
            },
            videoList,
            surgingVideos: {
                monthly: { longform: videoList.filter(v => !v.isShorts).slice(0, 5), shorts: videoList.filter(v => v.isShorts).slice(0, 5) },
                weekly: { longform: [], shorts: [] },
                daily: { longform: [], shorts: [] },
            },
            audienceProfile: {
                summary: "AI analysis will be performed on demand.",
                interests: [], genderRatio: [], ageGroups: [], topCountries: []
            },
            lastFetched: new Date().toISOString()
        };

        set(cacheKey, data);
        return data;
    } catch (error) {
        console.error("Error fetching channel analysis:", error);
        throw error;
    }
};

export const fetchRankingData = async (
    type: 'channels' | 'videos', 
    filters: any, 
    apiKey: string
): Promise<(ChannelRankingData | VideoRankingData)[]> => {
    console.log('Fetching ranking data:', { type, filters });
    try {
        if (type === 'videos') {
            const data = await fetchFromYouTube('videos', {
                part: 'snippet,statistics,contentDetails',
                chart: 'mostPopular',
                regionCode: (filters.country && filters.country !== 'WW') ? filters.country : 'US',
                videoCategoryId: filters.category === 'all' ? '0' : filters.category,
                maxResults: '50'
            }, apiKey);

            // Fetch channel statistics to get subscriber counts for performance analysis
            const channelIds = Array.from(new Set(data.items.map((item: any) => item.snippet.channelId))).join(',');
            let channelStatsMap: Record<string, number> = {};
            let channelThumbnailMap: Record<string, string> = {};
            
            if (channelIds) {
                try {
                    const channelsData = await fetchFromYouTube('channels', {
                        part: 'snippet,statistics',
                        id: channelIds
                    }, apiKey);
                    
                    channelStatsMap = channelsData.items.reduce((acc: any, curr: any) => {
                        acc[curr.id] = parseInt(curr.statistics.subscriberCount) || 0;
                        return acc;
                    }, {});

                    channelThumbnailMap = channelsData.items.reduce((acc: any, curr: any) => {
                        acc[curr.id] = curr.snippet.thumbnails.default.url;
                        return acc;
                    }, {});
                } catch (e) {
                    console.error("Failed to fetch channel stats for ranking:", e);
                }
            }

            return data.items.map((item: any, index: number): VideoRankingData => {
                const views = parseInt(item.statistics.viewCount) || 0;
                const durationMatch = item.contentDetails?.duration?.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
                const hours = parseInt(durationMatch?.[1] || '0') || 0;
                const minutes = parseInt(durationMatch?.[2] || '0') || 0;
                const seconds = parseInt(durationMatch?.[3] || '0') || 0;
                const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;

                return {
                    id: item.id,
                    rank: index + 1,
                    name: item.snippet.title,
                    channelName: item.snippet.channelTitle,
                    channelId: item.snippet.channelId,
                    thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
                    publishedAt: item.snippet.publishedAt,
                    viewCount: views,
                    rankChange: 0,
                    channelTotalViews: 0,
                    channelSubscriberCount: channelStatsMap[item.snippet.channelId] || 0,
                    channelThumbnailUrl: channelThumbnailMap[item.snippet.channelId] || '',
                    durationSeconds: totalSeconds,
                    isShorts: totalSeconds <= 60,
                    channelCountry: filters.country,
                };
            });
        } else {
            // For channels, YouTube doesn't have a "mostPopular" chart.
            // We'll search for top channels in the category.
            const categoryNames: Record<string, string> = {
                '1': 'Film Animation', '2': 'Autos Vehicles', '10': 'Music', '15': 'Pets Animals',
                '17': 'Sports', '19': 'Travel Events', '20': 'Gaming', '22': 'People Blogs',
                '23': 'Comedy', '24': 'Entertainment', '25': 'News Politics', '26': 'Howto Style',
                '27': 'Education', '28': 'Science Technology', '29': 'Nonprofits Activism',
            };
            
            const query = filters.category && filters.category !== 'all' 
                ? categoryNames[filters.category] || '' 
                : '';

            const searchParams: any = {
                part: 'snippet',
                type: 'channel',
                order: 'viewCount',
                regionCode: (filters.country && filters.country !== 'WW') ? filters.country : 'US',
                maxResults: '50'
            };
            
            if (query) {
                searchParams.q = query;
            } else {
                searchParams.q = 'a'; // Fallback query to get some popular channels
            }

            const searchData = await fetchFromYouTube('search', searchParams, apiKey);

            const channelIds = (searchData.items || [])
                .filter((item: any) => item.id && item.id.channelId)
                .map((item: any) => item.id.channelId)
                .join(',');
            const channelsData = await fetchFromYouTube('channels', {
                part: 'snippet,statistics',
                id: channelIds
            }, apiKey);

            return (channelsData.items || []).map((item: any, index: number): ChannelRankingData => ({
                id: item.id,
                name: item.snippet.title,
                channelHandle: item.snippet.customUrl,
                thumbnailUrl: item.snippet.thumbnails.default.url,
                subscriberCount: parseInt(item.statistics.subscriberCount) || 0,
                newSubscribersInPeriod: 0,
                newViewsInPeriod: 0,
                videoCount: parseInt(item.statistics.videoCount) || 0,
                viewCount: parseInt(item.statistics.viewCount) || 0,
                rank: index + 1,
                rankChange: 0,
                channelCountry: item.snippet.country,
            }));
        }
    } catch (error) {
        console.error("Error fetching ranking data:", error);
        return [];
    }
};

export const fetchVideoComments = async (videoId: string, apiKey: string): Promise<VideoComment[]> => {
    console.log("Fetching comments for video:", videoId);
    try {
        const data = await fetchFromYouTube('commentThreads', {
            part: 'snippet',
            videoId: videoId,
            maxResults: '50',
            order: 'relevance'
        }, apiKey);

        return data.items.map((item: any): VideoComment => ({
            text: item.snippet.topLevelComment.snippet.textDisplay,
            author: item.snippet.topLevelComment.snippet.authorDisplayName,
            likeCount: item.snippet.topLevelComment.snippet.likeCount,
            publishedAt: item.snippet.topLevelComment.snippet.publishedAt
        }));
    } catch (error) {
        console.error("Error fetching video comments:", error);
        return [];
    }
};

export const fetchVideoDetails = async (videoId: string, apiKey: string): Promise<VideoDetailData> => {
    console.log("Fetching details for video:", videoId);
    try {
        const videoData = await fetchFromYouTube('videos', {
            part: 'snippet,statistics,contentDetails,player',
            id: videoId
        }, apiKey);

        if (!videoData.items || videoData.items.length === 0) {
            throw new Error("Video not found");
        }

        const video = videoData.items[0];
        const channelData = await fetchFromYouTube('channels', {
            part: 'statistics',
            id: video.snippet.channelId
        }, apiKey);

        const durationMatch = video.contentDetails?.duration?.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        const hours = parseInt(durationMatch?.[1] || '0') || 0;
        const minutes = parseInt(durationMatch?.[2] || '0') || 0;
        const seconds = parseInt(durationMatch?.[3] || '0') || 0;
        const totalMinutes = (hours * 60) + minutes + (seconds / 60);

        const comments = await fetchVideoComments(videoId, apiKey);

        return {
            id: video.id,
            title: video.snippet.title,
            description: video.snippet.description,
            thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
            publishedAt: video.snippet.publishedAt,
            durationMinutes: totalMinutes,
            channelId: video.snippet.channelId,
            channelTitle: video.snippet.channelTitle,
            channelSubscriberCount: parseInt(channelData.items[0]?.statistics?.subscriberCount) || 0,
            viewCount: parseInt(video.statistics.viewCount) || 0,
            likeCount: parseInt(video.statistics.likeCount) || 0,
            commentCount: parseInt(video.statistics.commentCount) || 0,
            embedHtml: video.player.embedHtml,
            embeddable: video.status?.embeddable !== false,
            comments: comments
        };
    } catch (error) {
        console.error("Error fetching video details:", error);
        throw error;
    }
};

export const analyzeVideoDeeply = async (videoData: VideoDetailData, apiKey: string): Promise<{ commentInsights: CommentInsights, deepDiveReport: AI6StepReport }> => {
    console.log("Deeply analyzing video:", videoData.id);
    
    try {
        const [commentInsights, deepDiveReport] = await Promise.all([
            getAICommentInsights(videoData.comments),
            getAIDeepDiveReport(videoData)
        ]);

        return { commentInsights, deepDiveReport };
    } catch (error) {
        console.error("Error analyzing video deeply:", error);
        throw error;
    }
};

export const analyzeChannelDeeply = async (channelData: ChannelAnalysisData, apiKey: string): Promise<{ deepDiveReport: AI6StepReport }> => {
    console.log("Deeply analyzing CHANNEL:", channelData.id);
    // For channel deep dive, we use a slightly different prompt or logic in geminiService
    // But since the types are similar, we can adapt.
    // In this app, we'll use the AIDeepDiveReport structure.
    
    // We need a dummy VideoDetailData to satisfy the AI prompt if needed, 
    // or better, implement a specific channel deep dive in geminiService.
    // Let's assume we have getAIDeepDiveReport for channel too or adapt it.
    
    // For now, let's use a simplified version or the existing one with channel data
    const mockVideoForChannel: any = {
        title: `Channel Analysis: ${channelData.name}`,
        channelTitle: channelData.name,
        viewCount: channelData.totalViews,
        likeCount: 0,
        commentCount: 0,
        publishedAt: channelData.publishedAt,
        durationMinutes: 0,
        description: channelData.description,
        comments: []
    };

    const deepDiveReport = await getAIDeepDiveReport(mockVideoForChannel);
    return { deepDiveReport };
};

export const fetchSimilarChannels = async (_channelId: string, _apiKey: string): Promise<SimilarChannelData[]> => {
    throw new Error('VERIFIED_SIMILARITY_UNAVAILABLE: audited source evidence is required; synthetic similarity scores are forbidden.');
};

export const fetchMyChannelAnalytics = async (
    channelId: string,
    dataApiKey: string,
    analyticsApiKey: string
): Promise<MyChannelAnalyticsData> => {
    void channelId;
    void dataApiKey;
    void analyticsApiKey;
    throw new Error('VERIFIED_ANALYTICS_UNAVAILABLE: OAuth-backed YouTube Analytics data is required.');
};

export const convertPublicDataToKPI = (_channelData: ChannelAnalysisData): MyChannelAnalyticsData['kpi'] => {
    throw new Error('VERIFIED_ANALYTICS_UNAVAILABLE: public cumulative metrics cannot be converted into private monthly KPIs.');
};

export const fetchBenchmarkComparison = async (
    _myChannelData: MyChannelAnalyticsData,
    _benchmarkKPI: MyChannelAnalyticsData['kpi'],
    _benchmarkChannelName: string
): Promise<BenchmarkComparisonData> => {
    throw new Error('VERIFIED_BENCHMARK_UNAVAILABLE: audited OAuth analytics and central Writer evidence are required.');
};
