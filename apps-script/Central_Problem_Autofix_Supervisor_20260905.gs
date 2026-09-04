/* CENTRAL_PROBLEM_AUTOFIX_SUPERVISOR_V1_20260905
 *
 * Search-first error recovery supervisor.
 *
 * Mandatory order:
 * ERROR/FAIL/DEGRADED/BROKEN/PENDING
 * -> canonical instruction/LAST_GOOD/failure record read
 * -> exact FIRST_BROKEN_STAGE + failure signature
 * -> SEARCH_LEARNING_REQUIRED if no matching fresh learning record
 * -> central learning writeback
 * -> allow-listed safe repair only
 * -> changed-condition rerun
 * -> quality gate
 * -> success central writeback only when quality PASS
 * -> otherwise narrower search/learning loop.
 *
 * Trigger policy:
 * - exactly ONE central supervisor watchdog may exist.
 * - installer removes only exact duplicate supervisor triggers and the obsolete
 *   dedicated Central Sheet Audit trigger because this supervisor calls that
 *   audit inside its own cycle.
 * - unrelated triggers (especially processTaskQueue) are never touched.
 */

var CENTRAL_PROBLEM_AUTOFIX_V1 = {
  version: 'CENTRAL_PROBLEM_AUTOFIX_SUPERVISOR_V1_20260905',
  centralSpreadsheetId: '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI',
  handler: 'runCentralProblemAutofixSupervisor10m',
  legacyAuditHandler: 'runCentralSheetRuntimeAuditAutofix10m',
  intervalMinutes: 10,
  instructionId: 'INST_20260905_PROBLEM_SEARCH_OPERATING_INSTRUCTION_GATE_001',
  instructionTab: '18_AGENT_INSTRUCTION',
  learningTab: '31_학습실행로그',
  triggerTab: '36_AUTOMATION_TRIGGER_REGISTRY',
  contractTab: '61_BACKEND_FUNCTION_CONTRACT',
  workflowTab: '75_ORCHESTRA_WORKFLOW_MAP',
  qaTab: '80_DATA_RUNTIME_QA_LOG',
  evidenceTab: '93_RUNTIME_EVIDENCE_CONTROL',
  queueTab: '07_EXECUTION_QUEUE',
  auditTab: '08_AUDIT_LOG',
  queensControlTab: '109_QUEENS_DAILY_CONTROL',
  learningMaxAgeHours: 168,
  cooldownMinutes: 20,
  maxIssuesPerRun: 40,
  maxRepairsPerRun: 3,
  recentRows: 180,
  tz: 'Asia/Seoul'
};

