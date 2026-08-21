const CONTENTOS_FRONT_SEED_RULE_VERSION = 'CONTENTOS_FRONT_REQUIREMENT_SEED_V1_20260821';

/**
 * Canonical front requirements are derived from the current Analyzer/Content OS UI:
 * FilterState: minViews, videoLength, videoFormat, period, sortBy, resultsLimit, country, category.
 * Native UI result limits: 25/50/75/100. API contract also accepts 20 for backward/user-request compatibility.
 */
const CONTENTOS_FRONT_NATIVE_LIMITS = [25, 50, 75, 100];
const CONTENTOS_FRONT_ACCEPTED_LIMITS = [20, 25, 50, 75, 100];

function buildContentOsFrontSeedPackage_(seedContext, frontRequest) {
  const req = normalizeContentOsFrontRequest_(frontRequest || {});
  const keywordPlan = buildContentOsKeywordExpansionPlan_(seedContext || {}, req);
  const candidatePool = collectContentOsSeedCandidates_(seedContext || {}, keywordPlan);
  const ranked = rankContentOsCandidatesForFront_(candidatePool, req);
  const returnLimit = req.resultsLimit;
  const fetchLimit = resolveContentOsFetchLimit_(returnLimit);

  return {
    ok: true,
    version: CONTENTOS_FRONT_SEED_RULE_VERSION,
    query: String((seedContext || {}).query || ''),
    normalizedQuery: String((seedContext || {}).normalizedQuery || (seedContext || {}).query || ''),
    frontRequest: req,
    keywordPlan: keywordPlan,
    fetchPlan: {
      requestedLimit: returnLimit,
      fetchLimit: fetchLimit,
      nativeUiLimits: CONTENTOS_FRONT_NATIVE_LIMITS.slice(),
      acceptedContractLimits: CONTENTOS_FRONT_ACCEPTED_LIMITS.slice(),
      expansionPolicy: 'PRIMARY→SYNONYM→INTENT→TRENDING→CATEGORY until candidate target met'
    },
    candidates: ranked.slice(0, returnLimit),
    candidateCount: ranked.length,
    sufficientForFront: ranked.length >= Math.min(returnLimit, 20),
    nextAction: ranked.length >= returnLimit ? 'RETURN_TO_FRONT' : 'EXPAND_RELATED_KEYWORDS_AND_QUEENS_REFRESH'
  };
}

function normalizeContentOsFrontRequest_(r) {
  const requested = Number(r.resultsLimit || 25);
  const resultsLimit = CONTENTOS_FRONT_ACCEPTED_LIMITS.indexOf(requested) !== -1 ? requested : 25;
  return {
    minViews: Number(r.minViews == null ? 100000 : r.minViews),
    videoLength: String(r.videoLength || 'any'),
    videoFormat: String(r.videoFormat || 'any'),
    period: String(r.period || '30'),
    sortBy: String(r.sortBy || 'viewCount'),
    resultsLimit: resultsLimit,
    country: String(r.country || 'KR'),
    category: String(r.category || 'all')
  };
}

function resolveContentOsFetchLimit_(requestedLimit) {
  if (requestedLimit <= 20) return 25;
  if (requestedLimit <= 25) return 25;
  if (requestedLimit <= 50) return 50;
  if (requestedLimit <= 75) return 75;
  return 100;
}

function buildContentOsKeywordExpansionPlan_(ctx, req) {
  const primary = uniqueSeedKeywords_([
    ctx.query,
    ctx.normalizedQuery,
    ...(ctx.primaryKeywords || [])
  ]);
  const synonyms = uniqueSeedKeywords_(ctx.synonyms || []);
  const intent = uniqueSeedKeywords_(ctx.intentKeywords || []);
  const trending = uniqueSeedKeywords_(ctx.trendingKeywords || []);
  const category = uniqueSeedKeywords_(ctx.categoryKeywords || []);
  const script = uniqueSeedKeywords_(ctx.scriptFeatureKeywords || []);

  // Larger front requests progressively widen the keyword families instead of repeating one exact query.
  let families = primary.slice();
  if (req.resultsLimit >= 20) families = families.concat(synonyms);
  if (req.resultsLimit >= 25) families = families.concat(intent);
  if (req.resultsLimit >= 50) families = families.concat(trending);
  if (req.resultsLimit >= 75) families = families.concat(category);
  if (req.resultsLimit >= 100) families = families.concat(script);

  return {
    primary: primary,
    synonyms: synonyms,
    intent: intent,
    trending: trending,
    category: category,
    scriptFeature: script,
    searchQueries: uniqueSeedKeywords_(families).slice(0, 40),
    targetResults: req.resultsLimit
  };
}

