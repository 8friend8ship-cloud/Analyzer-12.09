const nativeFetch = globalThis.fetch.bind(globalThis);

const videoCache = new Map<string, any>();
const channelCache = new Map<string, any>();

const stableId = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(36);
};

const parseYouTubeVideoId = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    if (url.hostname === 'youtu.be') return url.pathname.replace(/^\//, '') || null;
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      const shorts = url.pathname.match(/^\/shorts\/([^/?]+)/);
      if (shorts) return shorts[1];
    }
  } catch {}
  return null;
};

const toJsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-OS-Data-Mode': 'CENTRAL_BACKDATA_ONLY' },
});

async function centralSearch(query: string, maxResults: number) {
  const params = new URLSearchParams({ query, asset_type: 'TEXT', limit: String(maxResults) });
  const response = await nativeFetch(`/api/backend?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) return [];
  const json = await response.json().catch(() => ({}));
  return Array.isArray(json?.results) ? json.results : [];
}

function rememberResult(result: any, index: number) {
  const rawUrl = String(result?.url || result?.source_url || result?.SOURCE_URL || '');
  const title = String(result?.title || result?.TITLE || result?.summary || result?.SUMMARY || rawUrl || `Backdata ${index + 1}`);
  const videoId = parseYouTubeVideoId(rawUrl) || `backdata-${stableId(rawUrl || title + index)}`;
  const channelId = String(result?.channel_id || result?.CHANNEL_ID || `central-${stableId(String(result?.channel || result?.platform || 'content-os'))}`);
  const channelTitle = String(result?.channel_title || result?.CHANNEL_TITLE || result?.channel || result?.platform || 'Content OS Backdata');
  const thumbnail = String(result?.thumbnail_url || result?.THUMBNAIL_URL || result?.image_url || result?.IMAGE_URL || '');
  const publishedAt = String(result?.published_at || result?.PUBLISHED_AT || result?.created_at || result?.CREATED_AT || new Date(0).toISOString());

  const normalized = { videoId, channelId, title, channelTitle, thumbnail, publishedAt, rawUrl, source: result };
  videoCache.set(videoId, normalized);
  if (!channelCache.has(channelId)) channelCache.set(channelId, normalized);
  return normalized;
}

async function handleYouTubeApi(url: URL) {
  const endpoint = url.pathname.split('/').pop() || '';
  if (endpoint === 'search') {
    const query = url.searchParams.get('q') || '';
    const type = url.searchParams.get('type') || 'video';
    const maxResults = Math.min(Number(url.searchParams.get('maxResults') || 20), 50);
    const results = await centralSearch(query, maxResults);
    const normalized = results.map(rememberResult);
    const items = normalized.map((item) => type === 'channel' ? ({
      id: { kind: 'youtube#channel', channelId: item.channelId },
      snippet: {
        title: item.channelTitle,
        description: 'Content OS 중앙 백데이터 결과',
        customUrl: '',
        publishedAt: item.publishedAt,
        thumbnails: { default: { url: item.thumbnail }, high: { url: item.thumbnail } },
      },
    }) : ({
      id: { kind: 'youtube#video', videoId: item.videoId },
      snippet: {
        title: item.title,
        description: 'Content OS 중앙 백데이터 결과',
        channelId: item.channelId,
        channelTitle: item.channelTitle,
        publishedAt: item.publishedAt,
        thumbnails: { default: { url: item.thumbnail }, high: { url: item.thumbnail } },
      },
    }));
    return toJsonResponse({ kind: 'youtube#searchListResponse', items, pageInfo: { totalResults: items.length, resultsPerPage: items.length } });
  }

  if (endpoint === 'videos') {
    const ids = (url.searchParams.get('id') || '').split(',').filter(Boolean);
    const items = ids.map((id) => videoCache.get(id)).filter(Boolean).map((item: any) => ({
      id: item.videoId,
      snippet: {
        title: item.title,
        channelId: item.channelId,
        channelTitle: item.channelTitle,
        publishedAt: item.publishedAt,
        tags: item.source?.keywords ? String(item.source.keywords).split(',') : [],
        thumbnails: { default: { url: item.thumbnail }, high: { url: item.thumbnail } },
      },
      statistics: {
        viewCount: String(item.source?.view_count || item.source?.VIEW_COUNT || 0),
        likeCount: String(item.source?.like_count || item.source?.LIKE_COUNT || 0),
        commentCount: String(item.source?.comment_count || item.source?.COMMENT_COUNT || 0),
      },
      contentDetails: { duration: String(item.source?.duration || item.source?.DURATION || 'PT0S') },
    }));
    return toJsonResponse({ kind: 'youtube#videoListResponse', items });
  }

  if (endpoint === 'channels') {
    const ids = (url.searchParams.get('id') || '').split(',').filter(Boolean);
    const items = ids.map((id) => channelCache.get(id)).filter(Boolean).map((item: any) => ({
      id: item.channelId,
      snippet: {
        title: item.channelTitle,
        description: 'Content OS 중앙 백데이터',
        publishedAt: item.publishedAt,
        country: item.source?.country || item.source?.COUNTRY || '',
        thumbnails: { default: { url: item.thumbnail }, high: { url: item.thumbnail } },
      },
      statistics: {
        subscriberCount: String(item.source?.subscriber_count || item.source?.SUBSCRIBER_COUNT || 0),
        videoCount: String(item.source?.video_count || item.source?.VIDEO_COUNT || 0),
        viewCount: String(item.source?.channel_view_count || item.source?.CHANNEL_VIEW_COUNT || 0),
      },
      brandingSettings: { channel: { keywords: String(item.source?.keywords || '') } },
    }));
    return toJsonResponse({ kind: 'youtube#channelListResponse', items });
  }

  if (endpoint === 'commentThreads' || endpoint === 'comments') return toJsonResponse({ items: [] });
  if (endpoint === 'videoCategories') return toJsonResponse({ items: [] });
  return toJsonResponse({ items: [], contentOsPolicy: 'EXTERNAL_SEARCH_API_DISABLED' });
}

export function installFreeOperationPolicy() {
  if ((globalThis as any).__CONTENT_OS_FREE_POLICY__) return;
  (globalThis as any).__CONTENT_OS_FREE_POLICY__ = true;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    let url: URL;
    try { url = new URL(raw, globalThis.location?.origin || 'https://contents-os.com'); }
    catch { return nativeFetch(input as any, init); }

    if (url.hostname === 'www.googleapis.com' && url.pathname.startsWith('/youtube/v3/')) {
      return handleYouTubeApi(url);
    }
    if (url.hostname.includes('generativelanguage.googleapis.com')) {
      return toJsonResponse({ ok: false, error: 'FREE_MODE_EXTERNAL_AI_API_DISABLED' }, 403);
    }
    return nativeFetch(input as any, init);
  }) as typeof fetch;
}
