import type { ChannelRankingData, FilterState, VideoData } from '../types';

const LOCAL_CACHE_PREFIX = 'contents-os:youtube-query-cache:v2:';
export const YOUTUBE_CACHE_VERSION = 'CONTENTOS_YOUTUBE_DRIVE_CACHE_V2_20260822';
const CACHE_TTL_MS = 28 * 24 * 60 * 60 * 1000;
const CENTRAL_MIRROR_LIMIT = 30;

export type YoutubeCacheMode = 'video' | 'channel';

export interface YoutubeCachePayload {
  version: string;
  cacheKey: string;
  signature: string;
  query: string;
  normalizedQuery: string;
  mode: YoutubeCacheMode;
  filters: Record<string, string | number | boolean>;
  videos: VideoData[];
  channels: ChannelRankingData[];
  storedAt: string;
  expiresAt: string;
  dataPolicy: 'YOUTUBE_PUBLIC_METADATA_REFRESH_28D';
}

export interface YoutubeCacheReadResult {
  hit: boolean;
  source: 'LOCAL_BROWSER' | 'DRIVE_SHEETS' | 'MISS';
  payload?: YoutubeCachePayload;
}

const normalizedQuery = (value: string) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

const normalizedFilterObject = (filters: FilterState): Record<string, string | number | boolean> => ({
  country: String(filters.country || 'WW'),
  category: String(filters.category || 'all'),
  period: String(filters.period || 'any'),
  minViews: Number(filters.minViews || 0),
  videoLength: String(filters.videoLength || 'any'),
  videoFormat: String(filters.videoFormat || 'any'),
  sortBy: String(filters.sortBy || 'relevance'),
  resultsLimit: Math.max(1, Math.min(Number(filters.resultsLimit || 50), 100)),
});

const fnv1a = (value: string) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const buildYoutubeCacheDescriptor = (query: string, filters: FilterState, mode: YoutubeCacheMode) => {
  const filterObject = normalizedFilterObject(filters);
  const signature = JSON.stringify({ q: normalizedQuery(query), mode, filters: filterObject });
  return {
    cacheKey: `ytq_${fnv1a(signature)}`,
    signature,
    normalizedQuery: normalizedQuery(query),
    filters: filterObject,
  };
};

const isFreshPayload = (payload: YoutubeCachePayload | null | undefined) => {
  if (!payload || payload.version !== YOUTUBE_CACHE_VERSION) return false;
  const expiresAt = new Date(payload.expiresAt).getTime();
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
};

const loadLocal = (cacheKey: string): YoutubeCachePayload | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_CACHE_PREFIX + cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as YoutubeCachePayload;
    if (!isFreshPayload(parsed)) {
      window.localStorage.removeItem(LOCAL_CACHE_PREFIX + cacheKey);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(LOCAL_CACHE_PREFIX + cacheKey);
    return null;
  }
};

const saveLocal = (payload: YoutubeCachePayload) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_CACHE_PREFIX + payload.cacheKey, JSON.stringify(payload));
  } catch (error) {
    console.warn('[YouTubeCache] local cache write skipped:', error);
  }
};

