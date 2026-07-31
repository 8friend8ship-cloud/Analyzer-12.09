import type { VideoData } from '../types';

export const MAX_STORED_SOURCE_ROWS = 200;
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
  return rows.slice(0, boundedLimit).flatMap((row, index) => {
    const id = readText(row, ['videoId', 'video_id', 'id']);
    const title = readText(row, ['title', 'videoTitle', 'video_title']);
    if (!id || !title) return [];
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
