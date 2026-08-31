const CACHE_BACKEND_URL = process.env.CONTENT_OS_CACHE_BACKEND_URL || 'https://script.google.com/macros/s/AKfycbzz247_Mwl9c6N1WxmpHAttwHQJB6RCFtaY08XlHgxysz1iEzg7HWDXa3i5oXhDS1jo/exec';
const COLLECTOR_BACKEND_URL = process.env.CONTENT_OS_BACKEND_URL || 'https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec';
const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3';
const CLIENT_CACHE_VERSION = 'CONTENTOS_YOUTUBE_DRIVE_CACHE_V2_20260822';
const CACHE_READ_VERSION = 'CONTENTOS_YOUTUBE_CACHE_READ_V3_20260831';
const ALLOWED_METHODS = new Set(['GET', 'POST', 'OPTIONS']);
const CACHE_TTL_MS = 28 * 24 * 60 * 60 * 1000;

const parseJson = (text: string) => {
  try { return JSON.parse(text); } catch { return null; }
};

const parseFilters = (value: unknown) => {
  if (typeof value !== 'string' || !value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
};

const safeCachePayload = (body: any) => ({
  version: String(body?.version || ''),
  cacheKey: String(body?.cacheKey || ''),
  signature: String(body?.signature || ''),
  query: String(body?.query || ''),
  normalizedQuery: String(body?.normalizedQuery || ''),
  mode: body?.mode === 'channel' ? 'channel' : 'video',
  filters: body?.filters && typeof body.filters === 'object' ? body.filters : {},
  videos: Array.isArray(body?.videos) ? body.videos.slice(0, 100) : [],
  channels: Array.isArray(body?.channels) ? body.channels.slice(0, 100) : [],
  storedAt: String(body?.storedAt || new Date().toISOString()),
  expiresAt: String(body?.expiresAt || ''),
  dataPolicy: 'YOUTUBE_PUBLIC_METADATA_REFRESH_28D',
});

const backendHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = process.env.CONTENT_OS_BACKEND_TOKEN;
  if (token) headers['X-Content-OS-Token'] = token;
  return headers;
};

async function postToDriveBackend(action: string, payload: any) {
  const response = await fetch(CACHE_BACKEND_URL, {
    method: 'POST', headers: backendHeaders(),
    body: JSON.stringify({ action, payload, source: 'content-os-vercel-cache' }), redirect: 'follow',
  });
  const text = await response.text();
  return { response, json: parseJson(text), text };
}

async function searchCentralCollector(query: string, limit: number) {
  const response = await fetch(COLLECTOR_BACKEND_URL, {
    method: 'POST', headers: backendHeaders(),
    body: JSON.stringify({
      action: 'search', asset_type: 'VIDEO', query,
      limit: Math.max(1, Math.min(limit || 50, 50)), target_apps: 'APP_CONTENT_OS',
    }), redirect: 'follow',
  });
  const text = await response.text();
  return { response, json: parseJson(text) };
}

const normalize = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
const num = (value: unknown) => Number(String(value ?? 0).replace(/,/g, '')) || 0;

const parseCollectorNotes = (row: any) => {
  const raw = row?.NOTES ?? row?.notes ?? '';
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return parseJson(raw);
};

const videoIdFromRow = (row: any, meta: any) => {
  const fromMeta = String(meta?.video_id || '').trim();
  if (fromMeta) return fromMeta;
  const rawUrl = String(row?.ARTICLE_URL ?? row?.url ?? '').trim();
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes('youtu.be')) return url.pathname.replace(/^\//, '').split('/')[0] || '';
    if (url.hostname.includes('youtube.com')) return url.searchParams.get('v') || '';
  } catch { /* ignore */ }
  return '';
};

const isoDurationMinutes = (value: unknown) => {
  const text = String(value || '');
  const m = text.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!m) return 0;
  return (Number(m[1] || 0) * 1440) + (Number(m[2] || 0) * 60) + Number(m[3] || 0) + (Number(m[4] || 0) / 60);
};

