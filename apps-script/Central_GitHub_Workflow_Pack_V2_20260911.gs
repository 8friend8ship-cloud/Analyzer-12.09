/* CENTRAL_GITHUB_WORKFLOW_PACK_V2_20260911
 * Candidate only. No physical trigger is created here.
 * Purpose:
 * 1) register each GitHub/repository requirement into central Sheets,
 * 2) build a per-project custom workflow from the closest verified template,
 * 3) enforce Google Trends / metadata-search as SIGNAL_ONLY,
 * 4) audit tab order and trigger contract before any runtime mutation,
 * 5) write evidence/learning/change records with stable IDs.
 *
 * Runtime promotion requires bound-script readback + same-fixture x2 + user version approval.
 */

var CENTRAL_GITHUB_WORKFLOW_PACK_V2 = {
  version: 'CENTRAL_GITHUB_WORKFLOW_PACK_V2_20260911_CANDIDATE_1',
  spreadsheetId: '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI',
  tz: 'Asia/Seoul',
  repoTab: '01_APP_REPO_REGISTRY',
  lineageTab: '28_GitHub전체계보',
  instructionTab: '18_AGENT_INSTRUCTION',
  historyTab: '34_CHAT_COMMAND_HISTORY',
  triggerTab: '36_AUTOMATION_TRIGGER_REGISTRY',
  trendTab: '62_TREND_RESEARCH_WAREHOUSE',
  changeTab: '63_EVOLUTION_CHANGELOG',
  workflowTab: '75_ORCHESTRA_WORKFLOW_MAP',
  templateTab: '77_TEMPLATE_EVOLUTION_FACTORY',
  evidenceTab: '93_RUNTIME_EVIDENCE_CONTROL',
  releaseTab: '94_RELEASE_GATE_CONTROL',
  controlTab: '99_DOCS_LEARNING_AUTOFIX_CONTROL',
  requiredSignalFields: ['PLATFORM','KEYWORD','LOCALE','COLLECTED_AT','TREND_SIGNAL','CONFIDENCE','STATUS'],
  googleTrendFields: ['KEYWORD','LOCALE','COLLECTED_AT','TREND_SIGNAL','TREND_SCORE','CONFIDENCE'],
  forbiddenSignalPromotion: /(^|_)(SEED_READY|VERIFIED_FACT|PRODUCTION_READY)($|_)/i,
  approvalRequiredForVersionPromotion: true
};

function runCentralGitHubWorkflowPackV2(input) {
  input = input || {};
  var started = new Date();
  var runId = 'RUN_GH_WFPACK_' + Utilities.formatDate(started, CENTRAL_GITHUB_WORKFLOW_PACK_V2.tz, 'yyyyMMdd_HHmmss_SSS');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) return {ok:true, skipped:true, reason:'LOCK_BUSY', runId:runId, version:CENTRAL_GITHUB_WORKFLOW_PACK_V2.version};
  try {
    var ss = SpreadsheetApp.openById(CENTRAL_GITHUB_WORKFLOW_PACK_V2.spreadsheetId);
    var sheets = ghPackSheets_(ss);
    var orderAudit = auditCentralTabOrderV2_(ss);
    var triggerAudit = auditCentralTriggerRegistryV2_(sheets.trigger);
    var signalAudit = auditTrendSignalPolicyV2_(sheets.trend);
    var repoAudit = auditRegisteredRepoCoverageV2_(sheets.repo, sheets.lineage, sheets.workflow, sheets.template);

    var requirement = input.requirement ? registerGitHubRequirementV2_(sheets, input.requirement, runId) : null;
    var custom = materializeMissingRepoWorkflowCandidatesV2_(sheets, repoAudit, runId);

    var ok = orderAudit.ok && triggerAudit.ok && signalAudit.ok && repoAudit.schemaOk;
    writeGitHubWorkflowPackEvidenceV2_(sheets.evidence, {
      runId:runId, ok:ok, orderAudit:orderAudit, triggerAudit:triggerAudit,
      signalAudit:signalAudit, repoAudit:repoAudit, custom:custom, requirement:requirement,
      at:new Date().toISOString()
    });
    return {
      ok:ok,
      degraded:!ok,
      runId:runId,
      tabOrder:orderAudit,
      triggerContract:triggerAudit,
      trendSignalPolicy:signalAudit,
      repoCoverage:repoAudit,
      customWorkflowCandidates:custom,
      requirement:requirement,
      nextAction: ok ? 'BOUND_RUNTIME_X2_THEN_USER_VERSION_APPROVAL' : 'FIRST_BROKEN_STAGE_SEARCH_LEARN_MIN_FIX_RETEST',
      version:CENTRAL_GITHUB_WORKFLOW_PACK_V2.version
    };
  } catch (e) {
    return {ok:false, runId:runId, error:String(e && e.stack || e), version:CENTRAL_GITHUB_WORKFLOW_PACK_V2.version};
  } finally {
    lock.releaseLock();
  }
}

