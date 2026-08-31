/*
 * PERSONA_MVP_HOURLY_GOVERNOR_V1_20260831
 * Reuses the existing 5-minute physical factory wake.
 * Adds: safe runtime slicing before 5 minutes, local-shell/runner lease classification,
 * hourly persona multimodal comparison QA, and verified-only Seed/template promotion candidates.
 * No new ScriptApp clock trigger is created here.
 */
var PERSONA_MVP_HOURLY_GOVERNOR_V1 = Object.freeze({
  version: '1.0.0',
  physicalWakeMinutes: 5,
  hourlyDueMinutes: 60,
  safeYieldSeconds: 270,
  hardStopSeconds: 285,
  schedulerMode: 'EXISTING_5M_FACTORY_WAKE_WITH_10M_LEARNING_AND_60M_MVP_GOVERNOR',
  requiredModalities: ['IMAGE','LANGUAGE','VOICE','FACE_EXPRESSION','MOUTH_LIPSYNC','GESTURE','MOTION'],
  compareSources: ['V_TUBE','ANIMATION','NOTEBOOKLM','FLOW'],
  installNewTrigger: false
});

function pmhgNorm_(v) { return String(v == null ? '' : v).trim(); }
function pmhgUpper_(v) { return pmhgNorm_(v).toUpperCase(); }
function pmhgElapsedSeconds_(startedMs, nowMs) { return Math.max(0, Number(nowMs || Date.now()) - Number(startedMs || 0)) / 1000; }
function pmhgRuntimeDecision_(startedMs, nowMs) {
  var sec = pmhgElapsedSeconds_(startedMs, nowMs);
  if (sec >= PERSONA_MVP_HOURLY_GOVERNOR_V1.hardStopSeconds) return { action: 'STOP_AND_RESUME', elapsedSeconds: sec, status: 'RUNTIME_HARD_STOP_GUARD' };
  if (sec >= PERSONA_MVP_HOURLY_GOVERNOR_V1.safeYieldSeconds) return { action: 'YIELD_AND_RESUME', elapsedSeconds: sec, status: 'RUNTIME_SAFE_YIELD' };
  return { action: 'CONTINUE', elapsedSeconds: sec, status: 'RUNTIME_WITHIN_BUDGET' };
}
function pmhgRunnerLeaseDecision_(runner) {
  runner = runner || {};
  var status = pmhgUpper_(runner.status || runner.STATUS);
  var heartbeatAgeMin = Number(runner.heartbeatAgeMinutes || runner.HEARTBEAT_AGE_MIN || 999999);
  var claimedAgeSec = Number(runner.claimedAgeSeconds || runner.CLAIMED_AGE_SEC || 0);
  if (status.indexOf('OFFLINE') >= 0 || status.indexOf('PENDING') >= 0 || heartbeatAgeMin > 15) {
    return { action: 'HOLD_AND_ROUTE_LAST_GOOD', errorClass: 'LOCAL_RUNNER_HEARTBEAT_STALE', preservePartial: true };
  }
  if (status.indexOf('CLAIM') >= 0 && claimedAgeSec > 300) {
    return { action: 'STALE_RELEASE_REQUEUE', errorClass: 'CLAIM_EXCEEDS_5M_WITHOUT_RESULT', preservePartial: true };
  }
  return { action: 'KEEP_LEASE', errorClass: '', preservePartial: true };
}
function pmhgSelectComparisonRoute_(state) {
  state = state || {};
  var vtube = pmhgUpper_(state.vtube || state.VTUBE);
  var animation = pmhgUpper_(state.animation || state.ANIMATION);
  var notebook = pmhgUpper_(state.notebooklm || state.NOTEBOOKLM);
  var flow = pmhgUpper_(state.flow || state.FLOW);
  return {
    imagePersona: vtube.indexOf('PASS') >= 0 || vtube.indexOf('READY') >= 0 ? 'V_TUBE' : 'VERIFIED_IMAGE_PACK',
    motionBaseline: animation.indexOf('PASS') >= 0 || animation.indexOf('LINEAGE_CONFIRMED') >= 0 ? 'ANIMATION' : 'V_TUBE_SOURCE_ONLY',
    voiceAudio: notebook.indexOf('PASS') >= 0 || notebook.indexOf('VERIFIED') >= 0 ? 'NOTEBOOKLM' : 'VOICE_PACK_BROWSER_OR_EXISTING',
    generativeCompare: flow.indexOf('VERIFIED') >= 0 || flow.indexOf('ACK_X2') >= 0 ? 'FLOW_COMPARE_ACTIVE' : 'FLOW_COMPARE_HOLD',
    promotionRule: 'ONLY_ACTUAL_OUTPUT_DRIVE_ACK_X2_CAN_PROMOTE'
  };
}
function pmhgTemplateCompleteness_(row) {
  row = row || {};
  var missing = [];
  PERSONA_MVP_HOURLY_GOVERNOR_V1.requiredModalities.forEach(function(k) {
    var v = pmhgUpper_(row[k] || row[k + '_STATUS']);
    if (!(v.indexOf('PASS') >= 0 || v.indexOf('READY') >= 0 || v.indexOf('VERIFIED') >= 0 || v.indexOf('ACTIVE') >= 0)) missing.push(k);
  });
  return { complete: missing.length === 0, missing: missing, status: missing.length ? 'MULTIMODAL_CANDIDATE' : 'MVP_COMPONENTS_COMPLETE_NEEDS_X2' };
}
function pmhgEnsureSheet_(ss, name, headers, rows) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name, ss.getNumSheets(), { rows: rows || 3000, columns: headers.length });
  if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
  var current = sh.getRange(1,1,1,headers.length).getDisplayValues()[0];
  if (current.join('\u0001') !== headers.join('\u0001')) sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  return sh;
}
function pmhgAppend_(sh, obj) {
  var headers = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
  sh.appendRow(headers.map(function(h){ return Object.prototype.hasOwnProperty.call(obj,h) ? obj[h] : ''; }));
  return sh.getLastRow();
}
function ensurePersonaMvpHourlyTabs_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  pmhgEnsureSheet_(ss,'PERSONA_MVP_HOURLY',['RUN_ID','STARTED_AT','FINISHED_AT','SOURCE_WAKE','RUNTIME_ACTION','RUNNER_ACTION','COMPARE_ROUTE','TEMPLATE_STATUS','MISSING_COMPONENTS','SEED_ACTION','ERROR_CLASS','LAST_GOOD','RESUME_POINT','STATUS','NOTES'],3000);
  pmhgEnsureSheet_(ss,'PERSONA_COMPARE_SEED',['COMPARE_SEED_ID','PERSONA_ID','IMAGE_SOURCE','VOICE_SOURCE','LANGUAGE_SOURCE','MOTION_SOURCE','LIPSYNC_SOURCE','FLOW_ROLE','EVIDENCE','STATUS','CREATED_AT'],5000);
  pmhgEnsureSheet_(ss,'PERSONA_RUNTIME_LEASE',['LEASE_ID','RUNNER_ID','JOB_ID','STATUS','HEARTBEAT_AGE_MIN','CLAIMED_AGE_SEC','DECISION','ERROR_CLASS','LAST_GOOD','RESUME_POINT','UPDATED_AT'],5000);
  return { ok:true };
}
function runPersonaMvpHourlyGovernor_(ss, context) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  context = context || {};
  ensurePersonaMvpHourlyTabs_(ss);
  var startedMs = Number(context.startedMs || Date.now());
  var runtime = pmhgRuntimeDecision_(startedMs, Number(context.nowMs || Date.now()));
  var lease = pmhgRunnerLeaseDecision_(context.runner || {});
  var route = pmhgSelectComparisonRoute_(context.runtimeState || {});
  var completeness = pmhgTemplateCompleteness_(context.templateState || {});
  var seedStatus = completeness.complete ? 'COMPARE_SEED_READY_NEEDS_ACTUAL_X2' : 'COMPARE_SEED_GAP_LEARNING';
  var runId = 'PMVP_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyyMMdd_HHmmss');
  var runSheet = ss.getSheetByName('PERSONA_MVP_HOURLY');
  pmhgAppend_(runSheet, {
    RUN_ID: runId,
    STARTED_AT: new Date(startedMs).toISOString(),
    FINISHED_AT: new Date().toISOString(),
    SOURCE_WAKE: PERSONA_MVP_HOURLY_GOVERNOR_V1.schedulerMode,
    RUNTIME_ACTION: runtime.action,
    RUNNER_ACTION: lease.action,
    COMPARE_ROUTE: JSON.stringify(route),
    TEMPLATE_STATUS: completeness.status,
    MISSING_COMPONENTS: completeness.missing.join('|'),
    SEED_ACTION: seedStatus,
    ERROR_CLASS: lease.errorClass,
    LAST_GOOD: pmhgNorm_(context.lastGood),
    RESUME_POINT: runtime.action === 'CONTINUE' ? 'NEXT_10M_LEARNING_OR_HOURLY_COMPARE' : 'SAVE_PARTIAL→RELEASE_LEASE_IF_STALE→RESUME_FROM_LAST_GOOD',
    STATUS: runtime.action === 'STOP_AND_RESUME' ? 'PARTIAL_SAVED_RESUME_REQUIRED' : 'GOVERNOR_PASS',
    NOTES: 'VTube/Animation/NotebookLM/Flow comparison is evidence-weighted. Source/preview does not equal actual output. Production promotion requires Drive output/readback x2.'
  });
  return { ok:true, runId:runId, runtime:runtime, lease:lease, route:route, completeness:completeness, seedStatus:seedStatus, installNewTrigger:false };
}
function runPersonaMvpHourlyGovernorIfDue_(ss, context) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  context = context || {};
  var props = PropertiesService.getScriptProperties();
  var key = 'PERSONA_MVP_HOURLY_LAST_RUN_AT';
  var lastMs = Number(props.getProperty(key) || 0);
  var nowMs = Number(context.nowMs || Date.now());
  var intervalMs = PERSONA_MVP_HOURLY_GOVERNOR_V1.hourlyDueMinutes * 60000;
  if (lastMs && nowMs - lastMs < intervalMs) return { ok:true, ran:false, nextDueMs:lastMs + intervalMs, installNewTrigger:false };
  var result = runPersonaMvpHourlyGovernor_(ss, context);
  if (result.ok) props.setProperty(key,String(nowMs));
  return { ok:result.ok, ran:true, result:result, installNewTrigger:false };
}
function ensurePersonaMvpHourlyTrigger_() {
  return {
    ok:true,
    installNewTrigger:false,
    physicalWake:'existing processTaskQueue/factory 5m trigger',
    logicalHourlyDueMinutes:60,
    safeYieldSeconds:PERSONA_MVP_HOURLY_GOVERNOR_V1.safeYieldSeconds,
    hardStopSeconds:PERSONA_MVP_HOURLY_GOVERNOR_V1.hardStopSeconds,
    handler:'runPersonaMvpHourlyGovernorIfDue_',
    policy:'No duplicate timer. Long work is sliced before 5 minutes, partial state is preserved, stale claims are released/requeued, and comparison learning is promoted only after actual output + Drive readback x2.'
  };
}
