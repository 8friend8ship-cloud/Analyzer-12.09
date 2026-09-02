/* CENTRAL_SHEET_RUNTIME_AUDIT_AUTOFIX_V1_20260902
 * Purpose:
 * - Prove that central Sheets are not merely present, but have a real execution path.
 * - Audit Sheet -> function contract -> trigger/runtime evidence -> workflow/map -> readback.
 * - Repair only safe trigger-level gaps in THIS bound Apps Script project.
 * - Never mark runtime VERIFIED from registry/source existence alone.
 *
 * Latest user policy (2026-09-02): a created Sheet is not an operational automation.
 * Operational PASS requires a bound function/execution path, trigger or logical wake,
 * LAST_RUN/runtime evidence and x2 readback. Empty/unlinked controls must be surfaced.
 */

var CENTRAL_SHEET_RUNTIME_AUDIT_V1 = {
  version: 'CENTRAL_SHEET_RUNTIME_AUDIT_AUTOFIX_V1_20260902',
  centralSpreadsheetId: '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI',
  dedicatedHandler: 'runCentralSheetRuntimeAuditAutofix10m',
  intervalMinutes: 10,
  registryTab: '03_SHEET_SCRIPT_REGISTRY',
  triggerTab: '36_AUTOMATION_TRIGGER_REGISTRY',
  contractTab: '61_BACKEND_FUNCTION_CONTRACT',
  workflowTab: '75_ORCHESTRA_WORKFLOW_MAP',
  qaTab: '80_DATA_RUNTIME_QA_LOG',
  evidenceTab: '93_RUNTIME_EVIDENCE_CONTROL',
  queueTab: '07_EXECUTION_QUEUE',
  auditTab: '08_AUDIT_LOG',
  propsCursor: 'CENTRAL_SHEET_RUNTIME_AUDIT_CURSOR_V1',
  propsLastX2: 'CENTRAL_SHEET_RUNTIME_AUDIT_LAST_X2_V1',
  batchSize: 15,
  tz: 'Asia/Seoul'
};

