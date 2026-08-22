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
 * Free-operation policy.
 *
 * YouTube Data API v3 is never replaced with synthetic or unrelated backdata.
 * Before an official YouTube request leaves the browser we reserve its documented
 * quota cost in browser-local accounting (search.list=100 units; ordinary list calls=1).
 * Content OS checks browser + Drive/Sheets cache before reaching this path.
 *
 * Paid generative-language traffic remains blocked in free mode.
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
      return nativeFetch(input as any, init);
    }

    if (url.hostname.includes('generativelanguage.googleapis.com')) {
      return toJsonResponse({ ok: false, error: 'FREE_MODE_EXTERNAL_AI_API_DISABLED' }, 403);
    }

    return nativeFetch(input as any, init);
  }) as typeof fetch;
}
