
import type { VideoData, ChannelAnalysisData, VideoRankingData, VideoDetailData, VideoComment, MyChannelAnalyticsData, SimilarChannelData, ChannelRankingData, DailyStat } from '../types';

// --- Mock Data for fetchYouTubeData ---
export const mockVideoData: VideoData[] = Array.from({ length: 50 }, (_, i) => {
  const publishedAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
  const viewCount = 250000 - i * 2000;
  
  return {
    id: `video_id_${i}`,
    channelId: `channel_id_${i % 5}`,
    title: `Analysis Result Video ${i + 1}: 10 Essential Items for Beginner Camping`,
    thumbnailUrl: `https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg?sqp=-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLBw_a_A-p3e9Xw_Xw_Xw_Xw_Xw`,
    channelTitle: `Camping Channel ${i % 5}`,
    publishedAt: publishedAt.toISOString(),
    subscribers: 150000 + (i % 5) * 10000,
    viewCount: viewCount,
    likeCount: Math.round(viewCount * 0.04),
    commentCount: Math.round(viewCount * 0.005),
    durationMinutes: 8 + (i % 10),
    engagementRate: 4.5 + Math.random(),
    channelCountry: 'KR',
  };
});

// --- Mock Data for fetchChannelAnalysis (Public Data Only) ---
export const mockChannelAnalysisData: ChannelAnalysisData = {
  id: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw',
  name: 'Kids Diana Show',
  handle: '@KidsDianaShow',
  thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_k-3_2j3J2-z3-z3-z3-z3-z3_z3_z3=s176-c-k-c0x00ffffff-no-rj-mo',
  subscriberCount: 138000000,
  totalViews: 121639870471,
  totalVideos: 1200,
  publishedAt: '2015-05-12T00:00:00Z',
  description: 'Welcome to the official YouTube channel of Diana, one of the most popular kid video bloggers in the world! Together with her brother Roma, she films fun videos for kids, such as educational videos, role-playing, and challenges. Subscribe to Diana\'s channel so you don\'t miss her new videos!',
  channelKeywords: ['diana', 'kids diana show', 'diana and roma'],
  overview: {
    uploadPattern: { last30Days: 8, last7Days: 2, last24Hours: 0 },
    channelFocus: { categories: ['Entertainment'], tags: ['kids', 'play', 'toys'] },
    popularKeywords: [],
  },
  videoList: mockVideoData.slice(0, 50).map(v => ({...v, isShorts: v.durationMinutes <= 1, tags: ['mock']})),
  surgingVideos: {
    monthly: { longform: mockVideoData.slice(0, 3).map(v => ({...v, isShorts: false})), shorts: [] },
    weekly: { longform: [], shorts: [] },
    daily: { longform: [], shorts: [] },
  },
  audienceProfile: { // This is an AI-generated persona, which is compliant.
    summary: "AI 분석 기능이 비활성화되었습니다. 이 데이터는 UI 표시를 위한 목업 데이터입니다. (AI analysis is disabled. This is mock data for UI display.)",
    interests: [], genderRatio: [], ageGroups: [], topCountries: [],
  },
};

const MOCK_CATEGORIES = ['24', '22', '20', '10', '26', '27', '17'];
const MOCK_CATEGORY_TAGS: {[key: string]: string[]} = {
    '24': ['영화/애니메이션', '엔터테인먼트'],
    '22': ['Vlog', '라이프스타일'],
    '20': ['게임', '엔터테인먼트'],
    '10': ['음악'],
    '26': ['Vlog', '라이프스타일', '스포츠', '기타'],
    '27': ['교육'],
    '17': ['스포츠']
}

// A helper function to generate more diverse names for ranking data
const getDiverseRankingName = (baseName: string, index: number, categoryId: string): string => {
  switch (categoryId) {
    case '20': // Gaming
      return index % 3 === 0 ? `[Game] ${baseName} Play` : `Travel and play ${baseName}`;
    case '10': // Music
      return index % 2 === 0 ? `[Music] ${baseName} Playlist` : `[Mukbang] ${baseName} Challenge`;
    case '24': // Entertainment
      return index % 2 === 0 ? `[Entertainment] ${baseName} Highlight` : `[News] ${baseName} Analysis`;
    default:
      return `[${categoryId}] ${baseName}`;
  }
};