function runCentralProblemAutofixSupervisor10m() {
  var started = new Date();
  var runId = 'RUN_PROBLEM_AUTOFIX_' + Utilities.formatDate(started, CENTRAL_PROBLEM_AUTOFIX_V1.tz, 'yyyyMMdd_HHmmss_SSS');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) {
    return {ok:true, skipped:true, reason:'PROBLEM_AUTOFIX_LOCK_BUSY', runId:runId, version:CENTRAL_PROBLEM_AUTOFIX_V1.version};
  }

  try {
    var ss = SpreadsheetApp.openById(CENTRAL_PROBLEM_AUTOFIX_V1.centralSpreadsheetId);
    var sh = getProblemAutofixSheets_(ss);
    var instruction = readProblemCanonicalInstruction_(sh.instruction);
    if (!instruction.ok) throw new Error('CANONICAL_PROBLEM_INSTRUCTION_MISSING:' + CENTRAL_PROBLEM_AUTOFIX_V1.instructionId);

    // Always audit current central runtime first. This is diagnosis, not a PASS claim.
    var auditResult = callProblemSafeHandler_('runCentralSheetRuntimeAuditAutofix10m');
    var before = collectProblemAutofixSnapshot_(sh, auditResult);
    var issues = classifyProblemAutofixIssues_(before).slice(0, CENTRAL_PROBLEM_AUTOFIX_V1.maxIssuesPerRun);

    var ready = [];
    var searchRequired = [];
    issues.forEach(function(issue) {
      var learned = findFreshProblemLearning_(sh.learning, issue.signature);
      if (learned.ok) {
        issue.learningId = learned.learningId;
        ready.push(issue);
      } else {
        searchRequired.push(issue);
        upsertProblemSearchTask_(sh.queue, issue, runId, instruction);
        writeProblemSearchRequestLearning_(sh.learning, issue, runId, instruction);
      }
    });

    // Hard gate: no matching learning record -> no mutation.
    var repairPlan = buildProblemAutofixPlan_(ready);
    var repairResults = executeProblemAutofixPlan_(repairPlan, runId);

    // Changed-condition rerun/readback. No successful repair is recorded yet.
    var retest = callProblemSafeHandler_('runCentralSheetRuntimeAuditAutofix10m');
    var after = collectProblemAutofixSnapshot_(sh, retest);
    var quality = evaluateProblemAutofixQuality_(ready, repairResults, before, after, retest);

    writeProblemAutofixQa_(sh.qa, runId, started, issues, searchRequired, repairResults, quality, instruction);
    writeProblemAutofixEvidence_(sh.evidence, runId, issues, searchRequired, repairResults, quality);
    writeProblemAutofixAudit_(sh.audit, runId, issues, searchRequired, repairResults, quality);

    // Success learning is written only after quality PASS.
    quality.successes.forEach(function(success) {
      writeProblemAutofixSuccessLearning_(sh.learning, success, runId, instruction);
      closeProblemSearchTaskOnSuccess_(sh.queue, success.signature, runId, success);
    });

    // Failed quality returns to narrower search-learning loop.
    quality.failures.forEach(function(failure) {
      upsertProblemSearchTask_(sh.queue, {
        signature:failure.signature,
        code:'QUALITY_GATE_FAIL',
        firstBrokenStage:failure.firstBrokenStage || 'QUALITY_RETEST',
        detail:'QUALITY_FAIL:' + (failure.reason || 'unknown')
      }, runId, instruction);
    });

    return {
      ok: searchRequired.length === 0 && quality.failures.length === 0,
      degraded: searchRequired.length > 0 || quality.failures.length > 0,
      runId:runId,
      instructionGate:instruction.id,
      issueCount:issues.length,
      searchLearningRequiredCount:searchRequired.length,
      repairAttemptCount:repairResults.length,
      qualityPassCount:quality.successes.length,
      qualityFailCount:quality.failures.length,
      successes:quality.successes,
      failures:quality.failures,
      nextAction:(searchRequired.length || quality.failures.length) ? 'SEARCH_LEARN_NARROWER_FIRST_BROKEN_STAGE_THEN_NEXT_WATCHDOG' : 'CONTINUE_WATCHDOG',
      version:CENTRAL_PROBLEM_AUTOFIX_V1.version
    };
  } catch (err) {
    return {ok:false, runId:runId, error:String(err && err.stack || err), version:CENTRAL_PROBLEM_AUTOFIX_V1.version};
  } finally {
    lock.releaseLock();
  }
}

function installOrRepairCentralProblemAutofixSupervisorTrigger() {
  var all = ScriptApp.getProjectTriggers();
  var ours = all.filter(function(t){ return t.getHandlerFunction() === CENTRAL_PROBLEM_AUTOFIX_V1.handler; });
  var legacy = all.filter(function(t){ return t.getHandlerFunction() === CENTRAL_PROBLEM_AUTOFIX_V1.legacyAuditHandler; });
  var deleted = [];

  // Remove only exact duplicates of this supervisor.
  if (ours.length > 1) {
    ours.slice(1).forEach(function(t){ deleted.push(problemTriggerUid_(t)); ScriptApp.deleteTrigger(t); });
  }

  // Supervisor subsumes legacy central audit timer; audit function itself remains callable.
  legacy.forEach(function(t){ deleted.push(problemTriggerUid_(t)); ScriptApp.deleteTrigger(t); });

  ours = ScriptApp.getProjectTriggers().filter(function(t){ return t.getHandlerFunction() === CENTRAL_PROBLEM_AUTOFIX_V1.handler; });
  if (ours.length === 0) {
    ScriptApp.newTrigger(CENTRAL_PROBLEM_AUTOFIX_V1.handler)
      .timeBased().everyMinutes(CENTRAL_PROBLEM_AUTOFIX_V1.intervalMinutes).create();
    ours = ScriptApp.getProjectTriggers().filter(function(t){ return t.getHandlerFunction() === CENTRAL_PROBLEM_AUTOFIX_V1.handler; });
  }

  return {
    ok:ours.length === 1,
    handler:CENTRAL_PROBLEM_AUTOFIX_V1.handler,
    triggerCount:ours.length,
    triggerUid:ours.length ? problemTriggerUid_(ours[0]) : '',
    deletedOnlyExactSupervisorDuplicatesAndLegacyAudit:deleted,
    processTaskQueuePreserved:ScriptApp.getProjectTriggers().filter(function(t){ return t.getHandlerFunction() === 'processTaskQueue'; }).length,
    scriptId:ScriptApp.getScriptId(),
    intervalMinutes:CENTRAL_PROBLEM_AUTOFIX_V1.intervalMinutes,
    version:CENTRAL_PROBLEM_AUTOFIX_V1.version
  };
}