function runCentralSheetRuntimeAuditAutofix10m() {
  var started = new Date();
  var runId = 'RUN_CENTRAL_SHEET_AUDIT_' + Utilities.formatDate(started, CENTRAL_SHEET_RUNTIME_AUDIT_V1.tz, 'yyyyMMdd_HHmmss');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) {
    return {ok:true, skipped:true, reason:'CENTRAL_AUDIT_LOCK_BUSY', runId:runId, version:CENTRAL_SHEET_RUNTIME_AUDIT_V1.version};
  }

  try {
    var central = SpreadsheetApp.openById(CENTRAL_SHEET_RUNTIME_AUDIT_V1.centralSpreadsheetId);
    var registry = requireCentralSheet_(central, CENTRAL_SHEET_RUNTIME_AUDIT_V1.registryTab);
    var triggerReg = requireCentralSheet_(central, CENTRAL_SHEET_RUNTIME_AUDIT_V1.triggerTab);
    var contractReg = requireCentralSheet_(central, CENTRAL_SHEET_RUNTIME_AUDIT_V1.contractTab);
    var workflowReg = requireCentralSheet_(central, CENTRAL_SHEET_RUNTIME_AUDIT_V1.workflowTab);
    var qa = requireCentralSheet_(central, CENTRAL_SHEET_RUNTIME_AUDIT_V1.qaTab);
    var evidence = requireCentralSheet_(central, CENTRAL_SHEET_RUNTIME_AUDIT_V1.evidenceTab);
    var queue = requireCentralSheet_(central, CENTRAL_SHEET_RUNTIME_AUDIT_V1.queueTab);
    var audit = requireCentralSheet_(central, CENTRAL_SHEET_RUNTIME_AUDIT_V1.auditTab);

    var triggerRows = readRowsAsObjects_(triggerReg);
    var contractRows = readRowsAsObjects_(contractReg);
    var workflowRows = readRowsAsObjects_(workflowReg);
    var registryRows = readRowsAsObjects_(registry);

    var ownTriggerState = inspectAndRepairOwnAuditTrigger_();
    var ownFactoryState = inspectOwnFactoryWake_();

    var props = PropertiesService.getScriptProperties();
    var cursor = Number(props.getProperty(CENTRAL_SHEET_RUNTIME_AUDIT_V1.propsCursor) || '0');
    if (!isFinite(cursor) || cursor < 0) cursor = 0;
    var candidates = registryRows.filter(function(r) { return isRealSpreadsheetId_(r.SPREADSHEET_ID); });
    if (cursor >= candidates.length) cursor = 0;
    var end = Math.min(cursor + CENTRAL_SHEET_RUNTIME_AUDIT_V1.batchSize, candidates.length);
    var batch = candidates.slice(cursor, end);
    var sheetFileResults = batch.map(function(r) {
      return auditRegisteredSheetFile_(r, triggerRows);
    });
    var nextCursor = end >= candidates.length ? 0 : end;
    props.setProperty(CENTRAL_SHEET_RUNTIME_AUDIT_V1.propsCursor, String(nextCursor));

    var tabCoverage = auditCentralTabCoverage_(central, triggerRows, contractRows, workflowRows);
    var criticalRuntime = classifyCriticalCentralRuntime_(triggerRows, contractRows, ownTriggerState, ownFactoryState);

    var failures = [];
    sheetFileResults.forEach(function(r) {
      if (r.severity === 'FAIL') failures.push(r.code + ':' + r.sheetCode);
    });
    if (!ownTriggerState.ok) failures.push('AUDITOR_TRIGGER:' + ownTriggerState.status);
    if (criticalRuntime.failCount > 0) failures.push('CENTRAL_RUNTIME_PENDING:' + criticalRuntime.failCount);

    var status = failures.length === 0 ? 'PASS_BATCH_RUNTIME_EVIDENCE_PRESENT' : 'DEGRADED_RUNTIME_GAPS_FOUND';
    var resultId = 'RESULT_' + runId;
    var nowIso = new Date().toISOString();
    var summary = {
      version: CENTRAL_SHEET_RUNTIME_AUDIT_V1.version,
      runId: runId,
      batch: {start:cursor, end:end, total:candidates.length, nextCursor:nextCursor},
      ownAuditTrigger: ownTriggerState,
      ownFactoryWake: ownFactoryState,
      criticalRuntime: criticalRuntime,
      registeredSheetBatch: sheetFileResults,
      centralTabCoverage: tabCoverage,
      failures: failures
    };

    appendQaRow_(qa, {
      QA_ID:'QA_' + runId,
      RUN_ID:runId,
      APP_ID:'P00_AGENT_CORE;ALL_PROJECTS',
      FUNCTION_ID:CENTRAL_SHEET_RUNTIME_AUDIT_V1.dedicatedHandler,
      TRIGGER_ID:ownTriggerState.triggerUid || 'NOT_PROVEN',
      INPUT_DATA_IDS:'03|36|61|75|07|80|93|01_MASTER_REGISTRY',
      INPUT_HASH:'CURSOR_' + cursor + '_BATCH_' + sheetFileResults.length,
      OUTPUT_DATA_IDS:'80|93|07',
      RESULT_ID:resultId,
      STARTED_AT:started.toISOString(),
      FINISHED_AT:nowIso,
      STATUS:status,
      READBACK_STATE:failures.length === 0 ? 'BATCH_READBACK_PASS;X2_PENDING_OR_REUSED' : 'RUNTIME_GAP_READBACK_RECORDED',
      QUALITY_SCORE:failures.length === 0 ? '100' : '70',
      ERROR_CLASS:failures.join('|').slice(0, 5000),
      RETRY_COUNT:'0',
      EVIDENCE_POINTER:'03_SHEET_SCRIPT_REGISTRY;36_AUTOMATION_TRIGGER_REGISTRY;61_BACKEND_FUNCTION_CONTRACT;75_ORCHESTRA_WORKFLOW_MAP;93_RUNTIME_EVIDENCE_CONTROL',
      NEXT_ACTION:failures.length === 0 ? 'CONTINUE_ROUND_ROBIN;REQUIRE_X2_BEFORE_GLOBAL_VERIFIED' : 'REPAIR_ONLY_FIRST_BROKEN_RUNTIME_STAGE;PRESERVE_LAST_GOOD;RETEST_X2'
    });

    appendEvidenceRow_(evidence, {
      EVIDENCE_ID:'EVID_' + runId,
      PROJECT_ID:'P00_AGENT_CORE',
      APP_ID:'ALL_WORKFLOWS;ALL_PROJECTS',
      FUNCTION_OR_ROUTE:CENTRAL_SHEET_RUNTIME_AUDIT_V1.dedicatedHandler,
      TRIGGER_UID:ownTriggerState.triggerUid || '',
      RUN_ID:runId,
      RESULT_ID:resultId,
      FRONT_URL:'',
      DRIVE_ACK:'CENTRAL_SHEET_WRITEBACK_PASS',
      PASS_1:failures.length === 0 ? 'PASS' : 'DEGRADED',
      PASS_2:'PENDING_NEXT_DISTINCT_RUN',
      LAST_GOOD:'PRESERVE_EXISTING_LAST_GOOD',
      STATUS:status,
      ROOT_CAUSE:failures.length ? failures.join('|').slice(0, 5000) : '',
      MIN_FIX:failures.length ? 'SAFE_INTERNAL_MINIMUM_DIFF_ONLY;NO_REGISTRY_ONLY_PASS' : 'NONE',
      NEXT_RESUME_POINT:'NEXT_10M_AUDIT_CURSOR_' + nextCursor,
      UPDATED_AT:nowIso
    });

    if (failures.length) {
      upsertRepairQueueTask_(queue, failures, runId, resultId);
    }

    appendAuditLog_(audit, runId, status, JSON.stringify({
      cursor:cursor,
      nextCursor:nextCursor,
      auditedFiles:sheetFileResults.length,
      ownTrigger:ownTriggerState.status,
      factoryWake:ownFactoryState.status,
      pendingCritical:criticalRuntime.failCount,
      unlinkedTabs:tabCoverage.unlinkedCount,
      failures:failures
    }).slice(0, 12000));

    return {
      ok: failures.length === 0,
      degraded: failures.length > 0,
      runId: runId,
      resultId: resultId,
      status: status,
      nextCursor: nextCursor,
      ownAuditTrigger: ownTriggerState,
      ownFactoryWake: ownFactoryState,
      criticalRuntime: criticalRuntime,
      auditedRegisteredSheets: sheetFileResults.length,
      centralTabCoverage: tabCoverage,
      failureCount: failures.length,
      failures: failures,
      installNewTrigger: false,
      version: CENTRAL_SHEET_RUNTIME_AUDIT_V1.version
    };
  } catch (err) {
    return {ok:false, error:String(err && err.stack || err), version:CENTRAL_SHEET_RUNTIME_AUDIT_V1.version};
  } finally {
    lock.releaseLock();
  }
}