function collectContentOsSeedCandidates_(ctx, plan) {
  const rows = Array.isArray(ctx.videos) ? ctx.videos : [];
  const targets = uniqueSeedKeywords_(plan.searchQueries || []).map(normalizeSeedKeyword_);
  const out = [], seen = {};
  rows.forEach(v => {
    const id = String(v.id || v.videoId || '');
    if (!id || seen[id]) return;
    const hay = normalizeSeedKeyword_([
      v.keyword, v.title, v.summary, v.qtag, v.scriptType, v.scriptHook
    ].filter(Boolean).join(' '));
    const matched = !targets.length || targets.some(t => t && hay.indexOf(t) !== -1);
    if (!matched) return;
    seen[id] = true;
    out.push(v);
  });
  return out;
}

function rankContentOsCandidatesForFront_(rows, req) {
  const now = new Date();
  return (rows || []).filter(v => {
    const views = Number(v.viewCount || v.views || 0);
    if (views < req.minViews) return false;
    const country = String(v.country || v.channelCountry || '');
    if (req.country !== 'WW' && country && country !== req.country) return false;
    if (req.period !== 'any' && v.publishedAt) {
      const days = Number(req.period);
      const age = (now.getTime() - new Date(v.publishedAt).getTime()) / 86400000;
      if (Number.isFinite(age) && age > days) return false;
    }
    const dur = Number(v.durationMinutes || 0);
    if (req.videoLength === 'short' && dur >= 4) return false;
    if (req.videoLength === 'medium' && (dur < 4 || dur > 20)) return false;
    if (req.videoLength === 'long' && dur <= 20) return false;
    if (req.videoFormat === 'shorts' && dur > 3) return false;
    if (req.videoFormat === 'longform' && dur > 0 && dur < 3) return false;
    return true;
  }).sort((a,b) => {
    if (req.sortBy === 'publishedAt') return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    if (req.sortBy === 'engagementRate') return Number(b.engagementRate || 0) - Number(a.engagementRate || 0);
    if (req.sortBy === 'relevance') return Number(b.relevanceScore || b.performanceScore || 0) - Number(a.relevanceScore || a.performanceScore || 0);
    return Number(b.viewCount || b.views || 0) - Number(a.viewCount || a.views || 0);
  });
}

function uniqueSeedKeywords_(xs) {
  const out = [], seen = {};
  (xs || []).forEach(x => {
    const s = String(x || '').trim();
    const n = normalizeSeedKeyword_(s);
    if (!s || !n || seen[n]) return;
    seen[n] = true;
    out.push(s);
  });
  return out;
}

function normalizeSeedKeyword_(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '').replace(/[^0-9a-z가-힣]/g, '');
}

function contentOsFrontSeedRuleHealth() {
  return {
    ok: true,
    version: CONTENTOS_FRONT_SEED_RULE_VERSION,
    nativeUiLimits: CONTENTOS_FRONT_NATIVE_LIMITS,
    acceptedContractLimits: CONTENTOS_FRONT_ACCEPTED_LIMITS,
    requiredFilterFields: ['minViews','videoLength','videoFormat','period','sortBy','resultsLimit','country','category'],
    requiredVideoFields: ['id','channelId','title','thumbnailUrl','channelTitle','publishedAt','subscribers','viewCount','likeCount','commentCount','durationMinutes','engagementRate'],
    sourceSyncRequired: true
  };
}