function registerGitHubRequirementV2_(sheets, req, runId) {
  req = req || {};
  var repo = String(req.repository || req.repo || '').trim();
  var requirement = String(req.summary || req.requirement || '').trim();
  if (!repo || !requirement) return {ok:false, reason:'REPOSITORY_AND_REQUIREMENT_REQUIRED'};
  var projectId = String(req.projectId || 'P00_AGENT_CORE');
  var id = 'GHREQ_' + ghPackHash_(repo + '|' + requirement).slice(0,12).toUpperCase();

  var historyHeaders = ghPackHeaders_(sheets.history);
  var existing = ghPackRows_(sheets.history).some(function(r){ return String(r.CHAT_CMD_ID||'') === id; });
  if (!existing) {
    ghPackAppendObject_(sheets.history, historyHeaders, {
      CHAT_CMD_ID:id, RECEIVED_AT:ghPackNow_(), SOURCE_CHAT:'CENTRAL_GITHUB_WORKFLOW_PACK_V2',
      USER_REQUEST_SUMMARY:requirement, PROJECT_ID:projectId, ROUTE:'GITHUB_REQUIREMENT→CENTRAL_SHEET→CUSTOM_WORKFLOW→QA',
      ROUTE_REASON:'Every GitHub requirement must have central Sheet lineage before execution', TASK_ID:id.replace('GHREQ_','TASK_GHREQ_'),
      PRIORITY:String(req.priority || 'P0'), STATUS:'REGISTERED_WORKFLOW_CANDIDATE', WORK_REQUIRED:'YES', CODEX_REQUIRED:'ONLY_IF_CODE_CHANGE',
      WORKFLOW_CHECK:'01/28→62 signal gate→75/77 custom workflow→36/61 trigger/function→93 evidence→94 release',
      BLOCKER:'BOUND_RUNTIME_X2_AND_VERSION_APPROVAL_BEFORE_PROMOTION', EVIDENCE:runId,
      LAST_UPDATED_AT:ghPackNow_(), NEXT_ACTION:'MATERIALIZE_CUSTOM_WORKFLOW_THEN_RUNTIME_X2',
      NOTES:'Stable requirement id; duplicate-safe; Google Trends/meta-search signals never directly promote Seed/Production.'
    });
  }
  return {ok:true, id:id, deduped:existing, repository:repo};
}

function auditCentralTabOrderV2_(ss) {
  var sheets = ss.getSheets();
  var numbered = [], duplicates = {}, gaps = [];
  sheets.forEach(function(s, physicalIndex){
    var m = String(s.getName()).match(/^(\d{2,3})_/);
    if (!m) return;
    var n = Number(m[1]);
    numbered.push({n:n,name:s.getName(),physicalIndex:physicalIndex});
    duplicates[n] = (duplicates[n] || 0) + 1;
  });
  var max = numbered.reduce(function(a,x){return Math.max(a,x.n);},0);
  var present = {};
  numbered.forEach(function(x){present[x.n]=true;});
  for (var i=0;i<=max;i++) if (!present[i]) gaps.push(i);
  var dup = Object.keys(duplicates).filter(function(k){return duplicates[k]>1;}).map(Number);
  var inversion = [];
  for (var j=1;j<numbered.length;j++) if (numbered[j].n < numbered[j-1].n) inversion.push(numbered[j-1].name+'→'+numbered[j].name);
  return {
    ok:inversion.length===0,
    physicalSheetCount:sheets.length,
    numberedCount:numbered.length,
    duplicateNumbers:dup,
    numberingGaps:gaps,
    inversions:inversion,
    policy:'GAPS_OR_DUPLICATE_NUMBERS_ARE_REVIEW_ITEMS;DO_NOT_MOVE_OR_RENAME_TABS_WITHOUT_REFERENCE_DIFF'
  };
}