function auditCentralProblemAutofixTriggerContract() {
  var all = ScriptApp.getProjectTriggers();
  var ours = all.filter(function(t){ return t.getHandlerFunction() === CENTRAL_PROBLEM_AUTOFIX_V1.handler; });
  var legacy = all.filter(function(t){ return t.getHandlerFunction() === CENTRAL_PROBLEM_AUTOFIX_V1.legacyAuditHandler; });
  return {
    ok:ours.length === 1 && legacy.length === 0,
    supervisorCount:ours.length,
    supervisorUid:ours.length ? problemTriggerUid_(ours[0]) : '',
    legacyAuditPhysicalCount:legacy.length,
    processTaskQueueCount:all.filter(function(t){ return t.getHandlerFunction() === 'processTaskQueue'; }).length,
    scriptId:ScriptApp.getScriptId(),
    version:CENTRAL_PROBLEM_AUTOFIX_V1.version
  };
}

function testCentralProblemAutofixSupervisorX2() {
  var a = runCentralProblemAutofixSupervisor10m();
  Utilities.sleep(1100);
  var b = runCentralProblemAutofixSupervisor10m();
  var ok = !!(a && b && a.runId && b.runId && a.runId !== b.runId && a.ok !== false && b.ok !== false);
  return {ok:ok, pass1:a, pass2:b, version:CENTRAL_PROBLEM_AUTOFIX_V1.version};
}

function getProblemAutofixSheets_(ss) {
  function req(name){ var s=ss.getSheetByName(name); if(!s) throw new Error('CENTRAL_TAB_MISSING:'+name); return s; }
  return {
    instruction:req(CENTRAL_PROBLEM_AUTOFIX_V1.instructionTab),
    learning:req(CENTRAL_PROBLEM_AUTOFIX_V1.learningTab),
    trigger:req(CENTRAL_PROBLEM_AUTOFIX_V1.triggerTab),
    contract:req(CENTRAL_PROBLEM_AUTOFIX_V1.contractTab),
    workflow:req(CENTRAL_PROBLEM_AUTOFIX_V1.workflowTab),
    qa:req(CENTRAL_PROBLEM_AUTOFIX_V1.qaTab),
    evidence:req(CENTRAL_PROBLEM_AUTOFIX_V1.evidenceTab),
    queue:req(CENTRAL_PROBLEM_AUTOFIX_V1.queueTab),
    audit:req(CENTRAL_PROBLEM_AUTOFIX_V1.auditTab),
    queens:req(CENTRAL_PROBLEM_AUTOFIX_V1.queensControlTab)
  };
}

function readProblemCanonicalInstruction_(sheet) {
  var rows=problemRows_(sheet), row=rows.filter(function(r){return String(r.INSTRUCTION_ID||'')===CENTRAL_PROBLEM_AUTOFIX_V1.instructionId;})[0];
  return row ? {ok:true,id:String(row.INSTRUCTION_ID||''),status:String(row.STATUS||''),rule:String(row.DECISION_RULE||''),evidence:String(row.EVIDENCE||'')} : {ok:false};
}

function collectProblemAutofixSnapshot_(sh, auditResult) {
  return {
    at:new Date().toISOString(),
    audit:auditResult || {},
    qa:problemTailRows_(sh.qa,CENTRAL_PROBLEM_AUTOFIX_V1.recentRows),
    evidence:problemTailRows_(sh.evidence,CENTRAL_PROBLEM_AUTOFIX_V1.recentRows),
    triggers:problemRows_(sh.trigger),
    contracts:problemRows_(sh.contract),
    workflow:problemTailRows_(sh.workflow,120),
    queens:problemRows_(sh.queens)
  };
}

