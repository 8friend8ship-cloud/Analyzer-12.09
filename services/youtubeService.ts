
import type { 
    VideoData, 
    ChannelAnalysisData, 
    ChannelVideo, 
    TrendPoint, 
    ChannelRankingData, 
    VideoRankingData, 
    VideoDetailData, 
    VideoComment, 
    CommentInsights, 
    AIVideoDeepDiveInsights, 
    SimilarChannelData, 
    MyChannelAnalyticsData, 
    AnalysisMode, 
    FilterState, 
    AudienceProfile, 
    BenchmarkComparisonData, 
    VideoAnalytics,
    AIAnalyticsInsight
} from '../types';
import { 
    getRankingFromFirestore, 
    setRankingInFirestore,
    getSearchResultsFromFirestore,
    setSearchResultsInFirestore
} from './firebaseService';
import { 
    getAICommentInsights, 
    getAIVideoDeepDiveInsights, 
    getAISimilarChannels, 
    getAIChannelDashboardInsights,
    getAIChannelComprehensiveAnalysis,
    getAIComparisonInsights
} from './geminiService';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// --- Helper Functions ---

const parseISO8601Duration = (duration: string): number => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    const hours = (parseInt(match[1] || '0') || 0);
    const minutes = (parseInt(match[2] || '0') || 0);
    const seconds = (parseInt(match[3] || '0') || 0);
    return hours * 60 + minutes + seconds / 60;
};

const calculateEstimatedRevenue = (views: number, duration: string | number, categoryId: string, country: string, subscribers: number): number => {
    // Simplified logic for estimation
    let rpm = 2.0; // Default RPM USD for Longform
    const durationMinutes = typeof duration === 'string' ? parseISO8601Duration(duration) : duration;
    
    // Country adjustment
    if (['US', 'AU', 'CA', 'GB', 'DE'].includes(country)) rpm *= 2.5;
    else if (['KR', 'JP', 'FR'].includes(country)) rpm *= 1.5;
    else if (['IN', 'VN', 'PH', 'BR'].includes(country)) rpm *= 0.3;

    // Category adjustment
    if (['20', '24'].includes(categoryId)) rpm *= 0.8; // Gaming, Entertainment
    else if (['27', '28'].includes(categoryId)) rpm *= 1.2; // Edu, Tech
    
    // Duration adjustment (Long form ads)
    if (durationMinutes >= 8) rpm *= 1.5;
    
    // Shorts adjustment (Updated to 3 minutes per user request)
    // 3분 이하 영상은 숏폼 수익 모델(낮은 RPM)을 적용합니다.
    if (durationMinutes <= 3) {
        rpm = 0.05; // Shorts RPM is significantly lower
    }

    return Math.round((views / 1000) * rpm);
};

const extractChannelKeywords = (rawKeywords: string): string[] => {
    if (!rawKeywords) return [];
    return rawKeywords.match(/"[^"]+"|[^\s]+/g)?.map(s => s.replace(/"/g, '')) || [];
};

const calculateStats = (videos: ChannelVideo[]) => {
    if (videos.length === 0) return { totalVideos: 0, avgViews: 0, avgEngagementRate: 0, avgLikes: 0, avgComments: 0 };
    const totalVideos = videos.length;
    const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.likeCount, 0);
    const totalComments = videos.reduce((sum, v) => sum + v.commentCount, 0);
    
    return {
        totalVideos,
        avgViews: Math.round(totalViews / totalVideos),
        avgEngagementRate: parseFloat(((totalLikes + totalComments) / totalViews * 100).toFixed(2)) || 0,
        avgLikes: Math.round(totalLikes / totalVideos),
        avgComments: Math.round(totalComments / totalVideos)
    };
};

const filterItemsByExcludedCategories = (items: any[], excludedIds: Set<string> | string[]) => {
    const excludedSet = Array.isArray(excludedIds) ? new Set(excludedIds) : excludedIds;
    if (excludedSet.size === 0) return items;
    return items.filter(item => {
        const catId = item.snippet?.categoryId;
        return !excludedSet.has(catId);
    });
};

const filterItemsByDuration = (items: any[], format: 'any' | 'all' | 'longform' | 'shorts') => {
    if (format === 'any' || format === 'all') return items;
    return items.filter(item => {
        const duration = parseISO8601Duration(item.contentDetails?.duration || 'PT0S');
        if (format === 'shorts') return duration <= 3; // <= 3 minutes for shorts bucket
        if (format === 'longform') return duration > 3;
        return true;
    });
};

// --- Exported Functions ---