function auditCentralTriggerRegistryV2_(sheet) {
  var rows = ghPackRows_(sheet), active = rows.filter(function(r){return String(r.ACTIVE_YN||'').toUpperCase()==='Y';});
  var dangerous = rows.filter(function(r){
    return String(r.HANDLER||'')==='runQueensResearchScheduler' && String(r.ACTIVE_YN||'').toUpperCase()==='Y';
  });
  var duplicateActive = {};
  active.forEach(function(r){
    var key=String(r.HANDLER||'')+'|'+String(r.BACKEND_SLOT||'');
    duplicateActive[key]=(duplicateActive[key]||0)+1;
  });
  var dups=Object.keys(duplicateActive).filter(function(k){return duplicateActive[k]>1 && k.charAt(0)!=='|';});
  return {
    ok:dangerous.length===0,
    activeCount:active.length,
    supersededQueensSchedulerActiveCount:dangerous.length,
    duplicateActiveHandlerSlot:dups,
    policy:'CHECK_CANONICAL_HANDLER+ACTUAL_UID+LAST_RUN+READBACK_BEFORE_INSTALL;NO_BLIND_TRIGGER_CREATE'
  };
}

function auditTrendSignalPolicyV2_(sheet) {
  var headers = ghPackHeaders_(sheet), missing = CENTRAL_GITHUB_WORKFLOW_PACK_V2.requiredSignalFields.filter(function(h){return headers.indexOf(h)<0;});
  var rows = ghPackTailRows_(sheet, 500), google=0, meta=0, violations=[];
  rows.forEach(function(r){
    var platform=String(r.PLATFORM||'').toUpperCase();
    if (platform.indexOf('GOOGLE')>=0 || platform.indexOf('TREND')>=0) google++;
    if (platform.indexOf('META')>=0) meta++;
    var state=[r.STATUS,r.RECOMMENDED_ACTION,r.TREND_SIGNAL].join('|');
    if ((platform.indexOf('GOOGLE')>=0 || platform.indexOf('TREND')>=0 || platform.indexOf('META')>=0) && CENTRAL_GITHUB_WORKFLOW_PACK_V2.forbiddenSignalPromotion.test(state)) {
      violations.push(String(r.RESEARCH_ID||'UNKNOWN'));
    }
  });
  return {
    ok:missing.length===0 && violations.length===0,
    schemaMissing:missing,
    sampledRows:rows.length,
    googleSignalRows:google,
    metaSignalRows:meta,
    directPromotionViolations:violations.slice(0,20),
    policy:'SIGNAL_ONLY→NORMALIZE/DEDUPE→CROSS_EVIDENCE→QUEENS_CANDIDATE;TERM/TOPIC+LOCALE+TIME_WINDOW+COLLECTED_AT+CONFIDENCE_REQUIRED'
  };
}

