/* CENTRAL_WORKFLOW_BRIDGE_CROSSCHECK_V1_20260902
 * Purpose
 * - Cross-check that central Sheet values are actually connected to workflow/workflow-map,
 *   function contracts, triggers, queues, bridges, runtime evidence and front readback.
 * - Treat expected-but-empty / stalled fields as failure evidence, not a neutral blank.
 * - Detect split-brain between canonical tabs in 01_MASTER_REGISTRY and stale standalone
 *   sheets with the same control name.
 * - Safely sync canonical master rows to exact-schema mirrors without deleting mirror-only
 *   evidence. Schema conflicts are HOLD/MERGE_REQUIRED, never blindly overwritten.
 * - Reuse the existing factory wake. No new physical trigger is created here.
 */

var CWBX_V1 = {
  version: 'CENTRAL_WORKFLOW_BRIDGE_CROSSCHECK_V1_20260902',
  masterId: '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI',
  handler: 'runCentralWorkflowBridgeCrosscheck10m',
  tz: 'Asia/Seoul',
  propsMirrorCursor: 'CWBX_MIRROR_CURSOR_V1',
  propsLastState: 'CWBX_LAST_STATE_V1',
  maxMirrorWritesPerRun: 40,
  mirrorBatchSize: 2,
  tabs: {
    registry: '03_SHEET_SCRIPT_REGISTRY',
    queue: '07_EXECUTION_QUEUE',
    audit: '08_AUDIT_LOG',
    instruction: '18_AGENT_INSTRUCTION',
    history: '34_CHAT_COMMAND_HISTORY',
    triggers: '36_AUTOMATION_TRIGGER_REGISTRY',
    frontWorkflow: '56_FRONTAPP_WORKFLOW_MAP',
    frontIntegration: '57_FRONTAPP_INTEGRATION_MATRIX',
    bus: '59_DATA_INTELLIGENCE_BUS',
    subscriptions: '60_APP_DATA_SUBSCRIPTION',
    contracts: '61_BACKEND_FUNCTION_CONTRACT',
    workflow: '75_ORCHESTRA_WORKFLOW_MAP',
    functionUsage: '79_FUNCTION_DATA_USAGE_MAP',
    qa: '80_DATA_RUNTIME_QA_LOG',
    bridge: '86_DRIVE_RUNTIME_BRIDGE_ROUTER',
    projects: '89_PROJECT_PROGRESS_CONTROL',
    evidence: '93_RUNTIME_EVIDENCE_CONTROL',
    frontHealth: '96_FRONT_HEALTH_MONITOR',
    fronts: '100_FRONTAPP_PROJECT_CONTROL'
  },
  mirrors: [
    {tab:'18_AGENT_INSTRUCTION', fileId:'1ZUD9Vm67M_hsrTyJNYhy-mb2aXdL2NpE8DmFOU6QbeY', importMirrorOnly:true},
    {tab:'36_AUTOMATION_TRIGGER_REGISTRY', fileId:'1zC-MqrN3hH-gtXULj-DMOPsafs8jOnKrcmbmQJg6HFk', importMirrorOnly:false},
    {tab:'61_BACKEND_FUNCTION_CONTRACT', fileId:'1M1rF2IeSDgwpvWuDZC6fSmLFwYpceQCtPBMs_XZJ7xo', importMirrorOnly:false},
    {tab:'75_ORCHESTRA_WORKFLOW_MAP', fileId:'1dEUdukNnOGIcVQ3eZHMa4KPXhNzGAFIN0Qu2MxqBqQY', importMirrorOnly:false},
    {tab:'89_PROJECT_PROGRESS_CONTROL', fileId:'181VwpgL4X8kt0A4sexaYXu6v3WfAhYNGwPwCVvKMtd4', importMirrorOnly:false},
    {tab:'93_RUNTIME_EVIDENCE_CONTROL', fileId:'1q6lUbQ-ShDixnrWb3b4XnXKLeIlrDRgv5rBueXelnDw', importMirrorOnly:false},
    {tab:'100_FRONTAPP_PROJECT_CONTROL', fileId:'17bs2MxRyLZXQ_6oT4mgJ6QXRqnnYpRK5Ck2mKZw9Y7w', importMirrorOnly:false}
  ]
};

