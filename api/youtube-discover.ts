function decodeJsonText(raw: string) {
  try { return JSON.parse(`"${raw.replace(/"/g, '\\"')}"`); } catch { return raw.replace(/\\u0026/g, '&').replace(/\\n/g, ' '); }
}

function extractField(chunk: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = chunk.match(pattern);
    if (match?.[1]) return decodeJsonText(match[1]);
  }
  return '';
}

function parseVideoRenderers(html: string, limit: number) {
  const out: any[] = [];
  const seen = new Set<string>();
  const regex = /"videoRenderer":\{"videoId":"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) && out.length < limit) {
    const videoId = match[1];
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    const chunk = html.slice(match.index, Math.min(match.index + 12000, html.length));
    const title = extractField(chunk, [
      /"title":\{"runs":\[\{"text":"((?:\\.|[^"])*)"/,
      /"headline":\{"simpleText":"((?:\\.|[^"])*)"/,
    ]) || `YouTube video ${videoId}`;
    const channel = extractField(chunk, [
      /"ownerText":\{"runs":\[\{"text":"((?:\\.|[^"])*)"/,
      /"shortBylineText":\{"runs":\[\{"text":"((?:\\.|[^"])*)"/,
    ]);
    const publishedAt = extractField(chunk, [/"publishedTimeText":\{"simpleText":"((?:\\.|[^"])*)"/]);
    const viewsText = extractField(chunk, [
      /"viewCountText":\{"simpleText":"((?:\\.|[^"])*)"/,
      /"shortViewCountText":\{"simpleText":"((?:\\.|[^"])*)"/,
    ]);
    out.push({
      rank: out.length + 1,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      video_id: videoId,
      title,
      channel,
      published_at: publishedAt,
      views_text: viewsText,
      source: 'YOUTUBE_PUBLIC_SEARCH_HTML',
    });
  }
  return out;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-OS-Discovery-Mode', 'YOUTUBE_PUBLIC_HTML_API_FREE');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'GET_REQUIRED' });

  const query = String(req.query?.query || req.query?.q || '').trim();
  const limit = Math.max(1, Math.min(Number(req.query?.limit || 20), 30));
  const locale = String(req.query?.locale || req.query?.lang || 'ko-KR').trim();
  if (!query) return res.status(400).json({ ok: false, error: 'QUERY_REQUIRED' });

  const [language = 'ko', region = 'KR'] = locale.split('-');
  const sourceUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=${encodeURIComponent(language)}&gl=${encodeURIComponent(region)}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(sourceUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
        'Accept-Language': `${language},en;q=0.8`,
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timer);
    const html = await response.text();
    if (!response.ok) return res.status(502).json({ ok: false, error: `YOUTUBE_HTTP_${response.status}`, query, source_url: sourceUrl, fallback_next: 'BROWSER_BRIDGE_OR_LOCAL_YTDLP' });
    if (html.length > 8_000_000) return res.status(502).json({ ok: false, error: 'YOUTUBE_HTML_TOO_LARGE', query, source_url: sourceUrl, fallback_next: 'BROWSER_BRIDGE_OR_LOCAL_YTDLP' });

    const candidates = parseVideoRenderers(html, limit);
    return res.status(candidates.length ? 200 : 502).json({
      ok: candidates.length > 0,
      mode: 'YOUTUBE_PUBLIC_HTML_API_FREE_LOW_MEMORY',
      query,
      candidates,
      source_url: sourceUrl,
      youtube_data_api_key_required: false,
      gemini_required: false,
      warning: 'Unofficial low-frequency fallback; HTML structure or consent/rate limits can change.',
      fallback_next: candidates.length ? 'CROSSCHECK_AND_ENQUEUE_MISSING_QUEENS' : 'BROWSER_BRIDGE_OR_LOCAL_YTDLP',
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(502).json({
      ok: false,
      error: error?.name === 'AbortError' ? 'YOUTUBE_DISCOVERY_TIMEOUT' : String(error?.message || error || 'YOUTUBE_DISCOVERY_FAILED'),
      query,
      source_url: sourceUrl,
      fallback_next: 'BROWSER_BRIDGE_OR_LOCAL_YTDLP',
      youtube_data_api_key_required: false,
      gemini_required: false,
    });
  }
}
