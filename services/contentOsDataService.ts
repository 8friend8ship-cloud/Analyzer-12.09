import type { VideoData, FilterState, ChannelRankingData, AnalysisMode } from '../types';

const BACKEND_URL = (import.meta.env.VITE_CONTENT_OS_BACKEND_URL as string) || '';

const buildUrl = (path: string, params: Record<string, string | number | undefined>) => {
  if (!BACKEND_URL) {
    throw new Error('Content OS 백데이터 WebApp URL이 설정되지 않았습니다. VITE_CONTENT_OS_BACKEND_URL을 설정해주세요.');
  }
  const base = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
  const url = new URL(`${base}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Content OS 백데이터 조회 실패 (${response.status})`);
  }
  const payload = await response.json();
  if (payload?.ok === false) throw new Error(payload.message || 'Content OS 백데이터 조회 실패');
  return (payload?.data ?? payload) as T;
};

export const isContentOsBackendConfigured = () => !!BACKEND_URL;

export const fetchContentOsVideos = async (
  mode: AnalysisMode,
  query: string,
  filters: FilterState,
): Promise<VideoData[]> => {
  const url = buildUrl('/video/search', {
    q: query,
    mode,
    country: filters.country,
    category: filters.category,
    period: filters.period,
    videoFormat: filters.videoFormat,
    videoLength: filters.videoLength,
    minViews: filters.minViews,
    sortBy: filters.sortBy,
    limit: filters.resultsLimit,
  });
  return fetchJson<VideoData[]>(url);
};

export const fetchContentOsChannels = async (
  query: string,
  filters: FilterState,
): Promise<ChannelRankingData[]> => {
  const url = buildUrl('/channel/search', {
    q: query,
    country: filters.country,
    category: filters.category,
    sortBy: filters.sortBy,
    limit: filters.resultsLimit,
  });
  return fetchJson<ChannelRankingData[]>(url);
};

export const fetchKeywordRank = async (query: string) => {
  const url = buildUrl('/keyword/rank', { q: query });
  return fetchJson(url);
};

export const fetchQueensSummary = async (query: string) => {
  const url = buildUrl('/queens/search', { q: query });
  return fetchJson(url);
};