const fetchDriveCache = async (
  cacheKey: string,
  signature: string,
  queryText: string,
  mode: YoutubeCacheMode,
  filters: Record<string, string | number | boolean>,
): Promise<YoutubeCachePayload | null> => {
  try {
    const query = new URLSearchParams({
      cache_key: cacheKey,
      signature,
      query: queryText,
      mode,
      filters: JSON.stringify(filters),
    });
    const response = await fetch(`/api/youtube-cache?${query.toString()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const body = await response.json().catch(() => null);
    const payload = body?.hit ? body?.payload as YoutubeCachePayload : null;
    if (!isFreshPayload(payload)) return null;
    return payload;
  } catch (error) {
    console.warn('[YouTubeCache] Drive cache lookup unavailable:', error);
    return null;
  }
};

/**
 * While the exact-query V3 Apps Script cache is being synchronized, every successful
 * first search also feeds public YouTube metadata into the already-live central Drive
 * collector. This is accumulation only; it is not trusted as an exact cache hit until
 * the V3 dispatcher validates query/filter signature. No login id, API key, token or
 * private collection membership is sent.
 */
const mirrorPublicSearchToCentralCollector = async (payload: YoutubeCachePayload) => {
  if (payload.mode !== 'video' || !payload.videos.length) return;
  const videos = payload.videos.slice(0, CENTRAL_MIRROR_LIMIT);
  for (let i = 0; i < videos.length; i += 5) {
    const group = videos.slice(i, i + 5);
    await Promise.allSettled(group.map(video => {
      const url = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
      const metadata = {
        cache_version: payload.version,
        cache_key: payload.cacheKey,
        query: payload.query,
        normalized_query: payload.normalizedQuery,
        video_id: video.id,
        channel_id: video.channelId,
        channel_title: video.channelTitle,
        published_at: video.publishedAt,
        view_count: video.viewCount,
        like_count: video.likeCount,
        comment_count: video.commentCount,
        duration_minutes: video.durationMinutes,
        country: video.channelCountry,
        expires_at: payload.expiresAt,
      };
      return fetch('/api/backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enqueue',
          asset_type: 'VIDEO',
          url,
          source_page_url: url,
          platform: 'YOUTUBE',
          title: video.title,
          primary_code: 'CONTENT_OS_YOUTUBE_SEARCH',
          keywords: [payload.normalizedQuery, video.channelTitle, 'content-os', 'youtube-search-cache'].filter(Boolean).join(','),
          target_apps: 'APP_CONTENT_OS',
          use_case: 'FRONT_SEARCH_PUBLIC_METADATA',
          country: video.channelCountry || String(payload.filters.country || ''),
          language: '',
          notes: JSON.stringify(metadata).slice(0, 3500),
        }),
      });
    }));
  }
};

export async function readYoutubeCache(
  query: string,
  filters: FilterState,
  mode: YoutubeCacheMode,
): Promise<YoutubeCacheReadResult> {
  const descriptor = buildYoutubeCacheDescriptor(query, filters, mode);
  const local = loadLocal(descriptor.cacheKey);
  if (local && local.signature === descriptor.signature) {
    return { hit: true, source: 'LOCAL_BROWSER', payload: local };
  }

  const drive = await fetchDriveCache(
    descriptor.cacheKey,
    descriptor.signature,
    String(query || '').trim(),
    mode,
    descriptor.filters,
  );
  if (drive && drive.signature === descriptor.signature) {
    saveLocal(drive);
    return { hit: true, source: 'DRIVE_SHEETS', payload: drive };
  }

  return { hit: false, source: 'MISS' };
}

export function createYoutubeCachePayload(
  query: string,
  filters: FilterState,
  mode: YoutubeCacheMode,
  videos: VideoData[],
  channels: ChannelRankingData[],
): YoutubeCachePayload {
  const descriptor = buildYoutubeCacheDescriptor(query, filters, mode);
  const now = Date.now();
  return {
    version: YOUTUBE_CACHE_VERSION,
    cacheKey: descriptor.cacheKey,
    signature: descriptor.signature,
    query: String(query || '').trim(),
    normalizedQuery: descriptor.normalizedQuery,
    mode,
    filters: descriptor.filters,
    videos,
    channels,
    storedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + CACHE_TTL_MS).toISOString(),
    dataPolicy: 'YOUTUBE_PUBLIC_METADATA_REFRESH_28D',
  };
}

export function storeYoutubeCache(payload: YoutubeCachePayload) {
  saveLocal(payload);

  // Preferred exact-cache mirror. It becomes authoritative after the existing
  // WEBAPP_TEMPLATE_05 Apps Script V3 dispatcher is live.
  void fetch('/api/youtube-cache', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((error) => {
    console.warn('[YouTubeCache] exact Drive mirror pending:', error);
  });

  // Existing live collector keeps public metadata accumulating immediately even while
  // the exact-cache Apps Script source sync is pending.
  void mirrorPublicSearchToCentralCollector(payload).catch((error) => {
    console.warn('[YouTubeCache] central public metadata mirror pending:', error);
  });
}

export const youtubeCacheTtlDays = 28;
