import type { ChannelRankingData, FilterState, VideoData } from '../types';

const LOCAL_CACHE_PREFIX = 'contents-os:youtube-query-cache:v2:';
export const YOUTUBE_CACHE_VERSION = 'CONTENTOS_YOUTUBE_DRIVE_CACHE_V2_20260822';
const CACHE_TTL_MS = 28 * 24 * 60 * 60 * 1000;

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
  void fetch('/api/youtube-cache', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((error) => {
    console.warn('[YouTubeCache] Drive mirror pending:', error);
  });
}

export const youtubeCacheTtlDays = 28;
