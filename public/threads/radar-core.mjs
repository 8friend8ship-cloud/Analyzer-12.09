// Existing ContentOS lineage: DUAL_EYE_MULTI_BRAIN_BRIDGE_V1.
// Pure client/server-independent research adapter. No hidden collectors.
export const CONTRACT = 'CONTENTOS_THREADS_QUEENS_SEED_V1';
export const LINEAGE = 'DUAL_EYE_MULTI_BRAIN_BRIDGE_V1';
export const CHANNEL = '@d_guide07';
export const MAX_IMPORT = 500;

function clean(v) { return String(v == null ? '' : v).trim(); }
function finiteNonnegative(v) { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; }
function hash(v) { let h = 2166136261; for (const c of String(v)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
export function median(values) {
  const a = values.filter(v => Number.isFinite(v) && v >= 0).sort((a,b) => a-b);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2;
}
export function normalizePost(raw) {
  const sourceId = clean(raw.id || raw.sourceId || raw.SOURCE_ID);
  const url = clean(raw.permalink || raw.url || raw.sourceUrl || raw.SOURCE_URL);
  const user = clean(raw.username || raw.user || raw.author).replace(/^@/, '');
  const metric = (k, alt) => finiteNonnegative(raw[k] ?? raw[alt]);
  const likes = metric('likeCount','likes'), replies = metric('replyCount','replies');
  const reposts = metric('repostCount','reposts'), quotes = metric('quoteCount','quotes');
  const views = metric('viewCount','views');
  const allEngagement = [likes,replies,reposts,quotes].every(x=>x !== null);
  return {
    id: sourceId || (url ? 'url_' + hash(url) : ''),
    url, user, text: clean(raw.text || raw.title),
    timestamp: clean(raw.timestamp || raw.publishedAt),
    likes, replies, reposts, quotes, views,
    engagement: allEngagement ? likes+replies+reposts+quotes : null,
    evidence: clean(raw.evidence || raw.sourceEvidence || ''),
    provenance: clean(raw.provenance || 'MANUAL_IMPORT'),
    mediaType: clean(raw.media_type || raw.mediaType || ''),
  };
}
export function rankPosts(rawPosts, opts = {}) {
  const mode = opts.mode === 'views' ? 'views' : 'engagement';
  const minHistory = Math.max(3, Number(opts.minHistory) || 3);
  const all = (Array.isArray(rawPosts) ? rawPosts : []).slice(0,MAX_IMPORT).map(normalizePost).filter(x=>x.id && x.user);
  const seen = new Set();
  const unique = all.filter(x=>{ const k=x.url || x.id; if(seen.has(k))return false; seen.add(k); return true; });
  const metricKey = mode === 'views' ? 'views' : 'engagement';
  const byUser = new Map();
  for (const p of unique) { const k=p.user.toLowerCase(); if(!byUser.has(k))byUser.set(k,[]); byUser.get(k).push(p); }
  return unique.map(p=>{
    const hist = (byUser.get(p.user.toLowerCase()) || []).filter(x=>x.id !== p.id && x[metricKey] !== null).slice(0,20);
    const baseline = hist.length >= minHistory ? median(hist.map(x=>x[metricKey])) : null;
    const score = baseline !== null && baseline > 0 && p[metricKey] !== null ? Math.round(p[metricKey] / baseline * 100)/100 : null;
    return {...p, baseline, historyCount:hist.length, score, metricMode:mode,
      verification:score === null ? 'INSUFFICIENT_HISTORY_OR_METRICS' : 'CALCULATED',
      sourceId:'THREADS_' + p.id,
      queensId:'QUEENS_THREADS_' + hash(p.url || p.id),
      seedId:'SEED_THREADS_' + hash(p.url || p.id)
    };
  }).sort((a,b)=>(b.score ?? -1)-(a.score ?? -1));
}
export function toQueensSeed(row, query) {
  const sourceId = row.sourceId;
  const hook = (row.text || '').split(/[.!?\n]/)[0].slice(0,120);
  return {
    contractVersion: CONTRACT, lineage: LINEAGE, platform:'THREADS',
    sourceId, queensId: row.queensId, seedId: row.seedId,
    flow:['SOURCE','04_QUEENS','05_SEED','06_FUNCTION_CONTRACT','CONTENTOS_VIDEO_QUEUE'],
    sourceUrl:row.url, author:row.user, keyword:clean(query), collectedAt:new Date().toISOString(),
    provenance:row.provenance, evidence:row.evidence || row.url,
    metrics:{views:row.views,likes:row.likes,replies:row.replies,reposts:row.reposts,quotes:row.quotes,
      engagement:row.engagement,historyCount:row.historyCount,baseline:row.baseline,
      outlierMultiplier:row.score,metricMode:row.metricMode},
    sourceClaimStatus:row.verification,
    queens:{hook,format:row.mediaType || 'TEXT',question:'첫 문장, 구체적 장면, 반응을 만든 요소는 무엇인가?',
      observations:[row.text.slice(0,500)],provenance:row.provenance},
    seed:{idea:'독자에게 필요한 실제 사례로 다시 설명하기: ' + hook,
      variation:'독자의 문제 → 실제 사례 → 비교 숫자 → 행동 제안',
      shotPlan:['문제 제기','평소 기준과 이번 결과 비교','발견한 패턴','직접 적용할 실험'],
      originalityRule:'원문 복사가 아니라 자체 사례와 증거로 재구성'},
    status:'PREPARED_NOT_CENTRAL_WRITTEN'
  };
}
export function summarize(rows) {
  return {rows:rows.length,qualified:rows.filter(r=>r.score !== null && r.score>=10).length,
    verifiedOutliers:rows.filter(r=>r.score !== null).length,
    insufficient:rows.filter(r=>r.score === null).length};
}