function classifyProblemAutofixIssues_(s) {
  var out=[], seen={};
  function add(code,stage,detail,source){
    detail=String(detail||'').slice(0,1800);
    var sig=problemHash_(code+'|'+stage+'|'+detail);
    if(seen[sig])return; seen[sig]=1;
    out.push({signature:sig,code:code,firstBrokenStage:stage,detail:detail,sourceId:String(source||'')});
  }

  if(s.audit && s.audit.ok===false && !s.audit.skipped) add('CENTRAL_AUDIT_ERROR','FUNCTION_EXECUTION',s.audit.error||s.audit.reason||'audit ok=false',s.audit.runId||'');
  if(s.audit && s.audit.degraded && s.audit.failures) s.audit.failures.slice(0,20).forEach(function(x){add('CENTRAL_AUDIT_DEGRADED',inferProblemStage_(x),x,s.audit.resultId||'');});

  s.qa.forEach(function(r){
    var text=[r.STATUS,r.ERROR_CLASS,r.READBACK_STATE,r.NEXT_ACTION].join(' ');
    if(/FAIL|ERROR|DEGRADED|BROKEN/i.test(text)) add('QA_RUNTIME_PROBLEM',inferProblemStage_(text),r.ERROR_CLASS||r.STATUS,r.RESULT_ID||r.RUN_ID||r.QA_ID);
  });
  s.evidence.forEach(function(r){
    var text=[r.STATUS,r.ROOT_CAUSE,r.MIN_FIX,r.NEXT_RESUME_POINT].join(' ');
    if(/FAIL|ERROR|DEGRADED|BROKEN/i.test(text)) add('EVIDENCE_RUNTIME_PROBLEM',inferProblemStage_(text),r.ROOT_CAUSE||r.STATUS,r.RESULT_ID||r.EVIDENCE_ID);
  });
  s.triggers.forEach(function(r){
    if(String(r.ACTIVE_YN||'').toUpperCase()!=='Y')return;
    var text=[r.INSTALL_STATE,r.LAST_STATUS].join(' ');
    if(/ERROR|FAIL|BROKEN|MISSING|NOT_INSTALLED/i.test(text)) add('TRIGGER_RUNTIME_GAP','TRIGGER_RUNTIME',String(r.TRIGGER_ID||'')+':'+text,r.TRIGGER_ID||'');
  });
  s.queens.forEach(function(r){
    var text=[r.QUEUE_STATUS,r.LOG_INTEGRITY,r.WHY_NOT_COLLECTING,r.NEXT_ACTION].join(' ');
    if(/FAIL|TARGET_GAP|BROKEN|ERROR/i.test(text)) add('QUEENS_RUNTIME_GAP','QUEENS_RESULT_SEED_CONTROL',String(r.QUEENS_TASK_ID||'')+':'+text,r.QUEENS_TASK_ID||'');
  });
  return out;
}

function inferProblemStage_(text) {
  text=String(text||'').toUpperCase();
  if(/QUEENS|109|37_|35_|SEED/.test(text))return 'QUEENS_RESULT_SEED_CONTROL';
  if(/TRIGGER|UID|INSTALL/.test(text))return 'TRIGGER_RUNTIME';
  if(/WORKFLOW|BRIDGE|RELATION/.test(text))return 'WORKFLOW_BRIDGE';
  if(/DRYWRITER|WEBAPP_URL|CONFIG|MISSING_URL/.test(text))return 'RUNTIME_CONFIG';
  if(/FUNCTION|HANDLER|NOT_FOUND|EXECUT/.test(text))return 'FUNCTION_EXECUTION';
  if(/SHEET|RANGE|ROW|COLUMN/.test(text))return 'SHEET_DATA';
  return 'UNKNOWN_FIRST_BROKEN_STAGE';
}

function findFreshProblemLearning_(sheet, signature) {
  var rows=problemTailRows_(sheet,300), now=Date.now(), maxAge=CENTRAL_PROBLEM_AUTOFIX_V1.learningMaxAgeHours*3600000;
  for(var i=rows.length-1;i>=0;i--){
    var r=rows[i], hay=[r.SOURCE_IDS,r.QUESTION,r.FINDING,r.DECISION_OR_TASK,r.EVIDENCE_ID,r.NEXT_ACTION].join('|');
    if(hay.indexOf('AUTOFIX_SIG:'+signature)<0)continue;
    var t=Date.parse(String(r.TIMESTAMP||''));
    if(isFinite(t) && now-t>maxAge)continue;
    var st=String(r.RESULT_STATUS||'');
    if(/SEARCH_REQUEST|PENDING|REQUIRED/i.test(st))continue;
    return {ok:true,learningId:String(r.LEARNING_RUN_ID||''),status:st};
  }
  return {ok:false};
}

function buildProblemAutofixPlan_(issues) {
  var plan=[], used={};
  function add(handler,reason,issue){
    if(used[handler]||plan.length>=CENTRAL_PROBLEM_AUTOFIX_V1.maxRepairsPerRun)return;
    used[handler]=1; plan.push({handler:handler,reason:reason,issue:issue});
  }
  issues.forEach(function(i){
    var t=(i.code+' '+i.firstBrokenStage+' '+i.detail).toUpperCase();
    if(/QUEENS|109|37_|35_|SEED/.test(t))add('runQueensLogIntegrityAudit10m_','QUEENS_LOG_RESULT_SEED_REPAIR',i);
    if(/WORKFLOW|BRIDGE|RELATION/.test(t))add('runCentralWorkflowBridgeCrosscheck10m','WORKFLOW_BRIDGE_CROSSCHECK',i);
    if(/DRYWRITER|WEBAPP_URL|MISSING_URL|RUNTIME_CONFIG/.test(t))add('runContentOsDryWriterRuntimeConfigAutoHealFromFactory_','DRYWRITER_RUNTIME_CONFIG_SELF_HEAL',i);
    if(/TRIGGER|UID|INSTALL/.test(t))add('auditContentOsTriggerContract','TRIGGER_CONTRACT_READBACK',i);
  });
  return plan;
}

