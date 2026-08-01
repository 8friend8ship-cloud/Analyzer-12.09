import type { VideoData } from '../types';

export const MAX_STORED_SOURCE_ROWS = 200;
export const MAX_STORED_SOURCE_BYTES = 512 * 1024;
export const MAX_STORED_SOURCE_AGE_MS = 48 * 60 * 60 * 1000;
export const STORED_SOURCE_TIMEOUT_MS = 8_000;
export type MetricStatus = 'verified' | 'unavailable';

export interface StoredSourceRow {
  [key: string]: unknown;
}

const readText = (row: StoredSourceRow, aliases: string[]): string => {
  for (const key of aliases) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const readMetric = (row: StoredSourceRow, aliases: string[]): { value: number; status: MetricStatus } => {
  for (const key of aliases) {
    const raw = row[key];
    if (raw === '' || raw === null || raw === undefined) continue;
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(value) && value >= 0) return { value, status: 'verified' };
  }
  return { value: 0, status: 'unavailable' };
};

/**
 * Consumes a bounded slice of stored Data_Contract rows. It deliberately does not
 * assume a non-existent View_Count column; supported aliases are explicit and a
 * missing metric remains distinguishable from a verified zero.
 */
export const normalizeStoredSourceRows = (
  rows: StoredSourceRow[],
  limit = MAX_STORED_SOURCE_ROWS,
): VideoData[] => {
  const boundedLimit = Math.max(0, Math.min(Math.trunc(limit), MAX_STORED_SOURCE_ROWS));
  const seenIds = new Set<string>();
  return rows.slice(0, MAX_STORED_SOURCE_ROWS).flatMap((row) => {
    const id = readText(row, ['videoId', 'video_id', 'id']);
    const title = readText(row, ['title', 'videoTitle', 'video_title']);
    if (!id || !title || seenIds.has(id)) return [];
    if (seenIds.size >= boundedLimit) return [];
    seenIds.add(id);
    const views = readMetric(row, ['viewCount', 'view_count', 'views']);
    const likes = readMetric(row, ['likeCount', 'like_count', 'likes']);
    const comments = readMetric(row, ['commentCount', 'comment_count', 'comments']);
    return [{
      id,
      channelId: readText(row, ['channelId', 'channel_id']) || 'unknown',
      title,
      thumbnailUrl: readText(row, ['thumbnailUrl', 'thumbnail_url']),
      channelTitle: readText(row, ['channelTitle', 'channel_title']) || 'Unknown channel',
      publishedAt: readText(row, ['publishedAt', 'published_at']) || new Date(0).toISOString(),
      subscribers: readMetric(row, ['subscribers', 'subscriberCount']).value,
      viewCount: views.value,
      viewCountStatus: views.status,
      likeCount: likes.value,
      commentCount: comments.value,
      durationMinutes: readMetric(row, ['durationMinutes', 'duration_minutes']).value,
      engagementRate: views.status === 'verified' && views.value > 0
        ? ((likes.value + comments.value) / views.value) * 100
        : 0,
      channelCountry: readText(row, ['channelCountry', 'channel_country']) || undefined,
    } satisfies VideoData];
  });
};


export interface StoredSourceEnvelope {
  sourceId: string;
  sourceUpdatedAt: string;
  rows: StoredSourceRow[];
}

export interface StoredSourceResult {
  sourceId: string;
  sourceUpdatedAt: string;
  rows: VideoData[];
}

export interface StoredSourceFetchOptions {
  url?: string;
  limit?: number;
  nowMs?: number;
  fetchImpl?: typeof fetch;
}

const defaultStoredSourceUrl = (): string =>
  ((import.meta.env?.VITE_STORED_RESEARCH_URL as string | undefined) || '').trim();

