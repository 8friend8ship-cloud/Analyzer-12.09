const BACKEND_URL = process.env.CONTENT_OS_BACKEND_URL || 'https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec';
const ALLOWED_METHODS = new Set(['GET', 'POST', 'OPTIONS']);

type SearchPlanItem = {
  query: string;
  stage: 'EXACT' | 'NORMALIZED' | 'CORE_TERM' | 'RELATED';
  weight: number;
};

const RELATED_BACKDATA_TERMS: Record<string, string[]> = {
  '안국': ['북촌', '인사동', '삼청동', '경복궁', '창덕궁', '광화문', '서촌'],
  '북촌': ['안국', '삼청동', '경복궁', '창덕궁', '인사동'],
  '인사동': ['안국', '종로', '익선동', '북촌', '조계사'],
  '삼청동': ['안국', '북촌', '경복궁', '국립현대미술관'],
  '경복궁': ['광화문', '서촌', '북촌', '안국', '삼청동'],
  '창덕궁': ['안국', '북촌', '종묘', '인사동'],
  '광화문': ['경복궁', '서촌', '안국', '청계천'],
  '서촌': ['경복궁', '광화문', '북촌', '안국'],
  '도쿄': ['신주쿠', '시부야', '아사쿠사', '긴자', '우에노'],
  '오사카': ['난바', '도톤보리', '우메다', '교토', '고베'],
  '서울': ['종로', '성수', '홍대', '명동', '한강'],
};

const GENERIC_INTENT_TERMS = new Set([
  '여행', '여행지', '관광', '추천', '코스', '가볼만한곳', '가볼만한', '맛집', '카페', '숙소',
]);

function platformFromUrl(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YOUTUBE';
    if (host.includes('pinterest.')) return 'PINTEREST';
    if (host.includes('instagram.')) return 'INSTAGRAM';
    if (host.includes('tiktok.')) return 'TIKTOK';
    if (host.includes('threads.')) return 'THREADS';
    return 'CONTENT_OS';
  } catch { return 'CONTENT_OS'; }
}

function normalizePost(body: any) {
  const action = String(body?.action || '');
  if (action === 'collection.upsert') {
    const item = body?.payload?.item || {};
    const url = String(item.url || item.raw?.url || '');
    if (!url) return { localOnly: true, reason: 'COLLECTION_ITEM_HAS_NO_URL' };
    return {
      action: 'enqueue',
      asset_type: 'TEXT',
      url,
      source_page_url: url,
      platform: platformFromUrl(url),
      title: String(item.title || 'Content OS saved item'),
      primary_code: 'CONTENT_OS_COLLECTION',
      keywords: [item.type, item.raw?.category, 'content-os', 'saved'].filter(Boolean).join(','),
      target_apps: 'APP_CONTENT_OS',
      use_case: 'FRONT_COLLECTION_SAVE',
      notes: JSON.stringify({ id: item.id, type: item.type, metric1: item.metric1, metric2: item.metric2, date: item.date }).slice(0, 1500),
    };
  }
  if (action === 'collection.prune' || action === 'collection.remove' || action === 'collection.clear') {
    return { localOnly: true, reason: 'COLLECTOR_IS_APPEND_ONLY', action };
  }
  if (action === 'search') return body;
  if (action === 'enqueue') return body;
  if (body?.payload?.url) {
    const url = String(body.payload.url);
    return {
      action: 'enqueue', asset_type: 'TEXT', url, source_page_url: url,
      platform: platformFromUrl(url), title: String(body.payload.title || action || 'Content OS item'),
      primary_code: 'CONTENT_OS_EVENT', keywords: 'content-os,event', target_apps: 'APP_CONTENT_OS',
      use_case: String(action || 'FRONT_EVENT'), notes: JSON.stringify(body.payload).slice(0, 1500),
    };
  }
  return { localOnly: true, reason: 'UNSUPPORTED_NON_URL_EVENT', action };
}

function uniquePush<T>(arr: T[], item: T, key: (value: T) => string) {
  const k = key(item);
  if (!k || arr.some(v => key(v) === k)) return;
  arr.push(item);
}

function compactQuery(value: string) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function stripPlaceSuffix(token: string) {
  const t = token.trim();
  if (t.length >= 3 && /[동역]$/.test(t)) return t.slice(0, -1);
  return t;
}