function executeProblemAutofixPlan_(plan, runId) {
  var out=[];
  plan.forEach(function(p){
    var key=p.issue.signature+'|'+p.handler;
    if(problemCooldown_(key)){
      out.push({signature:p.issue.signature,firstBrokenStage:p.issue.firstBrokenStage,handler:p.handler,reason:p.reason,skipped:true,ok:true,status:'COOLDOWN_NO_BLIND_IDENTICAL_RETRY'});return;
    }
    var r=callProblemSafeHandler_(p.handler);
    problemMarkAttempt_(key,runId,r);
    out.push({signature:p.issue.signature,firstBrokenStage:p.issue.firstBrokenStage,learningId:p.issue.learningId,handler:p.handler,reason:p.reason,ok:!(r&&r.ok===false),skipped:!!(r&&r.skipped),result:problemSummary_(r)});
  });
  return out;
}

function callProblemSafeHandler_(name) {
  try {
    if(name==='runCentralSheetRuntimeAuditAutofix10m'&&typeof runCentralSheetRuntimeAuditAutofix10m==='function')return runCentralSheetRuntimeAuditAutofix10m();
    if(name==='runQueensLogIntegrityAudit10m_'&&typeof runQueensLogIntegrityAudit10m_==='function')return runQueensLogIntegrityAudit10m_();
    if(name==='runCentralWorkflowBridgeCrosscheck10m'&&typeof runCentralWorkflowBridgeCrosscheck10m==='function')return runCentralWorkflowBridgeCrosscheck10m();
    if(name==='runContentOsDryWriterRuntimeConfigAutoHealFromFactory_'&&typeof runContentOsDryWriterRuntimeConfigAutoHealFromFactory_==='function')return runContentOsDryWriterRuntimeConfigAutoHealFromFactory_();
    if(name==='auditContentOsTriggerContract'&&typeof auditContentOsTriggerContract==='function')return auditContentOsTriggerContract();
    return {ok:true,skipped:true,reason:'SAFE_HANDLER_NOT_SYNCED',handler:name};
  } catch(e){return {ok:false,handler:name,error:String(e&&e.stack||e)};}
}

function evaluateProblemAutofixQuality_(ready, repairs, before, after, retest) {
  var successes=[], failures=[];
  repairs.forEach(function(r){
    if(r.skipped){failures.push({signature:r.signature,firstBrokenStage:r.firstBrokenStage,handler:r.handler,reason:r.status});return;}
    if(r.ok===false){failures.push({signature:r.signature,firstBrokenStage:r.firstBrokenStage,handler:r.handler,reason:'REPAIR_FUNCTION_FAILED'});return;}
    var q=qualityCheckHandler_(r.handler,retest,after);
    if(q.ok)successes.push({signature:r.signature,firstBrokenStage:r.firstBrokenStage,handler:r.handler,learningId:r.learningId,quality:q});
    else failures.push({signature:r.signature,firstBrokenStage:r.firstBrokenStage,handler:r.handler,reason:q.reason||'QUALITY_GATE_FAIL'});
  });
  return {successes:successes,failures:failures,pass:failures.length===0,rule:'SUCCESS_ONLY_AFTER_RERUN_AND_QUALITY_GATE_PASS'};
}

function qualityCheckHandler_(handler,retest,after) {
  if(retest&&retest.ok===false&&!retest.degraded)return {ok:false,reason:'CENTRAL_RETEST_EXECUTION_FAILED'};
  if(handler==='auditContentOsTriggerContract'){
    var r=callProblemSafeHandler_('auditContentOsTriggerContract');
    return r&&r.ok===true?{ok:true,evidence:'TRIGGER_CONTRACT_OK'}:{ok:false,reason:'TRIGGER_CONTRACT_STILL_FAIL'};
  }
  if(handler==='runQueensLogIntegrityAudit10m_'){
    var bad=after.queens.filter(function(r){return /FAIL|BROKEN|ERROR/i.test([r.QUEUE_STATUS,r.LOG_INTEGRITY].join(' '));});
    return bad.length===0?{ok:true,evidence:'109_NO_FAIL_ROWS'}:{ok:false,reason:'109_QUEENS_CONTROL_STILL_FAIL:'+bad.length};
  }
  if(handler==='runCentralWorkflowBridgeCrosscheck10m'){
    var rr=callProblemSafeHandler_('runCentralWorkflowBridgeCrosscheck10m');
    return rr&&rr.ok!==false?{ok:true,evidence:'WORKFLOW_BRIDGE_RECHECK_OK'}:{ok:false,reason:'WORKFLOW_BRIDGE_RECHECK_FAIL'};
  }
  if(handler==='runContentOsDryWriterRuntimeConfigAutoHealFromFactory_'){
    var dr=callProblemSafeHandler_('runContentOsDryWriterRuntimeConfigAutoHealFromFactory_');
    return dr&&dr.ok!==false?{ok:true,evidence:'DRYWRITER_CONFIG_RECHECK_OK'}:{ok:false,reason:'DRYWRITER_CONFIG_RECHECK_FAIL'};
  }
  return {ok:false,reason:'NO_QUALITY_RULE_FOR_HANDLER'};
}