export const validateStoredSourceEnvelope = (
  value: unknown,
  nowMs = Date.now(),
): StoredSourceEnvelope => {
  if (!value || typeof value !== 'object') throw new Error('STORED_SOURCE_INVALID: object envelope required.');
  const envelope = value as Partial<StoredSourceEnvelope>;
  if (typeof envelope.sourceId !== 'string' || !envelope.sourceId.trim()) {
    throw new Error('STORED_SOURCE_INVALID: sourceId is required.');
  }
  if (typeof envelope.sourceUpdatedAt !== 'string') {
    throw new Error('STORED_SOURCE_INVALID: sourceUpdatedAt is required.');
  }
  const updatedAtMs = Date.parse(envelope.sourceUpdatedAt);
  if (!Number.isFinite(updatedAtMs) || updatedAtMs > nowMs + 5 * 60 * 1000) {
    throw new Error('STORED_SOURCE_INVALID: sourceUpdatedAt is invalid or in the future.');
  }
  if (nowMs - updatedAtMs > MAX_STORED_SOURCE_AGE_MS) {
    throw new Error('STORED_SOURCE_STALE: source is older than 48 hours.');
  }
  if (!Array.isArray(envelope.rows)) throw new Error('STORED_SOURCE_INVALID: rows must be an array.');
  if (envelope.rows.length > MAX_STORED_SOURCE_ROWS) {
    throw new Error('STORED_SOURCE_LIMIT: at most 200 rows are accepted.');
  }
  return {
    sourceId: envelope.sourceId.trim(),
    sourceUpdatedAt: new Date(updatedAtMs).toISOString(),
    rows: envelope.rows,
  };
};

export const fetchStoredSource = async ({
  url = defaultStoredSourceUrl(),
  limit = MAX_STORED_SOURCE_ROWS,
  nowMs = Date.now(),
  fetchImpl = fetch,
}: StoredSourceFetchOptions = {}): Promise<StoredSourceResult> => {
  if (!url) throw new Error('STORED_SOURCE_CONFIG_MISSING: VITE_STORED_RESEARCH_URL is required.');
  const endpoint = new URL(url);
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) {
    throw new Error('STORED_SOURCE_CONFIG_INVALID: credential-free HTTPS URL required.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STORED_SOURCE_TIMEOUT_MS);
  try {
    const response = await fetchImpl(endpoint, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`STORED_SOURCE_HTTP_ERROR: ${response.status}.`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new Error('STORED_SOURCE_CONTENT_TYPE: application/json required.');
    }
    const declaredLength = Number(response.headers.get('content-length') || '0');
    if (Number.isFinite(declaredLength) && declaredLength > MAX_STORED_SOURCE_BYTES) {
      throw new Error('STORED_SOURCE_LIMIT: response exceeds 512 KiB.');
    }
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_STORED_SOURCE_BYTES) {
      throw new Error('STORED_SOURCE_LIMIT: response exceeds 512 KiB.');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('STORED_SOURCE_INVALID_JSON: response is not valid JSON.');
    }
    const envelope = validateStoredSourceEnvelope(parsed, nowMs);
    return {
      sourceId: envelope.sourceId,
      sourceUpdatedAt: envelope.sourceUpdatedAt,
      rows: normalizeStoredSourceRows(envelope.rows, limit),
    };
  } finally {
    clearTimeout(timeout);
  }
};


const withinPeriod = (publishedAt: string, period: string, nowMs: number): boolean => {
  if (period === 'any') return true;
  const publishedMs = Date.parse(publishedAt);
  if (!Number.isFinite(publishedMs)) return false;
  return nowMs - publishedMs <= Number(period) * 24 * 60 * 60 * 1000;
};

export const filterStoredVideos = (
  rows: VideoData[],
  query: string,
  filters: import('../types').FilterState,
  nowMs = Date.now(),
): VideoData[] => {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];
  const lengthMatches = (minutes: number): boolean => {
    if (filters.videoFormat === 'shorts') return minutes <= 1;
    if (filters.videoFormat === 'longform') return minutes > 1;
    if (filters.videoLength === 'short') return minutes <= 4;
    if (filters.videoLength === 'medium') return minutes > 4 && minutes <= 20;
    if (filters.videoLength === 'long') return minutes > 20;
    return true;
  };
  const filtered = rows.filter((row) => {
    const text = `${row.title} ${row.channelTitle}`.toLocaleLowerCase();
    const countryMatches = filters.country === 'WW' || !filters.country
      || row.channelCountry === filters.country;
    const viewsMatch = filters.minViews <= 0
      || (row.viewCountStatus === 'verified' && row.viewCount >= filters.minViews);
    return text.includes(needle)
      && countryMatches
      && viewsMatch
      && lengthMatches(row.durationMinutes)
      && withinPeriod(row.publishedAt, filters.period, nowMs);
  });
  const sorted = [...filtered].sort((a, b) => {
    if (filters.sortBy === 'publishedAt') {
      return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    }
    if (filters.sortBy === 'engagementRate') return b.engagementRate - a.engagementRate;
    if (filters.sortBy === 'viewCount') return b.viewCount - a.viewCount;
    return 0;
  });
  return sorted.slice(0, Math.min(filters.resultsLimit, MAX_STORED_SOURCE_ROWS));
};