// A helper to generate diverse metadata for ranking data to test deep verification
const getDiverseMetadata = (index: number, categoryId: string): { description: string; tags: string[] } => {
  // Good item, matches category
  if (index % 4 === 0) {
    switch (categoryId) {
      case '20': return { description: '전문 오버워치, 롤(LoL) 플레이어입니다. (Professional Overwatch and LoL player.)', tags: ['오버워치', '롤', 'Faker', 'gameplay'] };
      case '10': return { description: '매일 새로운 K-POP 플레이리스트를 올립니다. (New K-POP playlists daily.)', tags: ['kpop', 'playlist', 'ive', 'newjeans'] };
      default: return { description: '이것은 선택된 카테고리에 대한 설명입니다. (This is a description for the selected category.)', tags: ['mock', 'relevant'] };
    }
  }
  // Mixed item, title might be misleading but metadata matches
  if (index % 4 === 1) {
    switch (categoryId) {
      case '20': return { description: '여행도 다니고 로블록스 게임도 하는 일상 채널. (A daily life channel for travel and Roblox games.)', tags: ['브이로그', '일상', '여행', '로블록스'] };
      case '10': return { description: '음악을 들으며 떠나는 먹방 여행. (Mukbang trip while listening to music.)', tags: ['먹방', '여행', '맛집', 'playlist'] };
      default: return { description: '혼합된 설명입니다. 이 아이템은 부분적으로 관련이 있습니다. (Mixed description. This item is partially relevant.)', tags: ['mixed', 'vlog', 'relevant-ish'] };
    }
  }
  // Bad item, doesn't match category
  if (index % 4 === 2) {
     switch (categoryId) {
      case '20': return { description: '강아지와 고양이의 행복한 일상. (Happy daily life of my dog and cat.)', tags: ['강아지', '고양이', 'pet', '브이로그'] };
      case '10': return { description: '부동산 투자, 10억 만들기 프로젝트. (Real estate investment project.)', tags: ['부동산', '재테크', '주식', 'money'] };
      default: return { description: '관련 없는 설명입니다. (Irrelevant description.)', tags: ['unrelated'] };
    }
  }
  // No metadata item
  return { description: '', tags: [] };
};

const calculateChannelGrade = (subs: number, growth: number): string => {
    const score = (Math.log10(subs + 1) * 5) + (Math.log10(growth + 1) * 8);
    if (score > 90) return 'S';
    if (score > 80) return 'A';
    if (score > 70) return 'B';
    if (score > 60) return 'C';
    return 'D';
};

const MOCK_CHANNEL_NAMES = [
    // Channels for "캠핑" search
    "캠핑 한끼 (Camping Meal)", "니니캠핑 (Nini Camping)", "도토리TV (Dotori TV)", "슬기로운 캠핑생활 (Wise Camping Life)",
    // New channels for "시니어" search
    "시니어 라이프 TV (Senior Life TV)", "오팔세대 시니어모델 (Opal Generation)", "슬기로운 시니어생활 (Wise Senior Life)", "꽃보다 시니어 (Seniors Over Flowers)",
    // Entertainment
    "Psick Univ", "Pani Bottle", "Gwak Tube", "Workman",
    // Knowledge/Current Affairs
    "Syuka World", "14F", "Newneek", "3PRO TV",
    // Gaming
    "Woowakgood", "Faker", "Gamst", "GamerZ",
    // Cooking/Food
    "Paik's Cuisine", "Haru Hankki", "Seungwoo Appa", "Yori Yongd",
    // Music
    "essential;", "Nerd Connection", "AKMU", "Official IVE",
    // Tech
    "ITSub", "Techmong", "Bbal짓연구소", "JM",
    // Life/Vlog
    "Lee Brother", "O-nuk", "ondo", "Lynbox",
    // Beauty
    "Pony Syndrome", "Risabae",
    // Animals
    "Healing Animal Energy", "SBS Animal"
];

