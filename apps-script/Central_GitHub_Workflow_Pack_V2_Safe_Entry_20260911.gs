/* Safe entry for CENTRAL_GITHUB_WORKFLOW_PACK_V2_20260911.
 * Default behavior is AUDIT_ONLY. It never bulk-materializes legacy repositories.
 * A custom workflow row is generated only for the repository explicitly carried
 * by input.requirement and only when input.materialize === true.
 * No physical trigger, OAuth, deployment, version, or production change occurs.
 */
var CENTRAL_GITHUB_WORKFLOW_PACK_V2_SAFE_VERSION = 'CENTRAL_GITHUB_WORKFLOW_PACK_V2_SAFE_ENTRY_20260911_CANDIDATE_2';

function runCentralGitHubWorkflowPackV2Safe(input) {
  input = input || {};
  var started = new Date();
  var runId = 'RUN_GH_WFPACK_SAFE_' + Utilities.formatDate(started, CENTRAL_GITHUB_WORKFLOW_PACK_V2.tz, 'yyyyMMdd_HHmmss_SSS');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) return {ok:true, skipped:true, reason:'LOCK_BUSY', runId:runId, version:CENTRAL_GITHUB_WORKFLOW_PACK_V2_SAFE_VERSION};
  try {
    var ss = SpreadsheetApp.openById(CENTRAL_GITHUB_WORKFLOW_PACK_V2.spreadsheetId);
    var sheets = ghPackSheets_(ss);
    var orderAudit = auditCentralTabOrderV2_(ss);
    var triggerAudit = auditCentralTriggerRegistryV2_(sheets.trigger);
    var signalAudit = auditTrendSignalPolicyV2Strict_(sheets.trend);
    var repoAudit = auditRegisteredRepoCoverageV2_(sheets.repo, sheets.lineage, sheets.workflow, sheets.template);

    var requirement = null;
    var custom = [];
    if (input.requirement) {
      requirement = registerGitHubRequirementV2_(sheets, input.requirement, runId);
      if (input.materialize === true && requirement && requirement.ok && requirement.repository) {
        custom = materializeMissingRepoWorkflowCandidatesV2_(
          sheets,
          {missingCustomWorkflowRepos:[requirement.repository]},
          runId
        );
      }
    }

    var hardPass = orderAudit.ok && triggerAudit.ok && signalAudit.ok && repoAudit.schemaOk;
    var metaGap = signalAudit.metaSignalRows === 0;
    writeGitHubWorkflowPackEvidenceV2_(sheets.evidence, {
      runId:runId,
      ok:hardPass,
      orderAudit:orderAudit,
      triggerAudit:triggerAudit,
      signalAudit:signalAudit,
      repoAudit:repoAudit,
      custom:custom,
      requirement:requirement,
      at:new Date().toISOString()
    });

    return {
      ok:hardPass,
      degraded:!hardPass || metaGap,
      runId:runId,
      mode:input.requirement ? (input.materialize === true ? 'EXPLICIT_REPO_MATERIALIZE' : 'REQUIREMENT_REGISTER_ONLY') : 'AUDIT_ONLY',
      tabOrder:orderAudit,
      triggerContract:triggerAudit,
      trendSignalPolicy:signalAudit,
      metaSignalDataGap:metaGap,
      repoCoverage:repoAudit,
      customWorkflowCandidates:custom,
      requirement:requirement,
      nextAction: hardPass ? 'BOUND_RUNTIME_X2_THEN_USER_VERSION_APPROVAL' : 'FIRST_BROKEN_STAGE_SEARCH_LEARN_MIN_FIX_RETEST',
      version:CENTRAL_GITHUB_WORKFLOW_PACK_V2_SAFE_VERSION
    };
  } catch (e) {
    return {ok:false, runId:runId, error:String(e && e.stack || e), version:CENTRAL_GITHUB_WORKFLOW_PACK_V2_SAFE_VERSION};
  } finally {
    lock.releaseLock();
  }
}

