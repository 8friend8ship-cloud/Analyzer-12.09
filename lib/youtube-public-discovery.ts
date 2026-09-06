export type YouTubeDiscoveryCandidate = {
  rank: number;
  url: string;
  video_id: string;
  title: string;
  channel: string;
  published_at: string;
  views_text: string;
  source: 'YOUTUBE_PUBLIC_SEARCH_HTML';
};

type DiscoveryResult = {
  ok: boolean;
  query: string;
  candidates: YouTubeDiscoveryCandidate[];
  source_url: string;
  warning?: string;
  error?: string;
};

function firstText(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value?.simpleText === 'string') return value.simpleText;
  if (Array.isArray(value?.runs)) return value.runs.map((x: any) => String(x?.text || '')).join('').trim();
  return '';
}

function extractInitialData(html: string): any | null {
  const markers = ['var ytInitialData = ', 'window["ytInitialData"] = ', 'ytInitialData = '];
  for (const marker of markers) {
    const start = html.indexOf(marker);
    if (start < 0) continue;
    let i = start + marker.length;
    while (i < html.length && /\s/.test(html[i])) i += 1;
    if (html[i] !== '{') continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let j = i; j < html.length; j += 1) {
      const ch = html[j];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          try { return JSON.parse(html.slice(i, j + 1)); } catch { break; }
        }
      }
    }
  }
  return null;
}

function candidateFromRenderer(renderer: any, rank: number): YouTubeDiscoveryCandidate | null {
  const videoId = String(renderer?.videoId || renderer?.navigationEndpoint?.watchEndpoint?.videoId || '').trim();
  if (!videoId) return null;
  return {
    rank,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    video_id: videoId,
    title: firstText(renderer?.title || renderer?.headline) || `YouTube video ${videoId}`,
    channel: firstText(renderer?.ownerText || renderer?.shortBylineText || renderer?.longBylineText),
    published_at: firstText(renderer?.publishedTimeText),
    views_text: firstText(renderer?.viewCountText || renderer?.shortViewCountText),
    source: 'YOUTUBE_PUBLIC_SEARCH_HTML',
  };
}

function walkRenderers(root: any, limit: number): YouTubeDiscoveryCandidate[] {
  const out: YouTubeDiscoveryCandidate[] = [];
  const seen = new Set<string>();
  const stack: any[] = [root];
  const rendererKeys = ['videoRenderer', 'gridVideoRenderer', 'compactVideoRenderer', 'reelItemRenderer'];
  let visited = 0;
  const maxVisited = 30000;

  while (stack.length && out.length < limit && visited < maxVisited) {
    const node = stack.pop();
    visited += 1;
    if (!node || typeof node !== 'object') continue;

    for (const key of rendererKeys) {
      if (!node[key]) continue;
      const item = candidateFromRenderer(node[key], out.length + 1);
      if (item && !seen.has(item.video_id)) {
        seen.add(item.video_id);
        out.push(item);
        if (out.length >= limit) break;
      }
    }
    if (out.length >= limit) break;

    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i -= 1) {
        const child = node[i];
        if (child && typeof child === 'object') stack.push(child);
      }
    } else {
      const values = Object.values(node);
      for (let i = values.length - 1; i >= 0; i -= 1) {
        const child = values[i];
        if (child && typeof child === 'object') stack.push(child);
      }
    }
  }
  return out;
}

export async function discoverYouTubePublicSearch(query: string, limit = 20, locale = 'ko-KR'): Promise<DiscoveryResult> {
  const safeLimit = Math.max(1, Math.min(Number(limit || 20), 30));
  const language = String(locale || 'ko-KR').split('-')[0] || 'ko';
  const region = String(locale || 'ko-KR').split('-')[1] || 'KR';
  const sourceUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=${encodeURIComponent(language)}&gl=${encodeURIComponent(region)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(sourceUrl, {
      method: 'GET',
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
    if (!response.ok) return { ok: false, query, candidates: [], source_url: sourceUrl, error: `YOUTUBE_HTTP_${response.status}` };
    if (html.length > 8_000_000) return { ok: false, query, candidates: [], source_url: sourceUrl, error: 'YOUTUBE_HTML_TOO_LARGE' };

    const initialData = extractInitialData(html);
    if (!initialData) {
      return { ok: false, query, candidates: [], source_url: sourceUrl, error: 'YT_INITIAL_DATA_NOT_FOUND', warning: 'Public YouTube HTML can change or be consent-blocked.' };
    }

    const candidates = walkRenderers(initialData, safeLimit);
    return {
      ok: candidates.length > 0,
      query,
      candidates,
      source_url: sourceUrl,
      warning: 'Unofficial low-frequency fallback. Use browser-assisted collection when blocked and do not treat this as an official YouTube API.',
      ...(candidates.length ? {} : { error: 'NO_VIDEO_RENDERERS_FOUND' }),
    };
  } catch (error: any) {
    return { ok: false, query, candidates: [], source_url: sourceUrl, error: String(error?.name === 'AbortError' ? 'YOUTUBE_DISCOVERY_TIMEOUT' : error?.message || error || 'YOUTUBE_DISCOVERY_FAILED') };
  }
}