const MOCK_CHANNEL_HANDLES = [
    // Handles for "캠핑" search
    "@camping.meal", "@ninicamping", "@dotori_tv", "@wise_camping_life",
    // New handles for "시니어" search
    "@seniorlifetv", "@opalsenior", "@wisesenior", "@seniors_over_flowers",
    "@psickuniverse", "@panibottle", "@gwaktube", "@workman",
    "@syukaworld", "@14f_official", "@newneek", "@3protv",
    "@woowakgood", "@faker", "@gamst", "@gamerz",
    "@paikscuisine", "@haruhankki", "@swabpa", "@yori_yongd",
    "@essential", "@nerdconnection", "@officialakmu", "@ivestarship",
    "@itsub", "@techmong", "@badajis", "@jmtv",
    "@lee.brother", "@onnuk_", "@ondo", "@lynbox",
    "@ponysyndrome", "@risabaeart",
    "@healinganimal", "@sbsanimal"
];


// --- Mock Data for fetchRankingData ---
export const mockRankingData: { channels: ChannelRankingData[], videos: VideoRankingData[] } = {
  channels: Array.from({ length: MOCK_CHANNEL_NAMES.length }, (_, i) => {
    const categoryId = MOCK_CATEGORIES[i % MOCK_CATEGORIES.length];
    const metadata = getDiverseMetadata(i, categoryId);
    const newSubscribersInPeriod = 150000 - i * 1200;
    const subscriberCount = 5000000 - i * 50000;
    
    return {
      id: `channel_rank_${i}`,
      name: MOCK_CHANNEL_NAMES[i],
      channelHandle: MOCK_CHANNEL_HANDLES[i],
      thumbnailUrl: ['https://yt3.ggpht.com/n6BgzAG72h8J-L_4O_4_pR_p2uDB_QYEvGAb4j-3wA2_C5n_a_y_p_3E_A=s88-c-k-c0x00ffffff-no-rj', 'https://yt3.ggpht.com/ytc/AIdro_n0_...=s88-c-k-c0x00ffffff-no-rj', 'https://yt3.ggpht.com/ytc/AIdro_n0_...=s88-c-k-c0x00ffffff-no-rj', 'https://yt3.ggpht.com/ytc/AIdro_n0_...=s88-c-k-c0x00ffffff-no-rj', 'https://yt3.ggpht.com/ytc/AIdro_n0_...=s88-c-k-c0x00ffffff-no-rj', 'https://yt3.ggpht.com/ytc/AIdro_n0_...=s88-c-k-c0x00ffffff-no-rj'][i % 6],
      subscriberCount: subscriberCount,
      newSubscribersInPeriod: newSubscribersInPeriod,
      newViewsInPeriod: 10000000 - i * 100000,
      videoCount: 200 + i,
      viewCount: 987654321 - i * 1000000,
      rank: i + 1,
      rankChange: 0,
      channelCountry: 'KR',
      categoryId: categoryId,
      description: metadata.description,
      tags: metadata.tags,
      grade: calculateChannelGrade(subscriberCount, newSubscribersInPeriod),
      categoryTags: MOCK_CATEGORY_TAGS[categoryId] || [],
      latestVideoThumbnailUrl: `https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg`,
    };
  }),
  videos: Array.from({ length: 50 }, (_, i) => {
    const categoryId = MOCK_CATEGORIES[i % MOCK_CATEGORIES.length];
    const originalVideo = mockVideoData[i % mockVideoData.length];
    const metadata = getDiverseMetadata(i, categoryId);
    return {
      id: `video_rank_${i}`,
      rank: i + 1,
      name: getDiverseRankingName(`Popular Video ${i + 1}`, i, categoryId),
      channelName: `Channel ${i % 10}`,
      channelId: `channel_${i % 10}`,
      thumbnailUrl: originalVideo.thumbnailUrl,
      publishedAt: originalVideo.publishedAt,
      viewCount: 5000000 - i * 40000,
      rankChange: 0,
      channelTotalViews: 123456789,
      channelSubscriberCount: 100000 + i * 1000,
      durationSeconds: (8 + (i % 10)) * 60,
      isShorts: (8 + (i % 10)) <= 1,
      channelCountry: 'KR',
      categoryId: categoryId,
      description: metadata.description,
      tags: metadata.tags,
      channelThumbnailUrl: ['https://yt3.googleusercontent.com/ytc/AIdro_k-3_2j3J2-z3-z3-z3-z3-z3_z3_z3=s176-c-k-c0x00ffffff-no-rj-mo', 'https://yt3.ggpht.com/n6BgzAG72h8J-L_4O_4_pR_p2uDB_QYEvGAb4j-3wA2_C5n_a_y_p_3E_A=s88-c-k-c0x00ffffff-no-rj'][i % 2],
      channelCategoryTags: MOCK_CATEGORY_TAGS[categoryId] || [],
    };
  }),
};