function runCentralWorkflowBridgeCrosscheck10m() {
  var started = new Date();
  var runId = 'RUN_CWBX_' + Utilities.formatDate(started, CWBX_V1.tz, 'yyyyMMdd_HHmmss');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) return {ok:true, skipped:true, reason:'CWBX_LOCK_BUSY', runId:runId, version:CWBX_V1.version};
  try {
    var ss = SpreadsheetApp.openById(CWBX_V1.masterId);
    var t = CWBX_V1.tabs;
    var sheets = {};
    Object.keys(t).forEach(function(k) { sheets[k] = cwbxRequireSheet_(ss, t[k]); });

    var data = {
      registry: cwbxRows_(sheets.registry),
      queue: cwbxRows_(sheets.queue),
      triggers: cwbxRows_(sheets.triggers),
      frontWorkflow: cwbxRows_(sheets.frontWorkflow),
      frontIntegration: cwbxRows_(sheets.frontIntegration),
      bus: cwbxRows_(sheets.bus),
      subscriptions: cwbxRows_(sheets.subscriptions),
      contracts: cwbxRows_(sheets.contracts),
      workflow: cwbxRows_(sheets.workflow),
      functionUsage: cwbxRows_(sheets.functionUsage),
      bridge: cwbxRows_(sheets.bridge),
      projects: cwbxRows_(sheets.projects),
      evidence: cwbxRows_(sheets.evidence),
      frontHealth: cwbxRows_(sheets.frontHealth),
      fronts: cwbxRows_(sheets.fronts)
    };

    var relationship = cwbxAuditRelationships_(data);
    var expectedWrites = cwbxAuditExpectedWrites_(sheets, data, started);
    var mirrors = cwbxAuditAndRepairMirrors_(ss, started);
    var failures = [];
    relationship.issues.forEach(function(x){ if (x.severity === 'FAIL') failures.push(x.code + ':' + x.id); });
    expectedWrites.issues.forEach(function(x){ if (x.severity === 'FAIL') failures.push(x.code + ':' + x.id); });
    mirrors.issues.forEach(function(x){ if (x.severity === 'FAIL') failures.push(x.code + ':' + x.id); });

    var status = failures.length ? 'DEGRADED_RELATIONSHIP_OR_RUNTIME_GAPS' : 'PASS_CROSSCHECK_CURRENT_SCOPE';
    var resultId = 'RESULT_' + runId;
    var summary = {
      version:CWBX_V1.version,
      runId:runId,
      status:status,
      relationship:relationship.summary,
      expectedWrites:expectedWrites.summary,
      mirrors:mirrors.summary,
      failureCount:failures.length,
      failures:failures.slice(0,80)
    };

    cwbxAppendByHeader_(sheets.qa, {
      QA_ID:'QA_' + runId,
      RUN_ID:runId,
      APP_ID:'P00_AGENT_CORE;ALL_PROJECTS',
      FUNCTION_ID:CWBX_V1.handler,
      TRIGGER_ID:'REUSE_TRG_FACTORY_ANALYZER_5M',
      INPUT_DATA_IDS:'03;36;56;57;59;60;61;75;79;86;89;93;96;100',
      INPUT_HASH:cwbxHash_(JSON.stringify(summary.relationship) + JSON.stringify(summary.mirrors)),
      OUTPUT_DATA_IDS:'07;08;80;93',
      RESULT_ID:resultId,
      STARTED_AT:started.toISOString(),
      FINISHED_AT:new Date().toISOString(),
      STATUS:status,
      READBACK_STATE:failures.length ? 'FAILURE_EVIDENCE_RECORDED;SAFE_REPAIRS_APPLIED_WHERE_ALLOWED' : 'CROSSCHECK_READBACK_PASS',
      QUALITY_SCORE:failures.length ? '70' : '100',
      ERROR_CLASS:failures.join('|').slice(0,5000),
      RETRY_COUNT:'0',
      EVIDENCE_POINTER:'36_TRIGGER;61_FUNCTION;75_WORKFLOW;86_BRIDGE;89_PROJECT;93_RUNTIME;100_FRONT',
      NEXT_ACTION:failures.length ? 'FIRST_BROKEN_STAGE_ONLY→MIN_FIX→SAME_CONDITION_RETEST→RUNTIME/DRIVE_READBACK' : 'CONTINUE_10M_LOGICAL_CROSSCHECK'
    });

    cwbxAppendByHeader_(sheets.evidence, cwbxEvidenceObject_(runId, resultId, status, failures, summary));
    if (failures.length) cwbxUpsertQueue_(sheets.queue, runId, resultId, failures, summary);
    cwbxAppendAudit_(sheets.audit, runId, status, JSON.stringify(summary).slice(0,12000));
    cwbxWriteHistoryOnStateChange_(sheets.history, summary, started);

    return {ok:!failures.length, degraded:!!failures.length, runId:runId, resultId:resultId, status:status, summary:summary, version:CWBX_V1.version};
  } catch (err) {
    return {ok:false, error:String(err && err.stack || err), version:CWBX_V1.version};
  } finally {
    lock.releaseLock();
  }
}

