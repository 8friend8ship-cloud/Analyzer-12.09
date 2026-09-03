const APPS_SCRIPT_URL = process.env.CONTENT_OS_CACHE_BACKEND_URL || 'https://script.google.com/macros/s/AKfycbzz247_Mwl9c6N1WxmpHAttwHQJB6RCFtaY08XlHgxysz1iEzg7HWDXa3i5oXhDS1jo/exec';
const FORCE_ALLOWED = new Set([
  'contentos.runtime.identity.v3',
  'contentos.runtime.register.v3',
  'contentos.drive.cache.selftest.v3',
  'front.json.selftest.v3',
  'contentos.intelligence.selftest.v3',
  'contentos.pipeline.recovery.v3'
]);
const parseJson = (text:string) => { try { return JSON.parse(text); } catch { return null; } };

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const forceAction = String(req.query?.forceAction || '').trim();
  if (forceAction) {
    res.setHeader('X-Content-OS-Diagnostic','IMMEDIATE_RUNTIME_FORCE_20260903');
    if (!FORCE_ALLOWED.has(forceAction)) return res.status(400).json({ok:false,error:'ACTION_NOT_ALLOWED',forceAction});
    try {
      const headers:Record<string,string> = {'Content-Type':'application/json'};
      const token = process.env.CONTENT_OS_BACKEND_TOKEN;
      if (token) headers['X-Content-OS-Token'] = token;
      const upstream = await fetch(APPS_SCRIPT_URL, {
        method:'POST', headers,
        body:JSON.stringify({action:forceAction,source:'protected-vercel-preview-health-force-20260903'}),
        redirect:'follow'
      });
      const text = await upstream.text();
      const json = parseJson(text);
      return res.status(200).json({
        ok: upstream.ok && !!json && json.ok !== false,
        action:forceAction,
        upstreamStatus:upstream.status,
        upstreamContentType:upstream.headers.get('content-type') || '',
        json,
        textPreview:json ? undefined : text.slice(0,1000),
        at:new Date().toISOString()
      });
    } catch (e:any) {
      return res.status(502).json({ok:false,action:forceAction,error:String(e?.message || e),at:new Date().toISOString()});
    }
  }

  const qstBackendConfigured = Boolean(
    process.env.CONTENT_OS_BACKEND_URL || process.env.CENTRAL_INTELLIGENCE_BACKEND_URL
  );

  return res.status(200).json({
    ok: true,
    service: 'content-os',
    version: '2026.8.31',
    canonicalRepo: '8friend8ship-cloud/contents-os-git',
    canonicalBranch: 'main',
    runtimeMirrorRepo: '8friend8ship-cloud/Analyzer-12.09',
    qstBackendConfigured,
    storedBackdataFallbackConfigured: true,
    backendConfigured: qstBackendConfigured,
    backendService: qstBackendConfigured ? 'QST_BACKEND' : 'COMMON_LIBRARY_COLLECTOR',
    backendMode: qstBackendConfigured ? 'live-qst-env' : 'stored-backdata-canonical',
    storageMode: 'local-first-central-mirror-enabled',
    readMode: qstBackendConfigured ? 'qst-plus-stored-fallback' : 'stored-backdata-only',
    completionGate: 'RUNTIME_OUTPUT_X2_AND_LESSON_CHECKED',
    at: new Date().toISOString(),
  });
}