function auditRegisteredRepoCoverageV2_(repoSheet, lineageSheet, workflowSheet, templateSheet) {
  var repoHeaders=ghPackHeaders_(repoSheet), lineageHeaders=ghPackHeaders_(lineageSheet);
  var repos=ghPackRows_(repoSheet), lineage=ghPackRows_(lineageSheet), workflows=ghPackRows_(workflowSheet), templates=ghPackRows_(templateSheet);
  function findRepoValue(r){
    var keys=['GITHUB_REPO','REPO','REPOSITORY','REPO_URL','LIVE_GITHUB_REPO','CANONICAL_GITHUB_REPO'];
    for(var i=0;i<keys.length;i++) if(r[keys[i]]) return String(r[keys[i]]);
    return '';
  }
  var repoNames={};
  repos.concat(lineage).forEach(function(r){
    var v=findRepoValue(r); if(v) v.split(/[;,|]/).forEach(function(x){x=x.trim();if(x.indexOf('/')>0)repoNames[x]=true;});
  });
  var wfText=JSON.stringify(workflows), tplText=JSON.stringify(templates), missing=[];
  Object.keys(repoNames).forEach(function(repo){
    var short=repo.split('/').pop();
    if(wfText.indexOf(repo)<0 && wfText.indexOf(short)<0 && tplText.indexOf(repo)<0 && tplText.indexOf(short)<0) missing.push(repo);
  });
  return {
    schemaOk:repoHeaders.length>0 && lineageHeaders.length>0,
    registeredRepoCount:Object.keys(repoNames).length,
    missingCustomWorkflowRepos:missing,
    policy:'NEW_REPO→DEDUP_REGISTRY→CLOSEST_PASSING_TEMPLATE→CUSTOM_WORKFLOW_CANDIDATE→STATIC_QA→BOUND_RUNTIME_X2→APPROVAL'
  };
}

function materializeMissingRepoWorkflowCandidatesV2_(sheets, repoAudit, runId) {
  var made=[];
  (repoAudit.missingCustomWorkflowRepos||[]).slice(0,50).forEach(function(repo){
    var short=repo.split('/').pop(), mapId='ORCH_GH_'+ghPackSlug_(short)+'_AUTO_V2';
    if (ghPackRows_(sheets.workflow).some(function(r){return String(r.MAP_ID||'')===mapId;})) return;
    ghPackAppendObject_(sheets.workflow, ghPackHeaders_(sheets.workflow), {
      MAP_ID:mapId, REQUEST_CLASS:'GITHUB_REPO_CUSTOM_WORKFLOW', CONDUCTOR:'CENTRAL_AGENT+OPENAI',
      RESEARCH:'62 Trend/metadata SIGNAL_ONLY + repo requirements + History/LAST_GOOD',
      SCRIPT:'GitHub requirement→task normalize→minimum repo patch only', DOMAIN_DATA:'01/28 repo lineage→Queens/Seed only after cross-evidence',
      ASSET_PACKS:'reuse verified project packs only', AUDIO:'only if mapped', VISUAL_RENDER:'only if mapped',
      ASSEMBLY:'closest passing 75/77 template→'+repo, QA:'schema+tab order+trigger/function+runtime/readback x2+consistency',
      FAILOVER:'FIRST_BROKEN_STAGE→SEARCH/LEARN→MIN_FIX→RETEST; preserve LAST_GOOD',
      API_POLICY:'EXISTING_APPROVAL_REUSE;NO_NEW_OAUTH/COST;SIGNAL_ONLY', OUTPUT:'project custom workflow + Sheet lineage + evidence IDs',
      LEARNING:'31/63/77/93 writeback; failure preserved', STATUS:'CANDIDATE_RUNTIME_PENDING',
      VERSION:CENTRAL_GITHUB_WORKFLOW_PACK_V2.version, EXTENSION_META_1:'repo='+repo, EXTENSION_META_2:'run='+runId,
      EXTENSION_META_3:'promotion requires user version approval'
    });
    made.push({repo:repo,mapId:mapId});
  });
  return made;
}