function upsertProblemSearchTask_(sheet,issue,runId,instruction) {
  var taskId='TASK_PROBLEM_SEARCH_LEARN_'+issue.signature.slice(0,20), headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0], data=sheet.getDataRange().getDisplayValues(), map=problemHeaderMap_(headers), row=-1;
  for(var i=1;i<data.length;i++)if(String(data[i][map.TASK_ID]||'')===taskId){row=i+1;break;}
  var now=new Date().toISOString(), obj={
    TASK_ID:taskId,STAGE_NO:'P0',TASK_TYPE:'PROBLEM_OFFICIAL_SEARCH_LEARNING',TARGET_ID:issue.firstBrokenStage,
    ACTION:'READ '+instruction.id+'→EXACT_ERROR/FUNCTION/VERSION→OFFICIAL_VENDOR_DOCS/CHANGELOG/STATUS→WRITE 31 WITH AUTOFIX_SIG:'+issue.signature+'→THEN_ALLOW_SAFE_AUTOFIX→RERUN→QUALITY_GATE',
    PRIORITY:'P0',APPROVAL_STATUS:'AUTO_SAFE_INTERNAL_SEARCH_LEARN',EXECUTION_METHOD:'CENTRAL_AGENT_WEB_SEARCH_FIRST',STATUS:'SEARCH_LEARNING_REQUIRED',RETRY_COUNT:'0',
    CREATED_AT:row>0?String(data[row-1][map.CREATED_AT]||now):now,UPDATED_AT:now,NOTES:(issue.code+'|'+issue.detail).slice(0,7000),OWNER:'CENTRAL_AGENT',
    FIRST_REQUESTED_AT:row>0?String(data[row-1][map.FIRST_REQUESTED_AT]||now):now,LAST_REQUESTED_AT:now,REQUEST_COUNT:row>0?String(Number(data[row-1][map.REQUEST_COUNT]||0)+1):'1',COMPLETION_EVIDENCE:runId+';AUTOFIX_SIG:'+issue.signature,APPROVAL_TYPE:'AUTO_SEARCH_LEARN_THEN_SAFE_FIX'
  };
  if(row>0)writeProblemRow_(sheet,row,headers,obj);else appendProblemRow_(sheet,headers,obj);
}

function closeProblemSearchTaskOnSuccess_(sheet,signature,runId,success) {
  var taskId='TASK_PROBLEM_SEARCH_LEARN_'+signature.slice(0,20), data=sheet.getDataRange().getDisplayValues(), headers=data[0]||[], map=problemHeaderMap_(headers);
  for(var i=1;i<data.length;i++)if(String(data[i][map.TASK_ID]||'')===taskId){writeProblemRow_(sheet,i+1,headers,{STATUS:'COMPLETED_QUALITY_PASS',UPDATED_AT:new Date().toISOString(),COMPLETION_EVIDENCE:runId+';QUALITY_PASS;'+success.handler});break;}
}

function writeProblemSearchRequestLearning_(sheet,issue,runId,instruction) {
  var id='LRUN_SEARCH_REQUEST_'+issue.signature.slice(0,20), rows=problemTailRows_(sheet,250);
  if(rows.some(function(r){return String(r.LEARNING_RUN_ID||'')===id&&/SEARCH_REQUEST/.test(String(r.RESULT_STATUS||''));}))return;
  appendProblemRow_(sheet,sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0],{
    LEARNING_RUN_ID:id,TIMESTAMP:new Date().toISOString(),SOURCE_IDS:instruction.id+';AUTOFIX_SIG:'+issue.signature,
    QUESTION:'자동수정 전 정확한 오류/함수/버전의 공식 검색 학습이 필요한가?',FINDING:'YES_SEARCH_REQUIRED_BEFORE_MUTATION:'+issue.detail,
    DECISION_OR_TASK:'OFFICIAL_DOCS_CHANGELOG_STATUS_FIRST→ROOT_CAUSE→MIN_SAFE_FIX→RETEST→QUALITY_GATE',TARGET_IDS:issue.firstBrokenStage,
    RESULT_STATUS:'SEARCH_REQUEST_REQUIRED_NOT_A_LEARNING_PASS',EVIDENCE_ID:runId,FAILURE_PRESERVED:'YES',NEXT_ACTION:'CENTRAL_AGENT_WEB_SEARCH_AND_WRITE_MATCHING_AUTOFIX_SIG_LEARNING'
  });
}

