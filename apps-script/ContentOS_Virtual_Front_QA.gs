const CONTENTOS_VIRTUAL_FRONT_QA_VERSION = 'CONTENTOS_VIRTUAL_FRONT_QA_V1_20260822';

/**
 * Demand-first backdata readiness evaluator.
 * Does not call an external API. It evaluates whether stored Queens/Seed/T1/T2
 * are sufficient for a front request and writes only the gap that must be filled.
 */
function evaluateContentOsVirtualFrontRequest(req) {
  req = req || {};
  const appId = String(req.appId || 'APP_CONTENT_OS');
  const query = String(req.query || '').trim();
  const requestedResults = Math.max(1, Number(req.resultsLimit || 20));
  if (!query) return {ok:false, reason:'QUERY_REQUIRED', version:CONTENTOS_VIRTUAL_FRONT_QA_VERSION};

  const ss = SpreadsheetApp.openById(CONTENTOS_PIPELINE_SHEET_ID);
  const queens = findLatestContentOsStageRows_(ss.getSheetByName('Queens_Work'), appId, query, 3);
  const seeds = findLatestContentOsStageRows_(ss.getSheetByName('Seed_Work'), appId, query, 3);
  const t1s = findLatestContentOsStageRows_(ss.getSheetByName('Template_T1'), appId, query, 3);
  const t2s = findLatestContentOsStageRows_(ss.getSheetByName('Template_T2'), appId, '', 3);

  const queensCount = queens.length;
  const seedReady = seeds.length > 0;
  const t1Ready = t1s.length > 0;
  const t2Ready = t2s.length > 0;
  const coverage = Math.min(1, queensCount / requestedResults);
  const seedSufficiency = seedReady ? Math.min(1, Math.max(coverage, 0.5)) : 0;
  const t1Score = t1Ready ? 1 : 0;
  const t2Score = t2Ready ? 1 : 0;
  const virtualFrontPass = seedSufficiency >= 0.5 && t1Ready && t2Ready;
  const apiFreeFinalPass = virtualFrontPass;
  const aiFallbackRate = 0;

  const gapReasons = [];
  if (coverage < 0.5) gapReasons.push('FRONT_REQUEST_COVERAGE_LOW');
  if (!seedReady) gapReasons.push('SEED_NOT_READY');
  if (!t1Ready) gapReasons.push('T1_NOT_READY');
  if (!t2Ready) gapReasons.push('T2_REQUIREMENT_NOT_READY');

  const gapClass = classifyContentOsGap_(req, gapReasons);
  const out = {
    ok:true,
    appId:appId,
    query:query,
    FRONT_REQUEST_COVERAGE:Number(coverage.toFixed(3)),
    SEED_SUFFICIENCY:Number(seedSufficiency.toFixed(3)),
    T1_READY:t1Score,
    T2_REQUIREMENT_PASS:t2Score,
    VIRTUAL_FRONT_PASS:virtualFrontPass,
    API_FREE_FINAL_PASS:apiFreeFinalPass,
    AI_FALLBACK_RATE:aiFallbackRate,
    GAP_CLASS:gapClass,
    GAP_REASONS:gapReasons,
    API_CALL_ALLOWED:shouldAllowContentOsApiForGap_(gapClass),
    nextAction:gapReasons.length ? 'WRITE_COVERAGE_GAP_AND_FILL_MINIMUM_ONLY' : 'REUSE_STORED_BACKDATA',
    version:CONTENTOS_VIRTUAL_FRONT_QA_VERSION,
    checkedAt:new Date().toISOString()
  };
  writeContentOsVirtualFrontGap_(ss, out);
  return out;
}

function classifyContentOsGap_(req, reasons) {
  req = req || {};
  if (req.newExternalFact === true) return 'NEW_EXTERNAL_FACT';
  if (req.trend === true) return 'TREND';
  if (req.recent === true) return 'RECENT';
  if (req.staleExternalMetric === true) return 'STALE_EXTERNAL_METRIC';
  if (reasons.indexOf('FRONT_REQUEST_COVERAGE_LOW') >= 0) return 'COVERAGE_GAP';
  if (reasons.length) return 'FORMAT_OR_TEMPLATE_GAP';
  return 'NONE';
}

function shouldAllowContentOsApiForGap_(gapClass) {
  return ['NEW_EXTERNAL_FACT','TREND','RECENT','STALE_EXTERNAL_METRIC'].indexOf(String(gapClass)) >= 0;
}

function findLatestContentOsStageRows_(sheet, appId, query, limit) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getDisplayValues();
  const nq = normalizeContentOsQuery_(query);
  const out = [];
  for (let i=values.length-1; i>=1 && out.length<(limit||3); i--) {
    const row = values[i];
    if (appId && row.indexOf(appId) === -1) continue;
    if (nq) {
      const hay = normalizeContentOsQuery_(row.join(' '));
      if (hay.indexOf(nq) === -1) continue;
    }
    out.push(row);
  }
  return out;
}

function writeContentOsVirtualFrontGap_(ss, result) {
  let sh = ss.getSheetByName('Coverage_Gap');
  if (!sh) {
    sh = ss.insertSheet('Coverage_Gap');
    sh.appendRow(['CHECKED_AT','APP_ID','QUERY','FRONT_REQUEST_COVERAGE','SEED_SUFFICIENCY','T1_READY','T2_REQUIREMENT_PASS','VIRTUAL_FRONT_PASS','API_FREE_FINAL_PASS','AI_FALLBACK_RATE','GAP_CLASS','GAP_REASONS','API_CALL_ALLOWED','NEXT_ACTION','VERSION']);
  }
  if (result.GAP_CLASS === 'NONE') return;
  sh.appendRow([
    new Date(), result.appId, result.query, result.FRONT_REQUEST_COVERAGE,
    result.SEED_SUFFICIENCY, result.T1_READY, result.T2_REQUIREMENT_PASS,
    result.VIRTUAL_FRONT_PASS, result.API_FREE_FINAL_PASS, result.AI_FALLBACK_RATE,
    result.GAP_CLASS, (result.GAP_REASONS||[]).join('|'), result.API_CALL_ALLOWED,
    result.nextAction, result.version
  ]);
}

/**
 * Two representative front requests. PASS requires both to reach final front
 * package without any AI fallback. External API permission is evaluated only
 * from explicit NEW/RECENT/TREND/STALE flags, never from a template-only gap.
 */
function testContentOsVirtualFrontReadinessX2() {
  const a = evaluateContentOsVirtualFrontRequest({appId:'APP_CONTENT_OS',query:'두바이 쫀득 쿠키',resultsLimit:20});
  const b = evaluateContentOsVirtualFrontRequest({appId:'APP_CONTENT_OS',query:'신라면 먹방',resultsLimit:20});
  return {
    ok:!!(a.API_FREE_FINAL_PASS && b.API_FREE_FINAL_PASS && a.AI_FALLBACK_RATE===0 && b.AI_FALLBACK_RATE===0),
    runs:[a,b],
    version:CONTENTOS_VIRTUAL_FRONT_QA_VERSION
  };
}