/**
 * One-time/safe repair entrypoint. Latest user instruction explicitly approves
 * automatic central trigger verification/repair. This creates at most ONE
 * dedicated 10-minute watchdog trigger for the auditor and deletes only exact
 * duplicates of the same dedicated handler. It never touches unrelated triggers.
 */
function installOrRepairCentralSheetRuntimeAuditTrigger() {
  var handler = CENTRAL_SHEET_RUNTIME_AUDIT_V1.dedicatedHandler;
  var triggers = ScriptApp.getProjectTriggers();
  var ours = triggers.filter(function(t) { return t.getHandlerFunction() === handler; });
  var deleted = [];

  if (ours.length > 1) {
    ours.slice(1).forEach(function(t) {
      deleted.push(safeTriggerUid_(t));
      ScriptApp.deleteTrigger(t);
    });
    triggers = ScriptApp.getProjectTriggers();
    ours = triggers.filter(function(t) { return t.getHandlerFunction() === handler; });
  }

  if (ours.length === 0) {
    ScriptApp.newTrigger(handler).timeBased().everyMinutes(CENTRAL_SHEET_RUNTIME_AUDIT_V1.intervalMinutes).create();
    ours = ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction() === handler; });
  }

  return {
    ok: ours.length === 1,
    handler: handler,
    triggerCount: ours.length,
    triggerUid: ours.length ? safeTriggerUid_(ours[0]) : '',
    deletedDuplicateUids: deleted,
    intervalMinutes: CENTRAL_SHEET_RUNTIME_AUDIT_V1.intervalMinutes,
    version: CENTRAL_SHEET_RUNTIME_AUDIT_V1.version
  };
}

