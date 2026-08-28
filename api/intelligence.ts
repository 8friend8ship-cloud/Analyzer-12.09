const CONFIGURED_BACKEND_URL = process.env.CENTRAL_INTELLIGENCE_BACKEND_URL || process.env.CONTENT_OS_BACKEND_URL || '';
const CONTENTOS_RUNTIME_URL = process.env.CONTENTOS_RUNTIME_V3_URL || 'https://script.google.com/macros/s/AKfycbzz247_Mwl9c6N1WxmpHAttwHQJB6RCFtaY08XlHgxysz1iEzg7HWDXa3i5oXhDS1jo/exec';
const COLLECTOR_URL = 'https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec';

const BUILTIN_EVENTS = [
  {
    EVENT_ID: 'EVT_TRAVEL_KR_VALUE_MUKBANG_SEED_20260821_001', EVENT_AT: '2026-08-21T05:20:00.000Z', PRODUCER_APP_ID: 'APP_CONTENT_OS', DATA_STAGE: 'SEED', ENTITY_TYPE: 'TRAVEL_SEED', ENTITY_ID: 'SEED_TRAVEL_KR_VALUE_MUKBANG_20260821_001', KEYWORD: '가성비 한국여행 먹방 스케줄', LOCALE: 'ko-KR', SUMMARY: '한국 가성비 먹방여행을 지역·시장·노포·맛집·예산·이동동선으로 조합하는 공용 Travel Seed', KEYWORDS: '한국|가성비|먹방|여행|스케줄|노포|시장|맛집|동선|예산', TAGS: 'TRAVEL|VALUE|MUKBANG|SCHEDULE|COMMON_TREND_SEED', METRICS_JSON: JSON.stringify({ enrichment_required: true, source_verified: true }), SOURCE_URL: 'https://docs.google.com/spreadsheets/d/1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ/edit', CALL_URL: 'https://contents-os.com/api/intelligence?action=events&app_id=APP_TRAVEL', LINEAGE_IDS: 'QUEENS_KR_TRAVEL_MUKBANG|SEED_TRAVEL_KR_VALUE_MUKBANG_20260821_001', CONFIDENCE: 0.8, STATUS: 'READY_FALLBACK', CONSUMER_SCOPE: 'APP_TRAVEL|APP_KFOOD|APP_DRYWRITE|APP_ANALYZER', MEMO: 'Emergency fixture only. Live Central Bus and stored backdata are attempted first.'
  },
  {
    EVENT_ID: 'EVT_TRAVEL_KR_VALUE_MUKBANG_T1_20260821_001', EVENT_AT: '2026-08-21T05:21:00.000Z', PRODUCER_APP_ID: 'APP_TRAVEL', DATA_STAGE: 'T1', ENTITY_TYPE: 'TRAVEL_T1', ENTITY_ID: 'T1_TRAVEL_KR_VALUE_MUKBANG_20260821_001', KEYWORD: '가성비 한국여행 먹방 스케줄', LOCALE: 'ko-KR', SUMMARY: '지역별 장소·시장·노포·추천메뉴·가격상태·체류시간·다음 이동·총예산으로 조립하는 여행 T1 패키지', KEYWORDS: '한국|가성비|먹방|여행|스케줄|노포|시장|맛집|동선|예산', TAGS: 'TRAVEL|T1|AUTO_ROUTE|VALUE|MUKBANG', METRICS_JSON: JSON.stringify({ enrichment_required: true }), SOURCE_URL: 'https://docs.google.com/spreadsheets/d/1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ/edit', CALL_URL: 'https://contents-os.com/api/intelligence?action=events&app_id=APP_TRAVEL', LINEAGE_IDS: 'SEED_TRAVEL_KR_VALUE_MUKBANG_20260821_001|T1_TRAVEL_KR_VALUE_MUKBANG_20260821_001', CONFIDENCE: 0.8, STATUS: 'READY_FALLBACK', CONSUMER_SCOPE: 'APP_TRAVEL|APP_KFOOD|APP_DRYWRITE|APP_ANALYZER', MEMO: 'Emergency fixture only. Live Central Bus and stored backdata are attempted first.'
  }
];