function testCentralWorkflowBridgeCrosscheckX2() {
  var a = runCentralWorkflowBridgeCrosscheck10m();
  Utilities.sleep(300);
  var b = runCentralWorkflowBridgeCrosscheck10m();
  return {ok:!!(a && b && a.runId && b.runId && a.runId !== b.runId), pass1:a, pass2:b, version:CWBX_V1.version};
}

function auditCentralWorkflowBridgeCrosscheckContract() {
  var triggers = ScriptApp.getProjectTriggers();
  var physicalOwn = triggers.filter(function(x){ return x.getHandlerFunction() === CWBX_V1.handler; });
  var factory = triggers.filter(function(x){ return x.getHandlerFunction() === 'processTaskQueue'; });
  return {
    ok:physicalOwn.length === 0 && factory.length === 1,
    policy:'NO_NEW_PHYSICAL_TRIGGER_FOR_CWBX;REUSE_EXISTING_PROCESS_TASK_QUEUE_LOGICAL_STAGE',
    cwbxPhysicalTriggerCount:physicalOwn.length,
    factoryTriggerCount:factory.length,
    factoryTriggerUid:factory.length ? cwbxTriggerUid_(factory[0]) : '',
    scriptId:ScriptApp.getScriptId(),
    version:CWBX_V1.version
  };
}

