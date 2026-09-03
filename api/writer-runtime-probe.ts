const WRITER_URL = 'https://script.google.com/macros/s/AKfycbxNPNmtCEeIjLJuUnfp-sTdEgQOzUUA_2cMkyqCzhaUJcRvYwppBgtSuPjbezWCn2zKrw/exec';
const PROBE_VERSION = 'WRITER_RUNTIME_PROBE_V1_20260903';

const text = (v:any) => String(v ?? '').trim();

async function callWriter(method:'GET'|'POST') {
  const init:any = { method, redirect:'follow', headers:{'User-Agent':'ContentOS-Writer-Runtime-Probe/1.0'} };
  if (method === 'POST') {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify({
      content_id:'CONTENT_RUNTIME_E2E_20260903_1215',
      title:'ContentOS Writer direct runtime E2E probe 2026-09-03',
      body_draft:'Runtime-only non-publish probe. Validate Writer WebApp POST acceptance and structured response. Do not publish externally.',
      rules:{regeneration:false,closing:'question',prayer:false,admonition:false},
      source:'CONTENT_OS_DIRECT_RUNTIME_E2E',
      idempotency_key:'CONTENTOS_WRITER_DIRECT_E2E_20260903_1215'
    });
  }
  const r = await fetch(WRITER_URL, init);
  const body = await r.text();
  let json:any = null;
  try { json = JSON.parse(body); } catch {}
  return {ok:r.ok,status:r.status,finalUrl:r.url,contentType:r.headers.get('content-type') || '',json,text:body.slice(0,3000)};
}

export default async function handler(req:any,res:any) {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'GET') return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  const mode = text(req.query?.mode || 'health').toLowerCase();
  try {
    const result = await callWriter(mode === 'post' ? 'POST' : 'GET');
    return res.status(result.ok ? 200 : 502).json({probeVersion:PROBE_VERSION,mode,writerUrlConfigured:true,result});
  } catch (e:any) {
    return res.status(502).json({probeVersion:PROBE_VERSION,mode,error:text(e?.message || e)});
  }
}
