import { reserveYoutubeQuota } from './youtubeQuotaGuard';

const nativeFetch = globalThis.fetch.bind(globalThis);

const toJsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-OS-Data-Mode': 'FREE_OPERATION_POLICY',
  },
});

/**
 * Canonical Content OS transport policy.
 * - Browser Gemini/generative-language calls are blocked.
 * - Browser YouTube Data API calls never carry a user/browser key upstream.
 * - YouTube requests are rewritten to the same-origin server-only proxy.
 * - The server proxy calls the official API only when an approved server key exists.
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
      return toJsonResponse({ ok: false, error: 'FREE_MODE_EXTERNAL_AI_API_DISABLED' }, 403);
    }

    return nativeFetch(input as any, init);
  }) as typeof fetch;
}