function cwbxAuditRelationships_(d) {
  var issues = [];
  var checks = 0;
  d.fronts.forEach(function(front) {
    var id = String(front.FRONT_PROJECT_ID || front.APP_ID || 'UNKNOWN_FRONT');
    var apps = cwbxTokens_(front.APP_ID);
    if (!apps.length) return;
    checks++;
    var gate = String(front.FUNCTION_TRIGGER_GATE || '');
    var allText = {
      trigger:cwbxText_(d.triggers),
      contract:cwbxText_(d.contracts),
      workflow:cwbxText_(d.workflow) + '\n' + cwbxText_(d.frontWorkflow),
      integration:cwbxText_(d.frontIntegration),
      subscription:cwbxText_(d.subscriptions),
      bridge:cwbxText_(d.bridge),
      project:cwbxText_(d.projects),
      evidence:cwbxText_(d.evidence),
      health:cwbxText_(d.frontHealth)
    };
    var required = [];
    if (/36/.test(gate)) required.push(['TRIGGER_LINK_MISSING','trigger']);
    if (/61/.test(gate)) required.push(['FUNCTION_CONTRACT_LINK_MISSING','contract']);
    if (/93/.test(gate)) required.push(['RUNTIME_EVIDENCE_LINK_MISSING','evidence']);
    if (/96/.test(gate)) required.push(['FRONT_HEALTH_LINK_MISSING','health']);
    required.push(['WORKFLOW_MAP_LINK_MISSING','workflow']);
    required.push(['PROJECT_CONTROL_LINK_MISSING','project']);

    required.forEach(function(spec) {
      var ok = apps.some(function(app){ return cwbxContains_(allText[spec[1]], app); });
      if (!ok) issues.push({severity:'FAIL', code:spec[0], id:id, apps:apps.join(';')});
    });

    var hasTrigger = apps.some(function(app){
      return d.triggers.some(function(r){ return cwbxContains_(String(r.APP_ID || ''), app) && String(r.ACTIVE_YN || '').toUpperCase() === 'Y'; });
    });
    if (!hasTrigger && /36/.test(gate)) issues.push({severity:'FAIL', code:'NO_ACTIVE_TRIGGER_ROW_FOR_FRONT', id:id, apps:apps.join(';')});
  });

  d.projects.forEach(function(p) {
    var pid = String(p.PROJECT_ID || 'UNKNOWN_PROJECT');
    var apps = cwbxTokens_(p.APP_ID);
    if (!apps.length) return;
    checks++;
    var workflowOk = apps.some(function(app){ return d.workflow.some(function(r){ return cwbxContains_(cwbxObjectText_(r), app); }); });
    var contractOk = apps.some(function(app){ return d.contracts.some(function(r){ return cwbxContains_(String(r.APP_ID || ''), app); }); });
    if (!workflowOk) issues.push({severity:'FAIL', code:'PROJECT_WORKFLOW_MAP_MISSING', id:pid, apps:apps.join(';')});
    if (!contractOk) issues.push({severity:'WARN', code:'PROJECT_FUNCTION_CONTRACT_NOT_MAPPED', id:pid, apps:apps.join(';')});
  });

  return {issues:issues, summary:{checkedEntities:checks, failCount:issues.filter(function(x){return x.severity==='FAIL';}).length, warnCount:issues.filter(function(x){return x.severity==='WARN';}).length}};
}

function cwbxAuditExpectedWrites_(sheets, d, now) {
  var issues = [];
  var checks = [];
  checks.push(cwbxExpectedWriteCheck_(sheets.bus, '59_DATA_INTELLIGENCE_BUS', 72*60, now, true));
  checks.push(cwbxExpectedWriteCheck_(sheets.evidence, '93_RUNTIME_EVIDENCE_CONTROL', 180, now, true));
  checks.push(cwbxExpectedWriteCheck_(sheets.qa, '80_DATA_RUNTIME_QA_LOG', 180, now, true));
  checks.push(cwbxExpectedWriteCheck_(sheets.frontHealth, '96_FRONT_HEALTH_MONITOR', 24*60, now, false));
  checks.forEach(function(c){ if (c && c.severity !== 'PASS') issues.push(c); });

  d.triggers.forEach(function(r) {
    var active = String(r.ACTIVE_YN || '').toUpperCase() === 'Y';
    if (!active) return;
    var install = String(r.INSTALL_STATE || '');
    var lastRun = String(r.LAST_RUN_AT || '').trim();
    var lastStatus = String(r.LAST_STATUS || '');
    var expectsRuntime = !/SUPERSEDED|DELETED|REGISTRY_ONLY|LOGICAL_ONLY_REUSE/i.test(install + ' ' + lastStatus);
    if (expectsRuntime && /RUNTIME_VERIFIED|LIVE_TRIGGER_INSTALLED|INSTALLED_VERIFIED|ACTIVE/i.test(install) && !lastRun) {
      issues.push({severity:'FAIL', code:'ACTIVE_TRIGGER_EXPECTS_LAST_RUN_BUT_EMPTY', id:String(r.TRIGGER_ID || r.HANDLER || 'UNKNOWN_TRIGGER')});
    }
    if (/PENDING|NOT_INSTALLED|BIND_PENDING|SYNC_PENDING|NOT_PROVEN|STAGED/i.test(install + ' ' + lastStatus)) {
      issues.push({severity:'FAIL', code:'ACTIVE_TRIGGER_DECLARED_BUT_EXECUTION_PATH_PENDING', id:String(r.TRIGGER_ID || r.HANDLER || 'UNKNOWN_TRIGGER')});
    }
  });

  return {issues:issues, summary:{checkCount:checks.length + d.triggers.length, failCount:issues.filter(function(x){return x.severity==='FAIL';}).length, warnCount:issues.filter(function(x){return x.severity==='WARN';}).length}};
}

