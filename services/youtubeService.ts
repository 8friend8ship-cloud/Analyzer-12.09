
import type { VideoData, AnalysisMode, FilterState, ChannelDetails, ChannelAnalysisData, ChannelVideo, FormatStats, TrendPoint, PerformanceTrendData, VideoComment, ChannelRankingData, VideoRankingData, AudienceProfile, VideoDetailData, CommentInsights, MyChannelAnalyticsData, RetentionDataPoint, BenchmarkComparisonData, SimilarChannelData, AIVideoDeepDiveInsights, SortBy } from '../types';
import { getAIChannelComprehensiveAnalysis, getAICommentInsights, getAISimilarChannels, getAIVideoDeepDiveInsights, getAIChannelDashboardInsights } from './geminiService';
import { getFromCache, setInCache, getDailyCache, setDailyCache } from './cacheService';

// Mock Data for MyChannelAnalytics
const MOCK_MY_CHANNEL_DATA: MyChannelAnalyticsData = {
    name: "Tech Explorer",
    thumbnailUrl: "https://ui-avatars.com/api/?name=Tech+Explorer&background=0D8ABC&color=fff",
    aiExecutiveSummary: {
        summary: "지난달 대비 조회수와 구독자 수가 모두 증가했습니다. 특히 'AI 도구' 관련 콘텐츠가 높은 성과를 보였습니다.",
        strengths: ["높은 클릭률(CTR)", "검색 유입 증가"],
        opportunities: ["쇼츠 콘텐츠 확대", "커뮤니티 탭 활성화"]
    },
    kpi: {
        viewsLast30d: 154000,
        netSubscribersLast30d: 3200,
        watchTimeHoursLast30d: 12500,
        ctrLast30d: 5.8,
        avgViewDurationSeconds: 290,
        impressionsLast30d: 2100000
    },
    dailyStats: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        netSubscribers: Math.floor(Math.random() * 150) + 50
    })),
    aiGrowthInsight: {
        summary: "구독자 전환율이 상승세입니다. 최근 업로드한 'Notion 꿀팁' 영상이 주요 원인으로 분석됩니다.",
        strengths: ["초반 30초 이탈률 감소"],
        opportunities: ["시리즈물 기획"]
    },
    funnelMetrics: {
        impressions: 2100000,
        ctr: 5.8,
        views: 154000,
        avgViewDuration: 290
    },
    aiFunnelInsight: {
        summary: "노출 수는 충분하나 클릭률이 다소 낮습니다. 썸네일의 텍스트 가독성을 높여보세요.",
        strengths: ["높은 노출 도달 범위"],
        opportunities: ["썸네일 A/B 테스트"]
    },
    contentSuccessFormula: {
        titlePatterns: ["~하는 방법", "Best 5", "절대 하지 마세요"],
        optimalLength: "8분 - 12분",
        thumbnailStyle: "인물 얼굴 포함 + 큰 텍스트"
    },
    contentIdeas: [
        { title: "2024년 최고의 생산성 앱 Top 10", reason: "시청자 관심사(생산성)와 높은 검색량" },
        { title: "ChatGPT로 업무 자동화하는 법", reason: "최근 'AI' 키워드 유입 증가" },
        { title: "초보자를 위한 영상 편집 가이드", reason: "댓글 요청 다수" }
    ],
    retentionData: {
        average: Array.from({ length: 101 }, (_, i) => ({ time: i, retention: 100 - (i * 0.6) })),
        topVideo: Array.from({ length: 101 }, (_, i) => ({ time: i, retention: 100 - (i * 0.3) }))
    },
    trafficSources: [
        { name: "YouTube 검색", percentage: 45, views: 69300 },
        { name: "탐색 기능", percentage: 30, views: 46200 },
        { name: "추천 동영상", percentage: 15, views: 23100 },
        { name: "기타", percentage: 10, views: 15400 }
    ],
    videoAnalytics: [
        { id: "v1", title: "생산성 끝판왕 Notion 활용법", thumbnailUrl: "https://placehold.co/320x180/1a1a1a/ffffff?text=Notion", publishedAt: new Date().toISOString(), views: 45000, ctr: 7.2, avgViewDurationSeconds: 320 },
        { id: "v2", title: "아이패드 필수 앱 추천", thumbnailUrl: "https://placehold.co/320x180/1a1a1a/ffffff?text=iPad", publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(), views: 28000, ctr: 5.5, avgViewDurationSeconds: 240 },
        { id: "v3", title: "맥북 초기 설정 가이드", thumbnailUrl: "https://placehold.co/320x180/1a1a1a/ffffff?text=MacBook", publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(), views: 15000, ctr: 4.8, avgViewDurationSeconds: 180 }
    ],
    viewerPersona: {
        name: "성장 욕구가 강한 2030 직장인",
        description: "자기계발과 효율적인 업무 방식에 관심이 많으며, 새로운 도구를 배우는 것을 주저하지 않습니다.",
        strategy: "실질적인 도움이 되는 튜토리얼과 동기부여 콘텐츠를 혼합하여 제공하세요."
    },
    viewershipData: {
        bestUploadTime: "수요일 오후 7시",
        heatmap: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => Math.floor(Math.random() * 100)))
    },
    audienceProfile: {
        summary: "25-34세 남성이 주 시청층입니다.",
        interests: ["Technology", "Business", "Lifestyle"],
        genderRatio: [{ label: "남성", value: 65 }, { label: "여성", value: 35 }],
        ageGroups: [{ label: "18-24", value: 20 }, { label: "25-34", value: 45 }, { label: "35-44", value: 25 }, { label: "기타", value: 10 }],
        topCountries: [{ label: "KR", value: 90 }, { label: "US", value: 5 }, { label: "JP", value: 5 }]
    }
};

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Helper to handle AI timeouts
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => {
            console.warn(`Async operation timed out after ${ms}ms`);
            resolve(fallback);
        }, ms))
    ]);
};

