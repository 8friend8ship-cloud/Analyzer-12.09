import type { VideoData, FilterState, ChannelRankingData } from '../types';

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

const buildParams = (query: string, filters: FilterState, mode: 'video' | 'channel') => {
  const p = new URLSearchParams({
    q: query,
    mode,
    minViews: String(filters.minViews),
    videoLength: filters.videoLength,
    videoFormat: filters.videoFormat,
    period: filters.period,
    sortBy: filters.sortBy,
    resultsLimit: String(filters.resultsLimit),
    country: filters.country,
    category: filters.category,
  });
  return p;
};

export async function fetchCentralBackdata(
  query: string,
  filters: FilterState,
  mode: 'video' | 'channel' = 'video'
): Promise<CentralSearchResponse> {
  const response = await fetch(`/api/content-search?${buildParams(query, filters, mode).toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const body = await response.json().catch(() => ({
    ok: false,
    status: 'ERROR',
    videos: [],
    query,
    message: `CENTRAL_BACKDATA_HTTP_${response.status}`,
  }));

  if (!response.ok && body?.status !== 'COLLECTING' && body?.status !== 'REFRESH_REQUIRED') {
    throw new Error(body?.message || `Central backdata search failed (${response.status})`);
  }
  return body as CentralSearchResponse;
}