// --- Mock Data for fetchVideoDetails ---
export const mockVideoDetailData: VideoDetailData = {
  id: 'video_id_0',
  title: 'Mock Video Detail Analysis: The Best Morning Routine',
  description: 'This is mock text for the video description. It has a structure similar to what the actual API would respond with.',
  thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  publishedAt: new Date().toISOString(),
  durationMinutes: 12.5,
  channelId: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw',
  channelTitle: 'Mock Analysis Channel',
  channelSubscriberCount: 1230000,
  viewCount: 543210,
  likeCount: 23456,
  commentCount: 1234,
  embedHtml: '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>',
  embeddable: true,
  comments: [],
  benchmarks: Array.from({ length: 30 }, (_, i) => ({
      title: `Similar Video ${i + 1}`,
      views: Math.floor(Math.random() * (2000000 - 10000) + 10000), // 10k to 2M views
      thumbnailUrl: `https://i.ytimg.com/vi/a_Xs_t3a_Us/hqdefault.jpg`,
  })),
};

// --- Mock Data for fetchVideoComments ---
export const mockVideoComments: VideoComment[] = Array.from({ length: 20 }, (_, i) => ({
  text: `정말 유용한 영상이네요! ${i + 1}번째 꿀팁 감사합니다.\n(This is a really useful video! Thanks for the tip #${i + 1}.)`,
  author: `Viewer ${i + 1}`,
  likeCount: 100 - i * 2,
  publishedAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
}));

// --- Mock Data for MyChannelAnalytics (Reflecting Actual Analytics API Data) ---
const generateMockAnalyticsDailyStats = (): Omit<DailyStat, 'estimatedRevenue'>[] => {
    const stats: Omit<DailyStat, 'estimatedRevenue'>[] = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dailyViews = 30000 + Math.floor(Math.random() * 20000);
        stats.push({
            date: date.toISOString().split('T')[0],
            views: dailyViews,
            subscribersGained: 50 + Math.floor(Math.random() * 100),
            subscribersLost: 10 + Math.floor(Math.random() * 20),
        });
    }
    return stats;
};

const mockDailyStats = generateMockAnalyticsDailyStats();
const totalViews = mockDailyStats.reduce((sum, s) => sum + s.views, 0);
const totalSubsGained = mockDailyStats.reduce((sum, s) => sum + s.subscribersGained, 0);
const totalSubsLost = mockDailyStats.reduce((sum, s) => sum + s.subscribersLost, 0);

