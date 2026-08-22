const QUOTA_STORAGE_KEY = 'contents-os:youtube-quota:v1';
export const YOUTUBE_DAILY_SAFE_UNIT_LIMIT = 8000;

export interface YoutubeQuotaState {
  pacificDay: string;
  usedUnits: number;
  searchCalls: number;
  detailCalls: number;
  updatedAt: string;
}

const pacificDayKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const emptyState = (): YoutubeQuotaState => ({
  pacificDay: pacificDayKey(),
  usedUnits: 0,
  searchCalls: 0,
  detailCalls: 0,
  updatedAt: new Date().toISOString(),
});

const readState = (): YoutubeQuotaState => {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = window.localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as YoutubeQuotaState;
    if (!parsed || parsed.pacificDay !== pacificDayKey()) return emptyState();
    return {
      pacificDay: parsed.pacificDay,
      usedUnits: Math.max(0, Number(parsed.usedUnits || 0)),
      searchCalls: Math.max(0, Number(parsed.searchCalls || 0)),
      detailCalls: Math.max(0, Number(parsed.detailCalls || 0)),
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
    };
  } catch {
    return emptyState();
  }
};

const writeState = (state: YoutubeQuotaState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort quota accounting if browser storage is unavailable.
  }
};

const endpointCost = (endpoint: string) => {
  const normalized = String(endpoint || '').replace(/^\/+|\/+$/g, '');
  if (normalized === 'search') return 100;
  return 1;
};

export const reserveYoutubeQuota = (endpoint: string) => {
  if (typeof window === 'undefined') return { ...emptyState(), reservedUnits: 0, remainingUnits: YOUTUBE_DAILY_SAFE_UNIT_LIMIT };
  const state = readState();
  const units = endpointCost(endpoint);
  if (state.usedUnits + units > YOUTUBE_DAILY_SAFE_UNIT_LIMIT) {
    throw new Error(`YouTube API 무료 한도 보호가 작동했습니다. 오늘 안전 한도 ${YOUTUBE_DAILY_SAFE_UNIT_LIMIT.toLocaleString()} units 중 ${state.usedUnits.toLocaleString()} units를 사용했습니다. 미국 태평양 시간 기준 다음 일일 초기화 후 다시 검색해주세요.`);
  }
  const isSearch = String(endpoint || '').replace(/^\/+|\/+$/g, '') === 'search';
  const next: YoutubeQuotaState = {
    pacificDay: state.pacificDay,
    usedUnits: state.usedUnits + units,
    searchCalls: state.searchCalls + (isSearch ? 1 : 0),
    detailCalls: state.detailCalls + (isSearch ? 0 : 1),
    updatedAt: new Date().toISOString(),
  };
  writeState(next);
  return {
    ...next,
    reservedUnits: units,
    remainingUnits: Math.max(0, YOUTUBE_DAILY_SAFE_UNIT_LIMIT - next.usedUnits),
  };
};

export const getYoutubeQuotaStatus = () => {
  const state = readState();
  return {
    ...state,
    safeLimitUnits: YOUTUBE_DAILY_SAFE_UNIT_LIMIT,
    remainingUnits: Math.max(0, YOUTUBE_DAILY_SAFE_UNIT_LIMIT - state.usedUnits),
  };
};