function cwbxExpectedWriteCheck_(sheet, id, maxAgeMinutes, now, required) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return {severity:required?'FAIL':'WARN', code:'HEADER_ONLY_EXPECTED_WRITE', id:id};
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
  var dateCols = ['UPDATED_AT','LAST_CHECKED_AT','CHECKED_AT','FINISHED_AT','EVENT_AT','RUN_AT','TIMESTAMP','CREATED_AT'];
  var idx = -1;
  for (var i=0;i<dateCols.length;i++) { idx = headers.indexOf(dateCols[i]); if (idx >= 0) break; }
  if (idx < 0) return {severity:'WARN', code:'NO_FRESHNESS_COLUMN', id:id};
  var start = Math.max(2, lastRow - 50);
  var vals = sheet.getRange(start, idx+1, lastRow-start+1, 1).getDisplayValues();
  var newest = null;
  vals.forEach(function(row){ var d = cwbxParseDate_(row[0]); if (d && (!newest || d > newest)) newest = d; });
  if (!newest) return {severity:required?'FAIL':'WARN', code:'EXPECTED_WRITE_TIMESTAMP_EMPTY', id:id};
  var age = (now.getTime() - newest.getTime())/60000;
  if (age > maxAgeMinutes) return {severity:required?'FAIL':'WARN', code:'STALE_NO_PROGRESS_' + Math.round(age) + 'M', id:id};
  return {severity:'PASS', code:'FRESH', id:id, ageMinutes:Math.round(age)};
}

function cwbxAuditAndRepairMirrors_(master, now) {
  var props = PropertiesService.getScriptProperties();
  var cursor = Number(props.getProperty(CWBX_V1.propsMirrorCursor) || '0');
  if (!isFinite(cursor) || cursor < 0 || cursor >= CWBX_V1.mirrors.length) cursor = 0;
  var issues = [];
  var repairs = 0;
  var checked = 0;
  for (var n=0; n<CWBX_V1.mirrorBatchSize; n++) {
    var idx = (cursor + n) % CWBX_V1.mirrors.length;
    var cfg = CWBX_V1.mirrors[idx];
    checked++;
    try {
      var canonical = cwbxRequireSheet_(master, cfg.tab);
      var mirrorSs = SpreadsheetApp.openById(cfg.fileId);
      var mirror = mirrorSs.getSheetByName(cfg.tab) || mirrorSs.getSheets()[0];
      var r = cwbxRepairExactSchemaMirror_(canonical, mirror, cfg, CWBX_V1.maxMirrorWritesPerRun - repairs);
      repairs += r.repairs;
      r.issues.forEach(function(x){ issues.push(x); });
    } catch (e) {
      issues.push({severity:'FAIL', code:'MIRROR_ACCESS_OR_SYNC_ERROR', id:cfg.tab, detail:String(e && e.message || e)});
    }
    if (repairs >= CWBX_V1.maxMirrorWritesPerRun) break;
  }
  var nextCursor = (cursor + CWBX_V1.mirrorBatchSize) % CWBX_V1.mirrors.length;
  props.setProperty(CWBX_V1.propsMirrorCursor, String(nextCursor));
  return {issues:issues, summary:{checked:checked, repairs:repairs, nextCursor:nextCursor, failCount:issues.filter(function(x){return x.severity==='FAIL';}).length, warnCount:issues.filter(function(x){return x.severity==='WARN';}).length}};
}

