const BACKEND_URL = process.env.CENTRAL_INTELLIGENCE_BACKEND_URL || process.env.CONTENT_OS_BACKEND_URL || '';

const BUILTIN_EVENTS = [
  {
    EVENT_ID: 'EVT_TRAVEL_KR_VALUE_MUKBANG_SEED_20260821_001',
    EVENT_AT: '2026-08-21T05:20:00.000Z',
    PRODUCER_APP_ID: 'APP_CONTENT_OS',
    DATA_STAGE: 'SEED',
    ENTITY_TYPE: 'TRAVEL_SEED',
    ENTITY_ID: 'SEED_TRAVEL_KR_VALUE_MUKBANG_20260821_001',
    KEYWORD: '가성비 한국여행 먹방 스케줄',
    LOCALE: 'ko-KR',
    SUMMARY: '한국 가성비 먹방여행을 지역·시장·노포·맛집·예산·이동동선으로 조합하는 공용 Travel Seed',
    KEYWORDS: '한국|가성비|먹방|여행|스케줄|노포|시장|맛집|동선|예산',
    TAGS: 'TRAVEL|VALUE|MUKBANG|SCHEDULE|COMMON_TREND_SEED',
    METRICS_JSON: JSON.stringify({ enrichment_required: true, source_verified: true }),
    SOURCE_URL: 'https://docs.google.com/spreadsheets/d/1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ/edit',
    CALL_URL: 'https://contents-os.com/api/intelligence?action=events&app_id=APP_TRAVEL',
    LINEAGE_IDS: 'QUEENS_KR_TRAVEL_MUKBANG|SEED_TRAVEL_KR_VALUE_MUKBANG_20260821_001',
    CONFIDENCE: 0.8,
    STATUS: 'READY_FALLBACK',
    CONSUMER_SCOPE: 'APP_TRAVEL|APP_KFOOD|APP_DRYWRITE|APP_ANALYZER',
    MEMO: 'Drive registry readback verified; live metrics enrichment remains required.'
  },
  {
    EVENT_ID: 'EVT_TRAVEL_KR_VALUE_MUKBANG_T1_20260821_001',
    EVENT_AT: '2026-08-21T05:21:00.000Z',
    PRODUCER_APP_ID: 'APP_TRAVEL',
    DATA_STAGE: 'T1',
    ENTITY_TYPE: 'TRAVEL_T1',
    ENTITY_ID: 'T1_TRAVEL_KR_VALUE_MUKBANG_20260821_001',
    KEYWORD: '가성비 한국여행 먹방 스케줄',
    LOCALE: 'ko-KR',
    SUMMARY: '지역별 장소·시장·노포·추천메뉴·가격상태·체류시간·다음 이동·총예산으로 조립하는 여행 T1 패키지',
    KEYWORDS: '한국|가성비|먹방|여행|스케줄|노포|시장|맛집|동선|예산',
    TAGS: 'TRAVEL|T1|AUTO_ROUTE|VALUE|MUKBANG',
    METRICS_JSON: JSON.stringify({ enrichment_required: true }),
    SOURCE_URL: 'https://docs.google.com/spreadsheets/d/1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ/edit',
    CALL_URL: 'https://contents-os.com/api/intelligence?action=events&app_id=APP_TRAVEL',
    LINEAGE_IDS: 'SEED_TRAVEL_KR_VALUE_MUKBANG_20260821_001|T1_TRAVEL_KR_VALUE_MUKBANG_20260821_001',
    CONFIDENCE: 0.8,
    STATUS: 'READY_FALLBACK',
    CONSUMER_SCOPE: 'APP_TRAVEL|APP_KFOOD|APP_DRYWRITE|APP_ANALYZER',
    MEMO: 'Secretless fallback. Replace with live Apps Script bus data when backend is available.'
  }
];

function cors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

function builtinGet(query: URLSearchParams) {
  const action = query.get('action') || 'health';
  if (action === 'health') {
    return {
      status: 200,
      body: {
        ok: true,
        service: 'CENTRAL_INTELLIGENCE_HUB',
        version: 'SECRETLESS_FALLBACK_V1_20260821',
        mode: BACKEND_URL ? 'UPSTREAM_PREFERRED' : 'BUILTIN_FALLBACK',
        backend_configured: Boolean(BACKEND_URL),
        builtin_events: BUILTIN_EVENTS.length,
        at: new Date().toISOString()
      }
    };
  }
  if (action === 'events') {
    const appId = String(query.get('app_id') || 'ALL_APPS');
    const limit = Math.max(1, Math.min(200, Number(query.get('limit') || 100)));
    const events = BUILTIN_EVENTS.filter((event) => {
      if (appId === 'ALL_APPS') return true;
      return String(event.CONSUMER_SCOPE || '').includes(appId) || event.PRODUCER_APP_ID === appId;
    }).slice(-limit);
    return { status: 200, body: { ok: true, mode: 'BUILTIN_FALLBACK', app_id: appId, count: events.length, events } };
  }
  return { status: 400, body: { ok: false, error: 'UNSUPPORTED_ACTION', action } };
}

async function upstreamGet(query: URLSearchParams) {
  if (!BACKEND_URL) return builtinGet(query);
  try {
    const url = `${BACKEND_URL}${BACKEND_URL.includes('?') ? '&' : '?'}${query.toString()}`;
    const r = await fetch(url, { redirect: 'follow' });
    const text = await r.text();
    try {
      const body = JSON.parse(text);
      if (r.ok && body?.ok !== false) return { status: r.status, body };
    } catch {}
    const fallback = builtinGet(query);
    return { status: fallback.status, body: { ...fallback.body, upstream_status: r.status, upstream_fallback: true } };
  } catch (error: any) {
    const fallback = builtinGet(query);
    return { status: fallback.status, body: { ...fallback.body, upstream_fallback: true, upstream_error: String(error?.message || error) } };
  }
}

async function upstreamPost(body: any) {
  if (!BACKEND_URL) {
    return { status: 202, body: { ok: true, accepted: false, mode: 'BUILTIN_FALLBACK_READ_ONLY', message: 'Live write backend not configured; read path remains available.' } };
  }
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
