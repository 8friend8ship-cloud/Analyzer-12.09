const CACHE_BACKEND_URL = process.env.CONTENT_OS_CACHE_BACKEND_URL || 'https://script.google.com/macros/s/AKfycbzz247_Mwl9c6N1WxmpHAttwHQJB6RCFtaY08XlHgxysz1iEzg7HWDXa3i5oXhDS1jo/exec';
const ALLOWED_METHODS = new Set(['GET', 'POST', 'OPTIONS']);

const parseJson = (text: string) => {
  try { return JSON.parse(text); } catch { return null; }
};

const parseFilters = (value: unknown) => {
  if (typeof value !== 'string' || !value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
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

async function postToDriveBackend(action: string, payload: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = process.env.CONTENT_OS_BACKEND_TOKEN;
  if (token) headers['X-Content-OS-Token'] = token;

  const response = await fetch(CACHE_BACKEND_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, payload, source: 'content-os-vercel-cache' }),
    redirect: 'follow',
  });
  const text = await response.text();
  return { response, json: parseJson(text), text };
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
      const filters = parseFilters(req.query?.filters);
      if (!cacheKey) return res.status(400).json({ ok: false, error: 'CACHE_KEY_REQUIRED' });

      const { response, json } = await postToDriveBackend('contentos.youtube.cache.lookup.v3', {
        cache_key: cacheKey,
        signature,
        query,
        mode,
        filters,
      });

      if (!response.ok || !json || json.ok === false) {
        return res.status(200).json({ ok: true, hit: false, backend: 'DRIVE_CACHE_UNAVAILABLE' });
      }
      return res.status(200).json(json);
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
    if (req.method === 'GET') return res.status(200).json({ ok: true, hit: false, backend: 'DRIVE_CACHE_UNAVAILABLE' });
    return res.status(202).json({ ok: true, mirrored: false, backend: 'DRIVE_CACHE_PENDING' });
  }
}