function cors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

function list(v:any){ if(Array.isArray(v)) return v.join('|'); return String(v || ''); }
function safeUrl(body:any){
  const candidates=[body?.source_url,body?.SOURCE_URL,body?.call_url,body?.CALL_URL];
  for(const u of candidates){ if(/^https?:\/\//i.test(String(u||''))) return String(u); }
  const id=encodeURIComponent(String(body?.event_id||body?.EVENT_ID||body?.entity_id||body?.ENTITY_ID||Date.now()));
  return `https://contents-os.com/api/intelligence?action=events&event_id=${id}`;
}

function builtinGet(query: URLSearchParams, extra:any = {}) {
  const action = query.get('action') || 'health';
  if (action === 'health') return { status: 200, body: { ok:true, service:'CENTRAL_INTELLIGENCE_HUB', version:'WRITEBUS_V4_LIVE_BUS_FIRST_20260828', canonical_repo:'8friend8ship-cloud/contents-os-git', mode:'LIVE_BUS_THEN_STORED_BACKDATA_THEN_BUILTIN', backend_configured:Boolean(CONFIGURED_BACKEND_URL), runtime_bridge_configured:Boolean(CONTENTOS_RUNTIME_URL), collector_read:true, collector_write:true, builtin_events:BUILTIN_EVENTS.length, at:new Date().toISOString(), ...extra } };
  if (action === 'events') {
    const appId = String(query.get('app_id') || 'ALL_APPS');
    const limit = Math.max(1, Math.min(200, Number(query.get('limit') || 100)));
    const eventId = String(query.get('event_id') || '');
    const events = BUILTIN_EVENTS.filter((event) => (!eventId || event.EVENT_ID === eventId) && (appId === 'ALL_APPS' || String(event.CONSUMER_SCOPE || '').includes(appId) || event.PRODUCER_APP_ID === appId)).slice(-limit);
    return { status:200, body:{ ok:true, mode:'BUILTIN_FALLBACK', app_id:appId, count:events.length, events, ...extra } };
  }
  return { status:400, body:{ ok:false, error:'UNSUPPORTED_ACTION', action, ...extra } };
}

function rowToEvent(row:any, appId:string, index:number){
  const sourceId=String(row?.SOURCE_ID || row?.source_id || `ROW_${index}`);
  const status=String(row?.QUEENS_SEED_STATUS || row?.STATUS || row?.VERIFIED_STATUS || 'STORED');
  return {
    EVENT_ID:`EVT_STORED_${sourceId}`,
    EVENT_AT:String(row?.LAST_CHECKED_AT || row?.LAST_SYNC || row?.FIRST_SEEN_AT || new Date().toISOString()),
    PRODUCER_APP_ID:'APP_CONTENT_OS',
    DATA_STAGE: status.includes('T1') ? 'T1' : status.includes('SEED') ? 'SEED' : 'QUEENS',
    ENTITY_TYPE:String(row?.PRIMARY_CODE || 'STORED_BACKDATA'),
    ENTITY_ID:sourceId,
    KEYWORD:String(row?.TITLE || row?.KEYWORDS || appId),
    LOCALE:String(row?.LANGUAGE || 'ko-KR'),
    SUMMARY:String(row?.SUMMARY || row?.TITLE || ''),
    KEYWORDS:String(row?.KEYWORDS || ''),
    TAGS:[row?.PRIMARY_CODE,row?.SUB_KEY,row?.QUEENS_SEED_STATUS,'STORED_BACKDATA'].filter(Boolean).join('|'),
    METRICS_JSON:JSON.stringify({ verified_status:row?.VERIFIED_STATUS || '', link_alive:row?.LINK_ALIVE || '', enrichment_required:true }),
    SOURCE_URL:String(row?.ARTICLE_URL || ''),
    CALL_URL:`https://contents-os.com/api/intelligence?action=events&app_id=${encodeURIComponent(appId)}`,
    LINEAGE_IDS:String(row?.SEARCH_BARCODE || sourceId),
    CONFIDENCE: row?.VERIFIED_STATUS === 'FRESH' ? 0.85 : 0.65,
    STATUS:String(row?.QUEENS_SEED_STATUS || row?.VERIFIED_STATUS || 'STORED'),
    CONSUMER_SCOPE:String(row?.TARGET_APPS || appId),
    MEMO:`SOURCE_MODE=STORED_BACKDATA; USE_CASE=${String(row?.USE_CASE || '')}`,
  };
}

function copyQuery(query: URLSearchParams) {
  const out = new URLSearchParams();
  query.forEach((value,key) => out.set(key,value));
  return out;
}

async function fetchJson(url:string) {
  const r = await fetch(url, { redirect:'follow' });
  const text = await r.text();
  let body:any = null;
  try { body = JSON.parse(text); } catch {}
  return { r, body, text };
}

async function configuredBackendGet(query: URLSearchParams) {
  if (!CONFIGURED_BACKEND_URL) return null;
  const url = `${CONFIGURED_BACKEND_URL}${CONFIGURED_BACKEND_URL.includes('?') ? '&' : '?'}${query.toString()}`;
  const {r,body} = await fetchJson(url);
  if (r.ok && body && body.ok !== false) return {status:r.status,body:{...body,mode:body.mode || 'LIVE',proxy_source:'CONFIGURED_BACKEND'}};
  throw new Error(`CONFIGURED_BACKEND_${r.status}`);
}

async function runtimeBridgeGet(query: URLSearchParams) {
  const externalAction = query.get('action') || 'health';
  if (!['health','events'].includes(externalAction)) return null;
  const p = copyQuery(query);
  p.set('action', externalAction === 'events' ? 'contentos.intelligence.events.v3' : 'contentos.intelligence.health.v3');
  const url = `${CONTENTOS_RUNTIME_URL}${CONTENTOS_RUNTIME_URL.includes('?') ? '&' : '?'}${p.toString()}`;
  const {r,body} = await fetchJson(url);
  if (r.ok && body && body.ok !== false) return {status:r.status,body:{...body,mode:body.mode || 'LIVE_CENTRAL_BUS',proxy_source:'WEBAPP_TEMPLATE_05_LIVE_CENTRAL_BUS'}};
  throw new Error(`CONTENTOS_RUNTIME_BRIDGE_${r.status}`);
}

async function collectorGetEvents(query:URLSearchParams){
  const appId=String(query.get('app_id') || 'ALL_APPS');
  if(appId === 'ALL_APPS') return null;
  const limit=Math.max(1,Math.min(200,Number(query.get('limit') || 100)));
  const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json'};
  const token=process.env.CONTENT_OS_BACKEND_TOKEN;
  if(token) headers['X-Content-OS-Token']=token;
  const r=await fetch(COLLECTOR_URL,{method:'POST',headers,body:JSON.stringify({action:'search',asset_type:'TEXT',query:appId,limit}),redirect:'follow'});
  const text=await r.text();
  let body:any=null; try{body=JSON.parse(text)}catch{}
  if(!r.ok || !body || body.ok===false) return null;
  const rows=Array.isArray(body.results)?body.results:[];
  const events=rows.map((row:any,index:number)=>rowToEvent(row,appId,index)).slice(-limit);
  if(!events.length) return null;
  return {status:200,body:{ok:true,mode:'STORED_BACKDATA',app_id:appId,count:events.length,events,scanned_rows:Number(body.scanned_rows||0)}};
}

async function upstreamGet(query: URLSearchParams) {
  const errors:string[] = [];
  if (CONFIGURED_BACKEND_URL) {
    try {
      const configured = await configuredBackendGet(query);
      if (configured) return configured;
    } catch (error:any) { errors.push(String(error?.message || error)); }
  }

  try {
    const live = await runtimeBridgeGet(query);
    if (live) return live;
  } catch (error:any) { errors.push(String(error?.message || error)); }

  if ((query.get('action') || 'health') === 'events') {
    try {
      const stored=await collectorGetEvents(query);
      if(stored) return {...stored,body:{...stored.body,live_bus_fallback:true,upstream_errors:errors.slice(0,3)}};
    } catch (error:any) { errors.push(String(error?.message || error)); }
  }

  return builtinGet(query,{upstream_fallback:true,upstream_errors:errors.slice(0,3)});
}

async function collectorPost(body:any){
  const payload:any={
    action:'enqueue', asset_type:'TEXT', url:safeUrl(body), source_page_url:safeUrl(body), platform:'CENTRAL_INTELLIGENCE',
    title:String(body?.title || body?.TITLE || `${body?.data_stage||body?.DATA_STAGE||'EVENT'} · ${body?.keyword||body?.KEYWORD||body?.entity_id||body?.ENTITY_ID||'Central Intelligence'}`),
    primary_code:String(body?.data_stage || body?.DATA_STAGE || 'GEN'), sub_key:String(body?.entity_type || body?.ENTITY_TYPE || ''), node_tag:String(body?.producer_app_id || body?.PRODUCER_APP_ID || ''),
    keywords:[list(body?.keywords||body?.KEYWORDS),list(body?.tags||body?.TAGS)].filter(Boolean).join('|'),
    target_apps:list(body?.consumer_scope||body?.CONSUMER_SCOPE||body?.target_apps||body?.TARGET_APPS),
    use_case:`CENTRAL_INTELLIGENCE_${String(body?.data_stage||body?.DATA_STAGE||'EVENT')}`,
    country:String(body?.country||body?.COUNTRY||''), language:String(body?.locale||body?.LOCALE||''), official_source:'N', rights_usage:'REFERENCE_ONLY',
    notes:JSON.stringify({ event_id:body?.event_id||body?.EVENT_ID||'', entity_id:body?.entity_id||body?.ENTITY_ID||'', summary:body?.summary||body?.SUMMARY||'', memo:body?.memo||body?.MEMO||'', metrics:body?.metrics||body?.METRICS_JSON||'', lineage:body?.lineage_ids||body?.LINEAGE_IDS||'', confidence:body?.confidence||body?.CONFIDENCE||'', status:body?.status||body?.STATUS||'' }).slice(0,4000)
  };
  const r=await fetch(COLLECTOR_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),redirect:'follow'});
  const text=await r.text();
  let parsed:any; try{parsed=JSON.parse(text)}catch{parsed={ok:false,error:'NON_JSON_COLLECTOR',preview:text.slice(0,500)}}
  if(r.ok && parsed?.ok) return { status:202, body:{ ok:true, accepted:true, mode:'COMMON_LIBRARY_COLLECTOR_WRITE', collector_status:parsed.status||'NEW', asset_type:'TEXT', url:payload.url, event_id:body?.event_id||body?.EVENT_ID||null, entity_id:body?.entity_id||body?.ENTITY_ID||null, target_apps:payload.target_apps, at:new Date().toISOString() } };
  return { status:r.status||502, body:{ ok:false, accepted:false, mode:'COMMON_LIBRARY_COLLECTOR_WRITE', collector_response:parsed } };
}

