const APPS_SCRIPT_URL = process.env.CONTENT_OS_CACHE_BACKEND_URL || 'https://script.google.com/macros/s/AKfycbzz247_Mwl9c6N1WxmpHAttwHQJB6RCFtaY08XlHgxysz1iEzg7HWDXa3i5oXhDS1jo/exec';
const WRITER_URL = process.env.DRYWRITER_WEBAPP_URL || 'https://script.google.com/macros/s/AKfycbxNPNmtCEeIjLJuUnfp-sTdEgQOzUUA_2cMkyqCzhaUJcRvYwppBgtSuPjbezWCn2zKrw/exec';
const FORCE_ALLOWED = new Set([
  'contentos.runtime.identity.v3',
  'contentos.runtime.register.v3',
  'contentos.drive.cache.selftest.v3',
  'front.json.selftest.v3',
  'contentos.intelligence.selftest.v3',
  'contentos.pipeline.recovery.v3',
  'drywriter.writer.probe.a',
  'drywriter.writer.probe.b'
]);
const parseJson = (text:string) => { try { return JSON.parse(text); } catch { return null; } };

const WRITER_FIXTURES:any = {
  'drywriter.writer.probe.a': {
    content_id:'CONTENT_552644ff-2d03-47ff-b3bd-6cab021650fe',
    title:'Full AI Workflow for Interior Designers – From Brief to Pro Render (2026)',
    body_draft:'제목: Full AI Workflow for Interior Designers – From Brief to Pro Render (2026)\n\n구성: {"hook":"2026 live YouTube API verified current source; AI interior brief→render→video workflow demand signal. Reference-only evidence for factory Queens→Seed→T1/T2 recovery.","problem":"Full AI Workflow for Interior Designers – From Brief to Pro Render (2026)","evidence":"https://www.youtube.com/watch?v=Wt6IzAS71e0","solution":"practical steps","close":"question"}\n\n출처: ["https://www.youtube.com/watch?v=Wt6IzAS71e0"]',
    rules:{regeneration:false,closing:'question',prayer:false,admonition:false},
    probe_request_id:'DRY_af359c03-fd27-41c2-aefa-92ed9c55fe71',
    source:'central_immediate_writer_probe_20260903'
  },
  'drywriter.writer.probe.b': {
    content_id:'CONTENT_27948d09-6bc5-4003-9afb-50c04bf8b69f',
    title:'BEST AI TOOLS Interior Designer MUST USE in 2026',
    body_draft:'제목: BEST AI TOOLS Interior Designer MUST USE in 2026\n\n구성: {"hook":"2026 live YouTube API verified current source; interior AI tools/visualization/productivity comparison demand signal. Reference-only evidence for x2 factory recovery.","problem":"BEST AI TOOLS Interior Designer MUST USE in 2026","evidence":"https://www.youtube.com/watch?v=M-1PRSwo3A4","solution":"practical steps","close":"question"}\n\n출처: ["https://www.youtube.com/watch?v=M-1PRSwo3A4"]',
    rules:{regeneration:false,closing:'question',prayer:false,admonition:false},
    probe_request_id:'DRY_eac8bce4-de95-479f-8640-a5109cac25ab',
    source:'central_immediate_writer_probe_20260903'
  }
};

async function postJson(target:string, body:any, headers:Record<string,string> = {}) {
  const upstream = await fetch(target, {
    method:'POST',
    headers:{'Content-Type':'application/json', ...headers},
    body:JSON.stringify(body),
    redirect:'follow'
  });
  const text = await upstream.text();
  const json = parseJson(text);
  return {
    ok: upstream.ok && (!!json ? json.ok !== false : true),
    upstreamStatus:upstream.status,
    upstreamContentType:upstream.headers.get('content-type') || '',
    finalUrl:upstream.url,
    json,
    textPreview:json ? undefined : text.slice(0,1600)
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const forceAction = String(req.query?.forceAction || '').trim();
  if (forceAction) {
    res.setHeader('X-Content-OS-Diagnostic','IMMEDIATE_RUNTIME_FORCE_20260903');
    if (!FORCE_ALLOWED.has(forceAction)) return res.status(400).json({ok:false,error:'ACTION_NOT_ALLOWED',forceAction});
    try {
      if (WRITER_FIXTURES[forceAction]) {
        const result = await postJson(WRITER_URL, WRITER_FIXTURES[forceAction]);
        return res.status(200).json({
          ok:result.ok,
          action:forceAction,
          target:'WRITER_CONTENT_FACTORY_V001',
          requestId:WRITER_FIXTURES[forceAction].probe_request_id,
          contentId:WRITER_FIXTURES[forceAction].content_id,
          ...result,
          at:new Date().toISOString()
        });
      }
      const headers:Record<string,string> = {};
      const token = process.env.CONTENT_OS_BACKEND_TOKEN;
      if (token) headers['X-Content-OS-Token'] = token;
      const result = await postJson(APPS_SCRIPT_URL, {action:forceAction,source:'production-health-force-20260903'}, headers);
      return res.status(200).json({ok:result.ok,action:forceAction,...result,at:new Date().toISOString()});
    } catch (e:any) {
      return res.status(502).json({ok:false,action:forceAction,error:String(e?.message || e),at:new Date().toISOString()});
    }
  }

  const qstBackendConfigured = Boolean(process.env.CONTENT_OS_BACKEND_URL || process.env.CENTRAL_INTELLIGENCE_BACKEND_URL);
  return res.status(200).json({
    ok:true, service:'content-os', version:'2026.8.31', canonicalRepo:'8friend8ship-cloud/contents-os-git', canonicalBranch:'main',
    runtimeMirrorRepo:'8friend8ship-cloud/Analyzer-12.09', qstBackendConfigured, storedBackdataFallbackConfigured:true,
    backendConfigured:qstBackendConfigured, backendService:qstBackendConfigured ? 'QST_BACKEND' : 'COMMON_LIBRARY_COLLECTOR',
    backendMode:qstBackendConfigured ? 'live-qst-env' : 'stored-backdata-canonical', storageMode:'local-first-central-mirror-enabled',
    readMode:qstBackendConfigured ? 'qst-plus-stored-fallback' : 'stored-backdata-only', completionGate:'RUNTIME_OUTPUT_X2_AND_LESSON_CHECKED', at:new Date().toISOString()
  });
}
