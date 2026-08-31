const RUNTIME_URL = 'https://script.google.com/macros/s/AKfycbzz247_Mwl9c6N1WxmpHAttwHQJB6RCFtaY08XlHgxysz1iEzg7HWDXa3i5oXhDS1jo/exec';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  try {
    const upstream = await fetch(RUNTIME_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ action: 'contentos.runtime.identity.v3' }),
      redirect: 'follow'
    });
    const text = await upstream.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {}
    return res.status(200).json({
      ok: true,
      probe: 'READ_ONLY_RUNTIME_IDENTITY_V1',
      upstreamStatus: upstream.status,
      upstreamContentType: upstream.headers.get('content-type') || '',
      identity: parsed,
      rawPreview: parsed ? '' : text.slice(0, 1200)
    });
  } catch (error: any) {
    return res.status(200).json({ ok: false, probe: 'READ_ONLY_RUNTIME_IDENTITY_V1', error: String(error?.message || error) });
  }
}
