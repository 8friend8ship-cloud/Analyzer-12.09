/*
 * FRONTAPP_REVIEW_GATE_V1_20260828
 *
 * API-free, fail-closed Apps Script helpers for DryWriter/front-app review.
 * This module DOES NOT call Gemini or any paid model API. It only validates
 * review/asset QA evidence already written to the canonical Google Sheet.
 * Per-app bound scripts should call these helpers before template promotion
 * or delivery, while preserving existing deployments/triggers.
 */

var FRONTAPP_REVIEW_GATE_V1 = Object.freeze({
  requiredTabs: [
    'GEMINI_REVIEW',
    'ASSET_QA_REQUIREMENTS',
    'ASSET_QA_QUEUE',
    'WORKFLOW_CROSSCHECK'
  ],
  pass: 'PASS',
  blockStates: ['BLOCK', 'PENDING', 'OPEN', 'FAIL', 'BLOCK_UNTIL_PASS']
});

function ensureFrontReviewTabs_(ss) {
  if (!ss || typeof ss.getSheetByName !== 'function') {
    throw new Error('Spreadsheet instance required');
  }
  var missing = FRONTAPP_REVIEW_GATE_V1.requiredTabs.filter(function(name) {
    return !ss.getSheetByName(name);
  });
  if (missing.length) {
    throw new Error('REVIEW_GATE_TABS_MISSING:' + missing.join(','));
  }
  return { ok: true, requiredTabs: FRONTAPP_REVIEW_GATE_V1.requiredTabs.slice() };
}

function sheetRowsAsObjects_(sheet) {
  var values = sheet.getDataRange().getDisplayValues();
  if (!values || values.length < 2) return [];
  var headers = values[0].map(function(v) { return String(v || '').trim(); });
  return values.slice(1).map(function(row, rowOffset) {
    var out = { __row: rowOffset + 2 };
    headers.forEach(function(header, i) {
      if (header) out[header] = row[i] == null ? '' : String(row[i]).trim();
    });
    return out;
  });
}

function normalizeDecision_(value) {
  return String(value || '').trim().toUpperCase();
}

function textReviewState_(ss, contentId) {
  ensureFrontReviewTabs_(ss);
  var rows = sheetRowsAsObjects_(ss.getSheetByName('GEMINI_REVIEW'))
    .filter(function(r) { return String(r.CONTENT_ID || '') === String(contentId); });
  if (!rows.length) {
    return { ok: false, state: 'MISSING_REVIEW', evidence: null };
  }
  var latest = rows[rows.length - 1];
  var state = normalizeDecision_(latest.FINAL_DECISION);
  var providerState = normalizeDecision_(latest.GEMINI_STATUS);
  var providerReady = providerState && providerState !== 'PENDING' && providerState !== 'PENDING_GEMINI';
  return {
    ok: state === FRONTAPP_REVIEW_GATE_V1.pass && providerReady,
    state: state || 'PENDING',
    providerState: providerState || 'PENDING',
    evidence: latest
  };
}

function assetQaState_(ss, contentId, usedAssetTypes) {
  ensureFrontReviewTabs_(ss);
  var requiredTypes = (usedAssetTypes || []).map(function(v) {
    return String(v || '').trim().toUpperCase();
  }).filter(Boolean);
  if (!requiredTypes.length) {
    return { ok: true, state: 'NOT_REQUIRED', missingTypes: [], failed: [] };
  }
  var rows = sheetRowsAsObjects_(ss.getSheetByName('ASSET_QA_QUEUE'))
    .filter(function(r) { return String(r.CONTENT_ID || '') === String(contentId); });
  var latestByType = {};
  rows.forEach(function(r) {
    var type = String(r.ASSET_TYPE || '').trim().toUpperCase();
    if (type) latestByType[type] = r;
  });
  var missing = [];
  var failed = [];
  requiredTypes.forEach(function(type) {
    var row = latestByType[type];
    if (!row) {
      missing.push(type);
      return;
    }
    if (normalizeDecision_(row.FINAL_DECISION) !== FRONTAPP_REVIEW_GATE_V1.pass) {
      failed.push({ type: type, decision: row.FINAL_DECISION || 'PENDING', row: row.__row });
    }
  });
  return {
    ok: missing.length === 0 && failed.length === 0,
    state: missing.length ? 'MISSING_ASSET_QA' : (failed.length ? 'ASSET_QA_BLOCK' : 'PASS'),
    missingTypes: missing,
    failed: failed
  };
}