const youtubeApiKey = () => String(process.env.CONTENT_OS_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY || '');

type StoredCandidate = {
  id: string;
  sourceUrl: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  country: string;
  row: any;
  meta: any;
};

async function hydrateStoredCandidates(candidates: StoredCandidate[]) {
  const apiKey = youtubeApiKey();
  if (!apiKey || !candidates.length) {
    return { videos: [] as any[], apiCalls: 0, reason: apiKey ? 'NO_CANDIDATES' : 'YOUTUBE_KEY_NOT_CONFIGURED' };
  }

  const target = new URL(`${YOUTUBE_BASE}/videos`);
  target.searchParams.set('part', 'snippet,statistics,contentDetails');
  target.searchParams.set('id', candidates.slice(0, 50).map(v => v.id).join(','));
  target.searchParams.set('key', apiKey);

  const response = await fetch(target, {
    headers: { 'User-Agent': 'ContentOS-Central-Collector/1.0' },
  });
  const text = await response.text();
  const body = parseJson(text);
  if (!response.ok || !body || !Array.isArray(body.items)) {
    return { videos: [] as any[], apiCalls: 1, reason: `YOUTUBE_VIDEOS_${response.status}` };
  }

  const byId = new Map(candidates.map(candidate => [candidate.id, candidate]));
  const videos = body.items.map((item: any) => {
    const candidate = byId.get(String(item?.id || ''));
    const views = num(item?.statistics?.viewCount);
    const likes = num(item?.statistics?.likeCount);
    const comments = num(item?.statistics?.commentCount);
    const durationMinutes = isoDurationMinutes(item?.contentDetails?.duration);
    const publishedAt = String(item?.snippet?.publishedAt || candidate?.publishedAt || '');
    const title = String(item?.snippet?.title || candidate?.title || '');
    const channelTitle = String(item?.snippet?.channelTitle || candidate?.channelTitle || '');
    const id = String(item?.id || candidate?.id || '');
    return {
      id,
      channelId: String(item?.snippet?.channelId || ''),
      title,
      thumbnailUrl: String(item?.snippet?.thumbnails?.high?.url || item?.snippet?.thumbnails?.medium?.url || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '')),
      channelTitle,
      publishedAt,
      subscribers: 0,
      viewCount: views,
      likeCount: likes,
      commentCount: comments,
      durationMinutes,
      engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0,
      channelCountry: String(candidate?.country || candidate?.meta?.country || ''),
      categoryId: String(item?.snippet?.categoryId || ''),
      sourceUrl: String(candidate?.sourceUrl || (id ? `https://www.youtube.com/watch?v=${id}` : '')),
    };
  }).filter((video: any) => video.id && video.title);

  return { videos, apiCalls: 1, reason: 'OK' };
}