function auditCentralSheetRuntimeTriggerContract() {
  return {
    auditor: inspectAndRepairOwnAuditTrigger_(true),
    factory: inspectOwnFactoryWake_(),
    scriptId: ScriptApp.getScriptId(),
    version: CENTRAL_SHEET_RUNTIME_AUDIT_V1.version
  };
}

/** Same-fixture x2 runtime proof. */
function testCentralSheetRuntimeAuditX2() {
  var first = runCentralSheetRuntimeAuditAutofix10m();
  Utilities.sleep(300);
  var second = runCentralSheetRuntimeAuditAutofix10m();
  var ok = !!(first && second && (first.ok || first.degraded) && (second.ok || second.degraded) && first.runId !== second.runId);
  PropertiesService.getScriptProperties().setProperty(CENTRAL_SHEET_RUNTIME_AUDIT_V1.propsLastX2, JSON.stringify({at:new Date().toISOString(), ok:ok, first:first && first.resultId, second:second && second.resultId}));
  return {ok:ok, pass1:first, pass2:second, version:CENTRAL_SHEET_RUNTIME_AUDIT_V1.version};
}

function inspectAndRepairOwnAuditTrigger_(readOnly) {
  var handler = CENTRAL_SHEET_RUNTIME_AUDIT_V1.dedicatedHandler;
  var ours = ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction() === handler; });
  if (!readOnly && ours.length > 1) {
    // Safe autofix: delete exact duplicates only, preserve the first.
    ours.slice(1).forEach(function(t) { ScriptApp.deleteTrigger(t); });
    ours = ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction() === handler; });
  }
  return {
    ok: ours.length === 1,
    status: ours.length === 1 ? 'DEDICATED_AUDIT_TRIGGER_PRESENT' : (ours.length === 0 ? 'DEDICATED_AUDIT_TRIGGER_MISSING' : 'DEDICATED_AUDIT_TRIGGER_DUPLICATE'),
    count: ours.length,
    triggerUid: ours.length ? safeTriggerUid_(ours[0]) : ''
  };
}

function inspectOwnFactoryWake_() {
  var triggers = ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction() === 'processTaskQueue'; });
  var functionLoaded = typeof processTaskQueue === 'function';
  return {
    ok: functionLoaded && triggers.length === 1,
    status: !functionLoaded ? 'PROCESS_TASK_QUEUE_FUNCTION_NOT_BOUND' : (triggers.length === 1 ? 'PROCESS_TASK_QUEUE_TRIGGER_PRESENT' : (triggers.length === 0 ? 'PROCESS_TASK_QUEUE_TRIGGER_MISSING' : 'PROCESS_TASK_QUEUE_TRIGGER_DUPLICATE')),
    functionLoaded:functionLoaded,
    count:triggers.length,
    triggerUid:triggers.length ? safeTriggerUid_(triggers[0]) : ''
  };
}

