import type { VideoData, FilterState, ChannelRankingData } from '../types';
import { getActiveLocalApiUser, getActiveYouTubeApiKey } from './localApiKeyService';
import { runGeminiLearningAnalysis } from './geminiLearningService';
import { saveLearningArchiveSession } from './learningArchiveService';
import {
  createYoutubeCachePayload,
  readYoutubeCache,
  storeYoutubeCache,
} from './youtubeCacheService';

export interface CentralSearchResponse {
  ok: boolean;
  status: 'READY' | 'COLLECTING' | 'REFRESH_REQUIRED' | 'ERROR';
  query: string;
  normalizedQuery?: string;
  seedId?: string | null;
  t1Id?: string | null;
  t2Id?: string | null;
  videos: VideoData[];
  channels?: ChannelRankingData[];
  message?: string;
  lineage?: string[];
}

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const countryToLangCode: Record<string, string> = {
  US: 'en', GB: 'en', CA: 'en', AU: 'en', SG: 'en', PH: 'en', NZ: 'en', PG: 'en',
  KR: 'ko', JP: 'ja', DE: 'de', FR: 'fr', CN: 'zh-Hans', HK: 'zh-Hant', TW: 'zh-Hant',
  RU: 'ru', VN: 'vi', ID: 'id', TH: 'th', MY: 'ms', BN: 'ms', MX: 'es', CL: 'es',
  PE: 'es', IN: 'hi', BR: 'pt',
};

let youtubeApiCallCounter = 0;

const chunks = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

const apiGet = async (endpoint: string, params: Record<string, string>, apiKey: string) => {
  const key = String(apiKey || '').trim();
  if (!key) {
    throw new Error('YouTube API 키가 없습니다. 왼쪽 아래 “학습 API”에서 이 로그인 계정의 개인 YouTube 키를 저장해주세요.');
  }
  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([name, value]) => {
    if (value !== '') url.searchParams.set(name, value);
  });
  url.searchParams.set('key', key);

  youtubeApiCallCounter += 1;
  const response = await fetch(url.toString());
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = body?.error?.errors?.[0]?.reason;
    const detail = body?.error?.message || `YouTube API HTTP ${response.status}`;
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
      throw new Error(`이 개인 YouTube API 키의 일일 할당량을 초과했습니다. (${detail})`);
    }
    if (reason === 'keyInvalid' || reason === 'ipRefererBlocked' || response.status === 400 || response.status === 403) {
      throw new Error(`개인 YouTube API 키 설정을 확인해주세요. (${detail})`);
    }
    throw new Error(detail);
  }
  return body;
};