function applyStoredFilters(videos: any[], filters: Record<string, any>) {
  const minViews = Math.max(0, num(filters?.minViews));
  const period = String(filters?.period || 'any').toLowerCase();
  const sortBy = String(filters?.sortBy || 'relevance');
  const country = String(filters?.country || 'WW').toUpperCase();
  const videoLength = String(filters?.videoLength || 'any').toLowerCase();
  const videoFormat = String(filters?.videoFormat || 'any').toLowerCase();
  const category = String(filters?.category || 'all');
  const wanted = Math.max(1, Math.min(Number(filters?.resultsLimit || 50), 100));

  if (videoFormat !== 'any') {
    return { videos: [], unsupportedFilter: `videoFormat:${videoFormat}` };
  }

  const now = Date.now();
  const days = period === 'any' ? 0 : Number(period);
  const periodFloor = Number.isFinite(days) && days > 0 ? now - (days * 86400000) : 0;

  let out = videos.filter(video => {
    if (minViews > 0 && Number(video.viewCount || 0) < minViews) return false;

    if (periodFloor) {
      const published = new Date(String(video.publishedAt || '')).getTime();
      if (!Number.isFinite(published) || published < periodFloor) return false;
    }

    if (country !== 'WW') {
      const rowCountry = String(video.channelCountry || '').toUpperCase();
      if (rowCountry && rowCountry !== country) return false;
    }

    const duration = Number(video.durationMinutes || 0);
    if (videoLength === 'short' && !(duration > 0 && duration < 4)) return false;
    if (videoLength === 'medium' && !(duration >= 4 && duration <= 20)) return false;
    if (videoLength === 'long' && !(duration > 20)) return false;
    if (!['any', 'short', 'medium', 'long'].includes(videoLength)) return false;

    if (category !== 'all' && category && String(video.categoryId || '') !== category) return false;
    return true;
  });

  if (sortBy === 'viewCount') out.sort((a, b) => Number(b.viewCount || 0) - Number(a.viewCount || 0));
  else if (sortBy === 'publishedAt') out.sort((a, b) => new Date(String(b.publishedAt || '')).getTime() - new Date(String(a.publishedAt || '')).getTime());
  else if (sortBy === 'engagementRate') out.sort((a, b) => Number(b.engagementRate || 0) - Number(a.engagementRate || 0));

  return { videos: out.slice(0, wanted), unsupportedFilter: '' };
}

