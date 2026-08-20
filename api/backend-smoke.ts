const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec';

async function asJson(response: Response) {
  const text = await response.text();
  try { return { status: response.status, body: JSON.parse(text) }; }
  catch { return { status: response.status, body: text.slice(0, 2000) }; }
}

export default async function handler(_req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const stamp = new Date().toISOString();
  const enqueuePayload = {
    action: 'enqueue',
    asset_type: 'TEXT',
    source_type: 'WEBAPP_RUNTIME',
    platform: 'CONTENT_OS',
    category: 'BACKEND_SMOKE',
    title: 'Content OS backend runtime smoke',
    summary: `Content OS Vercel to Apps Script collector runtime verification ${stamp}`,
    keywords: 'content-os,backend,vercel,apps-script,smoke',
    source_url: `https://contents-os.com/?backend_smoke=${encodeURIComponent(stamp)}`,
    target_apps: 'APP_CONTENT_OS',
    use_case: 'RUNTIME_STORAGE_SMOKE',
  };
  try {
    const enqueue = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enqueuePayload),
      redirect: 'follow',
    });
    const enqueueResult = await asJson(enqueue);

    const search = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', asset_type: 'TEXT', query: 'Content OS backend runtime smoke', limit: 5 }),
      redirect: 'follow',
    });
    const searchResult = await asJson(search);
    return res.status(200).json({ ok: true, stamp, enqueue: enqueueResult, search: searchResult });
  } catch (error: any) {
    return res.status(502).json({ ok: false, error: 'BACKEND_SMOKE_FAILED', message: String(error?.message || error) });
  }
}