const parseDurationMinutes = (value: string) => {
  const match = String(value || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return Number(match?.[1] || 0) * 60 + Number(match?.[2] || 0) + Number(match?.[3] || 0) / 60;
};

const searchPages = async (
  params: Record<string, string>,
  apiKey: string,
  requested: number,
) => {
  const wanted = Math.max(1, Math.min(Number(requested || 50), 100));
  const items: any[] = [];
  let pageToken = '';

  while (items.length < wanted) {
    const pageSize = Math.min(50, wanted - items.length);
    const body = await apiGet('search', {
      ...params,
      maxResults: String(pageSize),
      ...(pageToken ? { pageToken } : {}),
    }, apiKey);
    items.push(...(body.items || []));
    pageToken = body.nextPageToken || '';
    if (!pageToken || (body.items || []).length === 0) break;
  }
  return items.slice(0, wanted);
};

const fetchVideos = async (query: string, filters: FilterState, apiKey: string): Promise<VideoData[]> => {
  const searchParams: Record<string, string> = {
    part: 'snippet',
    q: query,
    type: 'video',
    order: filters.sortBy === 'publishedAt' ? 'date' : filters.sortBy === 'relevance' ? 'relevance' : 'viewCount',
  };

  if (filters.country && filters.country !== 'WW') {
    searchParams.regionCode = filters.country;
    const lang = countryToLangCode[filters.country];
    if (lang) searchParams.relevanceLanguage = lang;
  }
  if (filters.category && filters.category !== 'all') searchParams.videoCategoryId = filters.category;
  if (filters.videoLength && filters.videoLength !== 'any') searchParams.videoDuration = filters.videoLength;
  if (filters.videoFormat === 'shorts') searchParams.videoDuration = 'short';
  if (filters.period && filters.period !== 'any') {
    const date = new Date();
    date.setDate(date.getDate() - Number(filters.period));
    searchParams.publishedAfter = date.toISOString();
  }

  const searchItems = await searchPages(searchParams, apiKey, filters.resultsLimit);
  const videoIds = searchItems.map((item: any) => item?.id?.videoId).filter(Boolean);
  if (!videoIds.length) return [];

  const detailGroups = await Promise.all(chunks(videoIds, 50).map(ids => apiGet('videos', {
    part: 'snippet,statistics,contentDetails',
    id: ids.join(','),
  }, apiKey)));
  const detailItems = detailGroups.flatMap(group => group.items || []);

  const channelIds = Array.from(new Set(detailItems.map((item: any) => item?.snippet?.channelId).filter(Boolean)));
  const channelGroups = channelIds.length
    ? await Promise.all(chunks(channelIds, 50).map(ids => apiGet('channels', { part: 'snippet,statistics', id: ids.join(',') }, apiKey)))
    : [];
  const subscriberMap = channelGroups.flatMap(group => group.items || []).reduce((acc: Record<string, number>, item: any) => {
    acc[item.id] = Number(item?.statistics?.subscriberCount || 0);
    return acc;
  }, {});
  const countryMap = channelGroups.flatMap(group => group.items || []).reduce((acc: Record<string, string>, item: any) => {
    acc[item.id] = item?.snippet?.country || '';
    return acc;
  }, {});

  let videos = detailItems.map((item: any): VideoData => {
    const views = Number(item?.statistics?.viewCount || 0);
    const likes = Number(item?.statistics?.likeCount || 0);
    const comments = Number(item?.statistics?.commentCount || 0);
    const channelId = item?.snippet?.channelId || '';
    return {
      id: item.id,
      channelId,
      title: item?.snippet?.title || '',
      thumbnailUrl: item?.snippet?.thumbnails?.high?.url || item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || '',
      channelTitle: item?.snippet?.channelTitle || '',
      publishedAt: item?.snippet?.publishedAt || '',
      subscribers: subscriberMap[channelId] || 0,
      viewCount: views,
      likeCount: likes,
      commentCount: comments,
      durationMinutes: parseDurationMinutes(item?.contentDetails?.duration || ''),
      engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0,
      channelCountry: countryMap[channelId] || '',
    };
  });

  if (filters.minViews > 0) videos = videos.filter(video => video.viewCount >= filters.minViews);
  if (filters.videoFormat === 'shorts') videos = videos.filter(video => video.durationMinutes <= 1.05);
  if (filters.videoFormat === 'longform') videos = videos.filter(video => video.durationMinutes > 1.05);

  if (filters.sortBy === 'engagementRate') videos.sort((a, b) => b.engagementRate - a.engagementRate);
  else if (filters.sortBy === 'publishedAt') videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  else if (filters.sortBy === 'viewCount') videos.sort((a, b) => b.viewCount - a.viewCount);

  return videos.slice(0, Math.min(filters.resultsLimit || 50, 100));
};

const fetchChannels = async (query: string, filters: FilterState, apiKey: string): Promise<ChannelRankingData[]> => {
  const params: Record<string, string> = { part: 'snippet', q: query, type: 'channel' };
  if (filters.country && filters.country !== 'WW') {
    params.regionCode = filters.country;
    const lang = countryToLangCode[filters.country];
    if (lang) params.relevanceLanguage = lang;
  }

  const searchItems = await searchPages(params, apiKey, filters.resultsLimit);
  const channelIds = searchItems.map((item: any) => item?.id?.channelId).filter(Boolean);
  if (!channelIds.length) return [];

  const groups = await Promise.all(chunks(channelIds, 50).map(ids => apiGet('channels', {
    part: 'snippet,statistics',
    id: ids.join(','),
  }, apiKey)));
  const byId = groups.flatMap(group => group.items || []).reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = item;
    return acc;
  }, {});

  return channelIds.map((id: string, index: number): ChannelRankingData => {
    const item = byId[id] || {};
    return {
      id,
      name: item?.snippet?.title || searchItems[index]?.snippet?.title || '',
      channelHandle: item?.snippet?.customUrl || '',
      thumbnailUrl: item?.snippet?.thumbnails?.default?.url || searchItems[index]?.snippet?.thumbnails?.default?.url || '',
      subscriberCount: Number(item?.statistics?.subscriberCount || 0),
      newSubscribersInPeriod: 0,
      newViewsInPeriod: 0,
      videoCount: Number(item?.statistics?.videoCount || 0),
      viewCount: Number(item?.statistics?.viewCount || 0),
      rank: index + 1,
      rankChange: 0,
      channelCountry: item?.snippet?.country || '',
      description: item?.snippet?.description || '',
    };
  });
};