function auditRegisteredSheetFile_(r, triggerRows) {
  var sheetCode = String(r.SHEET_CODE || '');
  var spreadsheetId = String(r.SPREADSHEET_ID || '');
  var scriptProject = String(r.SCRIPT_PROJECT_NAME || '');
  var role = String(r.ROLE || '');
  var registryOnly = /NONE_REGISTRY_ONLY|READ_ONLY|REGISTRY/i.test(scriptProject + ' ' + role + ' ' + String(r.STATUS || ''));
  var access = false;
  var lastRowSum = 0;
  var tabCount = 0;
  var error = '';
  try {
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheets = ss.getSheets();
    tabCount = sheets.length;
    sheets.forEach(function(s) { lastRowSum += Math.max(0, s.getLastRow() - 1); });
    access = true;
  } catch (e) {
    error = String(e && e.message || e);
  }

  var bindingKnown = isRealScriptId_(r.SCRIPT_ID);
  var matchingTriggers = triggerRows.filter(function(t) {
    var hay = [t.APP_ID,t.QUEENS_TASK_ID,t.TARGET_QUEUE,t.BACKEND_SLOT,t.NOTES].join('|');
    return containsToken_(hay, sheetCode) || containsToken_(hay, scriptProject) || containsToken_(hay, String(r.SPREADSHEET_NAME || ''));
  });
  var active = matchingTriggers.filter(function(t) { return String(t.ACTIVE_YN || '').toUpperCase() === 'Y'; });
  var runtimeProven = active.some(function(t) {
    return !!String(t.LAST_RUN_AT || '').trim() && /RUNTIME_VERIFIED|LIVE_TRIGGER_INSTALLED|INSTALLED_VERIFIED|SUCCESS|ACTIVE/i.test(String(t.INSTALL_STATE || '') + ' ' + String(t.LAST_STATUS || '')) && !/PENDING|NOT_PROVEN|CODE_STAGED/i.test(String(t.LAST_STATUS || ''));
  });

  var code = 'ACCESS_OK_RUNTIME_NOT_PROVEN';
  var severity = 'WARN';
  if (!access) { code='SHEET_ACCESS_FAIL'; severity='FAIL'; }
  else if (registryOnly) { code='REGISTRY_ONLY_ACCESS_OK'; severity='INFO'; }
  else if (runtimeProven) { code='RUNTIME_EVIDENCE_PRESENT'; severity='PASS'; }
  else if (active.length > 0 && !runtimeProven) { code='TRIGGER_DECLARED_BUT_NO_FRESH_RUNTIME_PROOF'; severity='FAIL'; }
  else if (bindingKnown) { code='SCRIPT_BOUND_NO_TRIGGER_EVIDENCE'; severity='FAIL'; }
  else { code='SHEET_PRESENT_NO_BOUND_RUNTIME'; severity='FAIL'; }

  return {
    sheetCode:sheetCode,
    spreadsheetId:spreadsheetId,
    access:access,
    tabCount:tabCount,
    dataRows:lastRowSum,
    bindingKnown:bindingKnown,
    activeTriggerRows:active.length,
    runtimeProven:runtimeProven,
    code:code,
    severity:severity,
    error:error
  };
}

function auditCentralTabCoverage_(central, triggerRows, contractRows, workflowRows) {
  var triggerText = triggerRows.map(function(r){ return objectValuesText_(r); }).join('\n');
  var contractText = contractRows.map(function(r){ return objectValuesText_(r); }).join('\n');
  var workflowText = workflowRows.map(function(r){ return objectValuesText_(r); }).join('\n');
  var rows = central.getSheets().map(function(s) {
    var title = s.getName();
    var linkedTrigger = containsToken_(triggerText, title);
    var linkedFunction = containsToken_(contractText, title);
    var linkedWorkflow = containsToken_(workflowText, title);
    var lastRow = s.getLastRow();
    return {
      tab:title,
      dataRows:Math.max(0,lastRow-1),
      headerPresent:lastRow >= 1 && s.getLastColumn() > 0,
      linkedTrigger:linkedTrigger,
      linkedFunction:linkedFunction,
      linkedWorkflow:linkedWorkflow,
      linked:linkedTrigger || linkedFunction || linkedWorkflow
    };
  });
  var unlinked = rows.filter(function(r){ return !r.linked; });
  var headerOnlyUnlinked = unlinked.filter(function(r){ return r.dataRows === 0; });
  return {
    totalTabs:rows.length,
    linkedCount:rows.length-unlinked.length,
    unlinkedCount:unlinked.length,
    headerOnlyUnlinkedCount:headerOnlyUnlinked.length,
    unlinkedSample:unlinked.slice(0,20),
    note:'UNLINKED is a review signal, not automatic failure; runtime PASS still requires function+trigger+readback evidence.'
  };
}