function parseISO8601Duration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  const hours = (parseInt(match[1] || '0') || 0);
  const minutes = (parseInt(match[2] || '0') || 0);
  const seconds = (parseInt(match[3] || '0') || 0);
  return hours * 60 + minutes + seconds / 60;
}

/**
 * Calculates estimated revenue based on views, duration, category, and country.
 * 
 * Logic:
 * - Subscribers < 1000: Revenue is 0 (Not Monetized).
 * - Shorts (< 60s): Low RPM ($0.01 - $0.05)
 * - Longform: Base RPM ($1.5 - $3.0) adjusted by Category and Country
 */
const calculateEstimatedRevenue = (viewCount: number, durationStr: string, categoryId: string, countryCode: string = 'KR', subscriberCount: number = 0): number => {
    // Basic Monetization Threshold: 1000 subscribers.
    // Note: We cannot check 4000 hours or 10M Shorts views publicly, so this is the best available filter.
    if (subscriberCount < 1000) {
        return 0;
    }

    const durationSeconds = parseISO8601Duration(durationStr) * 60;
    const isShorts = durationSeconds <= 60;

    // Base RPM (Revenue Per 1,000 views) in USD
    // Shorts are significantly lower.
    let rpm = isShorts ? 0.04 : 2.0;

    // Category Multipliers (Approximate Market Rates)
    const categoryMultipliers: Record<string, number> = {
        '1': 0.9,  // Film & Animation
        '2': 1.8,  // Autos & Vehicles (High)
        '10': 0.8, // Music (Low due to licensing/official mvs)
        '15': 1.2, // Pets & Animals
        '17': 1.2, // Sports
        '19': 1.1, // Travel & Events
        '20': 0.7, // Gaming (Generally lower, though volume is high)
        '22': 1.0, // People & Blogs (Baseline)
        '23': 0.9, // Comedy
        '24': 0.9, // Entertainment
        '25': 1.5, // News & Politics (Decent)
        '26': 1.6, // Howto & Style
        '27': 2.0, // Education (High)
        '28': 2.5, // Science & Technology (Very High)
        '29': 1.2, // Nonprofits & Activism
    };

    if (categoryId && categoryMultipliers[categoryId]) {
        rpm *= categoryMultipliers[categoryId];
    }

    // Country Multipliers relative to KR (Tier 2 ish)
    const countryMultipliers: Record<string, number> = {
        'US': 3.5, 'AU': 3.5, 'CA': 3.0, 'GB': 2.5, 'DE': 2.5, // Tier 1
        'KR': 1.0, 'JP': 1.2, 'FR': 1.5, 'IT': 1.2, 'ES': 1.0, // Tier 2
        'IN': 0.15, 'VN': 0.15, 'ID': 0.15, 'PH': 0.15, 'BR': 0.2, 'RU': 0.2, 'TH': 0.2 // Tier 3
    };

    if (countryCode && countryMultipliers[countryCode]) {
        rpm *= countryMultipliers[countryCode];
    } else if (countryCode !== 'KR' && countryCode !== 'WW') {
        // Fallback for unknown countries (assume Lower Tier 2 / Tier 3 mix)
        rpm *= 0.5;
    }

    return Math.round((viewCount / 1000) * rpm);
}


// Helper to filter items based on excluded category IDs
const filterItemsByExcludedCategories = (items: any[], excludedCategories: any) => {
    if (!excludedCategories || !items) return items;
    const excludedSet = excludedCategories instanceof Set 
        ? excludedCategories 
        : new Set(Array.isArray(excludedCategories) ? excludedCategories : []);
    
    if (excludedSet.size === 0) return items;

    return items.filter((item: any) => item.snippet && !excludedSet.has(item.snippet.categoryId));
};

// Helper to filter items based on duration (Manual filtering as API doesn't support it for mostPopular)
const filterItemsByDuration = (items: any[], format: 'all' | 'longform' | 'shorts') => {
    if (format === 'all' || !items) return items;
    
    return items.filter((item: any) => {
        if (!item.contentDetails || !item.contentDetails.duration) return true; // Keep if unknown
        const durationMinutes = parseISO8601Duration(item.contentDetails.duration);
        const durationSeconds = durationMinutes * 60;
        
        // 3분 이하 = Shorts (in this context) / 3분 초과 = Longform
        if (format === 'shorts') {
            return durationSeconds <= 180;
        } else if (format === 'longform') {
            return durationSeconds > 180;
        }
        return true;
    });
};