async function lookupCentralCollectorFallback(
  cacheKey: string,
  signature: string,
  query: string,
  mode: 'video' | 'channel',
  filters: Record<string, any>,
) {
  if (mode !== 'video' || !query.trim()) return null;

  try {
    const wanted = Math.max(1, Math.min(Number(filters?.resultsLimit || 50), 100));
    const fetchLimit = Math.max(wanted, Math.min(50, wanted * 4));
    const { response, json } = await searchCentralCollector(query, fetchLimit);
    if (!response.ok || !json || json.ok === false || !Array.isArray(json.results)) return null;

    const candidates: StoredCandidate[] = [];
    const seen = new Set<string>();

    for (const row of json.results) {
      const meta = parseCollectorNotes(row) || {};
      const matchQuery = normalize(row?._MATCH_QUERY || meta.normalized_query || meta.query || query);
      if (matchQuery && matchQuery !== normalize(query)) continue;

      const platform = String(row?.PLATFORM ?? row?.platform ?? '').toUpperCase();
      const sourceUrl = String(row?.ARTICLE_URL ?? row?.url ?? '').trim();
      const videoId = videoIdFromRow(row, meta);
      if (!videoId || seen.has(videoId)) continue;
      if (platform && platform !== 'YOUTUBE' && !sourceUrl.includes('youtube.com') && !sourceUrl.includes('youtu.be')) continue;
      seen.add(videoId);

      candidates.push({
        id: videoId,
        sourceUrl,
        title: String(row?.TITLE ?? row?.title ?? ''),
        channelTitle: String(meta.channel_title || row?.AUTHOR_SOURCE || ''),
        publishedAt: String(meta.published_at || row?.PUBLISHED_AT || ''),
        country: String(meta.country || row?.COUNTRY || ''),
        row,
        meta,
      });
      if (candidates.length >= 50) break;
    }

    if (!candidates.length) return null;

    const hydrated = await hydrateStoredCandidates(candidates);
    if (!hydrated.videos.length) {
      return {
        ok: true,
        hit: false,
        source: 'CENTRAL_STORED_BACKDATA',
        backend: 'CENTRAL_STORED_BACKDATA_YOUTUBE_ENRICHMENT_PENDING',
        version: CACHE_READ_VERSION,
        result_count: 0,
        api_calls: hydrated.apiCalls,
        reason: hydrated.reason,
      };
    }

    const filtered = applyStoredFilters(hydrated.videos, filters);
    const now = Date.now();
    const videos = filtered.videos;

    if (!videos.length) {
      return {
        ok: true,
        hit: false,
        source: 'CENTRAL_STORED_BACKDATA_YOUTUBE_ENRICHED',
        backend: 'CENTRAL_STORED_BACKDATA_YOUTUBE_ENRICHED',
        version: CACHE_READ_VERSION,
        result_count: 0,
        api_calls: hydrated.apiCalls,
        reason: filtered.unsupportedFilter ? 'UNSUPPORTED_FILTER_FAIL_CLOSED' : 'FILTER_NO_MATCH',
        unsupported_filter: filtered.unsupportedFilter || null,
      };
    }

    return {
      ok: true,
      hit: true,
      source: 'CENTRAL_STORED_BACKDATA_YOUTUBE_ENRICHED',
      backend: 'CENTRAL_STORED_BACKDATA_YOUTUBE_ENRICHED',
      version: CACHE_READ_VERSION,
      payload: {
        version: CLIENT_CACHE_VERSION,
        cacheKey,
        signature,
        query,
        normalizedQuery: normalize(query),
        mode: 'video',
        filters,
        videos,
        channels: [],
        storedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + CACHE_TTL_MS).toISOString(),
        dataPolicy: 'YOUTUBE_PUBLIC_METADATA_REFRESH_28D',
      },
      result_count: videos.length,
      api_calls: hydrated.apiCalls,
      hydration_reason: hydrated.reason,
    };
  } catch (error: any) {
    console.warn('[ContentOS YouTube cache] central collector fallback unavailable:', error);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!ALLOWED_METHODS.has(req.method || '')) return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });

  try {
    if (req.method === 'GET') {
      const cacheKey = String(req.query?.cache_key || '');
      const signature = String(req.query?.signature || '');
      const query = String(req.query?.query || '');
      const mode = String(req.query?.mode || 'video') === 'channel' ? 'channel' : 'video';
      const filters = parseFilters(req.query?.filters) as Record<string, any>;
      if (!cacheKey) return res.status(400).json({ ok: false, error: 'CACHE_KEY_REQUIRED' });

      let driveResult: any = null;
      try {
        driveResult = await postToDriveBackend('contentos.youtube.cache.lookup.v3', {
          cache_key: cacheKey, signature, query, mode, filters,
        });
      } catch (error) {
        console.warn('[ContentOS YouTube cache] exact Drive cache backend pending:', error);
      }

      if (driveResult?.response?.ok && driveResult?.json && driveResult.json.ok !== false && driveResult.json.hit) {
        return res.status(200).json(driveResult.json);
      }

      const collectorHit = await lookupCentralCollectorFallback(cacheKey, signature, query, mode, filters);
      if (collectorHit) return res.status(200).json(collectorHit);

      if (driveResult?.response?.ok && driveResult?.json && driveResult.json.ok !== false) {
        return res.status(200).json(driveResult.json);
      }
      return res.status(200).json({ ok: true, hit: false, backend: 'DRIVE_CACHE_UNAVAILABLE', version: CACHE_READ_VERSION, api_calls: 0 });
    }

    const payload = safeCachePayload(req.body || {});
    if (!payload.cacheKey || !payload.signature || !payload.query) {
      return res.status(400).json({ ok: false, error: 'INVALID_CACHE_PAYLOAD' });
    }

    const { response, json } = await postToDriveBackend('contentos.youtube.cache.store.v3', payload);
    if (!response.ok || !json || json.ok === false) {
      return res.status(202).json({ ok: true, mirrored: false, backend: 'DRIVE_CACHE_PENDING', version: CACHE_READ_VERSION });
    }
    return res.status(200).json({ ok: true, mirrored: true, version: CACHE_READ_VERSION, ...json });
  } catch (error: any) {
    console.error('[ContentOS YouTube Drive cache]', error);
    if (req.method === 'GET') return res.status(200).json({ ok: true, hit: false, backend: 'DRIVE_CACHE_UNAVAILABLE', version: CACHE_READ_VERSION, api_calls: 0 });
    return res.status(202).json({ ok: true, mirrored: false, backend: 'DRIVE_CACHE_PENDING', version: CACHE_READ_VERSION });
  }
}
