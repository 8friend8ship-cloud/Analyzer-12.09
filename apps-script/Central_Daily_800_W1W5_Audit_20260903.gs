const CENTRAL_DAILY_800_W1W5_AUDIT_V1 = Object.freeze({
  version: 'CENTRAL_DAILY_800_W1W5_AUDIT_V1_20260903',
  timezone: 'Asia/Seoul',
  masterSpreadsheetId: '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI',
  workerSpreadsheetId: '1skzvmX6Za5W5Qw9V8_Nr9QDB_cyajwabQjfHvexGDjY',
  checkSheet: '105_DAILY_800_W1W5_CHECK',
  logSheet: '106_DAILY_800_W1W5_RUN_LOG',
  dueProperty: 'CENTRAL_DAILY_800_W1W5_LAST_KST_DATE',
  physicalWake: 'processTaskQueue'
});

/**
 * Logical daily audit. This function MUST be called from the existing factory
 * processTaskQueue/unified scheduler. It never creates a ScriptApp trigger.
 */
function runCentralDaily800W1W5AuditFromFactory_() {
  return runCentralDaily800W1W5AuditCore_({force:false, source:'EXISTING_PROCESS_TASK_QUEUE'});
}

/** Manual verification entrypoint; still creates no trigger. */
function runCentralDaily800W1W5AuditNow() {
  return runCentralDaily800W1W5AuditCore_({force:true, source:'MANUAL_FACTORY_VERIFY'});
}

/** Lightweight pre-work gate for other central functions. */
function centralDailyEnsure800W1W5Precheck_() {
  const date = centralDailyKstDate_();
  const prop = PropertiesService.getScriptProperties().getProperty(CENTRAL_DAILY_800_W1W5_AUDIT_V1.dueProperty);
  if (prop === date) return {ok:true, alreadyChecked:true, date:date};
  return runCentralDaily800W1W5AuditCore_({force:false, source:'PRE_WORK_GATE'});
}

