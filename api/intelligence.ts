const BACKEND_URL = process.env.CENTRAL_INTELLIGENCE_BACKEND_URL || process.env.CONTENT_OS_BACKEND_URL || '';

function cors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

async function upstreamGet(query: URLSearchParams) {
  if (!BACKEND_URL) return { status: 503, body: { ok: false, error: 'CENTRAL_INTELLIGENCE_BACKEND_URL_NOT_CONFIGURED' } };
  const url = `${BACKEND_URL}${BACKEND_URL.includes('?') ? '&' : '?'}${query.toString()}`;
  const r = await fetch(url, { redirect: 'follow' });
  const text = await r.text();
  try { return { status: r.status, body: JSON.parse(text) }; }
  catch { return { status: r.status, body: { ok: false, error: 'NON_JSON_UPSTREAM', preview: text.slice(0, 500) } }; }
}

async function upstreamPost(body: any) {
  if (!BACKEND_URL) return { status: 503, body: { ok: false, error: 'CENTRAL_INTELLIGENCE_BACKEND_URL_NOT_CONFIGURED' } };
  const r = await fetch(BACKEND_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), redirect: 'follow'
  });
  const text = await r.text();
  try { return { status: r.status, body: JSON.parse(text) }; }
  catch { return { status: r.status, body: { ok: false, error: 'NON_JSON_UPSTREAM', preview: text.slice(0, 500) } }; }
}

export default async function handler(req: any, res: any) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const params = new URLSearchParams();
      const q = req.query || {};
      params.set('action', String(q.action || 'health'));
      if (q.app_id) params.set('app_id', String(q.app_id));
      if (q.since) params.set('since', String(q.since));
      if (q.limit) params.set('limit', String(q.limit));
      const out = await upstreamGet(params);
      return res.status(out.status).json(out.body);
    }
    if (req.method === 'POST') {
      const out = await upstreamPost(req.body || {});
      return res.status(out.status).json(out.body);
    }
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: 'INTELLIGENCE_PROXY_FAILED', message: String(error?.message || error) });
  }
}