const newestPublishedAt = (videos: VideoData[]) => videos.reduce((latest, video) => {
  const value = Date.parse(video.publishedAt || '');
  return Number.isFinite(value) && value > latest ? value : latest;
}, 0);

const qualitySnapshot = (videos: VideoData[]) => ({
  count: videos.length,
  newestPublishedAt: newestPublishedAt(videos) ? new Date(newestPublishedAt(videos)).toISOString() : null,
  topViewCount: videos.reduce((max, video) => Math.max(max, Number(video.viewCount || 0)), 0),
  medianViewCount: videos.length
    ? [...videos].map(video => Number(video.viewCount || 0)).sort((a, b) => a - b)[Math.floor(videos.length / 2)]
    : 0,
});

export async function fetchCentralBackdata(
  query: string,
  filters: FilterState,
  mode: 'video' | 'channel' = 'video'
): Promise<CentralSearchResponse> {
  youtubeApiCallCounter = 0;
  const userId = getActiveLocalApiUser() || 'anonymous-local';

  // Stored data is a baseline for A/B comparison, not the final answer when a local API key is available.
  const cached = await readYoutubeCache(query, filters, mode);
  const cachedVideos = cached.hit && cached.payload ? (cached.payload.videos || []) : [];
  const cachedChannels = cached.hit && cached.payload ? (cached.payload.channels || []) : [];
  const apiKey = String(getActiveYouTubeApiKey() || '').trim();

  if (!apiKey) {
    if (cached.hit && cached.payload) {
      saveLearningArchiveSession({
        sessionId: `${Date.now()}-${mode}-${query}`,
        userId,
        createdAt: new Date().toISOString(),
        query,
        mode,
        filters,
        storedBaseline: mode === 'video' ? cachedVideos : cachedChannels,
        lineage: [cached.source, 'STORED_BASELINE_ONLY', 'LOCAL_YOUTUBE_KEY_MISSING'],
        apiUsage: { youtubeCallsObserved: 0, geminiCallsObserved: 0 },
      });
      return {
        ok: true,
        status: 'READY',
        query,
        normalizedQuery: cached.payload.normalizedQuery || query.trim(),
        videos: mode === 'video' ? cachedVideos : [],
        channels: mode === 'channel' ? cachedChannels : [],
        lineage: [cached.source, 'STORED_BASELINE_ONLY', 'LOCAL_YOUTUBE_KEY_MISSING'],
        message: '저장 백데이터만 표시했습니다. 학습 API 패널에 개인 YouTube 키를 넣으면 같은 조건으로 live 검색을 실행해 품질 비교·학습까지 진행합니다.',
      };
    }
    throw new Error('저장 데이터도 없고 개인 YouTube API 키도 없습니다. 왼쪽 아래 “학습 API”에서 YouTube Data API 키를 등록해주세요.');
  }

  try {
    if (mode === 'channel') {
      const channels = await fetchChannels(query, filters, apiKey);
      const payload = createYoutubeCachePayload(query, filters, mode, [], channels);
      storeYoutubeCache(payload);
      const qualityDelta = {
        storedCount: cachedChannels.length,
        liveCount: channels.length,
        coverageGain: channels.length - cachedChannels.length,
      };
      saveLearningArchiveSession({
        sessionId: `${Date.now()}-channel-${query}`,
        userId,
        createdAt: new Date().toISOString(),
        query,
        mode,
        filters,
        storedBaseline: cachedChannels,
        youtube: channels,
        qualityDelta,
        lineage: [cached.hit ? cached.source : 'NO_STORED_BASELINE', 'LIVE_YOUTUBE_DATA_API_V3', 'A_B_QUALITY_COMPARE', 'CACHE_WRITEBACK'],
        apiUsage: { youtubeCallsObserved: youtubeApiCallCounter, geminiCallsObserved: 0 },
      });
      return {
        ok: true,
        status: 'READY',
        query,
        normalizedQuery: payload.normalizedQuery,
        videos: [],
        channels,
        lineage: [cached.hit ? cached.source : 'NO_STORED_BASELINE', 'LIVE_YOUTUBE_DATA_API_V3', 'A_B_QUALITY_COMPARE', 'CACHE_WRITEBACK'],
        message: `예전 방식의 live YouTube 채널 검색을 실행했습니다. 저장 기준 ${cachedChannels.length}건 ↔ live ${channels.length}건, 관측 API 호출 ${youtubeApiCallCounter}회. 결과 JSON을 학습 아카이브에 저장했습니다.`,
      };
    }

    const videos = await fetchVideos(query, filters, apiKey);
    const payload = createYoutubeCachePayload(query, filters, mode, videos, []);
    storeYoutubeCache(payload);

    const gemini = await runGeminiLearningAnalysis(query, videos, filters);
    const storedQuality = qualitySnapshot(cachedVideos);
    const liveQuality = qualitySnapshot(videos);
    const qualityDelta = {
      stored: storedQuality,
      live: liveQuality,
      coverageGain: liveQuality.count - storedQuality.count,
      freshnessGainMs: (Date.parse(liveQuality.newestPublishedAt || '') || 0) - (Date.parse(storedQuality.newestPublishedAt || '') || 0),
      topViewGain: liveQuality.topViewCount - storedQuality.topViewCount,
    };

    saveLearningArchiveSession({
      sessionId: `${Date.now()}-video-${query}`,
      userId,
      createdAt: new Date().toISOString(),
      query,
      mode,
      filters,
      storedBaseline: cachedVideos,
      youtube: videos,
      gemini,
      qualityDelta,
      seedCandidate: gemini?.seedCandidate || null,
      lineage: [
        cached.hit ? cached.source : 'NO_STORED_BASELINE',
        'LEGACY_STRENGTH_LIVE_YOUTUBE_SEARCH',
        'YOUTUBE_DATA_API_V3',
        gemini ? 'GEMINI_LEARNING_ANALYSIS' : 'GEMINI_NOT_CONFIGURED_OR_FAILED',
        'A_B_QUALITY_COMPARE',
        'LEARNING_ARCHIVE_JSON',
        'CACHE_WRITEBACK',
      ],
      apiUsage: {
        youtubeCallsObserved: youtubeApiCallCounter,
        geminiCallsObserved: gemini ? 1 : 0,
      },
    });

    return {
      ok: true,
      status: 'READY',
      query,
      normalizedQuery: payload.normalizedQuery,
      videos,
      channels: [],
      seedId: gemini ? `LOCAL_SEED_${Date.now()}` : null,
      lineage: [
        cached.hit ? cached.source : 'NO_STORED_BASELINE',
        'LEGACY_STRENGTH_LIVE_YOUTUBE_SEARCH',
        'YOUTUBE_DATA_API_V3',
        gemini ? 'GEMINI_LEARNING_ANALYSIS' : 'GEMINI_NOT_CONFIGURED_OR_FAILED',
        'A_B_QUALITY_COMPARE',
        'LEARNING_ARCHIVE_JSON',
        'CACHE_WRITEBACK',
      ],
      message: `live YouTube 검색 ${videos.length}건을 기준으로 분석했습니다. 저장 기준 ${cachedVideos.length}건과 A/B 비교했고, 관측 YouTube API 호출 ${youtubeApiCallCounter}회${gemini ? ' + Gemini 학습분석 1회' : ''}. 전체 세션 JSON을 Learning Archive에 저장했습니다.`,
    };
  } catch (error) {
    if (cached.hit && cached.payload) {
      console.warn('[ContentOS] live learning refresh failed; using stored baseline:', error);
      return {
        ok: true,
        status: 'REFRESH_REQUIRED',
        query,
        normalizedQuery: cached.payload.normalizedQuery || query.trim(),
        videos: mode === 'video' ? cachedVideos : [],
        channels: mode === 'channel' ? cachedChannels : [],
        lineage: [cached.source, 'LIVE_API_REFRESH_FAILED', 'STORED_BASELINE_FALLBACK'],
        message: `live API 학습 갱신에 실패해 저장 기준값으로 표시했습니다. 관측 API 호출 ${youtubeApiCallCounter}회.`,
      };
    }
    throw error;
  }
}
