import { discoverYouTubePublicSearch } from '../lib/youtube-public-discovery';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-OS-Discovery-Mode', 'YOUTUBE_PUBLIC_HTML_API_FREE');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'GET_REQUIRED' });

  const query = String(req.query?.query || req.query?.q || '').trim();
  const limit = Math.max(1, Math.min(Number(req.query?.limit || 20), 50));
  const locale = String(req.query?.locale || req.query?.lang || 'ko-KR').trim();

  if (!query) return res.status(400).json({ ok: false, error: 'QUERY_REQUIRED' });

  const result = await discoverYouTubePublicSearch(query, limit, locale);
  return res.status(result.ok ? 200 : 502).json({
    ...result,
    mode: 'YOUTUBE_PUBLIC_HTML_API_FREE',
    youtube_data_api_key_required: false,
    gemini_required: false,
    fallback_next: result.ok ? 'CROSSCHECK_AND_ENQUEUE_MISSING_QUEENS' : 'BROWSER_BRIDGE_OR_LOCAL_YTDLP',
    checked_at: new Date().toISOString(),
  });
}
