/*
 * PERSONA_LEARNING_10M_V1_20260831
 * Reuses the existing 5-minute factory wake; does not install another clock trigger.
 * Goal: every 10 minutes collect verified outputs, seed candidates, recurring errors,
 * prevention/template-patch candidates, and a compact cycle audit row.
 */
var PERSONA_LEARNING_10M_V1 = Object.freeze({
  version: '1.0.0',
  intervalMinutes: 10,
  schedulerMode: 'EXISTING_5M_FACTORY_WAKE_WITH_10M_DUE_GUARD',
  maxSeconds: 210,
  maxRowsPerCycle: 50,
  sheets: {
    cycle: 'PERSONA_LEARNING_CYCLE',
    seed: 'PERSONA_SEED_CANDIDATE',
    error: 'PERSONA_ERROR_LEARNING',
    patch: 'PERSONA_TEMPLATE_PATCH_CANDIDATE'
  }
});

function pl10Norm_(v) { return String(v == null ? '' : v).trim(); }
function pl10Upper_(v) { return pl10Norm_(v).toUpperCase(); }
function pl10Rows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  var values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
  var headers = values[0].map(String);
  return values.slice(1).filter(function(r) { return r.some(function(v) { return pl10Norm_(v) !== ''; }); })
    .map(function(r, i) {
      var o = { __row: i + 2 };
      headers.forEach(function(h, j) { o[h] = r[j]; });
      return o;
    });
}
function pl10Append_(sheet, obj) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  sheet.appendRow(headers.map(function(h) { return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : ''; }));
  return sheet.getLastRow();
}
function pl10EnsureSheet_(ss, name, headers, rows) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name, ss.getNumSheets(), { rows: rows || 2000, columns: headers.length });
  if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
  if (sh.getMaxRows() < (rows || 2000)) sh.insertRowsAfter(sh.getMaxRows(), (rows || 2000) - sh.getMaxRows());
  var current = sh.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  if (current.join('\u0001') !== headers.join('\u0001')) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  return sh;
}
function ensurePersonaLearning10mTabs_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var c = pl10EnsureSheet_(ss, PERSONA_LEARNING_10M_V1.sheets.cycle,
    ['CYCLE_ID','STARTED_AT','FINISHED_AT','SOURCE_WAKE','REVIEWED_PACKS','SEED_CANDIDATES','ERROR_CANDIDATES','PATCH_CANDIDATES','STATUS','LAST_GOOD','RESUME_POINT','NOTES'], 3000);
  var s = pl10EnsureSheet_(ss, PERSONA_LEARNING_10M_V1.sheets.seed,
    ['SEED_CANDIDATE_ID','PERSONA_ID','PERSONA_SNAPSHOT_ID','SOURCE_PACK_ID','LANGUAGE_PACK_ID','VOICE_PACK_ID','TEMPLATE_ID','SOURCE_STATUS','EVIDENCE','LEARNING_SUMMARY','STATUS','CREATED_AT'], 5000);
  var e = pl10EnsureSheet_(ss, PERSONA_LEARNING_10M_V1.sheets.error,
    ['ERROR_LEARNING_ID','ERROR_CLASS','COUNT','SOURCE','FIRST_SEEN','LAST_SEEN','FAILURE_SIGNATURE','PREVENTION_RULE','STATUS','UPDATED_AT'], 5000);
  var p = pl10EnsureSheet_(ss, PERSONA_LEARNING_10M_V1.sheets.patch,
    ['PATCH_CANDIDATE_ID','ERROR_CLASS','PATCH_TYPE','TARGET_TEMPLATE','PROPOSED_RULE','EVIDENCE_COUNT','TEST_REQUIRED','AUTO_APPLY_ALLOWED','STATUS','CREATED_AT','LAST_TEST_RESULT','PROMOTION_GATE'], 5000);
  return { ok: true, cycle: c.getSheetId(), seed: s.getSheetId(), error: e.getSheetId(), patch: p.getSheetId() };
}
function pl10ExistingKeys_(sheet, keyHeader) {
  var rows = pl10Rows_(sheet), out = {};
  rows.forEach(function(r) { var k = pl10Norm_(r[keyHeader]); if (k) out[k] = true; });
  return out;
}
function pl10CollectSeedCandidates_(ss, limit) {
  var source = ss.getSheetByName('BOT_PERSONA_KNOWLEDGE');
  var outSheet = ss.getSheetByName(PERSONA_LEARNING_10M_V1.sheets.seed);
  if (!source || !outSheet) return [];
  var existing = pl10ExistingKeys_(outSheet, 'SEED_CANDIDATE_ID');
  var created = [];
  pl10Rows_(source).slice(0, Number(limit || PERSONA_LEARNING_10M_V1.maxRowsPerCycle)).forEach(function(r) {
    var status = pl10Upper_(r.STATUS);
    if (!pl10Norm_(r.PERSONA_ID) || (!status.match(/ACTIVE|READY|VERIFIED/))) return;
    var key = ['SEED10M', pl10Norm_(r.PERSONA_ID), pl10Norm_(r.PERSONA_SNAPSHOT_ID), pl10Norm_(r.PACK_ID)].join('_').replace(/[^A-Za-z0-9_.-]+/g, '-');
    if (existing[key]) return;
    pl10Append_(outSheet, {
      SEED_CANDIDATE_ID: key,
      PERSONA_ID: pl10Norm_(r.PERSONA_ID),
      PERSONA_SNAPSHOT_ID: pl10Norm_(r.PERSONA_SNAPSHOT_ID),
      SOURCE_PACK_ID: pl10Norm_(r.PACK_ID),
      LANGUAGE_PACK_ID: pl10Norm_(r.LANGUAGE_PACK_ID),
      VOICE_PACK_ID: pl10Norm_(r.VOICE_PACK_ID),
      TEMPLATE_ID: pl10Norm_(r.TEMPLATE_ID),
      SOURCE_STATUS: status,
      EVIDENCE: pl10Norm_(r.EXPERTISE_SOURCES || r.QUEENS_SOURCE),
      LEARNING_SUMMARY: pl10Norm_(r.KNOWLEDGE_SUMMARY),
      STATUS: 'CANDIDATE_NEEDS_CENTRAL_PROMOTION_GATE',
      CREATED_AT: new Date().toISOString()
    });
    existing[key] = true;
    created.push(key);
  });
  return created;
}
function pl10CollectErrorsAndPatchCandidates_(ss) {
  var recurring = (typeof collectRecurringPersonaErrors_ === 'function') ? collectRecurringPersonaErrors_(ss, 2) : [];
  var errSheet = ss.getSheetByName(PERSONA_LEARNING_10M_V1.sheets.error);
  var patchSheet = ss.getSheetByName(PERSONA_LEARNING_10M_V1.sheets.patch);
  var errKeys = pl10ExistingKeys_(errSheet, 'ERROR_LEARNING_ID');
  var patchKeys = pl10ExistingKeys_(patchSheet, 'PATCH_CANDIDATE_ID');
  var now = new Date().toISOString();
  var createdErrors = [], createdPatches = [];
  recurring.slice(0, PERSONA_LEARNING_10M_V1.maxRowsPerCycle).forEach(function(x) {
    var errorClass = pl10Upper_(x.errorClass || 'UNCLASSIFIED');
    var safe = errorClass.replace(/[^A-Z0-9_.-]+/g, '_').slice(0, 80);
    var errId = 'ERR10M_' + safe;
    if (!errKeys[errId]) {
      pl10Append_(errSheet, {
        ERROR_LEARNING_ID: errId,
        ERROR_CLASS: errorClass,
        COUNT: Number(x.count || 0),
        SOURCE: 'PERSONA_MATCH_QUEUE|STORYBOARD_PERSONA|GEMINI_PROJECT_CROSSCHECK|ASSET_QA_QUEUE',
        FIRST_SEEN: now,
        LAST_SEEN: now,
        FAILURE_SIGNATURE: errorClass,
        PREVENTION_RULE: 'REPAIR_FAILED_DIMENSION_ONLY;NO_BLIND_RETRY;RETEST_SAME_FIXTURE_X2',
        STATUS: 'ACTIVE_PREVENTION_CANDIDATE',
        UPDATED_AT: now
      });
      errKeys[errId] = true;
      createdErrors.push(errId);
    }
    var patchId = 'PATCH10M_' + safe;
    if (!patchKeys[patchId]) {
      pl10Append_(patchSheet, {
        PATCH_CANDIDATE_ID: patchId,
        ERROR_CLASS: errorClass,
        PATCH_TYPE: 'PREVENTION_TEMPLATE_RULE',
        TARGET_TEMPLATE: 'PERSONA_MULTIMODAL_OR_RELATED_COMPONENT',
        PROPOSED_RULE: 'Detect ' + errorClass + ' before execution; reuse LAST_GOOD; repair failed dimension only; require same-fixture x2 before promotion.',
        EVIDENCE_COUNT: Number(x.count || 0),
        TEST_REQUIRED: 'X2',
        AUTO_APPLY_ALLOWED: 'NO_PRODUCTION_MUTATION;DATA_RULE_CANDIDATE_ONLY',
        STATUS: 'TEST_REQUIRED',
        CREATED_AT: now,
        LAST_TEST_RESULT: '',
        PROMOTION_GATE: 'CENTRAL_77+71/80_QA+93_RUNTIME_EVIDENCE'
      });
      patchKeys[patchId] = true;
      createdPatches.push(patchId);
    }
  });
  return { recurring: recurring, errors: createdErrors, patches: createdPatches };
}
function runPersonaLearningCycle10m_(ss, context) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  context = context || {};
  var startedMs = Date.now(), startedAt = new Date(startedMs).toISOString();
  ensurePersonaLearning10mTabs_(ss);
  if (typeof ensurePersonaWorkflowTabs_ === 'function') ensurePersonaWorkflowTabs_(ss);
  var bot = ss.getSheetByName('BOT_PERSONA_KNOWLEDGE');
  var reviewed = bot ? Math.min(pl10Rows_(bot).length, PERSONA_LEARNING_10M_V1.maxRowsPerCycle) : 0;
  var seeds = pl10CollectSeedCandidates_(ss, PERSONA_LEARNING_10M_V1.maxRowsPerCycle);
  var learned = pl10CollectErrorsAndPatchCandidates_(ss);
  var cycleId = 'PLC10M_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyyMMdd_HHmmss');
  var cycleSheet = ss.getSheetByName(PERSONA_LEARNING_10M_V1.sheets.cycle);
  var status = (Date.now() - startedMs) / 1000 <= PERSONA_LEARNING_10M_V1.maxSeconds ? 'PASS_DATA_LEARNING_CYCLE' : 'PARTIAL_RUNTIME_BUDGET';
  pl10Append_(cycleSheet, {
    CYCLE_ID: cycleId,
    STARTED_AT: startedAt,
    FINISHED_AT: new Date().toISOString(),
    SOURCE_WAKE: PERSONA_LEARNING_10M_V1.schedulerMode,
    REVIEWED_PACKS: reviewed,
    SEED_CANDIDATES: seeds.length,
    ERROR_CANDIDATES: learned.errors.length,
    PATCH_CANDIDATES: learned.patches.length,
    STATUS: status,
    LAST_GOOD: status === 'PASS_DATA_LEARNING_CYCLE' ? cycleId : '',
    RESUME_POINT: 'CENTRAL_INGEST_SEED_ERROR_PATCH_CANDIDATES→X2_QA→PROMOTE_VERIFIED_ONLY',
    NOTES: 'No paid model/API. No new clock trigger. No automatic production code/template mutation.'
  });
  return { ok: status === 'PASS_DATA_LEARNING_CYCLE', cycleId: cycleId, reviewed: reviewed, seedCandidates: seeds, recurring: learned.recurring, errorCandidates: learned.errors, patchCandidates: learned.patches, installNewTrigger: false };
}
function runPersonaLearningCycle10mIfDue_(ss, context) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  context = context || {};
  var props = PropertiesService.getScriptProperties();
  var key = 'PERSONA_LEARNING_10M_LAST_RUN_AT';
  var lastMs = Number(props.getProperty(key) || 0);
  var nowMs = Date.now();
  var intervalMs = PERSONA_LEARNING_10M_V1.intervalMinutes * 60000;
  if (lastMs && nowMs - lastMs < intervalMs) return { ok: true, ran: false, nextDueMs: lastMs + intervalMs, source: PERSONA_LEARNING_10M_V1.schedulerMode };
  var result = runPersonaLearningCycle10m_(ss, context);
  if (result.ok) props.setProperty(key, String(nowMs));
  return { ok: result.ok, ran: true, source: PERSONA_LEARNING_10M_V1.schedulerMode, result: result };
}
function ensurePersonaLearning10mTrigger_() {
  return {
    ok: true,
    installNewTrigger: false,
    physicalWake: 'existing processTaskQueue/factory 5m trigger',
    logicalDueMinutes: PERSONA_LEARNING_10M_V1.intervalMinutes,
    handler: 'runPersonaLearningCycle10mIfDue_',
    schedulerMode: PERSONA_LEARNING_10M_V1.schedulerMode,
    policy: 'Reuse existing physical wake. A second timer is forbidden; invoke this handler from the existing factory wake after bound-source reconciliation.'
  };
}
