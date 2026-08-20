const ALLOWED_METHODS = new Set(['GET', 'POST']);

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (!ALLOWED_METHODS.has(req.method || '')) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const backendUrl = process.env.CONTENT_OS_BACKEND_URL;
  if (!backendUrl) {
    return res.status(503).json({
      ok: false,
      error: 'CONTENT_OS_BACKEND_NOT_CONFIGURED',
      hint: 'Configure CONTENT_OS_BACKEND_URL in the Vercel project environment.',
    });
  }

  try {
    const target = new URL(backendUrl);
    if (req.method === 'GET') {
      for (const [key, value] of Object.entries(req.query || {})) {
        if (Array.isArray(value)) value.forEach(v => target.searchParams.append(key, String(v)));
        else if (value != null) target.searchParams.set(key, String(value));
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = process.env.CONTENT_OS_BACKEND_TOKEN;
    if (token) headers['X-Content-OS-Token'] = token;

    const upstream = await fetch(target.toString(), {
      method: req.method,
      headers,
      body: req.method === 'POST' ? JSON.stringify(req.body ?? {}) : undefined,
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
