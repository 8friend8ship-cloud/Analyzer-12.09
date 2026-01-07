
import type { VideoData, ChannelAnalysisData, VideoRankingData, VideoDetailData, VideoComment, MyChannelAnalyticsData, BenchmarkComparisonData, SimilarChannelData, ChannelRankingData } from '../types';

// --- Mock Data for fetchYouTubeData ---
export const mockVideoData: VideoData[] = Array.from({ length: 50 }, (_, i) => ({
  id: `video_id_${i}`,
  channelId: `channel_id_${i % 5}`,
  title: `분석 결과 영상 ${i + 1}: 시니어 건강을 위한 최고의 운동`,
  thumbnailUrl: `https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg?sqp=-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLBw_a_A-p3e9Xw_Xw_Xw_Xw_Xw`,
  channelTitle: `건강 채널 ${i % 5}`,
  publishedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  subscribers: 150000 + (i % 5) * 10000,
  viewCount: 250000 - i * 2000,
  viewsPerHour: Math.round((250000 - i * 2000) / ((i + 1) * 24)),
  likeCount: Math.round((250000 - i * 2000) * 0.04),
  commentCount: Math.round((250000 - i * 2000) * 0.005),
  durationMinutes: 8 + (i % 10),
  engagementRate: 4.5 + Math.random(),
  channelCountry: 'KR',
}));

// --- Mock Data for fetchChannelAnalysis ---
export const mockChannelAnalysisData: ChannelAnalysisData = {
  id: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw',
  name: 'Mock 분석 채널',
  handle: '@mockchannel',
  thumbnailUrl: 'https://yt3.ggpht.com/ytc/AAUvwni42tQ2-3-p_x0_x-X0X-X0x-X0x-X0=s176-c-k-c0x00ffffff-no-rj',
  subscriberCount: 1230000,
  totalViews: 456789000,
  totalVideos: 150,
  publishedAt: '2020-01-01T00:00:00Z',
  description: '이것은 목업 데이터로 생성된 채널 설명입니다. 실제 API가 정지된 동안 UI 시연을 위해 사용됩니다.',
  channelKeywords: ['목업', '데이터', '시연'],
  overview: {
    uploadPattern: { last30Days: 8, last7Days: 2, last24Hours: 0 },
    competitiveness: { categories: [], tags: [] },
    popularKeywords: [],
  },
  videoList: mockVideoData.slice(0, 20).map(v => ({...v, isShorts: v.durationMinutes <= 1, tags: ['mock']})),
  surgingVideos: {
    monthly: { longform: mockVideoData.slice(0, 3).map(v => ({...v, isShorts: false})), shorts: [] },
    weekly: { longform: [], shorts: [] },
    daily: { longform: [], shorts: [] },
  },
  performanceTrend: {
    longFormStats: { totalVideos: 18, avgViews: 150000, avgEngagementRate: 5.1, avgLikes: 6000, avgComments: 300 },
    shortsStats: { totalVideos: 2, avgViews: 80000, avgEngagementRate: 8.2, avgLikes: 6400, avgComments: 150 },
    dailyTrends: Array.from({ length: 30 }, (_, i) => ({
      date: `${Math.floor(i / 2) + 1}/${i % 2 === 0 ? '15' : '28'}`,
      views: 100000 + Math.random() * 50000,
      engagements: 5000 + Math.random() * 2000,
      likes: 4000 + Math.random() * 1500,
      thumbnails: i % 4 === 0 ? ['https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'] : []
    })),
  },
  audienceProfile: {
    summary: "AI 분석 기능이 비활성화되었습니다. 이 데이터는 UI 표시를 위한 목업 데이터입니다.",
    interests: [], genderRatio: [], ageGroups: [], topCountries: [],
  },
};

// --- Mock Data for fetchRankingData ---
export const mockRankingData: { channels: ChannelRankingData[], videos: VideoRankingData[] } = {
  channels: Array.from({ length: 50 }, (_, i) => ({
    id: `channel_rank_${i}`,
    name: `인기 채널 ${i + 1}`,
    thumbnailUrl: 'https://yt3.ggpht.com/ytc/AAUvwni42tQ2-3-p_x0_x-X0X-X0x-X0x-X0=s176-c-k-c0x00ffffff-no-rj',
    subscriberCount: 5000000 - i * 50000,
    viewsInPeriod: 10000000 - i * 100000,
    videoCount: 200 + i,
    viewCount: 987654321 - i * 1000000,
    rank: i + 1,
    rankChange: i % 5 - 2,
    channelCountry: 'KR'
  })),
  videos: mockVideoData.map((v, i) => ({
    id: v.id,
    rank: i + 1,
    name: v.title,
    channelName: v.channelTitle,
    channelId: v.channelId,
    thumbnailUrl: v.thumbnailUrl,
    publishedDate: v.publishedAt,
    viewCount: v.viewCount,
    viewsPerHour: v.viewsPerHour,
    rankChange: i % 3 - 1,
    channelTotalViews: 123456789,
    channelSubscriberCount: v.subscribers,
    durationSeconds: v.durationMinutes * 60,
    isShorts: v.durationMinutes <= 1,
    channelCountry: 'KR'
  })),
};

