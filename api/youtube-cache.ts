const CACHE_BACKEND_URL = process.env.CONTENT_OS_CACHE_BACKEND_URL || 'https://script.google.com/macros/s/AKfycbzz247_Mwl9c6N1WxmpHAttwHQJB6RCFtaY08XlHgxysz1iEzg7HWDXa3i5oXhDS1jo/exec';
const COLLECTOR_BACKEND_URL = process.env.CONTENT_OS_BACKEND_URL || 'https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec';
const CLIENT_CACHE_VERSION = 'CONTENTOS_YOUTUBE_DRIVE_CACHE_V2_20260822';
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

const isReusableQueensRow = (row: any) => {
  const primaryCode = String(row?.PRIMARY_CODE ?? row?.primary_code ?? '');
  const useCase = String(row?.USE_CASE ?? row?.use_case ?? '');
  return (
    (primaryCode === 'CONTENT_OS_YOUTUBE_SEARCH' && useCase === 'FRONT_SEARCH_PUBLIC_METADATA') ||
    (primaryCode === 'CONTENT_OS_COVERAGE_GAP' && useCase === 'QUEENS_CROSSCHECK_GAP_FILL')
  );
};

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
    const { response, json } = await searchCentralCollector(query, Math.min(wanted, 50));
    if (!response.ok || !json || json.ok === false || !Array.isArray(json.results)) return null;

    const now = Date.now();
    const videos: any[] = [];
    const seen = new Set<string>();
    let expiresAt = now + CACHE_TTL_MS;
    let sourceKind = 'CENTRAL_DRIVE_COLLECTOR';

    for (const row of json.results) {
      if (!isReusableQueensRow(row)) continue;
      const meta = parseCollectorNotes(row) || {};
      const rowQuery = normalize(meta.normalized_query || meta.query || row?._MATCH_QUERY || query);
      if (rowQuery !== normalize(query)) continue;

      const videoId = videoIdFromRow(row, meta);
      if (!videoId || seen.has(videoId)) continue;
      seen.add(videoId);

      const explicitExpiry = new Date(String(meta.expires_at || '')).getTime();
      if (Number.isFinite(explicitExpiry) && explicitExpiry > now) expiresAt = Math.min(expiresAt, explicitExpiry);

      const views = num(meta.view_count);
      const likes = num(meta.like_count);
      const comments = num(meta.comment_count);
      videos.push({
        id: videoId,
        channelId: String(meta.channel_id || ''),
        title: String(row?.TITLE ?? row?.title ?? ''),
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        channelTitle: String(meta.channel_title || row?.AUTHOR_SOURCE || ''),
        publishedAt: String(meta.published_at || row?.PUBLISHED_AT || ''),
        subscribers: 0,
        viewCount: views,
        likeCount: likes,
        commentCount: comments,
        durationMinutes: num(meta.duration_minutes),
        engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0,
        channelCountry: String(meta.country || row?.COUNTRY || ''),
      });

      if (String(row?.PRIMARY_CODE || '') === 'CONTENT_OS_COVERAGE_GAP') sourceKind = 'QUEENS_COVERAGE_GAP_REUSE';
      if (videos.length >= wanted) break;
    }

    if (!videos.length) return null;

    return {
      ok: true, hit: true, source: sourceKind,
      backend: 'CENTRAL_STORED_BACKDATA_REUSE',
      payload: {
        version: CLIENT_CACHE_VERSION, cacheKey, signature, query,
        normalizedQuery: normalize(query), mode: 'video', filters, videos, channels: [],
        storedAt: new Date(now).toISOString(), expiresAt: new Date(expiresAt).toISOString(),
        dataPolicy: 'YOUTUBE_PUBLIC_METADATA_REFRESH_28D',
      },
      result_count: videos.length, api_calls: 0,
    };
  } catch (error) {
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
      return res.status(200).json({ ok: true, hit: false, backend: 'DRIVE_CACHE_UNAVAILABLE', api_calls: 0 });
    }

    const payload = safeCachePayload(req.body || {});
    if (!payload.cacheKey || !payload.signature || !payload.query) {
      return res.status(400).json({ ok: false, error: 'INVALID_CACHE_PAYLOAD' });
    }

    const { response, json } = await postToDriveBackend('contentos.youtube.cache.store.v3', payload);
    if (!response.ok || !json || json.ok === false) {
      return res.status(202).json({ ok: true, mirrored: false, backend: 'DRIVE_CACHE_PENDING' });
    }
    return res.status(200).json({ ok: true, mirrored: true, ...json });
  } catch (error: any) {
    console.error('[ContentOS YouTube Drive cache]', error);
    if (req.method === 'GET') return res.status(200).json({ ok: true, hit: false, backend: 'DRIVE_CACHE_UNAVAILABLE', api_calls: 0 });
    return res.status(202).json({ ok: true, mirrored: false, backend: 'DRIVE_CACHE_PENDING' });
  }
}