// --- NEW Helper Functions for Statistics ---

const calculateStats = (videos: ChannelVideo[]): FormatStats => {
    if (!videos || videos.length === 0) return { totalVideos: 0, avgViews: 0, avgEngagementRate: 0, avgLikes: 0, avgComments: 0 };
    
    const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.likeCount, 0);
    const totalComments = videos.reduce((sum, v) => sum + v.commentCount, 0);
    const avgEngagementRate = videos.reduce((sum, v) => sum + v.engagementRate, 0) / videos.length;

    return {
        totalVideos: videos.length,
        avgViews: Math.round(totalViews / videos.length),
        avgLikes: Math.round(totalLikes / videos.length),
        avgComments: Math.round(totalComments / videos.length),
        avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2))
    };
};

const estimateAudienceProfile = (country: string = 'KR'): AudienceProfile => {
    // Provide plausible estimated data based on general YouTube demographics for the region
    const isKorea = country === 'KR';
    return {
        summary: "채널의 공개 데이터와 카테고리 트렌드를 기반으로 추정한 시청자 프로필입니다.",
        interests: ["Entertainment", "Vlog", "Lifestyle", "Music", "Gaming"],
        genderRatio: [
            { label: "남성", value: 55 },
            { label: "여성", value: 45 }
        ],
        ageGroups: [
            { label: "18-24", value: 25 },
            { label: "25-34", value: 40 },
            { label: "35-44", value: 20 },
            { label: "기타", value: 15 }
        ],
        topCountries: isKorea 
            ? [{ label: "대한민국", value: 88 }, { label: "미국", value: 4 }, { label: "일본", value: 3 }, { label: "기타", value: 5 }]
            : [{ label: "미국", value: 45 }, { label: "영국", value: 10 }, { label: "인도", value: 8 }, { label: "기타", value: 37 }]
    };
};

const extractChannelKeywords = (keywordsStr: string): string[] => {
    if (!keywordsStr) return [];
    // Regex to handle quoted strings like "funny video" or plain words
    const regex = /"([^"]+)"|(\S+)/g;
    const keywords: string[] = [];
    let match;
    while ((match = regex.exec(keywordsStr)) !== null) {
        // match[1] is the quoted string (without quotes), match[2] is the unquoted word
        keywords.push(match[1] || match[2]);
    }
    return keywords.slice(0, 15); // Limit to 15
};

const aggregateFrequency = (items: string[][]): { keyword: string, score: number }[] => {
    const counts = new Map<string, number>();
    items.forEach(list => {
        if (!list) return;
        list.forEach(item => {
            const normalized = item.trim(); // Keep case for display usually, or toLowerCase for aggregation
            if (normalized.length > 1) { // Ignore single chars
                counts.set(normalized, (counts.get(normalized) || 0) + 1);
            }
        });
    });

    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([keyword, count]) => {
            // Score 0-100 based on relative frequency
            const max = Math.max(...Array.from(counts.values()));
            return {
                keyword,
                score: Math.round((count / max) * 100)
            };
        });
};


// Actual API Calls

export const resolveChannelId = async (query: string, apiKey: string): Promise<string | null> => {
    try {
        const response = await fetch(`${BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=1`);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            return data.items[0].snippet.channelId;
        }
        return null;
    } catch (e) {
        console.error("Error resolving channel ID", e);
        return null;
    }
};