function writeProblemAutofixSuccessLearning_(sheet,success,runId,instruction) {
  appendProblemRow_(sheet,sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0],{
    LEARNING_RUN_ID:'LRUN_AUTOFIX_SUCCESS_'+success.signature.slice(0,20)+'_'+Utilities.formatDate(new Date(),CENTRAL_PROBLEM_AUTOFIX_V1.tz,'yyyyMMddHHmmss'),
    TIMESTAMP:new Date().toISOString(),SOURCE_IDS:instruction.id+';'+success.learningId+';AUTOFIX_SIG:'+success.signature,
    QUESTION:'검색학습 후 자동수정·재가동·품질검증이 실제 성공했는가?',FINDING:'YES_QUALITY_PASS:'+JSON.stringify(success.quality).slice(0,2500),
    DECISION_OR_TASK:'PROMOTE_AS_LAST_GOOD_CANDIDATE;REUSE_ONLY_SAME_FAILURE_SIGNATURE_AND_HANDLER',TARGET_IDS:success.firstBrokenStage+';'+success.handler,
    RESULT_STATUS:'AUTOFIX_RERUN_QUALITY_PASS_SUCCESS',EVIDENCE_ID:runId,FAILURE_PRESERVED:'YES',NEXT_ACTION:'CENTRAL_SUCCESS_RECORD→TEMPLATE_EVOLUTION_AFTER_DISTINCT_X2'
  });
}

function writeProblemAutofixQa_(sheet,runId,started,issues,searchRequired,repairs,quality,instruction) {
  appendProblemRow_(sheet,sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0],{
    QA_ID:'QA_'+runId,RUN_ID:runId,APP_ID:'P00_AGENT_CORE;ALL_PROJECTS',FUNCTION_ID:CENTRAL_PROBLEM_AUTOFIX_V1.handler,TRIGGER_ID:'CENTRAL_PROBLEM_AUTOFIX_WATCHDOG',
    INPUT_DATA_IDS:'18|31|36|61|75|80|93|109',INPUT_HASH:'ISSUES_'+issues.length,OUTPUT_DATA_IDS:'31|07|80|93',RESULT_ID:'RESULT_'+runId,
    STARTED_AT:started.toISOString(),FINISHED_AT:new Date().toISOString(),STATUS:quality.failures.length?'DEGRADED_QUALITY_FAIL':(searchRequired.length?'SEARCH_LEARNING_REQUIRED':'PASS_AUTOFIX_QUALITY_GATE'),
    READBACK_STATE:'search='+searchRequired.length+';repairs='+repairs.length+';qualityPass='+quality.successes.length+';qualityFail='+quality.failures.length,
    QUALITY_SCORE:quality.failures.length?'60':(searchRequired.length?'75':'100'),ERROR_CLASS:quality.failures.map(function(x){return x.reason;}).join('|').slice(0,5000),RETRY_COUNT:'0',
    EVIDENCE_POINTER:instruction.id+';31;07;93',NEXT_ACTION:(searchRequired.length||quality.failures.length)?'SEARCH_LEARN_NARROWER→NEXT_WATCHDOG':'SUCCESS_WRITEBACK→X2_PROMOTION'
  });
}

function writeProblemAutofixEvidence_(sheet,runId,issues,searchRequired,repairs,quality) {
  appendProblemRow_(sheet,sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0],{
    EVIDENCE_ID:'EVID_'+runId,PROJECT_ID:'P00_AGENT_CORE',APP_ID:'ALL_PROJECTS',FUNCTION_OR_ROUTE:CENTRAL_PROBLEM_AUTOFIX_V1.handler,TRIGGER_UID:'READBACK_BY_TRIGGER_CONTRACT',RUN_ID:runId,RESULT_ID:'RESULT_'+runId,
    DRIVE_ACK:'CENTRAL_WRITEBACK_PASS',PASS_1:quality.successes.length?'PASS':'PENDING',PASS_2:'PENDING_DISTINCT_NEXT_RUN',LAST_GOOD:'PRESERVE_EXISTING_LAST_GOOD',
    STATUS:quality.failures.length?'QUALITY_FAIL_SEARCH_RELEARN_REQUIRED':(searchRequired.length?'SEARCH_LEARNING_REQUIRED':'AUTOFIX_QUALITY_PASS'),
    ROOT_CAUSE:issues.map(function(x){return x.firstBrokenStage+':'+x.detail;}).join('|').slice(0,5000),MIN_FIX:repairs.map(function(x){return x.handler;}).join('|'),
    NEXT_RESUME_POINT:(searchRequired.length||quality.failures.length)?'EXACT_SIGNATURE_SEARCH_LEARNING':'NEXT_DISTINCT_WATCHDOG_X2',UPDATED_AT:new Date().toISOString()
  });
}

