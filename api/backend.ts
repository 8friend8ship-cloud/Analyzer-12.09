const BACKEND_URL = process.env.CONTENT_OS_BACKEND_URL || 'https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec';
const ALLOWED_METHODS = new Set(['GET', 'POST', 'OPTIONS']);

type SearchPlanItem = {
  query: string;
  stage: 'EXACT' | 'NORMALIZED' | 'CORE_TERM' | 'RELATED';
  weight: number;
};

type QueensRow = Record<string, any>;

type SeedItem = {
  seed_id: string;
  keyword: string;
  intent: string;
  category: string;
  source_platform: string;
  source_url: string;
  source_id: string;
  title: string;
  summary: string;
  published_at: string;
  metrics: { views: number; likes: number; comments: number; subscribers: number };
  score: number;
  tags: string[];
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
  '신라면': ['농심', '라면', '매운라면', '신라면 레시피', '신라면 먹방', '신라면 해외반응'],
};

const GENERIC_INTENT_TERMS = new Set([
  '여행', '여행지', '관광', '추천', '코스', '가볼만한곳', '가볼만한', '맛집', '카페', '숙소',
]);

const INTENT_RULES: Array<[string, RegExp]> = [
  ['RECIPE', /(레시피|recipe|조리|끓이|요리)/i],
  ['REACTION', /(반응|reaction|리액션|해외)/i],
  ['REVIEW', /(리뷰|review|후기|평가)/i],
  ['COMPARE', /(비교|vs\.?|대결|랭킹|순위)/i],
  ['SHORTS', /(shorts|쇼츠|릴스|reels|틱톡|tiktok)/i],
  ['MUKBANG', /(먹방|mukbang|먹어|시식)/i],
  ['PRICE', /(가격|price|할인|구매|마트|편의점)/i],
  ['HOWTO', /(방법|how to|팁|tip|꿀팁)/i],
];

function stableId(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(36);
}

function asNumber(value: any) {
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function asText(...values: any[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

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
      action: 'enqueue', asset_type: 'TEXT', url, source_page_url: url,
      platform: platformFromUrl(url), title: String(item.title || 'Content OS saved item'),
      primary_code: 'CONTENT_OS_COLLECTION',
      keywords: [item.type, item.raw?.category, 'content-os', 'saved'].filter(Boolean).join(','),
      target_apps: 'APP_CONTENT_OS', use_case: 'FRONT_COLLECTION_SAVE',
      notes: JSON.stringify({ id: item.id, type: item.type, metric1: item.metric1, metric2: item.metric2, date: item.date }).slice(0, 1500),
    };
  }
  if (action === 'collection.prune' || action === 'collection.remove' || action === 'collection.clear') {
    return { localOnly: true, reason: 'COLLECTOR_IS_APPEND_ONLY', action };
  }
  if (action === 'search' || action === 'selftest') return body;
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
  if (normalized && normalized !== exact) uniquePush(plan, { query: normalized, stage: 'NORMALIZED', weight: 90 }, x => x.query);
  const coreTerms = normalizedTokens.filter(t => t.length >= 2 && !GENERIC_INTENT_TERMS.has(t));
  coreTerms.forEach((term, idx) => uniquePush(plan, { query: term, stage: 'CORE_TERM', weight: 80 - idx }, x => x.query));
  const related: string[] = [];
  coreTerms.forEach(term => (RELATED_BACKDATA_TERMS[term] || []).forEach(r => { if (!related.includes(r)) related.push(r); }));
  related.slice(0, 8).forEach((term, idx) => uniquePush(plan, { query: term, stage: 'RELATED', weight: 60 - idx }, x => x.query));
  return plan.slice(0, 12);
}

function resultKey(item: any) {
  return asText(item?.SOURCE_ID, item?.source_id, item?.ARTICLE_URL, item?.url, item?.source_url, item?.TITLE, item?.title);
}

function classifyIntent(text: string) {
  for (const [intent, rule] of INTENT_RULES) if (rule.test(text)) return intent;
  return 'DISCOVERY';
}

function classifyCategory(query: string, text: string) {
  if (/(라면|ramen|noodle|식품|먹방|레시피)/i.test(`${query} ${text}`)) return 'FOOD';
  if (/(여행|관광|호텔|맛집|카페|서울|도쿄|오사카)/i.test(`${query} ${text}`)) return 'TRAVEL';
  if (/(인테리어|리모델링|욕실|주방|타일|누수)/i.test(`${query} ${text}`)) return 'INTERIOR';
  return 'CONTENT';
}