export const mockMyChannelAnalyticsData: MyChannelAnalyticsData = {
    name: "Analysis Channel (Mock)",
    thumbnailUrl: 'https://yt3.ggpht.com/ytc/AAUvwni42tQ2-3-p_x0_x-X0X-X0x-X0x-X0=s176-c-k-c0x00ffffff-no-rj',
    aiExecutiveSummary: { summary: "AI analysis functions will be activated upon actual API integration.", positivePatterns: ["Consistent subscriber growth"], growthAreas: ["Improving profitability"] },
    kpi: {
        viewsLast30d: totalViews,
        netSubscribersLast30d: totalSubsGained - totalSubsLost,
        watchTimeHoursLast30d: Math.round(totalViews * 2.5 / 60), // Avg view duration of 2.5 mins
        ctrLast30d: 6.8,
        avgViewDurationSeconds: 150,
        impressionsLast30d: Math.round(totalViews / 0.068),
    },
    dailyStats: mockDailyStats,
    aiGrowthInsight: { summary: "AI analysis is disabled.", positivePatterns: [], growthAreas: [] },
    funnelMetrics: {
        impressions: Math.round(totalViews / 0.068),
        ctr: 6.8,
        views: totalViews,
        avgViewDuration: 150,
    },
    aiFunnelInsight: { summary: "AI analysis is disabled.", positivePatterns: [], growthAreas: [] },
    contentSuccessFormula: { titlePatterns: ["Vlog", "Review"], optimalLength: '10-15 min', thumbnailStyle: 'Person-focused' },
    contentIdeas: [
        { title: "Q&A: Celebrating 100k Subscribers", reason: "Strengthens community interaction and increases channel loyalty." },
        { title: "One Month Living Series: Exploring a New Region", reason: "Expands on the popular travel content series." }
    ],
    retentionData: {
        average: Array.from({length: 101}, (_, i) => ({ time: i, retention: 100 * Math.exp(-0.04 * i) * (1 - 0.2 / (1 + Math.exp(-0.2 * (i - 50)))) })),
        topVideo: Array.from({length: 101}, (_, i) => ({ time: i, retention: 100 * Math.exp(-0.035 * i) * (1 - 0.1 / (1 + Math.exp(-0.2 * (i - 60)))) })),
    },
    trafficSources: [
        { name: "Browse features", percentage: 45, views: totalViews * 0.45 },
        { name: "YouTube search", percentage: 25, views: totalViews * 0.25 },
        { name: "Suggested videos", percentage: 15, views: totalViews * 0.15 },
        { name: "External", percentage: 10, views: totalViews * 0.10 },
        { name: "Other", percentage: 5, views: totalViews * 0.05 },
    ],
    videoAnalytics: mockVideoData.slice(0, 5).map((v, i) => ({
        id: v.id,
        thumbnailUrl: v.thumbnailUrl,
        title: v.title,
        publishedAt: v.publishedAt,
        views: v.viewCount,
        ctr: 5.5 + Math.random() * 3,
        avgViewDurationSeconds: 120 + Math.random() * 90,
    })),
    viewerPersona: { name: 'Growing Explorer', description: '20-30s demographic, thirsty for new experiences and knowledge, striving to live a self-directed life.', strategy: 'Provide practical information with emotional inspiration, positioning as a companion to help viewers grow.' },
    viewershipData: {
        bestUploadTime: 'Thursday 18:00 (Thu 6 PM)',
        heatmap: Array(7).fill(0).map(() => Array(24).fill(0).map(() => Math.random() * 100)),
    },
    audienceProfile: { 
        summary: "Actual data will be displayed when linked with YouTube Analytics.", 
        interests: [], 
        genderRatio: [{label: 'Female', value: 65}, {label: 'Male', value: 35}], 
        ageGroups: [
            {label: '18-24', value: 25},
            {label: '25-34', value: 40},
            {label: '35-44', value: 20},
            {label: '45-54', value: 10},
            {label: 'Other', value: 5},
        ], 
        topCountries: [{label: 'KR', value: 85}, {label: 'US', value: 10}, {label: 'JP', value: 5}] 
    },
};

// --- Mock Data for Similar Channels ---
export const mockSimilarChannels: SimilarChannelData[] = [
    { id: 'UCbCmjCuTUZos6Inko4u57UQ', name: 'Pani Bottle', handle: '@panibottle', thumbnailUrl: 'https://yt3.ggpht.com/ytc/AIdro_k-3...=s88-c-k-c0x00ffffff-no-rj', subscriberCount: 2200000, totalViews: 450000000, videoCount: 300, similarityScore: 98 },
// FIX: Added missing 'name' property key to resolve syntax error.
    { id: 'UCA_3_...', name: 'Gwak Tube', handle: '@gwaktube', thumbnailUrl: 'https://yt3.ggpht.com/ytc/AIdro_n0_...=s88-c-k-c0x00ffffff-no-rj', subscriberCount: 1900000, totalViews: 500000000, videoCount: 400, similarityScore: 96 },
    { id: 'UCu9_...', name: 'Life of Inquiry by Cho Seung-yeon', handle: '@TheLifeOfInquiry', thumbnailUrl: 'https://yt3.ggpht.com/ytc/AIdro_n0_...=s88-c-k-c0x00ffffff-no-rj', subscriberCount: 1500000, totalViews: 200000000, videoCount: 800, similarityScore: 88 },
];