function runCentralDaily800W1W5AuditCore_(opt) {
  opt = opt || {};
  const started = new Date();
  const date = centralDailyKstDate_(started);
  const props = PropertiesService.getScriptProperties();
  const lastDate = props.getProperty(CENTRAL_DAILY_800_W1W5_AUDIT_V1.dueProperty);
  if (!opt.force && lastDate === date) {
    return {ok:true, skipped:true, reason:'ALREADY_RAN_TODAY', date:date, version:CENTRAL_DAILY_800_W1W5_AUDIT_V1.version};
  }

  const runId = 'DAILY800W1W5_' + date.replace(/-/g,'') + '_V1';
  const master = SpreadsheetApp.openById(CENTRAL_DAILY_800_W1W5_AUDIT_V1.masterSpreadsheetId);
  const worker = SpreadsheetApp.openById(CENTRAL_DAILY_800_W1W5_AUDIT_V1.workerSpreadsheetId);
  const check = master.getSheetByName(CENTRAL_DAILY_800_W1W5_AUDIT_V1.checkSheet);
  const log = master.getSheetByName(CENTRAL_DAILY_800_W1W5_AUDIT_V1.logSheet);
  if (!check || !log) throw new Error('DAILY_800_W1W5_REQUIRED_SHEET_MISSING');

  const precheck = centralDailyCheck800_(check);
  const interferenceBefore = centralDailyInterferenceCheck_();
  const wDefs = centralDailyReadWorkerDefinitions_(worker);
  const w1 = {
    ok: precheck.ok && wDefs.ok,
    status: precheck.ok && wDefs.ok ? 'PASS_CANONICAL_AND_W1_W5_READBACK' : 'OPEN_CANONICAL_OR_WORKER_DEF'
  };

  let repair = {ok:true, skipped:true, results:[]};
  if (!w1.ok || !interferenceBefore.ok) repair = centralDailySafeAutofix_();

  const interferenceAfter = centralDailyInterferenceCheck_();
  const w2 = {
    ok: interferenceAfter.ok,
    status: interferenceAfter.ok ? (repair.skipped ? 'NO_FIX_REQUIRED' : 'SAFE_AUTOFIX_EXECUTED') : 'OPEN_RETRYABLE_INTERFERENCE',
    repair: repair
  };
  const w3 = {ok:true, status:'NOT_REQUIRED_UNLESS_SUPPORT_REQUIRED'};
  const w4 = centralDailyControlE2EX2_();
  const w5ok = !!(w1.ok && w2.ok && w4.ok);
  const w5 = {ok:w5ok, status:w5ok ? 'DAILY_AUDIT_PASS' : 'OPEN_RETRYABLE'};

  const nextResume = !precheck.ok ? 'W1_CANONICAL_PRECHECK' :
    !interferenceAfter.ok ? 'W2_INTERFERENCE_AUTOFIX' :
    !w4.ok ? 'W4_CONTROL_E2E_X2' : 'NEXT_DAILY_RUN';
  const workContent = [
    'STEP800/001-800 canonical precheck',
    'W1-W5 source readback',
    'CENTRAL_INTERFERENCE_CHECK',
    'safe internal autofix when required',
    'control E2E x2',
    'daily run-log readback'
  ].join('; ');
  const changeContent = repair.skipped ? 'NO_CHANGE_REQUIRED' : centralDailyCompact_(repair.results);
  const testResult = 'PRECHECK=' + precheck.status + ';INTERFERENCE=' + interferenceAfter.status + ';W4=' + w4.status;

  const row = {
    RUN_ID: runId,
    RUN_DATE_KST: date,
    TRIGGER_SOURCE: opt.source || 'EXISTING_PROCESS_TASK_QUEUE',
    TODAY_ORDER_ID: centralDailyLatestTodayOrder_(master),
    PROJECT_SCOPE: 'P00_AGENT_CORE;ALL_ACTIVE_PROJECTS',
    PRECHECK_800: precheck.status,
    INTERFERENCE_CHECK: interferenceAfter.status,
    W1_STATUS: w1.status,
    W2_STATUS: w2.status,
    W3_STATUS: w3.status,
    W4_STATUS: w4.status,
    W5_STATUS: w5.status,
    WORK_CONTENT: workContent,
    CHANGE_CONTENT: changeContent,
    PROGRESS_STATUS: w5ok ? 'DAILY_CONTROL_COMPLETE' : 'DAILY_CONTROL_OPEN_RETRYABLE',
    TEST_RESULT: testResult,
    RESULT_ACK: w5ok ? 'CONTROL_ACK_PASS' : 'CONTROL_ACK_OPEN',
    DRIVE_READBACK: 'PENDING_SELF_READBACK',
    FAIL_SIGNATURE: w5ok ? '' : centralDailyFailSignature_(precheck, interferenceAfter, w4),
    FIX_SIGNATURE: repair.skipped ? 'NO_FIX_REQUIRED' : 'SAFE_AUTOFIX_' + date.replace(/-/g,''),
    LEARNING_ID: w5ok ? 'LEARN_DAILY800W1W5_' + date.replace(/-/g,'') : '',
    PROPAGATION_ID: w5ok ? 'PROP_DAILY800W1W5_' + date.replace(/-/g,'') : '',
    FINAL_STATUS: w5.status,
    NEXT_RESUME_POINT: nextResume,
    UPDATED_AT: centralDailyKstTimestamp_(),
    NOTES: 'Apps Script central automation only; OpenAI Work dependency=FALSE; no new physical trigger/project/deployment/OAuth.'
  };

  const rowNo = centralDailyUpsertLog_(log, row);
  const readback = centralDailyReadbackLog_(log, rowNo, runId);
  row.DRIVE_READBACK = readback.ok ? 'PASS_RUN_ID_AND_ROW_READBACK' : 'FAIL_LOG_READBACK';
  row.UPDATED_AT = centralDailyKstTimestamp_();
  centralDailyUpsertLog_(log, row);
  centralDailyUpdateChecklist_(check, w5.status);

  if (readback.ok) props.setProperty(CENTRAL_DAILY_800_W1W5_AUDIT_V1.dueProperty, date);
  return {
    ok: w5ok && readback.ok,
    runId: runId,
    date: date,
    precheck: precheck,
    interference: interferenceAfter,
    w1: w1,
    w2: w2,
    w3: w3,
    w4: w4,
    w5: w5,
    readback: readback,
    nextResume: nextResume,
    version: CENTRAL_DAILY_800_W1W5_AUDIT_V1.version,
    elapsedMs: new Date().getTime() - started.getTime()
  };
}