function rowToSeed(row: QueensRow, keyword: string, index: number): SeedItem {
  const sourceUrl = asText(row.url, row.source_url, row.SOURCE_URL, row.ARTICLE_URL, row.source_page_url);
  const title = asText(row.title, row.TITLE, row.summary, row.SUMMARY, `Queens ${index + 1}`);
  const summary = asText(row.summary, row.SUMMARY, row.description, row.DESCRIPTION, title).slice(0, 500);
  const sourceId = asText(row.SOURCE_ID, row.source_id, row.video_id, row.VIDEO_ID, sourceUrl, title);
  const platform = asText(row.platform, row.PLATFORM, platformFromUrl(sourceUrl));
  const publishedAt = asText(row.published_at, row.PUBLISHED_AT, row.created_at, row.CREATED_AT);
  const views = asNumber(row.view_count ?? row.VIEW_COUNT);
  const likes = asNumber(row.like_count ?? row.LIKE_COUNT);
  const comments = asNumber(row.comment_count ?? row.COMMENT_COUNT);
  const subscribers = asNumber(row.subscriber_count ?? row.SUBSCRIBER_COUNT);
  const text = `${title} ${summary} ${asText(row.keywords, row.KEYWORDS)}`;
  const intent = classifyIntent(text);
  const category = classifyCategory(keyword, text);
  const tags = Array.from(new Set([keyword, intent.toLowerCase(), category.toLowerCase(), platform.toLowerCase(), ...asText(row.keywords, row.KEYWORDS).split(',').map(x => x.trim()).filter(Boolean)])).slice(0, 16);
  const matchWeight = asNumber(row._MATCH_WEIGHT || 50);
  const engagement = Math.min(25, Math.log10(1 + views + likes * 10 + comments * 20) * 5);
  const recency = publishedAt ? 5 : 0;
  const score = Math.round(Math.min(100, matchWeight * 0.7 + engagement + recency));
  return {
    seed_id: `seed_${stableId(`${keyword}|${sourceId}`)}`,
    keyword, intent, category, source_platform: platform, source_url: sourceUrl, source_id: sourceId,
    title, summary, published_at: publishedAt,
    metrics: { views, likes, comments, subscribers }, score, tags,
  };
}

function buildSeedLayer(query: string, rows: QueensRow[]) {
  const seeds = rows.map((row, index) => rowToSeed(row, query, index));
  seeds.sort((a, b) => b.score - a.score);
  const intentCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  seeds.forEach(seed => {
    intentCounts[seed.intent] = (intentCounts[seed.intent] || 0) + 1;
    categoryCounts[seed.category] = (categoryCounts[seed.category] || 0) + 1;
  });
  return {
    layer: 'SEED', version: 'CONTENT_OS_SEED_V1', keyword: query, count: seeds.length,
    intent_counts: intentCounts, category_counts: categoryCounts, items: seeds,
  };
}

