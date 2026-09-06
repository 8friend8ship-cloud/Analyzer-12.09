const BACKEND_URL = process.env.CONTENT_OS_BACKEND_URL || 'https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec';

type Locale = 'ko' | 'en' | 'ja' | 'zh' | 'es' | 'other';
type Row = Record<string, any>;

type CanonicalMap = {
  canonical: string;
  aliases: string[];
  category: string;
};

const MAP: Record<string, CanonicalMap> = {
  '일본 여행': { canonical: '일본 여행', aliases: ['japan travel','travel japan','日本旅行','日本 旅行','日本旅游','日本旅行攻略','viaje japón','viaje japon'], category: 'TRAVEL' },
  '서울 여행': { canonical: '서울 여행', aliases: ['seoul travel','travel seoul','ソウル旅行','首尔旅游','viaje seúl','viaje seul'], category: 'TRAVEL' },
  '신라면': { canonical: '신라면', aliases: ['shin ramyun','shin ramen','辛ラーメン','辛拉面','ramen shin'], category: 'FOOD' },
  '라면': { canonical: '라면', aliases: ['ramen','ラーメン','拉面','ramyun','noodles'], category: 'FOOD' },
  '인테리어': { canonical: '인테리어', aliases: ['interior design','home interior','インテリア','室内设计','diseño interior','diseno interior'], category: 'INTERIOR' },
  '리모델링': { canonical: '리모델링', aliases: ['remodeling','renovation','リフォーム','リノベーション','装修','翻新','remodelación','remodelacion'], category: 'INTERIOR' },
};

const INTENTS: Array<[string, RegExp]> = [
  ['RECIPE', /(레시피|recipe|cooking|how to cook|作り方|レシピ|做法|食谱|receta)/i],
  ['REACTION', /(반응|reaction|海外の反応|リアクション|反应|reacción|reaccion)/i],
  ['REVIEW', /(리뷰|review|후기|レビュー|評判|测评|评价|reseña|resena)/i],
  ['COMPARE', /(비교|compare|comparison|vs\.?|比較|对比|比较|comparación|comparacion)/i],
  ['PRICE', /(가격|price|cost|価格|値段|价格|precio)/i],
  ['MUKBANG', /(먹방|mukbang|eating|モッパン| 먹는|吃播)/i],
  ['HOWTO', /(방법|how to|guide|tips|やり方|方法|攻略|guía|guia|consejos)/i],
];

function normalize(v: string) { return String(v || '').trim().toLowerCase().replace(/\s+/g, ' '); }

function detectLocale(text: string): Locale {
  if (/[가-힣]/.test(text)) return 'ko';
  if (/[ぁ-んァ-ン]/.test(text)) return 'ja';
  if (/[一-鿿]/.test(text)) return 'zh';
  if (/[áéíóúñ¿¡]/i.test(text)) return 'es';
  if (/[a-z]/i.test(text)) return 'en';
  return 'other';
}

function requestedLocale(value: any, query: string): Locale {
  const requested = normalize(String(value || ''));
  if (requested === 'ko' || requested === 'en' || requested === 'ja' || requested === 'zh' || requested === 'es') return requested;
  return detectLocale(query);
}

function canonicalize(query: string) {
  const n = normalize(query);
  for (const entry of Object.values(MAP)) {
    if (normalize(entry.canonical) === n || entry.aliases.some(x => normalize(x) === n)) return entry;
  }
  for (const entry of Object.values(MAP)) {
    if (n.includes(normalize(entry.canonical)) || entry.aliases.some(x => n.includes(normalize(x)))) return entry;
  }
  return { canonical: query.trim(), aliases: [], category: 'CONTENT' };
}

function rowKey(r: Row) { return String(r.SOURCE_ID || r.source_id || r.ARTICLE_URL || r.url || r.TITLE || r.title || '').trim(); }

async function collectorSearch(query: string, limit: number) {
  const headers: Record<string,string> = { 'Content-Type':'application/json' };
  const token = process.env.CONTENT_OS_BACKEND_TOKEN;
  if (token) headers['X-Content-OS-Token'] = token;
  const response = await fetch(BACKEND_URL, { method:'POST', headers, body:JSON.stringify({ action:'search', asset_type:'TEXT', query, limit }), redirect:'follow' });
  const text = await response.text();
  let json:any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: response.status, rows: Array.isArray(json?.results) ? json.results : [], scanned:Number(json?.scanned_rows || 0) };
}