export const resolveChannelId = async (query: string, apiKey: string): Promise<string | null> => {
    if (query.startsWith('UC') && query.length === 24) return query; // Already an ID
    
    if (query.startsWith('@')) {
        const response = await fetch(`${BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&key=${apiKey}`);
        const data = await response.json();
        return data.items?.[0]?.snippet?.channelId || null;
    }
    
    if (query.includes('youtube.com/channel/')) {
        return query.split('youtube.com/channel/')[1].split('/')[0].split('?')[0];
    }
    
    const response = await fetch(`${BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&key=${apiKey}`);
    const data = await response.json();
    return data.items?.[0]?.snippet?.channelId || null;
};

export const fetchYouTubeData = async (mode: AnalysisMode, query: string, filters: FilterState, apiKey: string): Promise<VideoData[]> => {
    const safeQuery = query.replace(/[^a-zA-Z0-9가-힣-_]/g, '_');
    const safeFormat = filters.videoFormat || 'any';
    const safePeriod = filters.period || '30';
    const safeSort = filters.sortBy || 'viewCount';
    
    const cacheKey = `search_v2_${mode}_${safeQuery}_${filters.country}_${filters.category}_${safeFormat}_${safePeriod}_${safeSort}`;
    
    try {
        const cached = await getSearchResultsFromFirestore(cacheKey);
        if (cached && cached.timestamp) {
            const now = new Date().getTime();
            const cachedTime = new Date(cached.timestamp).getTime();
            const hoursDiff = (now - cachedTime) / (1000 * 60 * 60);
            
            if (hoursDiff < 24) {
                console.log(`[Search] HIT from Firestore for ${cacheKey} (${hoursDiff.toFixed(1)}h old)`);
                return cached.data;
            } else {
                console.log(`[Search] EXPIRED Firestore data for ${cacheKey} (${hoursDiff.toFixed(1)}h old), refreshing...`);
            }
        } else {
            console.log(`[Search] MISS for ${cacheKey}, fetching from API...`);
        }
    } catch (e) {
        console.warn("[Search] Firestore check failed, proceeding to API", e);
    }

    let searchUrl = `${BASE_URL}/search?part=snippet&maxResults=${filters.resultsLimit}&key=${apiKey}`;
    
    if (mode === 'channel') {
        const channelId = await resolveChannelId(query, apiKey);
        if (!channelId) throw new Error("Channel not found");
        searchUrl += `&channelId=${channelId}&order=date`;
    } else {
        searchUrl += `&q=${encodeURIComponent(query)}&type=video&order=${filters.sortBy === 'publishedAt' ? 'date' : 'viewCount'}`;
        if (filters.country && filters.country !== 'WW') {
            searchUrl += `&regionCode=${filters.country}`;
        }
        if (filters.category && filters.category !== 'all') {
            searchUrl += `&videoCategoryId=${filters.category}`;
        }
    }

    if (filters.period !== 'any' && mode === 'keyword') {
        const date = new Date();
        if (filters.period === '7') date.setDate(date.getDate() - 7);
        else if (filters.period === '30') date.setDate(date.getDate() - 30);
        else if (filters.period === '90') date.setDate(date.getDate() - 90);
        searchUrl += `&publishedAfter=${date.toISOString()}`;
    }

    const searchResponse = await fetch(searchUrl);
    const searchJson = await searchResponse.json();
    
    if (!searchJson.items || searchJson.items.length === 0) return [];

    const videoIds = searchJson.items.map((item: any) => item.id.videoId).join(',');
    const statsUrl = `${BASE_URL}/videos?part=statistics,contentDetails,snippet&id=${videoIds}&key=${apiKey}`;
    const statsResponse = await fetch(statsUrl);
    const statsJson = await statsResponse.json();

    if (!statsJson.items) return [];

    const channelIds = [...new Set(statsJson.items.map((item: any) => item.snippet.channelId))].join(',');
    const channelsUrl = `${BASE_URL}/channels?part=statistics,snippet&id=${channelIds}&key=${apiKey}`;
    const channelsResponse = await fetch(channelsUrl);
    const channelsJson = await channelsResponse.json();
    
    const channelMap = new Map<string, { subs: number, country: string }>();
    if (channelsJson.items) {
        channelsJson.items.forEach((c: any) => {
            channelMap.set(c.id, { 
                subs: parseInt(c.statistics.subscriberCount) || 0,
                country: c.snippet.country || 'KR'
            });
        });
    }

    const results = statsJson.items.map((item: any) => {
        const viewCount = parseInt(item.statistics.viewCount) || 0;
        const likeCount = parseInt(item.statistics.likeCount) || 0;
        const commentCount = parseInt(item.statistics.commentCount) || 0;
        const duration = parseISO8601Duration(item.contentDetails.duration);
        const publishedAt = item.snippet.publishedAt;
        const channelId = item.snippet.channelId;
        const channelInfo = channelMap.get(channelId) || { subs: 0, country: 'KR' };
        
        const hoursSincePublished = Math.max(1, (new Date().getTime() - new Date(publishedAt).getTime()) / (1000 * 60 * 60));
        const viewsPerHour = Math.round(viewCount / hoursSincePublished);
        
        const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;
        const performanceRatio = channelInfo.subs > 0 ? viewCount / channelInfo.subs : 0;
        const satisfactionScore = viewCount > 0 ? (likeCount * 5 + commentCount * 10) / viewCount : 0;

        let grade = 'D';
        if (performanceRatio > 5) grade = 'S';
        else if (performanceRatio > 2) grade = 'A';
        else if (performanceRatio > 1) grade = 'B';
        else if (performanceRatio > 0.5) grade = 'C';

        return {
            id: item.id,
            channelId: channelId,
            title: item.snippet.title,
            thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
            channelTitle: item.snippet.channelTitle,
            publishedAt: publishedAt,
            subscribers: channelInfo.subs,
            viewCount: viewCount,
            viewsPerHour: viewsPerHour,
            likeCount: likeCount,
            commentCount: commentCount,
            durationMinutes: parseFloat(duration.toFixed(2)),
            engagementRate: parseFloat(engagementRate.toFixed(2)),
            performanceRatio: parseFloat(performanceRatio.toFixed(2)),
            satisfactionScore: parseFloat(satisfactionScore.toFixed(4)),
            cll: 0, 
            cul: 0, 
            grade: grade,
            estimatedRevenue: calculateEstimatedRevenue(viewCount, duration, item.snippet.categoryId, channelInfo.country, channelInfo.subs),
            estimatedMonthlyRevenue: 0,
            channelCountry: channelInfo.country
        } as VideoData;
    });

    let filteredResults = results;

    if (filters.minViews > 0) {
        filteredResults = filteredResults.filter((v: VideoData) => v.viewCount >= filters.minViews);
    }

    if (filters.videoFormat === 'shorts') {
        filteredResults = filteredResults.filter((v: VideoData) => v.durationMinutes <= 3);
    } else if (filters.videoFormat === 'longform') {
        filteredResults = filteredResults.filter((v: VideoData) => v.durationMinutes > 3);
    }

    if (mode === 'keyword' && filters.country && filters.country !== 'WW') {
        filteredResults = filteredResults.filter((video: VideoData) => video.channelCountry === filters.country);
    }

    if (filteredResults.length > 0) {
        await setSearchResultsInFirestore(cacheKey, filteredResults).catch(err => {
            console.error("[Search] Failed to save to Firestore:", err);
        });
    }

    return filteredResults;
};