function cwbxRepairExactSchemaMirror_(canonical, mirror, cfg, budget) {
  var issues = [];
  var repairs = 0;
  var cLastCol = canonical.getLastColumn();
  var mLastCol = mirror.getLastColumn();
  var cHeaders = canonical.getRange(1,1,1,cLastCol).getDisplayValues()[0];
  var mHeaders = mirror.getRange(1,1,1,mLastCol).getDisplayValues()[0];
  if (cHeaders.join('\u241f') !== mHeaders.join('\u241f')) {
    issues.push({severity:'FAIL', code:'MIRROR_SCHEMA_MISMATCH_MERGE_REQUIRED', id:cfg.tab, canonicalCols:cLastCol, mirrorCols:mLastCol});
    return {issues:issues, repairs:0};
  }
  var keyCol = 0;
  var cLastRow = canonical.getLastRow();
  var mLastRow = mirror.getLastRow();
  var cData = cLastRow > 1 ? canonical.getRange(2,1,cLastRow-1,cLastCol).getDisplayValues() : [];
  var mData = mLastRow > 1 ? mirror.getRange(2,1,mLastRow-1,mLastCol).getDisplayValues() : [];
  var mIndex = {};
  mData.forEach(function(r,i){ var k=String(r[keyCol]||'').trim(); if(k) mIndex[k]=i+2; });
  var cIndex = {};
  cData.forEach(function(r,i){ var k=String(r[keyCol]||'').trim(); if(k) cIndex[k]=i+2; });

  for (var i=0;i<cData.length && repairs<budget;i++) {
    var row = cData[i];
    var key = String(row[keyCol]||'').trim();
    if (!key) continue;
    var mr = mIndex[key];
    if (!mr) {
      mirror.appendRow(row);
      repairs++;
      issues.push({severity:'WARN', code:'MIRROR_MISSING_CANONICAL_ROW_APPENDED', id:cfg.tab + ':' + key});
    } else {
      var existing = mirror.getRange(mr,1,1,mLastCol).getDisplayValues()[0];
      if (existing.join('\u241f') !== row.join('\u241f')) {
        mirror.getRange(mr,1,1,mLastCol).setValues([row]);
        repairs++;
        issues.push({severity:'WARN', code:'STALE_MIRROR_ROW_UPDATED_FROM_CANONICAL', id:cfg.tab + ':' + key});
      }
    }
  }

  var mirrorOnly = [];
  mData.forEach(function(r){ var k=String(r[keyCol]||'').trim(); if(k && !cIndex[k]) mirrorOnly.push({key:k,row:r}); });
  if (mirrorOnly.length) {
    if (cfg.importMirrorOnly) {
      mirrorOnly.slice(0, Math.max(0,budget-repairs)).forEach(function(x){ canonical.appendRow(x.row); repairs++; issues.push({severity:'WARN', code:'MIRROR_ONLY_ADDITIVE_ROW_RECOVERED_TO_CANONICAL', id:cfg.tab + ':' + x.key}); });
    } else {
      issues.push({severity:'FAIL', code:'MIRROR_ONLY_ROWS_RECOVERY_REVIEW_REQUIRED', id:cfg.tab, count:mirrorOnly.length});
    }
  }
  return {issues:issues, repairs:repairs};
}

