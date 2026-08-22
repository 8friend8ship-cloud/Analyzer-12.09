const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3';
const ALLOWED_ENDPOINTS = new Set([
  'search',
  'videos',
  'channels',
  'commentThreads',
  'comments',
  'playlistItems',
  'playlists',
  'videoCategories',
]);

const single = (value: any) => Array.isArray(value) ? value[0] : value;

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const endpoint = String(single(req.query?.endpoint) || '').trim();
  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return res.status(400).json({ error: 'YOUTUBE_ENDPOINT_NOT_ALLOWED' });
  }

  const apiKey = process.env.CONTENT_OS_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY || '';
  if (!apiKey) {
    return res.status(503).json({
      error: 'CENTRAL_YOUTUBE_KEY_NOT_CONFIGURED',
      api_calls: 0,
      guidance: 'Use stored Queens/Seed/Drive backdata or configure the approved server-side collector key.',
    });
  }

  const target = new URL(`${YOUTUBE_BASE}/${endpoint}`);
  Object.entries(req.query || {}).forEach(([key, raw]) => {
    if (key === 'endpoint' || key === 'key') return;
    const value = single(raw);
    if (value !== undefined && value !== '') target.searchParams.set(key, String(value));
  });
  target.searchParams.set('key', apiKey);

  try {
    const upstream = await fetch(target, {
      headers: { 'User-Agent': 'ContentOS-Central-Collector/1.0' },
    });
    const text = await upstream.text();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Content-OS-API-Path', 'SERVER_ONLY_YOUTUBE_PROXY');
    res.status(upstream.status);
    try {
      return res.json(JSON.parse(text));
    } catch {
      return res.send(text);
    }
  } catch (error: any) {
    return res.status(502).json({
      error: 'YOUTUBE_PROXY_UPSTREAM_FAILED',
      message: String(error?.message || error),
    });
  }
}