function writeProblemAutofixAudit_(sheet,runId,issues,searchRequired,repairs,quality) {
  var headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0], obj={}, upper=headers.map(function(h){return String(h).toUpperCase();});
  headers.forEach(function(h){obj[h]='';});
  function set(names,val){for(var i=0;i<names.length;i++){var x=upper.indexOf(names[i]);if(x>=0){obj[headers[x]]=val;return;}}}
  set(['AUDIT_ID','LOG_ID','ID'],'AUDIT_'+runId);set(['RUN_ID'],runId);set(['CREATED_AT','TIMESTAMP','AT','UPDATED_AT'],new Date().toISOString());
  set(['STATUS','RESULT'],quality.failures.length?'QUALITY_FAIL':(searchRequired.length?'SEARCH_REQUIRED':'QUALITY_PASS'));
  set(['DETAIL','NOTES','MESSAGE','EVIDENCE'],JSON.stringify({issues:issues.length,searchRequired:searchRequired.length,repairs:repairs.length,qualityPass:quality.successes.length,qualityFail:quality.failures.length,version:CENTRAL_PROBLEM_AUTOFIX_V1.version}).slice(0,10000));
  appendProblemRow_(sheet,headers,obj);
}

function problemCooldown_(key){var p=PropertiesService.getScriptProperties(),v=p.getProperty('PROBLEM_AUTOFIX_ATTEMPT_'+problemHash_(key));if(!v)return false;try{var o=JSON.parse(v),t=Date.parse(o.at||'');return isFinite(t)&&(Date.now()-t<CENTRAL_PROBLEM_AUTOFIX_V1.cooldownMinutes*60000);}catch(e){return false;}}
function problemMarkAttempt_(key,runId,result){PropertiesService.getScriptProperties().setProperty('PROBLEM_AUTOFIX_ATTEMPT_'+problemHash_(key),JSON.stringify({at:new Date().toISOString(),runId:runId,ok:!(result&&result.ok===false)}));}
function problemSummary_(x){try{return JSON.stringify(x).slice(0,3500);}catch(e){return String(x).slice(0,3500);}}
function problemHash_(s){var b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s||''),Utilities.Charset.UTF_8);return b.map(function(x){return ('0'+((x+256)%256).toString(16)).slice(-2);}).join('');}
function problemTriggerUid_(t){try{return t.getUniqueId?String(t.getUniqueId()):'';}catch(e){return '';}}
function problemHeaderMap_(h){var m={};h.forEach(function(x,i){if(x)m[x]=i;});return m;}
function problemRows_(sheet){var lr=sheet.getLastRow(),lc=sheet.getLastColumn();if(lr<2||lc<1)return[];var d=sheet.getRange(1,1,lr,lc).getDisplayValues(),h=d[0];return d.slice(1).filter(function(r){return r.some(function(v){return String(v).trim()!=='';});}).map(function(r){var o={};h.forEach(function(x,i){if(x)o[x]=r[i]||'';});return o;});}
function problemTailRows_(sheet,n){var lr=sheet.getLastRow(),lc=sheet.getLastColumn();if(lr<2||lc<1)return[];var start=Math.max(2,lr-n+1),h=sheet.getRange(1,1,1,lc).getDisplayValues()[0],d=sheet.getRange(start,1,lr-start+1,lc).getDisplayValues();return d.filter(function(r){return r.some(function(v){return String(v).trim()!=='';});}).map(function(r){var o={};h.forEach(function(x,i){if(x)o[x]=r[i]||'';});return o;});}
function appendProblemRow_(sheet,headers,obj){sheet.appendRow(headers.map(function(h){return obj[h]==null?'':obj[h];}));}
function writeProblemRow_(sheet,row,headers,obj){var cur=sheet.getRange(row,1,1,headers.length).getValues()[0];headers.forEach(function(h,i){if(Object.prototype.hasOwnProperty.call(obj,h))cur[i]=obj[h];});sheet.getRange(row,1,1,headers.length).setValues([cur]);}