function workflowCrosscheckState_(ss, appId) {
  ensureFrontReviewTabs_(ss);
  var rows = sheetRowsAsObjects_(ss.getSheetByName('WORKFLOW_CROSSCHECK'))
    .filter(function(r) {
      return !appId || !r.APP_ID || String(r.APP_ID) === String(appId);
    });
  var critical = rows.filter(function(r) {
    return String(r.REQUIRED || '').toUpperCase() === 'YES';
  });
  var failed = critical.filter(function(r) {
    var state = normalizeDecision_(r.STATUS);
    return !(state === 'PASS' || state === 'READY' || state === 'ACTIVE_CONTRACT');
  });
  return {
    ok: failed.length === 0,
    state: failed.length ? 'CROSSCHECK_BLOCK' : 'PASS',
    failedStages: failed.map(function(r) { return r.STAGE || ('ROW_' + r.__row); })
  };
}

function runFrontReviewGate_(ss, payload) {
  payload = payload || {};
  var contentId = payload.contentId || payload.CONTENT_ID;
  if (!contentId) throw new Error('CONTENT_ID_REQUIRED');
  var text = textReviewState_(ss, contentId);
  var assets = assetQaState_(ss, contentId, payload.usedAssetTypes || []);
  var crosscheck = workflowCrosscheckState_(ss, payload.appId || payload.APP_ID || '');
  var ok = text.ok && assets.ok && crosscheck.ok;
  return {
    ok: ok,
    decision: ok ? 'PASS' : 'BLOCK',
    contentId: String(contentId),
    text: text,
    assets: assets,
    crosscheck: crosscheck,
    reviewedAt: new Date().toISOString()
  };
}

function assertTemplatePromotionAllowed_(ss, payload) {
  var gate = runFrontReviewGate_(ss, payload);
  if (!gate.ok) {
    throw new Error('TEMPLATE_PROMOTION_BLOCKED:' + JSON.stringify({
      contentId: gate.contentId,
      text: gate.text.state,
      assets: gate.assets.state,
      crosscheck: gate.crosscheck.state
    }));
  }
  return gate;
}

function recordFrontTextReview_(ss, review) {
  ensureFrontReviewTabs_(ss);
  review = review || {};
  var required = ['REVIEW_ID', 'APP_ID', 'CONTENT_ID', 'GEMINI_STATUS', 'FINAL_DECISION'];
  var missing = required.filter(function(k) { return !String(review[k] || '').trim(); });
  if (missing.length) throw new Error('REVIEW_FIELDS_MISSING:' + missing.join(','));
  if (normalizeDecision_(review.GEMINI_STATUS) === 'PENDING' && normalizeDecision_(review.FINAL_DECISION) === 'PASS') {
    throw new Error('PENDING_PROVIDER_CANNOT_PASS');
  }
  appendObjectByHeader_(ss.getSheetByName('GEMINI_REVIEW'), review);
  return { ok: true, reviewId: review.REVIEW_ID };
}

function recordAssetQaResult_(ss, qa) {
  ensureFrontReviewTabs_(ss);
  qa = qa || {};
  var required = ['QA_ID', 'CONTENT_ID', 'ASSET_ID', 'ASSET_TYPE', 'FINAL_DECISION'];
  var missing = required.filter(function(k) { return !String(qa[k] || '').trim(); });
  if (missing.length) throw new Error('ASSET_QA_FIELDS_MISSING:' + missing.join(','));
  appendObjectByHeader_(ss.getSheetByName('ASSET_QA_QUEUE'), qa);
  return { ok: true, qaId: qa.QA_ID };
}

function appendObjectByHeader_(sheet, obj) {
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  var row = headers.map(function(h) {
    var key = String(h || '').trim();
    return key && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : '';
  });
  sheet.appendRow(row);
}

function buildReviewLearningRecord_(gateResult, fixApplied, evidence) {
  gateResult = gateResult || {};
  return {
    learning_id: 'LEARN_FRONT_REVIEW_' + Utilities.getUuid(),
    content_id: gateResult.contentId || '',
    outcome: gateResult.ok ? 'SUCCESS_TEMPLATE_CANDIDATE' : 'FAIL_PREVENTION_CANDIDATE',
    failed_dimension: gateResult.ok ? '' : JSON.stringify({
      text: gateResult.text && gateResult.text.state,
      assets: gateResult.assets && gateResult.assets.state,
      crosscheck: gateResult.crosscheck && gateResult.crosscheck.state
    }),
    fix_applied: fixApplied || '',
    evidence: evidence || '',
    created_at: new Date().toISOString()
  };
}