function buildT1(query: string, seedLayer: ReturnType<typeof buildSeedLayer>) {
  const top = seedLayer.items.slice(0, 12);
  return {
    layer: 'T1', version: 'CONTENT_OS_T1_V1', keyword: query,
    intent: Object.entries(seedLayer.intent_counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'DISCOVERY',
    category: Object.entries(seedLayer.category_counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'CONTENT',
    seed_ids: top.map(x => x.seed_id),
    top_sources: top.map(x => ({ seed_id: x.seed_id, title: x.title, url: x.source_url, platform: x.source_platform, score: x.score })),
    evidence_urls: top.map(x => x.source_url).filter(Boolean),
    updated_at: new Date().toISOString(),
  };
}

function buildT2(query: string, seedLayer: ReturnType<typeof buildSeedLayer>, t1: ReturnType<typeof buildT1>) {
  const intents = Array.from(new Set(seedLayer.items.map(x => x.intent)));
  const expansions = Array.from(new Set([
    query,
    ...intents.map(intent => `${query} ${intent.toLowerCase()}`),
    ...(RELATED_BACKDATA_TERMS[query] || []),
  ])).slice(0, 16);
  return {
    layer: 'T2', version: 'CONTENT_OS_T2_V1', keyword: query,
    parent_template: t1.version,
    content_angles: expansions,
    packs: {
      blog: expansions.filter(x => !/shorts/i.test(x)).slice(0, 8),
      shorts: expansions.map(x => `${x} 쇼츠`).slice(0, 8),
      research: seedLayer.items.slice(0, 20).map(x => ({ seed_id: x.seed_id, intent: x.intent, title: x.title, url: x.source_url })),
    },
    ai_required: false,
    external_youtube_api_required: false,
    gemini_required: false,
    updated_at: new Date().toISOString(),
  };
}

function buildPipeline(query: string, rows: QueensRow[]) {
  const seed = buildSeedLayer(query, rows);
  const t1 = buildT1(query, seed);
  const t2 = buildT2(query, seed, t1);
  return { queens: { layer: 'QUEENS', count: rows.length, results: rows }, seed, t1, t2 };
}

function selfTestRows(): QueensRow[] {
  return [
    { SOURCE_ID: 'fixture-shin-1', platform: 'YOUTUBE', title: '신라면 맛있게 끓이는 레시피', summary: '계란과 파를 활용한 조리 팁', url: 'https://www.youtube.com/watch?v=fixture-shin-1', view_count: 120000, like_count: 4300, comment_count: 310, keywords: '신라면,레시피,라면' },
    { SOURCE_ID: 'fixture-shin-2', platform: 'YOUTUBE', title: '외국인이 먹어본 신라면 해외반응', summary: '매운맛에 대한 해외 시식 반응', url: 'https://www.youtube.com/watch?v=fixture-shin-2', view_count: 340000, like_count: 9200, comment_count: 880, keywords: '신라면,해외반응,먹방' },
    { SOURCE_ID: 'fixture-shin-3', platform: 'YOUTUBE', title: '신라면과 매운라면 비교 리뷰', summary: '대표 매운 라면 제품 비교', url: 'https://www.youtube.com/watch?v=fixture-shin-3', view_count: 78000, like_count: 2100, comment_count: 190, keywords: '신라면,비교,리뷰' },
  ];
}

async function fetchUpstreamJson(payload: any, headers: Record<string, string>) {
  const upstream = await fetch(BACKEND_URL, { method: 'POST', headers, body: JSON.stringify(payload), redirect: 'follow' });
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
    const { upstream, json } = await fetchUpstreamJson({ ...payload, action: 'search', query: step.query, limit }, headers);
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
      merged.push({ ...row, _MATCH_QUERY: step.query, _MATCH_STAGE: step.stage, _MATCH_WEIGHT: step.weight });
    });
    if (merged.length >= limit) break;
  }
  merged.sort((a, b) => Number(b._MATCH_WEIGHT || 0) - Number(a._MATCH_WEIGHT || 0));
  const results = merged.slice(0, limit);
  const exactCount = trace[0]?.count || 0;
  const pipeline = buildPipeline(originalQuery, results);
  return {
    status: firstStatus,
    body: {
      ok: true, type: String(payload?.asset_type || 'TEXT'), query: originalQuery,
      count: results.length, scanned_rows: scannedRows,
      search_mode: exactCount > 0 ? 'EXACT_PLUS_RELATED_IF_NEEDED' : 'EXPANDED_STORED_BACKDATA',
      empty_exact_match: exactCount === 0, expanded_queries: trace, results,
      pipeline,
      api_free: { youtube_api_key: false, gemini_api_key: false, external_ai_required: false },
    },
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-OS-Data-Mode', 'QUEENS_SEED_T1_T2_API_FREE');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!ALLOWED_METHODS.has(req.method || '')) {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }
  try {
    let payload: any;
    if (req.method === 'GET') {
      payload = {
        action: String(req.query?.action || 'search'), asset_type: String(req.query?.asset_type || 'TEXT'),
        query: String(req.query?.query || ''), limit: Number(req.query?.limit || 20),
      };
    } else payload = normalizePost(req.body || {});

    if (String(payload?.action || '') === 'selftest') {
      const query = compactQuery(payload?.query || '신라면') || '신라면';
      const results = selfTestRows();
      return res.status(200).json({
        ok: true, mode: 'SELFTEST_FIXTURE_NO_EXTERNAL_API', query, results,
        pipeline: buildPipeline(query, results),
        api_free: { youtube_api_key: false, gemini_api_key: false, external_ai_required: false },
      });
    }

    if (payload?.localOnly) return res.status(200).json({ ok: true, mirrored: false, ...payload });
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