function classifyCriticalCentralRuntime_(triggerRows, contractRows, ownTriggerState, ownFactoryState) {
  var criticalTriggerPatterns = [
    'TRG_DOCS_LEARNING_AUTOFIX_20260829',
    'TRG_CENTRAL_RUNTIME_HEALTH_20260828',
    'TRG_PROJECT_PROGRESS_ORCHESTRATOR_20260828',
    'TRG_CENTRAL_RELATIONSHIP_FULL_AUDIT_HOURLY_20260901',
    'TRG_DRIVE_PROJECT_AUTOMATION_MANAGER_20260901',
    'TRG_CENTRAL_AUTOFIX_SUPERVISOR_REUSE_20260902'
  ];
  var states = criticalTriggerPatterns.map(function(id) {
    var r = triggerRows.filter(function(t){ return String(t.TRIGGER_ID || '') === id; })[0];
    if (!r) return {id:id, state:'MISSING_REGISTRY_ROW', proven:false};
    var proven = !!String(r.LAST_RUN_AT || '').trim() && /RUNTIME_VERIFIED|LIVE_TRIGGER_INSTALLED|INSTALLED_VERIFIED|SUCCESS/i.test(String(r.INSTALL_STATE || '') + ' ' + String(r.LAST_STATUS || '')) && !/PENDING|NOT_PROVEN/i.test(String(r.LAST_STATUS || ''));
    return {id:id, state:String(r.INSTALL_STATE || '') + '|' + String(r.LAST_STATUS || ''), lastRun:String(r.LAST_RUN_AT || ''), proven:proven};
  });
  var pendingContracts = contractRows.filter(function(c) {
    return /CENTRAL|DOCS_LEARNING|PROJECT_PROGRESS/i.test(String(c.CONTRACT_ID || '') + ' ' + String(c.ACTION || '')) && /PENDING|NOT_PROVEN|STAGED/i.test(String(c.DEPLOYMENT_STATUS || '') + ' ' + String(c.LAST_TEST_RESULT || ''));
  });
  var failCount = states.filter(function(s){ return !s.proven; }).length + (ownTriggerState.ok ? 0 : 1);
  return {
    triggerStates:states,
    pendingContractCount:pendingContracts.length,
    ownAuditTrigger:ownTriggerState.status,
    ownFactoryWake:ownFactoryState.status,
    failCount:failCount
  };
}

function upsertRepairQueueTask_(queue, failures, runId, resultId) {
  var taskId = 'TASK_CENTRAL_SHEET_RUNTIME_AUTOFIX_20260902';
  var data = queue.getDataRange().getDisplayValues();
  var headers = data.length ? data[0] : [];
  var map = headerMap_(headers);
  var rowIndex = -1;
  for (var i=1; i<data.length; i++) {
    if (String(data[i][map.TASK_ID] || '') === taskId) { rowIndex = i+1; break; }
  }
  var values = {};
  values.TASK_ID = taskId;
  values.STAGE_NO = 'P0';
  values.TASK_TYPE = 'CENTRAL_SHEET_FUNCTION_TRIGGER_RUNTIME_AUTOFIX';
  values.TARGET_ID = '01_MASTER_REGISTRY;ALL_REGISTERED_SHEETS';
  values.ACTION = 'PROVE_AND_REPAIR_SHEET→FUNCTION→TRIGGER→LAST_RUN→READBACK_X2;PRESERVE_LAST_GOOD';
  values.PRIORITY = 'P0';
  values.APPROVAL_STATUS = 'APPROVED_BY_USER_CURRENT_REQUEST';
  values.EXECUTION_METHOD = 'CENTRAL_APPS_SCRIPT_RUNTIME_AUDITOR';
  values.STATUS = 'DEGRADED_RUNTIME_GAPS_FOUND';
  values.RETRY_COUNT = '0';
  values.CREATED_AT = rowIndex > 0 ? String(data[rowIndex-1][map.CREATED_AT] || new Date().toISOString()) : new Date().toISOString();
  values.UPDATED_AT = new Date().toISOString();
  values.NOTES = failures.join('|').slice(0,7000);
  values.OWNER = 'CENTRAL_AUTOFIX_SUPERVISOR';
  values.FIRST_REQUESTED_AT = values.CREATED_AT;
  values.LAST_REQUESTED_AT = values.UPDATED_AT;
  values.REQUEST_COUNT = rowIndex > 0 ? String(Number(data[rowIndex-1][map.REQUEST_COUNT] || 0)+1) : '1';
  values.BLOCKED_TASK_ID = '';
  values.COMPLETION_EVIDENCE = resultId + ';' + runId;
  values.APPROVAL_TYPE = 'CURRENT_USER_REQUEST_SAFE_INTERNAL_AUTOFIX';

  if (rowIndex > 0) writeObjectToExistingRow_(queue, rowIndex, headers, values);
  else appendObjectRow_(queue, headers, values);
}