async function upstreamPost(body:any) {
  if (!CONFIGURED_BACKEND_URL) return collectorPost(body);
  try {
    const r=await fetch(CONFIGURED_BACKEND_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'follow'});
    const text=await r.text();
    try { const parsed=JSON.parse(text); if(r.ok && parsed?.ok!==false) return {status:r.status,body:parsed}; } catch {}
  } catch {}
  return collectorPost(body);
}

export default async function handler(req:any,res:any){
  cors(res); if(req.method==='OPTIONS') return res.status(204).end();
  try{
    if(req.method==='GET'){
      const params=new URLSearchParams(); const q=req.query||{};
      params.set('action',String(q.action||'health'));
      if(q.app_id)params.set('app_id',String(q.app_id));
      if(q.since)params.set('since',String(q.since));
      if(q.limit)params.set('limit',String(q.limit));
      if(q.event_id)params.set('event_id',String(q.event_id));
      const out=await upstreamGet(params); return res.status(out.status).json(out.body);
    }
    if(req.method==='POST'){ const out=await upstreamPost(req.body||{}); return res.status(out.status).json(out.body); }
    return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  }catch(error:any){ return res.status(500).json({ok:false,error:'INTELLIGENCE_PROXY_FAILED',message:String(error?.message||error)}); }
}