export const fetchChannelAnalysis = async (channelId: string, apiKey: string): Promise<ChannelAnalysisData> => {
    const channelResponse = await fetch(`${BASE_URL}/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${channelId}&key=${apiKey}`);
    const channelJson = await channelResponse.json();
    if (!channelJson.items || channelJson.items.length === 0) throw new Error("Channel not found");
    
    const channelItem = channelJson.items[0];
    const channelCountry = channelItem.snippet.country || 'KR';
    const uploadsPlaylistId = channelItem.contentDetails.relatedPlaylists.uploads;
    const subscriberCount = parseInt(channelItem.statistics?.subscriberCount || '0');
    
    const description = channelItem.snippet.description || "채널 설명이 없습니다.";
    const rawKeywords = channelItem.brandingSettings?.channel?.keywords || "";
    const channelKeywords = extractChannelKeywords(rawKeywords);

    const videosResponse = await fetch(`${BASE_URL}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`);
    const videosJson = await videosResponse.json();
    
    const videoIds = videosJson.items ? videosJson.items.map((v: any) => v.contentDetails.videoId).join(',') : '';
    
    let videoList: ChannelVideo[] = [];
    let recentTotalRevenue = 0;
    let recentTotalViews = 0;

    if (videoIds) {
        const videoStatsResponse = await fetch(`${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`);
        const videoStatsJson = await videoStatsResponse.json();
        
        const validItems = videoStatsJson.items ? videoStatsJson.items.filter((v: any) => v.statistics && v.contentDetails) : [];

        videoList = validItems.map((v: any) => {
            const views = parseInt(v.statistics.viewCount) || 0;
            const likes = parseInt(v.statistics.likeCount) || 0;
            const comments = parseInt(v.statistics.commentCount) || 0;
            const duration = parseISO8601Duration(v.contentDetails.duration);
            
            const revenue = calculateEstimatedRevenue(
                views, 
                v.contentDetails.duration, 
                v.snippet.categoryId, 
                channelCountry,
                subscriberCount
            );

            recentTotalRevenue += revenue;
            recentTotalViews += views;

            return {
                id: v.id,
                title: v.snippet.title,
                thumbnailUrl: v.snippet.thumbnails.medium?.url,
                publishedAt: v.snippet.publishedAt,
                viewCount: views,
                likeCount: likes,
                commentCount: comments,
                engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0,
                // **수정됨**: 3분 이하는 숏폼으로 분류
                isShorts: duration <= 3, 
                durationMinutes: duration,
                viewsPerHour: Math.round(views / (Math.max(1, (Date.now() - new Date(v.snippet.publishedAt).getTime()) / (1000 * 60 * 60)))),
                estimatedRevenue: revenue,
                tags: v.snippet.tags || []
            };
        });
    }

    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);
    
    const recentUploads = videoList.filter(v => new Date(v.publishedAt) >= oneMonthAgo).length;

    const dailyTrendsMap = new Map<string, TrendPoint>();
    const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    for (let i = 29; i >= 0; i--) {
        const d = new Date(utcToday);
        d.setUTCDate(utcToday.getUTCDate() - i);
        const isoDate = d.toISOString().split('T')[0];
        const displayDate = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
        dailyTrendsMap.set(isoDate, {
            date: displayDate,
            views: 0,
            engagements: 0,
            likes: 0,
            thumbnails: []
        });
    }

    videoList.forEach(video => {
        const pubDate = video.publishedAt.split('T')[0];
        if (dailyTrendsMap.has(pubDate)) {
            const stat = dailyTrendsMap.get(pubDate)!;
            stat.views += video.viewCount; 
            stat.likes += video.likeCount;
            stat.engagements += video.likeCount + video.commentCount;
            if (!stat.thumbnails) stat.thumbnails = [];
            if (stat.thumbnails.length < 5 && video.thumbnailUrl) {
                stat.thumbnails.push(video.thumbnailUrl);
            }
        }
    });
    const dailyTrends = Array.from(dailyTrendsMap.values());
    
    const shortsVideos = videoList.filter(v => v.isShorts);
    const longformVideos = videoList.filter(v => !v.isShorts);
    
    const shortsStats = calculateStats(shortsVideos);
    const longFormStats = calculateStats(longformVideos);
    
    const totalChannelViews = parseInt(channelItem.statistics?.viewCount || '0');
    let estimatedTotalRevenue = 0;
    
    if (subscriberCount >= 1000 && recentTotalViews > 0) {
        const blendedRPM = (recentTotalRevenue / recentTotalViews) * 1000;
        estimatedTotalRevenue = Math.round((totalChannelViews / 1000) * blendedRPM);
    } else if (subscriberCount < 1000) {
        estimatedTotalRevenue = 0;
    } else {
        estimatedTotalRevenue = Math.round((totalChannelViews / 1000) * 1.5);
    }

    // --- AI Analysis Injection ---
    let aiGeneratedData;
    try {
        const videoSnippetsForAI = videoList.slice(0, 15).map(v => ({
            title: v.title,
            tags: v.tags || []
        }));
        
        const channelStatsForAI = {
            name: channelItem.snippet.title,
            publishedAt: channelItem.snippet.publishedAt,
            subscriberCount: subscriberCount,
            totalViews: totalChannelViews,
            totalVideos: parseInt(channelItem.statistics?.videoCount || '0'),
            description: description
        };

        aiGeneratedData = await getAIChannelComprehensiveAnalysis(
            channelStatsForAI,
            videoSnippetsForAI,
            null
        );
    } catch (e) {
        console.warn("AI Analysis failed in youtubeService, using fallback.", e);
        aiGeneratedData = null;
    }

    const finalOverview = aiGeneratedData ? aiGeneratedData.overview : {
        competitiveness: { categories: [], tags: [] },
        popularKeywords: []
    };
    
    const finalAudienceProfile = aiGeneratedData ? aiGeneratedData.audienceProfile : {
        summary: "AI 분석에 실패했습니다. API 키를 확인하거나 잠시 후 다시 시도해주세요.",
        interests: [], genderRatio: [], ageGroups: [], topCountries: []
    };

    return {
        id: channelId,
        name: channelItem.snippet.title,
        handle: channelItem.snippet.customUrl,
        thumbnailUrl: channelItem.snippet.thumbnails.medium?.url,
        subscriberCount: subscriberCount,
        totalViews: totalChannelViews,
        totalVideos: parseInt(channelItem.statistics?.videoCount || '0'),
        publishedAt: channelItem.snippet.publishedAt,
        description: description,
        channelKeywords: channelKeywords,
        overview: {
            uploadPattern: {
                last30Days: recentUploads,
                last7Days: videoList.filter(v => new Date(v.publishedAt) >= new Date(Date.now() - 7 * 86400000)).length,
                last24Hours: videoList.filter(v => new Date(v.publishedAt) >= new Date(Date.now() - 86400000)).length
            },
            ...finalOverview
        },
        videoList,
        surgingVideos: {
            monthly: { longform: longformVideos.slice(0, 3), shorts: shortsVideos.slice(0, 3) },
            weekly: { longform: [], shorts: [] },
            daily: { longform: [], shorts: [] }
        },
        performanceTrend: {
            longFormStats,
            shortsStats,
            dailyTrends
        },
        audienceProfile: finalAudienceProfile,
        estimatedTotalRevenue: estimatedTotalRevenue,
        estimatedMonthlyRevenue: videoList.reduce((acc, v) => acc + (new Date(v.publishedAt) >= oneMonthAgo ? v.estimatedRevenue : 0), 0)
    };
};