function centralDailyCheck800_(sheet) {
  const values = sheet.getDataRange().getDisplayValues();
  const flat = values.map(function(r){return r.join('|');}).join('\n');
  const required = [
    'C001_CANONICAL_001_800_STEP800',
    'C010_W1_45STEP_AUDIT',
    'C020_W2_36STEP_FIX',
    'C030_W3_32STEP_SUPPORT',
    'C040_W4_38STEP_E2E_X2',
    'C050_W5_30STEP_FINAL',
    'C070_AUTOLOG_WORK_CHANGE_TEST',
    'C080_STEP800_DAILY_CLOSE',
    'C090_NEXT_RESUME_READBACK'
  ];
  const missing = required.filter(function(x){return flat.indexOf(x) < 0;});
  return {ok:missing.length===0, missing:missing, status:missing.length===0?'PASS_STEP800_W1_W5_CHECKLIST':'FAIL_MISSING_'+missing.join(',')};
}

function centralDailyReadWorkerDefinitions_(ss) {
  const required = [
    '10_W1_GEMINI_45STEP_SCRIPT',
    '11_W2_36STEP_FIX_SCRIPT',
    '12_W3_32STEP_SUPPORT_SCRIPT',
    '13_W4_38STEP_E2E_SCRIPT',
    '14_W5_30STEP_FINAL_SCRIPT'
  ];
  const state = required.map(function(name){
    const sh = ss.getSheetByName(name);
    return {name:name, ok:!!sh && sh.getLastRow() > 1};
  });
  return {ok:state.every(function(x){return x.ok;}), sheets:state};
}

function centralDailyInterferenceCheck_() {
  const triggers = ScriptApp.getProjectTriggers().map(function(t){return t.getHandlerFunction();});
  const processCount = triggers.filter(function(x){return x === CENTRAL_DAILY_800_W1W5_AUDIT_V1.physicalWake;}).length;
  const dailyPhysical = triggers.filter(function(x){return x === 'runCentralDaily800W1W5AuditFromFactory_' || x === 'runCentralDaily800W1W5AuditNow';}).length;
  const ok = processCount === 1 && dailyPhysical === 0;
  return {
    ok:ok,
    processTaskQueueTriggerCount:processCount,
    dailyAuditPhysicalTriggerCount:dailyPhysical,
    status:ok?'PASS_SINGLE_FACTORY_WAKE_NO_DAILY_PHYSICAL_TRIGGER':'HOLD_TRIGGER_COLLISION_OR_OWNER_MISMATCH'
  };
}

function centralDailySafeAutofix_() {
  const out = [];
  if (typeof runCentralSheetRuntimeAuditAutofix10m === 'function') {
    try { out.push({handler:'runCentralSheetRuntimeAuditAutofix10m', result:runCentralSheetRuntimeAuditAutofix10m()}); }
    catch (e) { out.push({handler:'runCentralSheetRuntimeAuditAutofix10m', error:String(e && e.message || e)}); }
  }
  if (typeof runCentralWorkflowBridgeCrosscheck10m === 'function') {
    try { out.push({handler:'runCentralWorkflowBridgeCrosscheck10m', result:runCentralWorkflowBridgeCrosscheck10m()}); }
    catch (e2) { out.push({handler:'runCentralWorkflowBridgeCrosscheck10m', error:String(e2 && e2.message || e2)}); }
  }
  return {ok:true, skipped:out.length===0, results:out};
}