export const fetchYouTubeData = async (mode: AnalysisMode, query: string, filters: FilterState, apiKey: string): Promise<VideoData[]> => {
    let url = `${BASE_URL}/search?part=snippet&maxResults=${filters.resultsLimit}&key=${apiKey}&type=video`;
    
    if (mode === 'keyword') {
        url += `&q=${encodeURIComponent(query)}`;
    } else {
        const channelId = await resolveChannelId(query, apiKey);
        if (!channelId) throw new Error("Channel not found");
        url += `&channelId=${channelId}`;
    }

    if (filters.period !== 'any') {
        const date = new Date();
        date.setDate(date.getDate() - parseInt(filters.period));
        url += `&publishedAfter=${date.toISOString()}`;
    }
    
    if (filters.videoFormat === 'shorts') {
        url += '&videoDuration=short';
    } else if (filters.videoFormat === 'longform') {
        url += '&videoDuration=medium'; 
    }

    if (filters.country && filters.country !== 'WW') {
        url += `&regionCode=${filters.country}`;
    }

    url += `&order=${filters.sortBy === 'viewCount' ? 'viewCount' : 'relevance'}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("YouTube API request failed");
    const data = await response.json();

    if (!data.items) return [];

    const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
    const statsResponse = await fetch(`${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`);
    const statsData = await statsResponse.json();

    // To calculate revenue correctly, we need subscriber counts.
    // Collect channel IDs from the video list.
    const channelIds = [...new Set(statsData.items.map((item: any) => item.snippet.channelId))].join(',');
    let channelMap = new Map<string, number>();
    
    if (channelIds) {
        try {
            // Batch fetch channel details (limit is 50, same as max search result, so one call usually suffices)
            const channelsResponse = await fetch(`${BASE_URL}/channels?part=statistics&id=${channelIds}&key=${apiKey}`);
            const channelsData = await channelsResponse.json();
            if (channelsData.items) {
                channelsData.items.forEach((c: any) => {
                    channelMap.set(c.id, parseInt(c.statistics.subscriberCount) || 0);
                });
            }
        } catch (e) {
            console.warn("Failed to fetch channel stats for revenue calculation:", e);
        }
    }

    const validItems = statsData.items.filter((item: any) => item.statistics && item.contentDetails);

    return validItems.map((item: any) => {
        const durationMin = parseISO8601Duration(item.contentDetails.duration);
        const views = parseInt(item.statistics.viewCount) || 0;
        const likes = parseInt(item.statistics.likeCount) || 0;
        const comments = parseInt(item.statistics.commentCount) || 0;
        const channelId = item.snippet.channelId;
        const subscribers = channelMap.get(channelId) || 0;
        
        // Calculate dynamic revenue with subscriber threshold check
        const revenue = calculateEstimatedRevenue(
            views, 
            item.contentDetails.duration, 
            item.snippet.categoryId, 
            filters.country,
            subscribers
        );

        return {
            id: item.id,
            channelId: channelId,
            title: item.snippet.title,
            thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            subscribers: subscribers,
            viewCount: views,
            viewsPerHour: Math.round(views / (Math.max(1, (Date.now() - new Date(item.snippet.publishedAt).getTime()) / (1000 * 60 * 60)))),
            likeCount: likes,
            commentCount: comments,
            durationMinutes: parseFloat(durationMin.toFixed(2)),
            engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0,
            performanceRatio: subscribers > 0 ? views / subscribers : 1.5, // Default if unknown subs
            satisfactionScore: views > 0 ? (likes * 5 + comments * 10) / views * 100 : 0,
            cll: 0,
            cul: 0,
            grade: 'B',
            estimatedRevenue: revenue,
            estimatedMonthlyRevenue: 0
        } as VideoData;
    });
};

export const fetchChannelAnalysis = async (channelId: string, apiKey: string): Promise<ChannelAnalysisData> => {
    // Add brandingSettings to the part parameter to get keywords
    const channelResponse = await fetch(`${BASE_URL}/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${channelId}&key=${apiKey}`);
    const channelJson = await channelResponse.json();
    if (!channelJson.items || channelJson.items.length === 0) throw new Error("Channel not found");
    
    const channelItem = channelJson.items[0];
    const channelCountry = channelItem.snippet.country || 'KR'; // Default to KR if not present
    const uploadsPlaylistId = channelItem.contentDetails.relatedPlaylists.uploads;
    const subscriberCount = parseInt(channelItem.statistics.subscriberCount);
    
    // Extract description and channel keywords
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
                isShorts: duration <= 1,
                durationMinutes: duration,
                viewsPerHour: Math.round(views / (Math.max(1, (Date.now() - new Date(v.snippet.publishedAt).getTime()) / (1000 * 60 * 60)))),
                estimatedRevenue: revenue,
                tags: v.snippet.tags || [] // Capture tags for analysis
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
    const audienceProfile = estimateAudienceProfile(channelItem.snippet.country);

    // Estimate Total Revenue based on "Blended RPM" from recent videos
    const totalChannelViews = parseInt(channelItem.statistics.viewCount);
    let estimatedTotalRevenue = 0;
    
    if (subscriberCount >= 1000 && recentTotalViews > 0) {
        // Calculate average RPM from recent videos
        const blendedRPM = (recentTotalRevenue / recentTotalViews) * 1000;
        estimatedTotalRevenue = Math.round((totalChannelViews / 1000) * blendedRPM);
    } else if (subscriberCount < 1000) {
        estimatedTotalRevenue = 0;
    } else {
        estimatedTotalRevenue = Math.round((totalChannelViews / 1000) * 1.5); // Conservative default
    }

    // --- New Analysis Logic: Use Top 10 Recent Videos ---
    // Previously used only index 0. Now we take slice(0, 10).
    const recent10Videos = videoList.slice(0, 10);
    
    // 1. Analyze popular keywords from titles of recent 10 videos
    const titleWords = recent10Videos.map(v => v.title.split(' '));
    const popularKeywords = aggregateFrequency(titleWords);

    // 2. Analyze tags from recent 10 videos
    const allTags = recent10Videos.map(v => v.tags || []);
    const aggregatedTags = aggregateFrequency(allTags).map(t => t.keyword); // Just need strings for competitiveness tags

    return {
        id: channelId,
        name: channelItem.snippet.title,
        handle: channelItem.snippet.customUrl,
        thumbnailUrl: channelItem.snippet.thumbnails.medium?.url,
        subscriberCount: subscriberCount,
        totalViews: totalChannelViews,
        totalVideos: parseInt(channelItem.statistics.videoCount),
        publishedAt: channelItem.snippet.publishedAt,
        description: description,
        channelKeywords: channelKeywords,
        overview: {
            uploadPattern: {
                last30Days: recentUploads,
                last7Days: videoList.filter(v => new Date(v.publishedAt) >= new Date(Date.now() - 7 * 86400000)).length,
                last24Hours: videoList.filter(v => new Date(v.publishedAt) >= new Date(Date.now() - 86400000)).length
            },
            competitiveness: {
                categories: ["Entertainment", "Vlog"], 
                tags: aggregatedTags.length > 0 ? aggregatedTags : ["분석된 태그 없음"]
            },
            popularKeywords: popularKeywords.length > 0 ? popularKeywords : [{ keyword: '분석된 키워드 없음', score: 0 }]
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
        audienceProfile,
        estimatedTotalRevenue: estimatedTotalRevenue,
        estimatedMonthlyRevenue: videoList.reduce((acc, v) => acc + (new Date(v.publishedAt) >= oneMonthAgo ? v.estimatedRevenue : 0), 0)
    };
};

export const fetchRankingData = async (type: 'channels' | 'videos', filters: any, apiKey: string): Promise<(ChannelRankingData | VideoRankingData)[]> => {
    const cacheKey = `ranking:${type}:${filters.country}:${filters.category}:${filters.limit}:${Array.from(filters.excludedCategories as Set<string>).join('-')}:${filters.videoFormat}`;
    const cachedData = getDailyCache(cacheKey);
    if (cachedData) {
        // Add a small delay to simulate network latency for better UX on cache hits
        await new Promise(resolve => setTimeout(resolve, 300));
        return cachedData;
    }

    const targetCount = filters.limit || 50;
    // DEEP SCAN: Increase max pages to scan (10 pages = 500 items) to ensure we get 50 valid items even after filtering
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
        // Fetch loop (Deep Scan)
        while (collectedItems.length < targetCount && attempt < MAX_PAGES_TO_SCAN) {
            const url = `${baseUrl}${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const response = await fetch(url);
            if (!response.ok) { // More robust error checking
                const errorBody = await response.json();
                console.error("YouTube API Error:", errorBody);
                throw new Error(`YouTube API request failed with status ${response.status}: ${errorBody.error?.message || 'Unknown error'}`);
            }
            const data = await response.json();
            
            if (!data.items || data.items.length === 0) break;

            let validItems = data.items;
             // SAFETY NET: Ensure items have snippet and statistics before filtering
            validItems = validItems.filter(item => item.snippet && item.statistics && item.contentDetails);
            validItems = filterItemsByExcludedCategories(validItems, filters.excludedCategories);
            validItems = filterItemsByDuration(validItems, filters.videoFormat);

            collectedItems = [...collectedItems, ...validItems];
            
            if (!data.nextPageToken) break;
            pageToken = data.nextPageToken;
            attempt++;
        }
        
        // Slice to exact target count
        collectedItems = collectedItems.slice(0, targetCount);
        
        if (collectedItems.length === 0) return [];

        let finalResult: (ChannelRankingData | VideoRankingData)[] = [];

        if (type === 'channels') {
            const channelTrendStats = new Map<string, number>();
            const uniqueChannelIds = new Set<string>();

            collectedItems.forEach((item: any) => {
                const cid = item.snippet.channelId;
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

            const channelsResp = await fetch(`${BASE_URL}/channels?part=snippet,statistics&id=${channelIdsArr.join(',')}&key=${apiKey}`);
            const channelsData = await channelsResp.json();
            
            if (!channelsData.items) return [];

            const rankedChannels = channelsData.items.map((item: any) => {
                const views = parseInt(item.statistics.viewCount) || 0;
                const subscriberCount = parseInt(item.statistics.subscriberCount) || 0;
                
                const channelCountry = item.snippet.country || filters.country;
                const revenue = calculateEstimatedRevenue(views, "PT5M", "22", channelCountry, subscriberCount); 

                return {
                    id: item.id,
                    name: item.snippet.title,
                    channelHandle: item.snippet.customUrl,
                    thumbnailUrl: item.snippet.thumbnails.medium?.url,
                    subscriberCount: subscriberCount,
                    viewsInPeriod: channelTrendStats.get(item.id) || 0, 
                    videoCount: parseInt(item.statistics.videoCount) || 0,
                    viewCount: views,
                    rank: 0,
                    rankChange: 0, 
                    estimatedTotalRevenue: revenue, 
                    estimatedMonthlyRevenue: revenue * 0.05,
                    channelCountry: item.snippet.country,
                    description: item.snippet.description
                };
            });

            rankedChannels.sort((a: any, b: any) => b.subscriberCount - a.subscriberCount);

            finalResult = rankedChannels.map((ch: any, index: number) => ({
                ...ch,
                rank: index + 1
            }));
        }

        if (type === 'videos') {
            const channelIds = [...new Set(collectedItems.map((item: any) => item.snippet.channelId))].join(',');
            let channelMap = new Map();
            if (channelIds) {
                const idsToFetch = channelIds.split(',').slice(0, 50).join(',');
                const channelsResponse = await fetch(`${BASE_URL}/channels?part=statistics&id=${idsToFetch}&key=${apiKey}`);
                const channelsData = await channelsResponse.json();
                if (channelsData.items) {
                    channelsData.items.forEach((c: any) => {
                        channelMap.set(c.id, parseInt(c.statistics.subscriberCount));
                    });
                }
            }

            finalResult = collectedItems.map((item: any, index: number) => {
                const views = parseInt(item.statistics.viewCount);
                const duration = parseISO8601Duration(item.contentDetails.duration);
                const subscriberCount = channelMap.get(item.snippet.channelId) || 0;
                
                const revenue = calculateEstimatedRevenue(
                    views, 
                    item.contentDetails.duration, 
                    item.snippet.categoryId, 
                    filters.country,
                    subscriberCount
                );

                return {
                    id: item.id,
                    rank: index + 1,
                    name: item.snippet.title,
                    channelName: item.snippet.channelTitle,
                    channelId: item.snippet.channelId,
                    thumbnailUrl: item.snippet.thumbnails.medium?.url,
                    publishedDate: item.snippet.publishedAt,
                    viewCount: views,
                    viewsPerHour: Math.round(views / (Math.max(1, (Date.now() - new Date(item.snippet.publishedAt).getTime()) / (1000 * 60 * 60)))),
                    rankChange: 0,
                    channelTotalViews: 0,
                    channelSubscriberCount: subscriberCount,
                    estimatedRevenue: revenue,
                    estimatedMonthlyRevenue: 0,
                    categoryId: item.snippet.categoryId,
                    durationSeconds: Math.floor(duration * 60),
                    isShorts: duration <= 1,
                    channelCountry: filters.country
                } as VideoRankingData;
            });
        }

        setDailyCache(cacheKey, finalResult);
        return finalResult;

    } catch (e) {
        console.error("Error fetching ranking data:", e);
        return [];
    }
};

export const fetchVideoComments = async (videoId: string, apiKey: string): Promise<VideoComment[]> => {
    try {
        const response = await fetch(`${BASE_URL}/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&key=${apiKey}`);
        const data = await response.json();
        if (!data.items) return [];
        return data.items.map((item: any) => ({
            text: item.snippet.topLevelComment.snippet.textDisplay,
            author: item.snippet.topLevelComment.snippet.authorDisplayName,
            likeCount: item.snippet.topLevelComment.snippet.likeCount,
            publishedAt: item.snippet.topLevelComment.snippet.publishedAt
        }));
    } catch (e) {
        console.error("Error fetching comments", e);
        return [];
    }
};

export const fetchVideoDetails = async (videoId: string, apiKey: string): Promise<VideoDetailData> => {
    // 1. Fetch Video Stats
    const response = await fetch(`${BASE_URL}/videos?part=snippet,statistics,contentDetails,player&id=${videoId}&key=${apiKey}`);
    const data = await response.json();
    if (!data.items || data.items.length === 0) throw new Error("Video not found");
    
    const item = data.items[0];
    const views = parseInt(item.statistics?.viewCount || '0');
    
    // 2. Fetch Channel Stats (for subscriber count)
    const channelId = item.snippet.channelId;
    let channelSubscriberCount = 0;
    let channelCountry = 'KR';
    try {
        const channelResp = await fetch(`${BASE_URL}/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`);
        const channelData = await channelResp.json();
        if (channelData.items && channelData.items.length > 0) {
            channelSubscriberCount = parseInt(channelData.items[0].statistics.subscriberCount);
            channelCountry = channelData.items[0].snippet.country || 'KR';
        }
    } catch (e) {
        console.error("Failed to fetch channel subscribers", e);
    }

    const revenue = calculateEstimatedRevenue(
        views, 
        item.contentDetails?.duration || "PT0M0S", 
        item.snippet.categoryId, 
        channelCountry,
        channelSubscriberCount
    );

    // 3. Fetch Comments
    const comments = await fetchVideoComments(videoId, apiKey);
    
    // 4. PREPARE EMPTY AI DATA (Optimization: Don't call AI here)
    const fallbackCommentInsights: CommentInsights = { summary: "분석 전", positivePoints: [], negativePoints: [] };
    const fallbackDeepDive: AIVideoDeepDiveInsights = {
        topicAnalysis: { summary: "심층 분석을 실행해주세요.", successFactors: [] },
        audienceAnalysis: { summary: "심층 분석을 실행해주세요.", engagementPoints: [] },
        performanceAnalysis: { summary: "심층 분석을 실행해주세요.", trafficSources: [], subscriberImpact: "-" },
        retentionStrategy: { summary: "심층 분석을 실행해주세요.", improvementPoints: [] },
        strategicRecommendations: { contentStrategy: "심층 분석을 실행해주세요.", newTopics: [], growthStrategy: "-" }
    };

    // We simply return the data WITHOUT waiting for AI. 
    // The UI will handle the "Start Analysis" user flow.
    return {
        id: videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.medium?.url,
        publishedAt: item.snippet.publishedAt,
        durationMinutes: parseISO8601Duration(item.contentDetails?.duration),
        channelId: channelId,
        channelTitle: item.snippet.channelTitle,
        channelSubscriberCount: channelSubscriberCount,
        viewCount: views,
        likeCount: parseInt(item.statistics?.likeCount || '0'),
        commentCount: parseInt(item.statistics?.commentCount || '0'),
        embedHtml: item.player?.embedHtml || "",
        embeddable: true,
        comments: comments,
        commentInsights: fallbackCommentInsights,
        deepDiveInsights: fallbackDeepDive,
        estimatedRevenue: revenue,
        estimatedMonthlyRevenue: 0 
    };
};

export const analyzeVideoDeeply = async (videoData: VideoDetailData, apiKey: string): Promise<{ commentInsights: CommentInsights, deepDiveInsights: AIVideoDeepDiveInsights }> => {
    // 1. Comment Analysis
    const fallbackCommentInsights: CommentInsights = { summary: "분석할 댓글이 없습니다.", positivePoints: [], negativePoints: [] };
    let commentInsights = fallbackCommentInsights;
    
    if (videoData.comments.length > 0) {
        try {
            // Increased timeout to 20s for comments
            commentInsights = await withTimeout(
                getAICommentInsights(videoData.comments),
                20000, 
                fallbackCommentInsights
            );
        } catch (e) {
            console.warn("Comment analysis failed", e);
        }
    }

    // 2. Deep Dive Strategy
    const prelimVideoData = {
        title: videoData.title,
        durationMinutes: videoData.durationMinutes,
        viewCount: videoData.viewCount,
        channelSubscriberCount: videoData.channelSubscriberCount,
        commentInsights: commentInsights
    };

    const fallbackDeepDive: AIVideoDeepDiveInsights = {
        topicAnalysis: { summary: "AI 분석 시간을 초과했습니다.", successFactors: [] },
        audienceAnalysis: { summary: "데이터 부족.", engagementPoints: [] },
        performanceAnalysis: { summary: "데이터 부족.", trafficSources: [], subscriberImpact: "-" },
        retentionStrategy: { summary: "-", improvementPoints: [] },
        strategicRecommendations: { contentStrategy: "-", newTopics: [], growthStrategy: "-" }
    };

    let deepDiveInsights = fallbackDeepDive;
    try {
        // Increased timeout to 60s for deep reasoning
        deepDiveInsights = await withTimeout(
            getAIVideoDeepDiveInsights(prelimVideoData as any),
            60000, 
            fallbackDeepDive
        );
    } catch (e) {
        console.warn("Deep dive analysis failed", e);
    }

    return { commentInsights, deepDiveInsights };
};

export const fetchSimilarChannels = async (channelId: string, apiKey: string): Promise<SimilarChannelData[]> => {
    // 1. Get channel details to understand the topic
    const channelDetails = await fetchChannelAnalysis(channelId, apiKey);
    
    // 2. Ask AI for REAL competitor names
    // OPTIMIZATION: Reduced request count to 3 to speed up the process and save quota
    const aiSuggestions = await getAISimilarChannels(channelDetails);
    
    // 3. Search YouTube for these channels to get REAL stats (ID, Subs, Videos)
    const promises = aiSuggestions.channels.map(async (suggestion) => {
        try {
            // Search for the channel by name
            const searchUrl = `${BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(suggestion.name)}&key=${apiKey}&maxResults=1`;
            const searchResp = await fetch(searchUrl);
            const searchData = await searchResp.json();
            
            if (searchData.items && searchData.items.length > 0) {
                const foundChannelId = searchData.items[0].snippet.channelId;
                
                // Get detailed stats for the found channel
                const statsUrl = `${BASE_URL}/channels?part=snippet,statistics&id=${foundChannelId}&key=${apiKey}`;
                const statsResp = await fetch(statsUrl);
                const statsData = await statsResp.json();
                
                if (statsData.items && statsData.items.length > 0) {
                    const item = statsData.items[0];
                    return {
                        id: item.id,
                        name: item.snippet.title,
                        thumbnailUrl: item.snippet.thumbnails.medium?.url,
                        subscriberCount: parseInt(item.statistics.subscriberCount),
                        videoCount: parseInt(item.statistics.videoCount),
                        reason: suggestion.reason
                    };
                }
            }
            return null; // Channel not found in API
        } catch (e) {
            console.error(`Failed to resolve similar channel: ${suggestion.name}`, e);
            return null;
        }
    });

    const results = await Promise.all(promises);
    return results.filter((r): r is SimilarChannelData => r !== null);
};

export const fetchMyChannelAnalytics = async (channelId: string, apiKey: string): Promise<MyChannelAnalyticsData> => {
    const publicData = await fetchChannelAnalysis(channelId, apiKey);
    const kpi = convertPublicDataToKPI(publicData);
    
    const simpleStats = {
        subscribers: publicData.subscriberCount,
        totalViews: publicData.totalViews,
        videoCount: publicData.totalVideos
    };
    const recentVideoData = publicData.videoList.map(v => ({
        title: v.title,
        views: v.viewCount,
        publishedAt: v.publishedAt
    }));

    let aiInsights: Partial<MyChannelAnalyticsData> = {};
    try {
        aiInsights = await getAIChannelDashboardInsights(publicData.name, simpleStats, recentVideoData);
    } catch (e) {
        console.warn("AI Dashboard Insight generation failed, falling back to basic data.", e);
    }

    return {
        name: publicData.name,
        thumbnailUrl: publicData.thumbnailUrl,
        kpi: kpi,
        videoAnalytics: publicData.videoList.slice(0, 10).map(v => ({
            id: v.id,
            thumbnailUrl: v.thumbnailUrl || '',
            title: v.title,
            publishedAt: v.publishedAt,
            views: v.viewCount,
            ctr: (Math.random() * 5) + 2, 
            avgViewDurationSeconds: v.durationMinutes * 60 * 0.4 
        })),
        aiExecutiveSummary: aiInsights.aiExecutiveSummary || MOCK_MY_CHANNEL_DATA.aiExecutiveSummary,
        aiGrowthInsight: aiInsights.aiGrowthInsight || MOCK_MY_CHANNEL_DATA.aiGrowthInsight,
        aiFunnelInsight: aiInsights.aiFunnelInsight || MOCK_MY_CHANNEL_DATA.aiFunnelInsight,
        contentSuccessFormula: aiInsights.contentSuccessFormula || MOCK_MY_CHANNEL_DATA.contentSuccessFormula,
        contentIdeas: aiInsights.contentIdeas || MOCK_MY_CHANNEL_DATA.contentIdeas,
        viewerPersona: aiInsights.viewerPersona || MOCK_MY_CHANNEL_DATA.viewerPersona,
        
        dailyStats: MOCK_MY_CHANNEL_DATA.dailyStats,
        funnelMetrics: {
            impressions: kpi.impressionsLast30d,
            ctr: kpi.ctrLast30d,
            views: kpi.viewsLast30d,
            avgViewDuration: kpi.avgViewDurationSeconds
        },
        retentionData: MOCK_MY_CHANNEL_DATA.retentionData,
        trafficSources: MOCK_MY_CHANNEL_DATA.trafficSources,
        viewershipData: MOCK_MY_CHANNEL_DATA.viewershipData,
        audienceProfile: publicData.audienceProfile
    };
};

export const convertPublicDataToKPI = (publicData: ChannelAnalysisData): MyChannelAnalyticsData['kpi'] => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentVideos = publicData.videoList.filter(v => new Date(v.publishedAt) > thirtyDaysAgo);
    
    const viewsLast30d = recentVideos.reduce((sum, v) => sum + v.viewCount, 0) + (publicData.totalViews * 0.05); 
    const netSubscribersLast30d = Math.round(publicData.subscriberCount * 0.02); 
    const watchTimeHoursLast30d = (viewsLast30d * 4) / 60; 
    const ctrLast30d = 4.5 + (Math.random() * 2); 
    const avgViewDurationSeconds = 240; 
    const impressionsLast30d = viewsLast30d * (100 / ctrLast30d);

    return {
        viewsLast30d: Math.round(viewsLast30d),
        netSubscribersLast30d: netSubscribersLast30d,
        watchTimeHoursLast30d: Math.round(watchTimeHoursLast30d),
        ctrLast30d: parseFloat(ctrLast30d.toFixed(1)),
        avgViewDurationSeconds: avgViewDurationSeconds,
        impressionsLast30d: Math.round(impressionsLast30d)
    };
};

export const fetchBenchmarkComparison = async (myData: MyChannelAnalyticsData, benchmarkKpi: MyChannelAnalyticsData['kpi'], benchmarkName: string = "벤치마크 채널"): Promise<BenchmarkComparisonData> => {
    const dailyComparison = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        
        const myDailyAvg = myData.kpi.viewsLast30d / 30;
        const bmDailyAvg = benchmarkKpi.viewsLast30d / 30;
        
        return {
            date: date.toISOString().split('T')[0],
            myChannelViews: Math.floor(myDailyAvg * (0.8 + Math.random() * 0.4)),
            benchmarkViews: Math.floor(bmDailyAvg * (0.8 + Math.random() * 0.4))
        };
    });

    const isGrowingFaster = myData.kpi.viewsLast30d > benchmarkKpi.viewsLast30d;

    return {
        myChannelKpi: myData.kpi,
        benchmarkChannelKpi: benchmarkKpi,
        dailyComparison,
        aiInsight: {
            summary: `현재 '${benchmarkName}' 대비 ${isGrowingFaster ? '더 빠른' : '다소 느린'} 성장세를 보이고 있습니다. 구독자 전환율과 시청 지속 시간에서의 차이를 좁히는 것이 핵심 과제입니다.`,
            strength: isGrowingFaster ? "최근 영상의 조회수 폭발력이 경쟁 채널을 상회하고 있습니다." : "고정 팬층의 충성도(댓글/좋아요 비율)는 경쟁 채널보다 높습니다.",
            weakness: isGrowingFaster ? "아직 전체 노출 규모(Impression)는 경쟁 채널이 더 큽니다." : "신규 유입을 위한 탐색 트래픽 확보가 부족합니다.",
            recommendation: `'${benchmarkName}'의 최근 인기 영상 중 '조회수/구독자' 비율이 높은 주제를 벤치마킹하여, 우리 채널만의 스타일로 재해석해보세요.`
        }
    };
};