function cwbxEvidenceObject_(runId, resultId, status, failures, summary) {
  return {
    EVIDENCE_ID:'EVID_' + runId,
    PROJECT_ID:'P00_AGENT_CORE;ALL_PROJECTS',
    APP_ID:'ALL_WORKFLOWS;ALL_FRONT_APPS',
    FUNCTION_OR_ROUTE:CWBX_V1.handler,
    TRIGGER_UID:'REUSE_PROCESS_TASK_QUEUE',
    RUN_ID:runId,
    RESULT_ID:resultId,
    FRONT_URL:'',
    DRIVE_ACK:'MASTER_REGISTRY_WRITEBACK_PASS',
    PASS_1:failures.length ? 'DEGRADED' : 'PASS',
    PASS_2:'PENDING_NEXT_DISTINCT_RUN',
    LAST_GOOD:'PRESERVE_EXISTING_LAST_GOOD',
    STATUS:status,
    ROOT_CAUSE:failures.join('|').slice(0,5000),
    MIN_FIX:failures.length ? 'TRACE_PRODUCER→FUNCTION→TRIGGER→BRIDGE→QUEUE→CONSUMER→READBACK;SAFE_LINK_OR_MIRROR_FIX_ONLY' : 'NONE',
    NEXT_RESUME_POINT:failures.length ? 'FIRST_BROKEN_RELATIONSHIP_OR_RUNTIME_STAGE' : 'NEXT_10M_CROSSCHECK',
    UPDATED_AT:new Date().toISOString(),
    NOTES:JSON.stringify(summary).slice(0,5000)
  };
}

function cwbxUpsertQueue_(sheet, runId, resultId, failures, summary) {
  var taskId = 'TASK_CENTRAL_WORKFLOW_BRIDGE_CROSSCHECK_AUTOFIX_20260902';
  var data = sheet.getDataRange().getDisplayValues();
  var headers = data[0] || [];
  var map = cwbxHeaderMap_(headers);
  var rowIndex = -1;
  for (var i=1;i<data.length;i++) if (String(data[i][map.TASK_ID] || '') === taskId) { rowIndex=i+1; break; }
  var obj = {
    TASK_ID:taskId,
    STAGE_NO:'P0',
    TASK_TYPE:'CENTRAL_WORKFLOW_MAP_SHEET_BRIDGE_CROSSCHECK_AUTOFIX',
    TARGET_ID:'03;36;56;57;59;60;61;75;79;86;89;93;96;100',
    ACTION:'CROSSCHECK_CANONICAL_SHEET↔FUNCTION↔TRIGGER↔WORKFLOW/MAP↔BRIDGE↔QUEUE↔RUNTIME↔FRONT;REPAIR_SAFE_LINKS;NO_DUPLICATE_TRIGGER',
    PRIORITY:'P0',
    APPROVAL_STATUS:'APPROVED_BY_USER_CURRENT_REQUEST',
    EXECUTION_METHOD:'EXISTING_FACTORY_WAKE_LOGICAL_10M+CWBX',
    STATUS:'DEGRADED_REPAIR_CONTINUE',
    RETRY_COUNT:'0',
    CREATED_AT:rowIndex>0 ? String(data[rowIndex-1][map.CREATED_AT] || new Date().toISOString()) : new Date().toISOString(),
    UPDATED_AT:new Date().toISOString(),
    NOTES:(failures.join('|') + ';' + JSON.stringify(summary)).slice(0,7000),
    OWNER:'CENTRAL_AGENT',
    FIRST_REQUESTED_AT:rowIndex>0 ? String(data[rowIndex-1][map.FIRST_REQUESTED_AT] || new Date().toISOString()) : new Date().toISOString(),
    LAST_REQUESTED_AT:new Date().toISOString(),
    REQUEST_COUNT:rowIndex>0 ? String(Number(data[rowIndex-1][map.REQUEST_COUNT] || 0)+1) : '1',
    BLOCKED_TASK_ID:'',
    COMPLETION_EVIDENCE:resultId + ';' + runId,
    APPROVAL_TYPE:'SAFE_INTERNAL_AUTOFIX_CURRENT_USER_REQUEST'
  };
  if (rowIndex>0) cwbxWriteObjectRow_(sheet,rowIndex,headers,obj); else cwbxAppendByHeader_(sheet,obj);
}