function intentOf(r: Row) {
  const text = `${r.TITLE || r.title || ''} ${r.SUMMARY || r.summary || ''} ${r.KEYWORDS || r.keywords || ''}`;
  for (const [name, rx] of INTENTS) if (rx.test(text)) return name;
  return 'DISCOVERY';
}

function buildPipeline(originalQuery: string, locale: Locale, canonical: CanonicalMap, rows: Row[]) {
  const seeds = rows.map((r,i) => ({
    seed_id: `seed_locale_${i+1}_${Buffer.from(rowKey(r)).toString('base64url').slice(0,10)}`,
    keyword: originalQuery,
    canonical_keyword: canonical.canonical,
    locale,
    category: canonical.category,
    intent: intentOf(r),
    source_platform: String(r.PLATFORM || r.platform || 'CONTENT_OS'),
    source_url: String(r.ARTICLE_URL || r.url || r.SOURCE_URL || ''),
    source_id: String(r.SOURCE_ID || r.source_id || ''),
    title: String(r.TITLE || r.title || ''),
    summary: String(r.SUMMARY || r.summary || '').slice(0,500),
    tags: [originalQuery, canonical.canonical, locale, canonical.category.toLowerCase()],
  }));
  const intents: Record<string,number> = {};
  seeds.forEach(s => intents[s.intent] = (intents[s.intent] || 0) + 1);
  const seed = { layer:'SEED', version:'CONTENT_OS_SEED_LOCALE_V1', keyword:originalQuery, canonical_keyword:canonical.canonical, locale, count:seeds.length, intent_counts:intents, items:seeds };
  const t1 = {
    layer:'T1', version:'CONTENT_OS_T1_LOCALE_V1', keyword:originalQuery, canonical_keyword:canonical.canonical, locale,
    category:canonical.category, seed_ids:seeds.slice(0,12).map(s=>s.seed_id),
    top_sources:seeds.slice(0,12).map(s=>({ seed_id:s.seed_id, title:s.title, url:s.source_url, platform:s.source_platform })),
    evidence_urls:seeds.map(s=>s.source_url).filter(Boolean).slice(0,12),
  };
  const t2 = {
    layer:'T2', version:'CONTENT_OS_T2_LOCALE_V1', keyword:originalQuery, canonical_keyword:canonical.canonical, locale,
    content_angles:Array.from(new Set([originalQuery, canonical.canonical, ...Object.keys(intents).map(x=>`${originalQuery} ${x.toLowerCase()}`)])).slice(0,12),
    packs:{ research:seeds.slice(0,20), front:{ locale, category:canonical.category, source_count:seeds.length } },
    ai_required:false, youtube_api_key_required:false, gemini_required:false,
  };
  return { queens:{ layer:'QUEENS', count:rows.length, results:rows }, seed, t1, t2 };
}

export default async function handler(req:any,res:any) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('X-Content-OS-Data-Mode','MULTILINGUAL_CANONICAL_QUEENS_SEED_T1_T2');
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'GET_REQUIRED' });
  const query = String(req.query?.query || '').trim();
  const limit = Math.max(1,Math.min(Number(req.query?.limit || 20),50));
  if (!query) return res.status(400).json({ ok:false,error:'QUERY_REQUIRED' });
  const locale = requestedLocale(req.query?.lang, query);
  const canonical = canonicalize(query);
  const plans = Array.from(new Set([canonical.canonical, query])).filter(Boolean);
  const merged:Row[] = [];
  const trace:any[] = [];
  let scanned = 0;
  for (const q of plans) {
    const found = await collectorSearch(q,limit);
    scanned += found.scanned;
    trace.push({ query:q, count:found.rows.length, status:found.status });
    for (const r of found.rows) if (rowKey(r) && !merged.some(x=>rowKey(x)===rowKey(r))) merged.push(r);
    if (merged.length >= limit) break;
  }
  const rows = merged.slice(0,limit);
  return res.status(200).json({
    ok:true, original_query:query, locale, canonical_keyword:canonical.canonical, category:canonical.category,
    count:rows.length, scanned_rows:scanned, search_trace:trace,
    pipeline:buildPipeline(query,locale,canonical,rows),
    api_free:{ youtube_api_key:false, gemini_api_key:false, external_ai_required:false },
  });
}