// --- Mock Data for fetchVideoDetails ---
export const mockVideoDetailData: VideoDetailData = {
  id: 'video_id_0',
  title: 'Mock 영상 상세 분석: 최고의 아침 루틴',
  description: '이것은 영상 설명을 위한 목업 텍스트입니다. 실제 API가 응답하는 것과 유사한 구조를 가집니다.',
  thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  publishedAt: new Date().toISOString(),
  durationMinutes: 12.5,
  channelId: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw',
  channelTitle: 'Mock 분석 채널',
  channelSubscriberCount: 1230000,
  viewCount: 543210,
  likeCount: 23456,
  commentCount: 1234,
  embedHtml: '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>',
  embeddable: true,
  comments: [],
};

// --- Mock Data for fetchVideoComments ---
export const mockVideoComments: VideoComment[] = Array.from({ length: 20 }, (_, i) => ({
  text: `정말 유용한 영상이네요! ${i + 1}번째 꿀팁 감사합니다.`,
  author: `시청자 ${i + 1}`,
  likeCount: 100 - i * 2,
  publishedAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
}));

// --- Mock Data for MyChannelAnalytics ---
export const mockMyChannelAnalyticsData: MyChannelAnalyticsData = {
    name: "내 채널 (Mock)",
    thumbnailUrl: 'https://yt3.ggpht.com/ytc/AAUvwni42tQ2-3-p_x0_x-X0X-X0x-X0x-X0=s176-c-k-c0x00ffffff-no-rj',
    aiExecutiveSummary: { summary: "AI 분석이 비활성화되었습니다.", strengths: [], opportunities: [] },
    kpi: { viewsLast30d: 1234567, netSubscribersLast30d: 5432, watchTimeHoursLast30d: 0, ctrLast30d: 0, avgViewDurationSeconds: 0, impressionsLast30d: 0 },
    dailyStats: Array.from({ length: 30 }, (_, i) => ({ date: `2023-10-${i+1}`, netSubscribers: 100 + Math.random() * 50 })),
    aiGrowthInsight: { summary: "AI 분석이 비활성화되었습니다.", strengths: [], opportunities: [] },
    funnelMetrics: { impressions: 0, ctr: 0, views: 1234567, avgViewDuration: 0 },
    aiFunnelInsight: { summary: "AI 분석이 비활성화되었습니다.", strengths: [], opportunities: [] },
    contentSuccessFormula: { titlePatterns: [], optimalLength: 'N/A', thumbnailStyle: 'N/A' },
    contentIdeas: [],
    retentionData: { average: [], topVideo: [] },
    trafficSources: [],
    videoAnalytics: [],
    viewerPersona: { name: 'N/A', description: 'AI 분석 비활성화', strategy: '' },
    viewershipData: { bestUploadTime: 'N/A', heatmap: Array(7).fill(Array(24).fill(0)) },
    audienceProfile: { summary: "AI 분석 비활성화", interests: [], genderRatio: [], ageGroups: [], topCountries: [] },
};

// --- Mock Data for Benchmark ---
export const mockBenchmarkComparisonData: BenchmarkComparisonData = {
    myChannelKpi: { viewsLast30d: 1234567, netSubscribersLast30d: 5432, watchTimeHoursLast30d: 0, ctrLast30d: 0, avgViewDurationSeconds: 0, impressionsLast30d: 0 },
    benchmarkChannelKpi: { viewsLast30d: 9876543, netSubscribersLast30d: 12345, watchTimeHoursLast30d: 0, ctrLast30d: 0, avgViewDurationSeconds: 0, impressionsLast30d: 0 },
    dailyComparison: Array.from({length: 30}, (_, i) => ({ date: `10/${i+1}`, myChannelViews: 40000 + i*1000, benchmarkViews: 300000 + i*5000 })),
    aiInsight: { summary: 'AI 분석이 비활성화되었습니다.', strength: '', weakness: '', recommendation: '' },
};

// --- Mock Data for Similar Channels ---
export const mockSimilarChannels: SimilarChannelData[] = [
    { id: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw', name: 'MrBeast (Mock)', thumbnailUrl: 'https://yt3.ggpht.com/ytc/AAUvwni42tQ2-3-p_x0_x-X0X-X0x-X0x-X0=s176-c-k-c0x00ffffff-no-rj', subscriberCount: 200000000, videoCount: 700, reason: '유사한 대규모 챌린지 콘텐츠.' },
    { id: 'UCX6OQ3DkcsbYNE6H8uQQuVA', name: 'Mark Rober (Mock)', thumbnailUrl: 'https://yt3.ggpht.com/ytc/AAUvwni42tQ2-3-p_x0_x-X0X-X0x-X0x-X0=s176-c-k-c0x00ffffff-no-rj', subscriberCount: 25000000, videoCount: 100, reason: '창의적인 엔지니어링 및 과학 기반 영상.' },
    { id: 'UC4-79U6u_IH_pZW2T__yLRA', name: 'SmarterEveryDay (Mock)', thumbnailUrl: 'https://yt3.ggpht.com/ytc/AAUvwni42tQ2-3-p_x0_x-X0X-X0x-X0x-X0=s176-c-k-c0x00ffffff-no-rj', subscriberCount: 11000000, videoCount: 300, reason: '과학적 개념에 대한 심층 탐구.' },
];