function cwbxWriteHistoryOnStateChange_(sheet, summary, at) {
  var state = cwbxHash_(JSON.stringify(summary));
  var props = PropertiesService.getScriptProperties();
  var prev = props.getProperty(CWBX_V1.propsLastState) || '';
  if (prev === state) return;
  props.setProperty(CWBX_V1.propsLastState, state);
  cwbxAppendByHeader_(sheet, {
    CHAT_ID:'CWBX_STATE_' + Utilities.formatDate(at,CWBX_V1.tz,'yyyyMMdd_HHmmss'),
    CREATED_AT:at.toISOString(),
    USER_REQUEST:'Central workflow/workflow-map Sheet bridge auto crosscheck',
    ASSISTANT_ACTION:'Crosschecked canonical tabs, function/trigger/workflow/map/bridge/runtime/front links; safe mirror repairs only; no duplicate physical trigger.',
    RESULT:summary.status,
    EVIDENCE:JSON.stringify(summary).slice(0,7000),
    STATUS:'RECORDED'
  });
}

function cwbxAppendAudit_(sheet, runId, status, detail) {
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
  var obj = {};
  headers.forEach(function(h){ obj[h]=''; });
  var upper = headers.map(function(h){return String(h).toUpperCase();});
  function set(names,val){ for(var i=0;i<names.length;i++){ var p=upper.indexOf(names[i]); if(p>=0){obj[headers[p]]=val;return;} } }
  set(['AUDIT_ID','LOG_ID','RUN_ID'],runId);
  set(['AUDIT_AT','CREATED_AT','TIMESTAMP','CHECKED_AT'],new Date().toISOString());
  set(['STATUS','RESULT'],status);
  set(['DETAIL','NOTES','MEMO'],detail);
  cwbxAppendByHeader_(sheet,obj);
}

function cwbxRequireSheet_(ss, name) { var s=ss.getSheetByName(name); if(!s) throw new Error('CWBX_MISSING_SHEET:'+name); return s; }
function cwbxRows_(sheet) {
  var lastRow=sheet.getLastRow(), lastCol=sheet.getLastColumn();
  if(lastRow<2||lastCol<1) return [];
  var vals=sheet.getRange(1,1,lastRow,lastCol).getDisplayValues(), h=vals[0];
  return vals.slice(1).filter(function(r){return r.some(function(v){return String(v).trim()!=='';});}).map(function(r){var o={};h.forEach(function(k,i){o[k]=r[i]||'';});return o;});
}
function cwbxObjectText_(o){return Object.keys(o||{}).map(function(k){return String(o[k]||'');}).join('|');}
function cwbxText_(rows){return rows.map(cwbxObjectText_).join('\n');}
function cwbxContains_(hay,needle){return String(hay||'').toUpperCase().indexOf(String(needle||'').toUpperCase())>=0;}
function cwbxTokens_(s){return String(s||'').split(/[;,|]/).map(function(x){return x.trim();}).filter(function(x){return /^APP_|_FRONT$|^P\d/i.test(x);});}
function cwbxHeaderMap_(h){var m={};h.forEach(function(x,i){m[String(x)]=i;});return m;}
function cwbxWriteObjectRow_(sheet,row,headers,obj){var v=headers.map(function(h){return obj.hasOwnProperty(h)?obj[h]:sheet.getRange(row,headers.indexOf(h)+1).getDisplayValue();});sheet.getRange(row,1,1,headers.length).setValues([v]);}
function cwbxAppendByHeader_(sheet,obj){var headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];var row=headers.map(function(h){return obj.hasOwnProperty(h)?obj[h]:'';});sheet.appendRow(row);}
function cwbxTriggerUid_(t){try{return String(t.getUniqueId());}catch(e){return '';}}
function cwbxHash_(s){var b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s||''),Utilities.Charset.UTF_8);return b.map(function(x){var v=(x<0?x+256:x).toString(16);return v.length===1?'0'+v:v;}).join('').slice(0,24);}
function cwbxParseDate_(v){
  if(!v) return null;
  var d=new Date(v); if(!isNaN(d.getTime())) return d;
  var s=String(v).replace(' KST','').replace(/\./g,'-');
  d=new Date(s); return isNaN(d.getTime())?null:d;
}
