import { discoverYouTubePublicSearch, type YouTubeDiscoveryCandidate } from '../lib/youtube-public-discovery';

const BACKEND_URL = process.env.CONTENT_OS_BACKEND_URL || 'https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec';

type Candidate = {
  rank: number;
  url: string;
  title?: string;
  channel?: string;
  published_at?: string;
  source?: string;
};

function normalizeUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').split('/')[0];
      return id ? `https://www.youtube.com/watch?v=${id}` : raw;
    }
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname === '/watch') {
        const id = url.searchParams.get('v');
        return id ? `https://www.youtube.com/watch?v=${id}` : raw;
      }
      const shorts = url.pathname.match(/^\/shorts\/([^/?]+)/);
      if (shorts) return `https://www.youtube.com/watch?v=${shorts[1]}`;
    }
    url.hash = '';
    return url.toString();
  } catch {
    return String(raw || '').trim();
  }
}

function keyFromRow(row: any) {
  return normalizeUrl(String(row?.ARTICLE_URL || row?.url || row?.SOURCE_URL || row?.source_url || ''));
}

async function callCollector(payload: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = process.env.CONTENT_OS_BACKEND_TOKEN;
  if (token) headers['X-Content-OS-Token'] = token;
  const response = await fetch(BACKEND_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    redirect: 'follow',
  });
  const text = await response.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { response, json, text };
}

async function readStored(query: string, limit: number) {
  const { response, json } = await callCollector({ action: 'search', asset_type: 'TEXT', query, limit });
  return {
    status: response.status,
    rows: Array.isArray(json?.results) ? json.results : [],
    scanned_rows: Number(json?.scanned_rows || 0),
  };
}

async function enqueueGap(query: string, candidate: Candidate) {
  const canonicalUrl = normalizeUrl(candidate.url);
  const payload = {
    action: 'enqueue',
    asset_type: 'TEXT',
    url: canonicalUrl,
    source_page_url: canonicalUrl,
    platform: 'YOUTUBE',
    title: String(candidate.title || `YouTube rank ${candidate.rank}: ${query}`),
    primary_code: 'CONTENT_OS_COVERAGE_GAP',
    keywords: [query, 'youtube', 'coverage-gap', `rank-${candidate.rank}`].join(','),
    target_apps: 'APP_CONTENT_OS,APP_ANALYZER',
    use_case: 'QUEENS_CROSSCHECK_GAP_FILL',
    notes: JSON.stringify({
      query,
      external_rank: candidate.rank,
      channel: candidate.channel || '',
      published_at: candidate.published_at || '',
      discovery_source: candidate.source || 'GENERAL_YOUTUBE_SEARCH',
      reason: 'MISSING_FROM_STORED_QUEENS',
      requested_at: new Date().toISOString(),
    }).slice(0, 1500),
  };
  const { response, json, text } = await callCollector(payload);
  return { status: response.status, ok: response.ok, response: json || text };
}

function toCandidate(row: YouTubeDiscoveryCandidate): Candidate {
  return {
    rank: row.rank,
    url: row.url,
    title: row.title,
    channel: row.channel,
    published_at: row.published_at,
    source: row.source,
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-OS-Data-Mode', 'QUEENS_COVERAGE_AUTO_GAP_FILL_API_FREE');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST_REQUIRED' });

  const query = String(req.body?.query || '').trim();
  let candidates: Candidate[] = Array.isArray(req.body?.candidates) ? req.body.candidates : [];
  const limit = Math.max(1, Math.min(Number(req.body?.limit || 20), 50));
  const dryRun = req.body?.dry_run !== false;
  const autoDiscover = req.body?.auto_discover !== false;
  const locale = String(req.body?.locale || req.body?.lang || 'ko-KR');

  if (!query) return res.status(400).json({ ok: false, error: 'QUERY_REQUIRED' });

  let discovery: any = null;
  if (!candidates.length && autoDiscover) {
    discovery = await discoverYouTubePublicSearch(query, limit, locale);
    if (discovery.ok) candidates = discovery.candidates.map(toCandidate);
  }

  if (!candidates.length) {
    return res.status(502).json({
      ok: false,
      error: 'DISCOVERY_CANDIDATES_UNAVAILABLE',
      query,
      discovery,
      fallback_next: 'BROWSER_BRIDGE_OR_LOCAL_YTDLP',
      youtube_data_api_key_required: false,
      gemini_required: false,
    });
  }

  const ranked = candidates
    .filter(x => x && x.url)
    .map((x, index) => ({ ...x, rank: Math.max(1, Number(x.rank || index + 1)), url: normalizeUrl(x.url) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit);

  const stored = await readStored(query, limit);
  const storedKeys = new Set(stored.rows.map(keyFromRow).filter(Boolean));
  const missing = ranked.filter(x => !storedKeys.has(x.url));
  const present = ranked.filter(x => storedKeys.has(x.url));

  const collection_log: any[] = [];
  if (!dryRun) {
    for (const candidate of missing) {
      const result = await enqueueGap(query, candidate);
      collection_log.push({
        rank: candidate.rank,
        url: candidate.url,
        title: candidate.title || '',
        action: 'QUEENS_GAP_ENQUEUE',
        status: result.status,
        ok: result.ok,
      });
    }
  }

  return res.status(200).json({
    ok: true,
    mode: 'API_FREE_QUEENS_COVERAGE_AUTO_GAP_FILL',
    query,
    discovery_source: discovery?.ok ? 'YOUTUBE_PUBLIC_SEARCH_HTML' : (candidates[0]?.source || 'SUPPLIED_CANDIDATES'),
    external_ranked_count: ranked.length,
    stored_queens_count: stored.rows.length,
    scanned_rows: stored.scanned_rows,
    present_count: present.length,
    missing_count: missing.length,
    coverage_rate: ranked.length ? Number((present.length / ranked.length).toFixed(4)) : 0,
    missing,
    present,
    collection_requested: !dryRun,
    collection_log,
    fallback_policy: {
      tier_1: 'STORED_QUEENS',
      tier_2: 'YOUTUBE_PUBLIC_SEARCH_HTML_LOW_FREQUENCY',
      tier_3: 'BROWSER_BRIDGE',
      tier_4: 'LOCAL_YTDLP_YTSEARCH',
    },
    audit: {
      rule: 'AUTO_DISCOVER_YOUTUBE_RANK_VS_STORED_QUEENS',
      missing_reason: 'MISSING_FROM_STORED_QUEENS',
      seed_learning_next: 'COLLECT_MISSING_QUEENS_THEN_REBUILD_SEED_T1_T2_AND_REINDEX_LIBRARY',
      youtube_api_key_required: false,
      gemini_required: false,
      checked_at: new Date().toISOString(),
    },
  });
}