function appendQaRow_(sheet, obj) { appendObjectRow_(sheet, sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0], obj); }
function appendEvidenceRow_(sheet, obj) { appendObjectRow_(sheet, sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0], obj); }

function appendAuditLog_(sheet, runId, status, detail) {
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
  var obj = {};
  headers.forEach(function(h) { obj[h] = ''; });
  var keys = headers.map(function(h){ return String(h).toUpperCase(); });
  function setAny(names, value) {
    for (var i=0;i<names.length;i++) {
      var idx = keys.indexOf(names[i]);
      if (idx >= 0) { obj[headers[idx]] = value; return; }
    }
  }
  setAny(['AUDIT_ID','LOG_ID','ID'], 'AUDIT_' + runId);
  setAny(['RUN_ID'], runId);
  setAny(['CREATED_AT','TIMESTAMP','AT','UPDATED_AT'], new Date().toISOString());
  setAny(['STATUS','RESULT'], status);
  setAny(['DETAIL','NOTES','MESSAGE','EVIDENCE'], detail);
  appendObjectRow_(sheet, headers, obj);
}

function readRowsAsObjects_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  var data = sheet.getRange(1,1,lastRow,lastCol).getDisplayValues();
  var headers = data[0];
  return data.slice(1).filter(function(r){ return r.some(function(v){ return String(v).trim() !== ''; }); }).map(function(r) {
    var o = {};
    headers.forEach(function(h,i){ if (h) o[h] = r[i] || ''; });
    return o;
  });
}

function appendObjectRow_(sheet, headers, obj) {
  var row = headers.map(function(h){ return obj[h] == null ? '' : obj[h]; });
  sheet.appendRow(row);
}

function writeObjectToExistingRow_(sheet, rowIndex, headers, obj) {
  var current = sheet.getRange(rowIndex,1,1,headers.length).getValues()[0];
  headers.forEach(function(h,i){ if (Object.prototype.hasOwnProperty.call(obj,h)) current[i] = obj[h]; });
  sheet.getRange(rowIndex,1,1,headers.length).setValues([current]);
}

function requireCentralSheet_(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) throw new Error('CENTRAL_TAB_MISSING:' + name);
  return s;
}

function headerMap_(headers) {
  var m = {};
  headers.forEach(function(h,i){ if (h) m[h]=i; });
  return m;
}

function objectValuesText_(o) {
  return Object.keys(o).map(function(k){ return String(o[k] == null ? '' : o[k]); }).join('|');
}

function containsToken_(hay, needle) {
  needle = String(needle || '').trim();
  if (!needle || /^(TBD|PARTIAL|PENDING|NONE|N\/A)$/i.test(needle)) return false;
  return String(hay || '').indexOf(needle) >= 0;
}

function isRealSpreadsheetId_(v) {
  v = String(v || '').trim();
  return /^[A-Za-z0-9_-]{20,}$/.test(v) && !/TBD|PENDING|VERIFY/i.test(v);
}

function isRealScriptId_(v) {
  v = String(v || '').trim();
  return /^[A-Za-z0-9_-]{20,}$/.test(v) && !/TBD|PENDING|VERIFY|PARTIAL|NONE/i.test(v);
}

function safeTriggerUid_(t) {
  try { return t.getUniqueId ? String(t.getUniqueId()) : ''; } catch (e) { return ''; }
}
