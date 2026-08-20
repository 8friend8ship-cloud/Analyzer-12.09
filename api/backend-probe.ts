const FALLBACK_BACKEND = 'https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const backendUrl = process.env.CONTENT_OS_BACKEND_URL || FALLBACK_BACKEND;
  try {
    const getResponse = await fetch(backendUrl, { method: 'GET', redirect: 'follow' });
    const getText = await getResponse.text();
    const postResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'health', source: 'content-os-probe', at: new Date().toISOString() }),
      redirect: 'follow',
    });
    const postText = await postResponse.text();
    return res.status(200).json({
      ok: true,
      backendUrlConfigured: Boolean(process.env.CONTENT_OS_BACKEND_URL),
      backendUrl,
      get: { status: getResponse.status, contentType: getResponse.headers.get('content-type'), body: getText.slice(0, 2000) },
      post: { status: postResponse.status, contentType: postResponse.headers.get('content-type'), body: postText.slice(0, 2000) },
    });
  } catch (error: any) {
    return res.status(502).json({ ok: false, error: 'BACKEND_PROBE_FAILED', message: String(error?.message || error) });
  }
}
