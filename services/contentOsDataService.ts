import type { ChannelRankingData, FilterState, VideoData } from '../types';

interface StoredDataSource {
  spreadsheetId: string;
  sheetName: string;
  version: string;
  lastReadAt: string;
}

interface StoredVideoSearchResponse {
  success: boolean;
  source?: StoredDataSource;
  query?: string;
  count?: number;
  totalMatched?: number;
  items?: VideoData[];
  error?: string;
  message?: string;
}

interface StoredChannelSearchResponse {
  success: boolean;
  source?: StoredDataSource;
  query?: string;
  count?: number;
  totalMatched?: number;
  items?: ChannelRankingData[];
  error?: string;
  message?: string;
}

const getCoreUrl = (): string => {
  const url = String(import.meta.env.VITE_CONTENT_OS_DATA_URL || '').trim();
  if (!url) {
    throw new Error(
      '저장 데이터 웹앱 주소가 아직 연결되지 않았습니다. VITE_CONTENT_OS_DATA_URL 설정이 필요합니다.'
    );
  }
  return url;
};

const buildUrl = (action: string, query: string, filters: FilterState): string => {
  const url = new URL(getCoreUrl());
  url.searchParams.set('action', action);
  url.searchParams.set('query', query);
  url.searchParams.set('country', filters.country || 'WW');
  url.searchParams.set('sortBy', filters.sortBy || 'viewCount');
  url.searchParams.set('period', filters.period || 'any');
  url.searchParams.set('limit', String(filters.resultsLimit || 50));
  url.searchParams.set('minViews', String(filters.minViews || 0));
  url.searchParams.set('cacheBust', String(Date.now()));
  return url.toString();
};

const readJson = async <T extends { success: boolean; error?: string; message?: string }>(
  url: string
): Promise<T> => {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'omit',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`저장 데이터 서버 응답 오류: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as T;
  if (!payload.success) {
    throw new Error(payload.message || payload.error || '저장 데이터 조회에 실패했습니다.');
  }
  return payload;
};

export const healthCheckStoredData = async (): Promise<StoredDataSource> => {
  const url = new URL(getCoreUrl());
  url.searchParams.set('action', 'health');
  url.searchParams.set('cacheBust', String(Date.now()));

  const payload = await readJson<{
    success: boolean;
    spreadsheetId: string;
    sheetName: string;
    version: string;
    timestamp: string;
    error?: string;
    message?: string;
  }>(url.toString());

  return {
    spreadsheetId: payload.spreadsheetId,
    sheetName: payload.sheetName,
    version: payload.version,
    lastReadAt: payload.timestamp,
  };
};

export const searchStoredVideos = async (
  query: string,
  filters: FilterState
): Promise<VideoData[]> => {
  const payload = await readJson<StoredVideoSearchResponse>(
    buildUrl('searchVideos', query, filters)
  );
  return Array.isArray(payload.items) ? payload.items : [];
};

export const searchStoredChannels = async (
  query: string,
  filters: FilterState
): Promise<ChannelRankingData[]> => {
  const payload = await readJson<StoredChannelSearchResponse>(
    buildUrl('searchChannels', query, filters)
  );
  return Array.isArray(payload.items) ? payload.items : [];
};
