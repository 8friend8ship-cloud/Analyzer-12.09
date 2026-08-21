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
  const markers = [
    'var ytInitialData = ',
    'window["ytInitialData"] = ',
    'ytInitialData = ',
  ];

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
      if (ch === '"') {
        inString = true;
        continue;
      }
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
  const title = firstText(renderer?.title || renderer?.headline) || `YouTube video ${videoId}`;
  const channel = firstText(renderer?.ownerText || renderer?.shortBylineText || renderer?.longBylineText);
  const published = firstText(renderer?.publishedTimeText);
  const views = firstText(renderer?.viewCountText || renderer?.shortViewCountText);
  return {
    rank,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    video_id: videoId,
    title,
    channel,
    published_at: published,
    views_text: views,
    source: 'YOUTUBE_PUBLIC_SEARCH_HTML',
  };
}

function walkRenderers(root: any, limit: number): YouTubeDiscoveryCandidate[] {
  const out: YouTubeDiscoveryCandidate[] = [];
  const seen = new Set<string>();
  const queue: any[] = [root];
  const rendererKeys = ['videoRenderer', 'gridVideoRenderer', 'compactVideoRenderer', 'reelItemRenderer'];

  while (queue.length && out.length < limit) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') continue;

    for (const key of rendererKeys) {
      if (node[key]) {
        const item = candidateFromRenderer(node[key], out.length + 1);
        if (item && !seen.has(item.video_id)) {
          seen.add(item.video_id);
          out.push(item);
          if (out.length >= limit) break;
        }
      }
    }
    if (out.length >= limit) break;

    if (Array.isArray(node)) {
      for (const child of node) queue.push(child);
    } else {
      for (const child of Object.values(node)) {
        if (child && typeof child === 'object') queue.push(child);
      }
    }
  }
  return out;
}

export async function discoverYouTubePublicSearch(query: string, limit = 20, locale = 'ko-KR'): Promise<DiscoveryResult> {
  const safeLimit = Math.max(1, Math.min(Number(limit || 20), 50));
  const language = String(locale || 'ko-KR').split('-')[0] || 'ko';
  const region = String(locale || 'ko-KR').split('-')[1] || 'KR';
  const sourceUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=${encodeURIComponent(language)}&gl=${encodeURIComponent(region)}`;

  try {
    const response = await fetch(sourceUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
        'Accept-Language': `${language},en;q=0.8`,
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    const html = await response.text();
    if (!response.ok) {
      return { ok: false, query, candidates: [], source_url: sourceUrl, error: `YOUTUBE_HTTP_${response.status}` };
    }

    const initialData = extractInitialData(html);
    if (!initialData) {
      return {
        ok: false,
        query,
        candidates: [],
        source_url: sourceUrl,
        error: 'YT_INITIAL_DATA_NOT_FOUND',
        warning: 'Public YouTube HTML is an unofficial fallback and can change without notice.',
      };
    }

    const candidates = walkRenderers(initialData, safeLimit);
    return {
      ok: candidates.length > 0,
      query,
      candidates,
      source_url: sourceUrl,
      warning: 'Public YouTube HTML is an unofficial fallback. Keep request frequency low and fall back to browser-assisted collection when blocked.',
      ...(candidates.length ? {} : { error: 'NO_VIDEO_RENDERERS_FOUND' }),
    };
  } catch (error: any) {
    return {
      ok: false,
      query,
      candidates: [],
      source_url: sourceUrl,
      error: String(error?.message || error || 'YOUTUBE_DISCOVERY_FAILED'),
    };
  }
}