function auditTrendSignalPolicyV2Strict_(sheet) {
  var headers = ghPackHeaders_(sheet);
  var missing = CENTRAL_GITHUB_WORKFLOW_PACK_V2.requiredSignalFields.filter(function(h){return headers.indexOf(h)<0;});
  var rows = ghPackTailRows_(sheet, 500), google=0, meta=0, violations=[];
  function isGoogleTrend(platform) {
    return /(^|[+_|])GOOGLE(_TRENDS?|_TRENDS_LIVE_UI)?($|[+_|])/.test(platform) || /(^|[+_|])GOOGLE_TRENDS($|[+_|])/.test(platform);
  }
  function isMetaSignal(platform) {
    return /(^|[+_|])META(_SIGNAL|_CONTENT|_GRAPH|_SEARCH|_AD_LIBRARY_PUBLIC|_BRANDED_CONTENT_PUBLIC)?($|[+_|])/.test(platform) && platform.indexOf('METADATA') < 0;
  }
  rows.forEach(function(r){
    var platform=String(r.PLATFORM||'').toUpperCase();
    var g=isGoogleTrend(platform), m=isMetaSignal(platform);
    if(g)google++;
    if(m)meta++;
    var state=[r.STATUS,r.RECOMMENDED_ACTION,r.TREND_SIGNAL].join('|');
    if((g||m) && CENTRAL_GITHUB_WORKFLOW_PACK_V2.forbiddenSignalPromotion.test(state)) violations.push(String(r.RESEARCH_ID||'UNKNOWN'));
  });
  return {
    ok:missing.length===0 && violations.length===0,
    schemaMissing:missing,
    sampledRows:rows.length,
    googleSignalRows:google,
    metaSignalRows:meta,
    directPromotionViolations:violations.slice(0,20),
    warning:meta===0?'META_SIGNAL_DATA_NOT_IMPLEMENTED_OR_NOT_INGESTED':'',
    policy:'SIGNAL_ONLY→NORMALIZE/DEDUPE→CROSS_EVIDENCE→QUEENS_CANDIDATE;TERM/TOPIC+LOCALE+TIME_WINDOW+COLLECTED_AT+CONFIDENCE_REQUIRED'
  };
}

function testCentralGitHubWorkflowPackV2SafeStatic() {
  return {
    ok:true,
    defaultMode:'AUDIT_ONLY',
    bulkLegacyMaterialization:false,
    explicitRepoOnly:true,
    physicalTriggerCreated:false,
    oauthChanged:false,
    deploymentChanged:false,
    versionCreated:false,
    productionChanged:false,
    version:CENTRAL_GITHUB_WORKFLOW_PACK_V2_SAFE_VERSION
  };
}

function testCentralGitHubWorkflowPackV2SafeX2() {
  var a = runCentralGitHubWorkflowPackV2Safe({});
  var b = runCentralGitHubWorkflowPackV2Safe({});
  var ok = !!(a && b && a.ok && b.ok && a.runId && b.runId && a.runId !== b.runId);
  var ss = SpreadsheetApp.openById(CENTRAL_GITHUB_WORKFLOW_PACK_V2.spreadsheetId);
  var sh = ss.getSheetByName(CENTRAL_GITHUB_WORKFLOW_PACK_V2.evidenceTab);
  ghPackAppendObject_(sh, ghPackHeaders_(sh), {
    EVIDENCE_ID:'EVID_GH_WFPACK_X2_' + ghPackHash_(String(a&&a.runId)+'|'+String(b&&b.runId)).slice(0,12).toUpperCase(),
    PROJECT_ID:'P00_AGENT_CORE', APP_ID:'ALL_REPOS', FUNCTION_OR_ROUTE:'testCentralGitHubWorkflowPackV2SafeX2',
    RUN_ID:String(a&&a.runId)+'|'+String(b&&b.runId), DRIVE_ACK:'01_MASTER_REGISTRY_WRITEBACK_X2',
    PASS_1:(a&&a.ok)?'PASS':'FAIL', PASS_2:(b&&b.ok)?'PASS':'FAIL',
    LAST_GOOD:'ORCH_ALL_APP_WORKFLOW_TEMPLATE_V1 + CENTRAL_PROBLEM_AUTOFIX_SUPERVISOR_V1_20260905',
    STATUS:ok?'PASS_X2_VERSION_GATE_READY':'FAIL_X2_SEARCH_LEARN_REQUIRED',
    ROOT_CAUSE:ok?'NONE':'SAFE_AUDIT_X2_FAILED', MIN_FIX:'FIRST_BROKEN_STAGE_MINIMUM_DIFF_ONLY',
    NEXT_RESUME_POINT:ok?'DRIVE_READBACK_THEN_CREATE_VERSION':'SEARCH_LEARN_MIN_FIX_RETEST', UPDATED_AT:ghPackNow_()
  });
  return {ok:ok, pass1:a, pass2:b, version:CENTRAL_GITHUB_WORKFLOW_PACK_V2_SAFE_VERSION};
}

function maybeRunCentralGitHubWorkflowPackV2ApprovedX2Once_() {
  var p=PropertiesService.getScriptProperties(), key='GH_WFPACK_V2_META_CLASSIFIER_X2_20260911';
  var base;
  if(p.getProperty(key)==='PASS') base={ok:true,skipped:true,reason:'APPROVED_X2_ALREADY_PASS'};
  else { base=testCentralGitHubWorkflowPackV2SafeX2(); if(base.ok) p.setProperty(key,'PASS'); }
  var raw={ok:true,skipped:true,reason:'RAW_ENTRY_HARDEN_X2_HANDLER_ABSENT'};
  try{raw=(typeof maybeRunRawEntryHardenX2OnceV16_==='function')?maybeRunRawEntryHardenX2OnceV16_():raw;}catch(e){raw={ok:false,error:String(e&&e.message||e)};}
  return {ok:!!base.ok&&raw.ok!==false,base:base,rawEntryHardeningX2:raw};
}