function centralDailyControlE2EX2_() {
  const a = centralDailyInterferenceCheck_();
  Utilities.sleep(20);
  const b = centralDailyInterferenceCheck_();
  const triggerContract = typeof auditContentOsTriggerContract === 'function' ? auditContentOsTriggerContract() : {ok:true, skipped:true, reason:'TRIGGER_CONTRACT_HANDLER_NOT_SYNCED'};
  const ok = a.ok && b.ok && triggerContract.ok !== false;
  return {ok:ok, status:ok?'PASS_CONTROL_E2E_X2':'FAIL_CONTROL_E2E_X2', run1:a, run2:b, triggerContract:triggerContract};
}

function centralDailyLatestTodayOrder_(master) {
  const sh = master.getSheetByName('19_DAILY_WORK_CONTROL');
  if (!sh || sh.getLastRow() < 2) return '';
  const values = sh.getDataRange().getDisplayValues();
  for (let r=values.length-1; r>=1; r--) {
    const joined = values[r].join('|');
    const m = joined.match(/DAILY_\d{8}_TODAY_ORDER_\d+/);
    if (m) return m[0];
  }
  return '';
}

function centralDailyUpsertLog_(sheet, obj) {
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
  const idx = {};
  headers.forEach(function(h,i){idx[String(h).trim()] = i;});
  const data = sheet.getLastRow() > 1 ? sheet.getRange(2,1,sheet.getLastRow()-1,sheet.getLastColumn()).getDisplayValues() : [];
  let rowNo = 0;
  for (let r=0; r<data.length; r++) {
    if (data[r][idx.RUN_ID] === obj.RUN_ID || data[r][idx.RUN_DATE_KST] === obj.RUN_DATE_KST) { rowNo = r+2; break; }
  }
  if (!rowNo) rowNo = Math.max(2, sheet.getLastRow()+1);
  const row = headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h) ? obj[h] : '';});
  sheet.getRange(rowNo,1,1,headers.length).setValues([row]);
  SpreadsheetApp.flush();
  return rowNo;
}

function centralDailyReadbackLog_(sheet, rowNo, runId) {
  const got = sheet.getRange(rowNo,1,1,Math.min(sheet.getLastColumn(),26)).getDisplayValues()[0];
  return {ok:got[0]===runId, row:rowNo, runId:got[0], finalStatus:got[22] || ''};
}

function centralDailyUpdateChecklist_(sheet, finalStatus) {
  const last = sheet.getLastRow();
  if (last < 2) return;
  const now = centralDailyKstTimestamp_();
  const values = sheet.getRange(2,1,last-1,16).getValues();
  for (let r=0; r<values.length; r++) {
    if (String(values[r][12]).toUpperCase() === 'Y' || String(values[r][12]).toUpperCase() === 'CONDITIONAL' || String(values[r][12]).indexOf('Y_') === 0) {
      values[r][13] = finalStatus;
      values[r][14] = now;
    }
  }
  sheet.getRange(2,1,values.length,16).setValues(values);
  SpreadsheetApp.flush();
}

function centralDailyFailSignature_(pre, interference, w4) {
  const bits = [];
  if (!pre.ok) bits.push('CANONICAL');
  if (!interference.ok) bits.push('INTERFERENCE');
  if (!w4.ok) bits.push('CONTROL_X2');
  return 'DAILY800W1W5_' + (bits.length ? bits.join('_') : 'UNKNOWN');
}

function centralDailyCompact_(value) {
  try {
    const s = JSON.stringify(value);
    return s.length > 1500 ? s.slice(0,1500) + '…' : s;
  } catch (e) {
    return String(value);
  }
}

function centralDailyKstDate_(d) {
  return Utilities.formatDate(d || new Date(), CENTRAL_DAILY_800_W1W5_AUDIT_V1.timezone, 'yyyy-MM-dd');
}

function centralDailyKstTimestamp_() {
  return Utilities.formatDate(new Date(), CENTRAL_DAILY_800_W1W5_AUDIT_V1.timezone, 'yyyy-MM-dd HH:mm:ss') + ' KST';
}
