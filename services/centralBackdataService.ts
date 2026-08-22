import type { VideoData, FilterState, ChannelRankingData } from '../types';
import { getActiveYouTubeApiKey } from './localApiKeyService';

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

const chunks = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

const apiGet = async (endpoint: string, params: Record<string, string>, apiKey: string) => {
  const key = String(apiKey || '').trim();
  if (!key) {
    throw new Error('YouTube API 키가 없습니다. 화면 왼쪽 아래의 “YouTube API 키 등록”에서 이 로그인 계정의 개인 키를 저장해주세요.');
  }
  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([name, value]) => {
    if (value !== '') url.searchParams.set(name, value);
  });
  url.searchParams.set('key', key);

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

export async function fetchCentralBackdata(
  query: string,
  filters: FilterState,
  mode: 'video' | 'channel' = 'video'
): Promise<CentralSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    mode,
    minViews: String(filters.minViews || 0),
    videoLength: filters.videoLength || 'any',
    videoFormat: filters.videoFormat || 'any',
    period: filters.period || 'any',
    sortBy: filters.sortBy || 'viewCount',
    resultsLimit: String(filters.resultsLimit || 50),
    country: filters.country || 'KR',
    category: filters.category || 'all',
  });

  try {
    const response = await fetch(`/api/content-search?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json();
    if ((response.ok || response.status === 202) && body?.ok && body?.status) {
      return body as CentralSearchResponse;
    }
  } catch (error) {
    console.warn('[Content OS] central backdata unavailable; checking optional local key fallback.', error);
  }

  const apiKey = getActiveYouTubeApiKey();
  if (!apiKey) {
    return {
      ok: true,
      status: 'COLLECTING',
      query,
      normalizedQuery: query.trim(),
      videos: [],
      channels: [],
      lineage: ['QUERY', 'QUEENS_REFRESH_REQUIRED'],
      message: '중앙 Queens→Seed→T1→T2 백데이터 연결을 기다리는 중입니다. 개인 YouTube API 키는 선택 사항입니다.',
    };
  }

  if (mode === 'channel') {
    const channels = await fetchChannels(query, filters, apiKey);
    return {
      ok: true,
      status: 'READY',
      query,
      normalizedQuery: query.trim(),
      videos: [],
      channels,
      lineage: ['LOGIN_LOCAL_API_KEY', 'YOUTUBE_DATA_API_V3', 'CHANNEL_SEARCH'],
      message: `개인 YouTube API 키 보조 경로로 채널 ${channels.length}건을 조회했습니다.`,
    };
  }

  const videos = await fetchVideos(query, filters, apiKey);
  return {
    ok: true,
    status: 'READY',
    query,
    normalizedQuery: query.trim(),
    videos,
    channels: [],
    lineage: ['LOGIN_LOCAL_API_KEY', 'YOUTUBE_DATA_API_V3', 'VIDEO_SEARCH'],
    message: `개인 YouTube API 키 보조 경로로 영상 ${videos.length}건을 조회했습니다.`,
  };
}
