const BACKEND_URL = process.env.CONTENT_OS_BACKEND_URL || 'https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec';
const ALLOWED_METHODS = new Set(['GET', 'POST']);

function platformFromUrl(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YOUTUBE';
    if (host.includes('pinterest.')) return 'PINTEREST';
    if (host.includes('instagram.')) return 'INSTAGRAM';
    if (host.includes('tiktok.')) return 'TIKTOK';
    if (host.includes('threads.')) return 'THREADS';
    return 'CONTENT_OS';
  } catch { return 'CONTENT_OS'; }
}

function normalizePost(body: any) {
  const action = String(body?.action || '');
  if (action === 'collection.upsert') {
    const item = body?.payload?.item || {};
    const url = String(item.url || item.raw?.url || '');
    if (!url) return { localOnly: true, reason: 'COLLECTION_ITEM_HAS_NO_URL' };
    return {
      action: 'enqueue',
      asset_type: 'TEXT',
      url,
      source_page_url: url,
      platform: platformFromUrl(url),
      title: String(item.title || 'Content OS saved item'),
      primary_code: 'CONTENT_OS_COLLECTION',
      keywords: [item.type, item.raw?.category, 'content-os', 'saved'].filter(Boolean).join(','),
      target_apps: 'APP_CONTENT_OS',
      use_case: 'FRONT_COLLECTION_SAVE',
      notes: JSON.stringify({ id: item.id, type: item.type, metric1: item.metric1, metric2: item.metric2, date: item.date }).slice(0, 1500),
    };
  }
  if (action === 'collection.prune' || action === 'collection.remove' || action === 'collection.clear') {
    return { localOnly: true, reason: 'COLLECTOR_IS_APPEND_ONLY', action };
  }
  if (action === 'search') return body;
  if (action === 'enqueue') return body;
  if (body?.payload?.url) {
    const url = String(body.payload.url);
    return {
      action: 'enqueue', asset_type: 'TEXT', url, source_page_url: url,
      platform: platformFromUrl(url), title: String(body.payload.title || action || 'Content OS item'),
      primary_code: 'CONTENT_OS_EVENT', keywords: 'content-os,event', target_apps: 'APP_CONTENT_OS',
      use_case: String(action || 'FRONT_EVENT'), notes: JSON.stringify(body.payload).slice(0, 1500),
    };
  }
  return { localOnly: true, reason: 'UNSUPPORTED_NON_URL_EVENT', action };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (!ALLOWED_METHODS.has(req.method || '')) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    let payload: any;
    if (req.method === 'GET') {
      payload = {
        action: 'search',
        asset_type: String(req.query?.asset_type || 'TEXT'),
        query: String(req.query?.query || ''),
        limit: Number(req.query?.limit || 20),
      };
    } else {
      payload = normalizePost(req.body || {});
    }

    if (payload?.localOnly) {
      return res.status(200).json({ ok: true, mirrored: false, ...payload });
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = process.env.CONTENT_OS_BACKEND_TOKEN;
    if (token) headers['X-Content-OS-Token'] = token;

    const upstream = await fetch(BACKEND_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || '';
    res.status(upstream.status);
    if (contentType.includes('application/json')) {
      try { return res.json(JSON.parse(text)); } catch { /* fall through */ }
    }
    return res.send(text);
  } catch (error: any) {
    console.error('[ContentOS backend proxy]', error);
    return res.status(502).json({ ok: false, error: 'BACKEND_UPSTREAM_FAILED' });
  }
}
