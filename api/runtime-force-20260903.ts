const APPS_SCRIPT_URL = process.env.CONTENT_OS_CACHE_BACKEND_URL || 'https://script.google.com/macros/s/AKfycbzz247_Mwl9c6N1WxmpHAttwHQJB6RCFtaY08XlHgxysz1iEzg7HWDXa3i5oXhDS1jo/exec';

const ALLOWED = new Set([
  'contentos.runtime.identity.v3',
  'contentos.runtime.register.v3',
  'contentos.drive.cache.selftest.v3',
  'front.json.selftest.v3',
  'contentos.intelligence.selftest.v3',
  'contentos.pipeline.recovery.v3'
]);

const parse = (t:string) => { try { return JSON.parse(t); } catch { return null; } };

export default async function handler(req:any,res:any) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-OS-Diagnostic','IMMEDIATE_RUNTIME_FORCE_20260903');
  if (req.method !== 'GET') return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  const action = String(req.query?.action || '').trim();
  if (!ALLOWED.has(action)) return res.status(400).json({ok:false,error:'ACTION_NOT_ALLOWED',action});
  try {
    const headers:Record<string,string> = {'Content-Type':'application/json'};
    const token = process.env.CONTENT_OS_BACKEND_TOKEN;
    if (token) headers['X-Content-OS-Token'] = token;
    const upstream = await fetch(APPS_SCRIPT_URL, {
      method:'POST',
      headers,
      body:JSON.stringify({action,source:'protected-vercel-preview-immediate-runtime-force-20260903'}),
      redirect:'follow'
    });
    const text = await upstream.text();
    const json = parse(text);
    return res.status(200).json({
      ok: upstream.ok && !!json && json.ok !== false,
      action,
      upstreamStatus:upstream.status,
      upstreamContentType:upstream.headers.get('content-type') || '',
      json,
      textPreview: json ? undefined : text.slice(0,1000),
      at:new Date().toISOString()
    });
  } catch (e:any) {
    return res.status(502).json({ok:false,action,error:String(e?.message || e),at:new Date().toISOString()});
  }
}