export const fetchRankingData = async (type: 'channels' | 'videos', filters: any, apiKey: string): Promise<(ChannelRankingData | VideoRankingData)[]> => {
    const today = new Date().toISOString().split('T')[0];
    const safeCategory = filters.category === 'all' ? 'all' : filters.category;
    const safeCountry = filters.country || 'KR';
    const safeType = type;
    const safeFormat = filters.videoFormat || 'all';
    const limit = filters.limit || 50;
    
    const skipCache = filters.skipCache || false;
    
    const firestoreKey = `${safeType}_${safeCountry}_${safeCategory}_${safeFormat}_${limit}_${today}`;

    if (!skipCache) {
        try {
            const cachedData = await getRankingFromFirestore(firestoreKey);
            if (cachedData) {
                console.log(`[Ranking] HIT from Firestore for ${firestoreKey}`);
                await new Promise(resolve => setTimeout(resolve, 200));
                return cachedData;
            }
        } catch (e) {
            console.warn("[Ranking] Firestore check failed, continuing with live API...", e);
        }
    }

    console.log(`[Ranking] MISS/SKIP for ${firestoreKey} (skipCache: ${skipCache}), fetching live data...`);

    const targetCount = filters.limit || 50;
    const MAX_PAGES_TO_SCAN = 10; 
    
    let collectedItems: any[] = [];
    let pageToken = '';
    let attempt = 0;
    
    const regionParam = (filters.country && filters.country !== 'WW') ? `&regionCode=${filters.country}` : '';
    
    let baseUrl = `${BASE_URL}/videos?part=snippet,statistics,contentDetails&chart=mostPopular&maxResults=50${regionParam}&key=${apiKey}`;
    if (filters.category && filters.category !== 'all') {
        baseUrl += `&videoCategoryId=${filters.category}`;
    }

    try {
        while (collectedItems.length < targetCount && attempt < MAX_PAGES_TO_SCAN) {
            const url = `${baseUrl}${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const response = await fetch(url);
            if (!response.ok) { 
                throw new Error(`YouTube API failed: ${response.status}`);
            }
            const data = await response.json();
            
            if (!data.items || data.items.length === 0) break;

            let validItems = data.items.filter((item: any) => 
                item && item.snippet && item.statistics && item.contentDetails && 
                item.statistics.viewCount !== undefined
            );
            
            validItems = filterItemsByExcludedCategories(validItems, filters.excludedCategories);
            validItems = filterItemsByDuration(validItems, filters.videoFormat);

            collectedItems = [...collectedItems, ...validItems];
            
            if (!data.nextPageToken) break;
            pageToken = data.nextPageToken;
            attempt++;
        }
        
        collectedItems = collectedItems.slice(0, targetCount);
        
        if (collectedItems.length === 0) return [];

        let finalResult: (ChannelRankingData | VideoRankingData)[] = [];

        if (type === 'channels') {
            const channelTrendStats = new Map<string, number>();
            const uniqueChannelIds = new Set<string>();

            collectedItems.forEach((item: any) => {
                const cid = item.snippet?.channelId;
                if (cid) {
                    uniqueChannelIds.add(cid);
                    const vViews = parseInt(item.statistics?.viewCount || '0');
                    const currentMax = channelTrendStats.get(cid) || 0;
                    if (vViews > currentMax) {
                        channelTrendStats.set(cid, vViews);
                    }
                }
            });

            const channelIdsArr = Array.from(uniqueChannelIds).slice(0, targetCount);
            if (channelIdsArr.length === 0) return [];
            
            let channelsDataItems: any[] = [];
            for (let i = 0; i < channelIdsArr.length; i += 50) {
                const batch = channelIdsArr.slice(i, i + 50);
                try {
                    const channelsResp = await fetch(`${BASE_URL}/channels?part=snippet,statistics&id=${batch.join(',')}&key=${apiKey}`);
                    const channelsData = await channelsResp.json();
                    if (channelsData.items) {
                        channelsDataItems = [...channelsDataItems, ...channelsData.items];
                    }
                } catch (e) {
                    console.error("Error fetching batch channels:", e);
                }
            }
            
            const rankedChannels = channelsDataItems.map((item: any) => {
                const views = parseInt(item.statistics?.viewCount || '0');
                const subscriberCount = parseInt(item.statistics?.subscriberCount || '0');
                const channelCountry = item.snippet?.country || filters.country;
                const revenue = calculateEstimatedRevenue(views, "PT5M", "22", channelCountry, subscriberCount); 

                return {
                    id: item.id,
                    name: item.snippet?.title || 'Unknown Channel',
                    channelHandle: item.snippet?.customUrl,
                    thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
                    subscriberCount: subscriberCount,
                    viewsInPeriod: channelTrendStats.get(item.id) || 0, 
                    videoCount: parseInt(item.statistics?.videoCount || '0'),
                    viewCount: views,
                    rank: 0, 
                    rankChange: 0, 
                    estimatedTotalRevenue: revenue, 
                    estimatedMonthlyRevenue: revenue * 0.05,
                    channelCountry: item.snippet?.country,
                    description: item.snippet?.description
                } as ChannelRankingData;
            });

            rankedChannels.sort((a, b) => b.subscriberCount - a.subscriberCount);

            finalResult = rankedChannels.map((ch, index) => ({
                ...ch,
                rank: index + 1
            }));
        }

        if (type === 'videos') {
            const channelIds = [...new Set(collectedItems.map((item: any) => item.snippet?.channelId).filter(Boolean))];
            let channelMap = new Map<string, { subscribers: number }>();
            
            for (let i = 0; i < channelIds.length; i += 50) {
                const batch = channelIds.slice(i, i + 50);
                try {
                    const channelsResponse = await fetch(`${BASE_URL}/channels?part=statistics&id=${batch.join(',')}&key=${apiKey}`);
                    const channelsData = await channelsResponse.json();
                    if (channelsData.items) {
                        channelsData.items.forEach((c: any) => {
                            const subCount = parseInt(c.statistics?.subscriberCount || '0');
                            channelMap.set(c.id, { subscribers: subCount });
                        });
                    }
                } catch (e) { console.error("Error batching video channels", e); }
            }

            finalResult = collectedItems.map((item: any, index: number) => {
                const stats = item.statistics || {};
                const snippet = item.snippet || {};
                const content = item.contentDetails || {};

                const views = parseInt(stats.viewCount || '0');
                const duration = parseISO8601Duration(content.duration);
                // Ensure sub count is safe number, default to 0 if missing
                const subscriberCount = channelMap.get(snippet.channelId)?.subscribers || 0;
                
                const revenue = calculateEstimatedRevenue(
                    views, 
                    content.duration || 'PT0S', 
                    snippet.categoryId, 
                    filters.country,
                    subscriberCount
                );

                return {
                    id: item.id,
                    rank: index + 1,
                    name: snippet.title || 'Unknown Video',
                    channelName: snippet.channelTitle || 'Unknown Channel',
                    channelId: snippet.channelId,
                    thumbnailUrl: snippet.thumbnails?.medium?.url || '',
                    publishedDate: snippet.publishedAt,
                    viewCount: views,
                    viewsPerHour: Math.round(views / (Math.max(1, (Date.now() - new Date(snippet.publishedAt || Date.now()).getTime()) / (1000 * 60 * 60)))),
                    rankChange: 0,
                    channelTotalViews: 0,
                    channelSubscriberCount: subscriberCount,
                    estimatedRevenue: revenue,
                    estimatedMonthlyRevenue: 0,
                    categoryId: snippet.categoryId,
                    channelHandle: snippet.customUrl,
                    channelDescription: snippet.description,
                    durationSeconds: Math.floor(duration * 60),
                    // **수정됨**: 3분 이하는 숏폼으로 분류
                    isShorts: duration <= 3, 
                    channelCountry: filters.country
                } as VideoRankingData;
            });
        }

        finalResult = finalResult.filter(Boolean);

        if (!skipCache && finalResult.length > 0) {
            setRankingInFirestore(firestoreKey, finalResult).catch(e => console.warn("Background save failed:", e));
        }

        return finalResult;

    } catch (e) {
        console.error("Error fetching ranking data (Global Catch):", e);
        return [];
    }
};

export const fetchVideoDetails = async (videoId: string, apiKey: string): Promise<VideoDetailData> => {
    const response = await fetch(`${BASE_URL}/videos?part=snippet,statistics,contentDetails,player&id=${videoId}&key=${apiKey}`);
    const data = await response.json();
    if (!data.items || data.items.length === 0) throw new Error("Video not found");
    
    const item = data.items[0];
    const channelId = item.snippet.channelId;
    
    // Fetch channel details for sub count
    const channelResponse = await fetch(`${BASE_URL}/channels?part=statistics&id=${channelId}&key=${apiKey}`);
    const channelData = await channelResponse.json();
    const subscriberCount = parseInt(channelData.items?.[0]?.statistics?.subscriberCount || '0');

    const views = parseInt(item.statistics.viewCount);
    const duration = parseISO8601Duration(item.contentDetails.duration);
    const revenue = calculateEstimatedRevenue(views, duration, item.snippet.categoryId, 'KR', subscriberCount);

    return {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
        publishedAt: item.snippet.publishedAt,
        durationMinutes: duration,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        channelSubscriberCount: subscriberCount,
        viewCount: views,
        likeCount: parseInt(item.statistics.likeCount) || 0,
        commentCount: parseInt(item.statistics.commentCount) || 0,
        embedHtml: item.player?.embedHtml || '',
        embeddable: true, 
        comments: [], // Will be fetched separately if needed
        commentInsights: { summary: '', positivePoints: [], negativePoints: [] },
        deepDiveInsights: { 
            topicAnalysis: { summary: '', successFactors: [] },
            audienceAnalysis: { summary: '', engagementPoints: [] },
            performanceAnalysis: { summary: '', trafficSources: [], subscriberImpact: '' },
            retentionStrategy: { summary: '', improvementPoints: [] },
            strategicRecommendations: { contentStrategy: '', newTopics: [], growthStrategy: '' }
        },
        estimatedRevenue: revenue,
        estimatedMonthlyRevenue: revenue * 0.1 // Heuristic
    };
};

export const fetchVideoComments = async (videoId: string, apiKey: string): Promise<VideoComment[]> => {
    try {
        const response = await fetch(`${BASE_URL}/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&order=relevance&key=${apiKey}`);
        const data = await response.json();
        if (!data.items) return [];
        
        return data.items.map((item: any) => ({
            text: item.snippet.topLevelComment.snippet.textDisplay,
            author: item.snippet.topLevelComment.snippet.authorDisplayName,
            likeCount: item.snippet.topLevelComment.snippet.likeCount,
            publishedAt: item.snippet.topLevelComment.snippet.publishedAt
        }));
    } catch (e) {
        console.error("Error fetching comments:", e);
        return [];
    }
};

export const analyzeVideoDeeply = async (videoData: VideoDetailData, apiKey: string): Promise<{ commentInsights: CommentInsights, deepDiveInsights: AIVideoDeepDiveInsights }> => {
    // 1. Fetch comments
    const comments = await fetchVideoComments(videoData.id, apiKey);
    
    // 2. Parallel AI calls
    const [commentInsights, deepDiveInsights] = await Promise.all([
        getAICommentInsights(comments),
        getAIVideoDeepDiveInsights({ ...videoData, commentInsights: { summary: '', positivePoints: [], negativePoints: [] } }) // Pass temp empty insights for deep dive prompt context if needed, or update implementation to accept raw comments
    ]);
    
   return { commentInsights, deepDiveInsights };
};

export const fetchSimilarChannels = async (channelId: string, apiKey: string): Promise<SimilarChannelData[]> => {
    // 1. Get channel info to find its topics/keywords
    const channelData = await fetchChannelAnalysis(channelId, apiKey);
    
    // 2. Use Gemini to find similar channels based on analysis data
    const aiResult = await getAISimilarChannels(channelData);
    
    // 3. Resolve these channel names to IDs and get basic stats
    const resolvedChannels: SimilarChannelData[] = [];
    
    for (const rec of aiResult.channels) {
        try {
            const searchResp = await fetch(`${BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(rec.name)}&maxResults=1&key=${apiKey}`);
            const searchJson = await searchResp.json();
            const cid = searchJson.items?.[0]?.snippet?.channelId;
            
            if (cid) {
                const statsResp = await fetch(`${BASE_URL}/channels?part=statistics&id=${cid}&key=${apiKey}`);
                const statsJson = await statsResp.json();
                const stats = statsJson.items?.[0]?.statistics;
                
                resolvedChannels.push({
                    id: cid,
                    name: rec.name,
                    thumbnailUrl: searchJson.items[0].snippet.thumbnails.default.url,
                    subscriberCount: parseInt(stats?.subscriberCount || '0'),
                    videoCount: parseInt(stats?.videoCount || '0'),
                    reason: rec.reason
                });
            }
        } catch (e) {
            console.error("Error resolving similar channel:", rec.name, e);
        }
    }
    
    return resolvedChannels;
};

export const fetchMyChannelAnalytics = async (channelId: string, apiKey: string): Promise<MyChannelAnalyticsData> => {
    // 1. Fetch Basic Channel Data
    const channelData = await fetchChannelAnalysis(channelId, apiKey);
    
    // 2. AI Analysis for Dashboard
    const aiInsights = await getAIChannelDashboardInsights(
        channelData.name,
        { subscribers: channelData.subscriberCount, totalViews: channelData.totalViews, videoCount: channelData.totalVideos },
        channelData.videoList.slice(0, 10).map(v => ({ title: v.title, views: v.viewCount, publishedAt: v.publishedAt }))
    );
    
    // 3. Transform to Dashboard Format
    const kpi = {
        viewsLast30d: channelData.overview.uploadPattern.last30Days * channelData.performanceTrend.longFormStats.avgViews, // Rough estimate
        netSubscribersLast30d: Math.round(channelData.subscriberCount * 0.01), // Rough estimate
        watchTimeHoursLast30d: Math.round(channelData.totalViews * 4 / 60), // Rough estimate (4 min avg)
        ctrLast30d: 5.2, // Mock/Benchmark
        avgViewDurationSeconds: 245, // Mock/Benchmark
        impressionsLast30d: channelData.totalViews * 12 // Mock/Benchmark (CTR ~8%)
    };

    return {
        name: channelData.name,
        thumbnailUrl: channelData.thumbnailUrl,
        aiExecutiveSummary: aiInsights.aiExecutiveSummary || { summary: '', strengths: [], opportunities: [] },
        kpi: kpi,
        dailyStats: channelData.performanceTrend.dailyTrends.map(t => ({ date: `2023-${t.date.replace('/', '-')}`, netSubscribers: Math.floor(Math.random() * 50) - 10 })), // Mock daily subs
        aiGrowthInsight: aiInsights.aiGrowthInsight || { summary: '', strengths: [], opportunities: [] },
        funnelMetrics: {
            impressions: kpi.impressionsLast30d,
            ctr: kpi.ctrLast30d,
            views: kpi.viewsLast30d,
            avgViewDuration: kpi.avgViewDurationSeconds
        },
        aiFunnelInsight: aiInsights.aiFunnelInsight || { summary: '', strengths: [], opportunities: [] },
        contentSuccessFormula: aiInsights.contentSuccessFormula || { titlePatterns: [], optimalLength: '', thumbnailStyle: '' },
        contentIdeas: aiInsights.contentIdeas || [],
        retentionData: {
            average: Array.from({length: 10}, (_, i) => ({ time: i*10, retention: 100 - i*8 })),
            topVideo: Array.from({length: 10}, (_, i) => ({ time: i*10, retention: 100 - i*5 })),
        },
        trafficSources: [
            { name: '검색', percentage: 40, views: kpi.viewsLast30d * 0.4 },
            { name: '탐색 기능', percentage: 35, views: kpi.viewsLast30d * 0.35 },
            { name: '추천 영상', percentage: 15, views: kpi.viewsLast30d * 0.15 },
            { name: '기타', percentage: 10, views: kpi.viewsLast30d * 0.1 }
        ],
        videoAnalytics: channelData.videoList.slice(0, 5).map(v => ({
            id: v.id,
            thumbnailUrl: v.thumbnailUrl,
            title: v.title,
            publishedAt: v.publishedAt,
            views: v.viewCount,
            ctr: Math.random() * 10, // Mock
            avgViewDurationSeconds: Math.random() * 300 // Mock
        })),
        viewerPersona: aiInsights.viewerPersona || { name: 'Unknown', description: '', strategy: '' },
        viewershipData: {
            bestUploadTime: '토요일 오후 8시',
            heatmap: Array(7).fill(0).map(() => Array(24).fill(0).map(() => Math.floor(Math.random() * 100)))
        },
        audienceProfile: channelData.audienceProfile
    };
};

export const convertPublicDataToKPI = (publicData: ChannelAnalysisData): MyChannelAnalyticsData['kpi'] => {
    return {
        viewsLast30d: publicData.videoList
            .filter(v => new Date(v.publishedAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
            .reduce((sum, v) => sum + v.viewCount, 0),
        netSubscribersLast30d: Math.round(publicData.subscriberCount * 0.02), // Estimate 2% growth
        watchTimeHoursLast30d: 0, // Cannot know publicly
        ctrLast30d: 0, // Cannot know
        avgViewDurationSeconds: 0, // Cannot know
        impressionsLast30d: 0 // Cannot know
    };
};

export const fetchBenchmarkComparison = async (
    myChannel: MyChannelAnalyticsData, 
    benchmarkKPI: MyChannelAnalyticsData['kpi'],
    benchmarkName: string
): Promise<BenchmarkComparisonData> => {
    // Use AI to generate insights based on the comparison
    const aiInsight = await getAIComparisonInsights(
        { query: myChannel.name, videos: [] }, // We just need names for this specific helper mostly, or update helper
        { query: benchmarkName, videos: [] }
    );

    // Construct simple daily comparison (mock logic for benchmark daily)
    const dailyComparison = myChannel.dailyStats.map(d => ({
        date: d.date,
        myChannelViews: Math.floor(Math.random() * 10000), // Use real if available
        benchmarkViews: Math.floor(Math.random() * 50000) // Mock benchmark
    }));

    return {
        myChannelKpi: myChannel.kpi,
        benchmarkChannelKpi: benchmarkKPI,
        dailyComparison,
        aiInsight: {
            summary: aiInsight.summary,
            strength: aiInsight.channelA_summary.strengths[0] || '',
            weakness: "벤치마크 대비 조회수 성장세가 약함",
            recommendation: aiInsight.recommendation
        }
    };
};