function buildStoredBackdataSearchPlan(rawQuery: string): SearchPlanItem[] {
  const exact = compactQuery(rawQuery);
  if (!exact) return [];

  const plan: SearchPlanItem[] = [];
  uniquePush(plan, { query: exact, stage: 'EXACT', weight: 100 }, x => x.query);

  const tokens = exact.split(' ').filter(Boolean);
  const normalizedTokens = tokens.map(stripPlaceSuffix);
  const normalized = compactQuery(normalizedTokens.join(' '));
  if (normalized && normalized !== exact) {
    uniquePush(plan, { query: normalized, stage: 'NORMALIZED', weight: 90 }, x => x.query);
  }

  const coreTerms = normalizedTokens.filter(t => t.length >= 2 && !GENERIC_INTENT_TERMS.has(t));
  coreTerms.forEach((term, idx) => {
    uniquePush(plan, { query: term, stage: 'CORE_TERM', weight: 80 - idx }, x => x.query);
  });

  const related: string[] = [];
  coreTerms.forEach(term => {
    (RELATED_BACKDATA_TERMS[term] || []).forEach(r => {
      if (!related.includes(r)) related.push(r);
    });
  });
  related.slice(0, 8).forEach((term, idx) => {
    uniquePush(plan, { query: term, stage: 'RELATED', weight: 60 - idx }, x => x.query);
  });

  return plan.slice(0, 12);
}

function resultKey(item: any) {
  return String(item?.SOURCE_ID || item?.source_id || item?.ARTICLE_URL || item?.url || item?.TITLE || item?.title || '').trim();
}

async function fetchUpstreamJson(payload: any, headers: Record<string, string>) {
  const upstream = await fetch(BACKEND_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    redirect: 'follow',
  });
  const text = await upstream.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* caller handles non-json */ }
  return { upstream, text, json };
}

async function searchStoredBackdata(payload: any, headers: Record<string, string>) {
  const originalQuery = compactQuery(payload?.query || '');
  const limit = Math.max(1, Math.min(Number(payload?.limit || 20), 50));
  const plan = buildStoredBackdataSearchPlan(originalQuery);
  const merged: any[] = [];
  const trace: any[] = [];
  let scannedRows = 0;
  let firstStatus = 200;

  for (let i = 0; i < plan.length; i++) {
    const step = plan[i];
    const { upstream, json } = await fetchUpstreamJson({
      ...payload,
      action: 'search',
      query: step.query,
      limit,
    }, headers);
    if (i === 0) firstStatus = upstream.status;
    if (!json || json.ok === false) {
      trace.push({ query: step.query, stage: step.stage, count: 0, status: upstream.status });
      continue;
    }

    const rows = Array.isArray(json.results) ? json.results : [];
    scannedRows += Number(json.scanned_rows || 0);
    trace.push({ query: step.query, stage: step.stage, count: rows.length, status: upstream.status });

    rows.forEach((row: any) => {
      const key = resultKey(row);
      if (!key || merged.some(r => resultKey(r) === key)) return;
      merged.push({
        ...row,
        _MATCH_QUERY: step.query,
        _MATCH_STAGE: step.stage,
        _MATCH_WEIGHT: step.weight,
      });
    });

    if (merged.length >= limit) break;
  }

  merged.sort((a, b) => Number(b._MATCH_WEIGHT || 0) - Number(a._MATCH_WEIGHT || 0));
  const results = merged.slice(0, limit);
  const exactCount = trace[0]?.count || 0;

  return {
    status: firstStatus,
    body: {
      ok: true,
      type: String(payload?.asset_type || 'TEXT'),
      query: originalQuery,
      count: results.length,
      scanned_rows: scannedRows,
      search_mode: exactCount > 0 ? 'EXACT_PLUS_RELATED_IF_NEEDED' : 'EXPANDED_STORED_BACKDATA',
      empty_exact_match: exactCount === 0,
      expanded_queries: trace,
      results,
    },
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!ALLOWED_METHODS.has(req.method || '')) {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    let payload: any;
    if (req.method === 'GET') {
      payload = {
        action: 'search',
        asset_type: String(req.query?.asset_type || 'TEXT'),
        query: String(req.query?.query || ''),
        limit: Number(req.query?.limit || 20),
      };
    } else {
      payload = normalizePost(req.body || {});
    }

    if (payload?.localOnly) {
      return res.status(200).json({ ok: true, mirrored: false, ...payload });
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = process.env.CONTENT_OS_BACKEND_TOKEN;
    if (token) headers['X-Content-OS-Token'] = token;

    if (String(payload?.action || '') === 'search') {
      const searched = await searchStoredBackdata(payload, headers);
      return res.status(searched.status).json(searched.body);
    }

    const { upstream, text } = await fetchUpstreamJson(payload, headers);
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
