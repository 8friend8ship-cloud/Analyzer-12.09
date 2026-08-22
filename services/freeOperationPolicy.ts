import { reserveYoutubeQuota } from './youtubeQuotaGuard';
import { getActiveGeminiApiKey, getActiveYouTubeApiKey } from './localApiKeyService';

const nativeFetch = globalThis.fetch.bind(globalThis);

/**
 * Content OS hybrid learning transport policy.
 * - A logged-in user's YouTube/Gemini keys stay in this browser's Local Pack.
 * - Explicit local-key calls go directly from the browser to Google APIs.
 * - If no local YouTube key exists, legacy YouTube requests fall back to the approved same-origin server proxy.
 * - API responses may be archived as JSON learning data, but credentials are never mirrored to Drive/GitHub/Vercel.
 */
export function installFreeOperationPolicy() {
  if ((globalThis as any).__CONTENT_OS_FREE_POLICY__) return;
  (globalThis as any).__CONTENT_OS_FREE_POLICY__ = true;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    let url: URL;
    try {
      url = new URL(raw, globalThis.location?.origin || 'https://contents-os.com');
    } catch {
      return nativeFetch(input as any, init);
    }

    if (url.hostname === 'www.googleapis.com' && url.pathname.startsWith('/youtube/v3/')) {
      const endpoint = url.pathname.split('/').filter(Boolean).pop() || '';
      reserveYoutubeQuota(endpoint);

      const localKey = String(getActiveYouTubeApiKey() || '').trim();
      const requestKey = String(url.searchParams.get('key') || '').trim();
      if (localKey && requestKey && requestKey === localKey) {
        return nativeFetch(url.toString(), init);
      }

      const proxy = new URL('/api/youtube-proxy', globalThis.location?.origin || 'https://contents-os.com');
      proxy.searchParams.set('endpoint', endpoint);
      url.searchParams.forEach((value, key) => {
        if (key !== 'key') proxy.searchParams.append(key, value);
      });

      return nativeFetch(proxy.toString(), {
        ...init,
        method: 'GET',
        credentials: 'same-origin',
      });
    }

    if (url.hostname.includes('generativelanguage.googleapis.com')) {
      const localKey = String(getActiveGeminiApiKey() || '').trim();
      const requestKey = String(url.searchParams.get('key') || '').trim();
      if (localKey && requestKey && requestKey === localKey) {
        return nativeFetch(url.toString(), init);
      }
      return new Response(JSON.stringify({
        ok: false,
        error: 'LOCAL_GEMINI_KEY_REQUIRED',
        guidance: 'Register a personal Gemini API key in this browser Local Pack for learning analysis.',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return nativeFetch(input as any, init);
  }) as typeof fetch;
}