function writeGitHubWorkflowPackEvidenceV2_(sheet, result) {
  var id='EVID_GH_WFPACK_'+ghPackHash_(result.runId).slice(0,12).toUpperCase();
  ghPackAppendObject_(sheet, ghPackHeaders_(sheet), {
    EVIDENCE_ID:id, PROJECT_ID:'P00_AGENT_CORE', APP_ID:'ALL_REPOS', FUNCTION_OR_ROUTE:'runCentralGitHubWorkflowPackV2',
    RUN_ID:result.runId, DRIVE_ACK:'01_MASTER_REGISTRY_WRITEBACK',
    LAST_GOOD:'ORCH_ALL_APP_WORKFLOW_TEMPLATE_V1 + DOCLEARN_GLOBAL_CHAT_EXECUTION_LOOP_20260908',
    STATUS:result.ok?'STATIC_CONTROL_PASS_RUNTIME_X2_PENDING':'DEGRADED_SEARCH_LEARN_REQUIRED',
    ROOT_CAUSE:result.ok?'NONE_STATIC':'ORDER/TRIGGER/SIGNAL/REPO_COVERAGE_GAP',
    MIN_FIX:'FIRST_BROKEN_STAGE_MINIMUM_DIFF_ONLY; no blind tab move/trigger install',
    NEXT_RESUME_POINT:'BOUND_SOURCE_SYNC→AUDIT→SAME_FIXTURE_X2→DRIVE_READBACK→USER_VERSION_APPROVAL', UPDATED_AT:ghPackNow_()
  });
  return id;
}

function ghPackSheets_(ss) {
  function req(name){var s=ss.getSheetByName(name);if(!s)throw new Error('CENTRAL_TAB_MISSING:'+name);return s;}
  return {
    repo:req(CENTRAL_GITHUB_WORKFLOW_PACK_V2.repoTab), lineage:req(CENTRAL_GITHUB_WORKFLOW_PACK_V2.lineageTab),
    instruction:req(CENTRAL_GITHUB_WORKFLOW_PACK_V2.instructionTab), history:req(CENTRAL_GITHUB_WORKFLOW_PACK_V2.historyTab),
    trigger:req(CENTRAL_GITHUB_WORKFLOW_PACK_V2.triggerTab), trend:req(CENTRAL_GITHUB_WORKFLOW_PACK_V2.trendTab),
    change:req(CENTRAL_GITHUB_WORKFLOW_PACK_V2.changeTab), workflow:req(CENTRAL_GITHUB_WORKFLOW_PACK_V2.workflowTab),
    template:req(CENTRAL_GITHUB_WORKFLOW_PACK_V2.templateTab), evidence:req(CENTRAL_GITHUB_WORKFLOW_PACK_V2.evidenceTab),
    release:req(CENTRAL_GITHUB_WORKFLOW_PACK_V2.releaseTab), control:req(CENTRAL_GITHUB_WORKFLOW_PACK_V2.controlTab)
  };
}
function ghPackHeaders_(sheet){var n=sheet.getLastColumn();return n?sheet.getRange(1,1,1,n).getDisplayValues()[0].map(String):[];}
function ghPackRows_(sheet){var last=sheet.getLastRow(), headers=ghPackHeaders_(sheet);if(last<2)return[];return sheet.getRange(2,1,last-1,headers.length).getDisplayValues().map(function(v){var o={};headers.forEach(function(h,i){o[h]=v[i];});return o;});}
function ghPackTailRows_(sheet,n){var last=sheet.getLastRow(),headers=ghPackHeaders_(sheet);if(last<2)return[];var start=Math.max(2,last-n+1),vals=sheet.getRange(start,1,last-start+1,headers.length).getDisplayValues();return vals.map(function(v){var o={};headers.forEach(function(h,i){o[h]=v[i];});return o;});}
function ghPackAppendObject_(sheet,headers,obj){var row=headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';});sheet.appendRow(row);return sheet.getLastRow();}
function ghPackNow_(){return Utilities.formatDate(new Date(),CENTRAL_GITHUB_WORKFLOW_PACK_V2.tz,'yyyy-MM-dd HH:mm:ss z');}
function ghPackSlug_(s){return String(s||'REPO').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,36)||'REPO';}
function ghPackHash_(s){var b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8);return b.map(function(x){x=x<0?x+256:x;return ('0'+x.toString(16)).slice(-2);}).join('');}

function testCentralGitHubWorkflowPackV2X2() {
  var a=runCentralGitHubWorkflowPackV2({});
  Utilities.sleep(1100);
  var b=runCentralGitHubWorkflowPackV2({});
  return {ok:!!(a&&b&&a.runId&&b.runId&&a.runId!==b.runId&&a.ok!==false&&b.ok!==false),pass1:a,pass2:b,version:CENTRAL_GITHUB_WORKFLOW_PACK_V2.version};
}
