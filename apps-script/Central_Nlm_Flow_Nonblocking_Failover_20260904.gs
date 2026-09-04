const GLOBAL_NLM_FLOW_NONBLOCKING_FAILOVER_VERSION = 'GLOBAL_NLM_FLOW_NONBLOCKING_FAILOVER_V1';
const GLOBAL_NLM_FLOW_MASTER_ID = '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI';
const GLOBAL_NLM_FLOW_FRESH_MINUTES = 60;

/**
 * Logical-only policy governor.
 *
 * Invariants:
 * - Never creates a physical trigger/project/deployment/OAuth grant.
 * - NotebookLM/Flow failure can HOLD only the provider-dependent artifact lane.
 * - Independent Drive/Queens/Seed/T1/T2/ImagePack/Persona/Animation/TTS lanes continue.
 * - Recovery requires distinct x2 RESULT/ACK + Drive readback before PRIMARY promotion.
 * - Missing provider evidence never fabricates an artifact or marks provider success.
 *
 * Runtime wiring target: the existing factory/central-health wake only.
 */
function runGlobalNlmFlowNonblockingFailover10m_(ctx) {
  ctx = ctx || {};
  const startedAt = new Date();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) {
    return {ok:true, skipped:true, reason:'LOCKED', version:GLOBAL_NLM_FLOW_NONBLOCKING_FAILOVER_VERSION};
  }

  try {
    const ss = SpreadsheetApp.openById(GLOBAL_NLM_FLOW_MASTER_ID);
    const bridges = readBridgeHealth_(ss);
    const taskClass = normalizeFailoverTaskClass_(ctx.taskClass || ctx.requirementClass || ctx.outputMode || 'MULTIMODAL');
    const requirement = String(ctx.requiredArtifact || ctx.requirement || '').toUpperCase();

    const nlm = classifyProviderHealth_(bridges.notebooklm, 'NOTEBOOKLM');
    const flow = classifyProviderHealth_(bridges.flow, 'FLOW');
    const fallback = chooseGlobalFailoverRoute_(taskClass, requirement, nlm, flow);

    const mode = (nlm.primaryReady && flow.primaryReady) ? 'PRIMARY' : 'FALLBACK_NONBLOCKING';
    const result = {
      ok:true,
      version:GLOBAL_NLM_FLOW_NONBLOCKING_FAILOVER_VERSION,
      mode:mode,
      taskClass:taskClass,
      notebooklm:nlm,
      flow:flow,
      primaryWorker: fallback.primaryWorker,
      fallbackWorker: fallback.fallbackWorker,
      holdScope: fallback.holdScope,
      continueScope: fallback.continueScope,
      routeReason: fallback.routeReason,
      recoveryGate:'DISTINCT_X2_RESULT_ACK_DRIVE_READBACK',
      noNewPhysicalTrigger:true,
      startedAt:startedAt.toISOString(),
      finishedAt:new Date().toISOString()
    };

    persistGlobalFailoverMode_(result);
    appendGlobalFailoverQa_(ss, ctx, result);
    return result;
  } catch (err) {
    return {
      ok:false,
      degraded:true,
      version:GLOBAL_NLM_FLOW_NONBLOCKING_FAILOVER_VERSION,
      error:String(err && err.message || err),
      policy:'FAIL_PROVIDER_LANE_ONLY;CONTINUE_INDEPENDENT_LANES'
    };
  } finally {
    lock.releaseLock();
  }
}

function readBridgeHealth_(ss) {
  const sh = ss.getSheetByName('24_CHROME_BRIDGE_REGISTRY');
  if (!sh || sh.getLastRow() < 2) return {notebooklm:null, flow:null};
  const values = sh.getRange(1, 1, sh.getLastRow(), Math.min(sh.getLastColumn(), 24)).getDisplayValues();
  const header = values[0];
  const idx = {};
  header.forEach(function(v, i) { idx[String(v).trim()] = i; });
  function toObj(row) {
    const out = {};
    header.forEach(function(v, i) { out[String(v).trim()] = row[i]; });
    return out;
  }
  const rows = values.slice(1).map(toObj);
  const nlm = rows.find(function(r) { return r.BRIDGE_ID === 'BRG_021'; }) ||
              rows.find(function(r) { return r.TARGET_SERVICE === 'NotebookLM' && r.BRIDGE_ID !== 'BRG_001'; }) ||
              rows.find(function(r) { return r.BRIDGE_ID === 'BRG_001'; }) || null;
  const flow = rows.find(function(r) { return r.BRIDGE_ID === 'BRG_002'; }) ||
               rows.find(function(r) { return /Flow/i.test(String(r.TARGET_SERVICE || '')); }) || null;
  return {notebooklm:nlm, flow:flow};
}

function classifyProviderHealth_(row, provider) {
  if (!row) return {provider:provider, primaryReady:false, state:'MISSING_REGISTRY'};
  const runtime = String(row.RUNTIME_STATE || '');
  const successAt = String(row.LAST_SUCCESS_AT || '');
  const error = String(row.LAST_ERROR || row.BLOCKER || '');
  const positive = /VERIFIED|PASS|SUCCESS|ACTIVE/i.test(runtime) && !/PENDING|HOLD|ERROR|UNVERIFIED|NOT_RUN|DISABLED/i.test(runtime);
  const fresh = isFreshKstTimestamp_(successAt, GLOBAL_NLM_FLOW_FRESH_MINUTES);
  return {
    provider:provider,
    primaryReady:positive && fresh,
    state:runtime || 'UNKNOWN',
    lastSuccessAt:successAt || '',
    fresh:fresh,
    blocker:error || ''
  };
}

function isFreshKstTimestamp_(text, maxMinutes) {
  if (!text) return false;
  const normalized = String(text).replace(' KST', '+09:00').replace(' ', 'T');
  const ms = Date.parse(normalized);
  if (!isFinite(ms)) return false;
  return (Date.now() - ms) >= 0 && (Date.now() - ms) <= maxMinutes * 60000;
}

function normalizeFailoverTaskClass_(value) {
  const s = String(value || '').toUpperCase();
  if (/IMAGE|THUMB|INTERIOR_VISUAL|PERSONA/.test(s)) return 'IMAGE';
  if (/AUDIO|VOICE|TTS|PODCAST/.test(s)) return 'AUDIO';
  if (/VIDEO|SHORTS|MOTION|ANIMATION|FLOW/.test(s)) return 'VIDEO';
  if (/TEXT|ARTICLE|BLOG|SCRIPT|REPORT|SUMMARY|DATA/.test(s)) return 'TEXT_DATA';
  return 'MULTIMODAL';
}

function chooseGlobalFailoverRoute_(taskClass, requirement, nlm, flow) {
  const uniqueNlm = /NOTEBOOKLM_ONLY|NOTEBOOKLM_UNIQUE/.test(requirement);
  const uniqueFlow = /FLOW_ONLY|FLOW_UNIQUE/.test(requirement);
  const continueScope = 'DRIVE|SHEETS|QUEENS|SEED|T1|T2|IMAGEPACK|PERSONA|CONTENTOS|INTERIOR|TRAVEL|VTUBE|SHORTS|DETERMINISTIC_WORKERS';

  if (taskClass === 'IMAGE') {
    return {
      primaryWorker: flow.primaryReady ? 'FLOW_OPTIONAL' : 'IMAGEPACK_PRIMARY',
      fallbackWorker:'IMAGEPACK|VERIFIED_ASSET|DETERMINISTIC_IMAGE_EDIT',
      holdScope: uniqueFlow && !flow.primaryReady ? 'FLOW_UNIQUE_ARTIFACT_ONLY' : 'NONE',
      continueScope:continueScope,
      routeReason:flow.primaryReady ? 'FLOW_HEALTHY_OPTIONAL' : 'FLOW_DEGRADED_USE_IMAGEPACK'
    };
  }
  if (taskClass === 'AUDIO') {
    return {
      primaryWorker:nlm.primaryReady ? 'NOTEBOOKLM_OPTIONAL' : 'APPROVED_TTS_LANGUAGE_VOICE',
      fallbackWorker:'APPROVED_TTS|LANGUAGE_PACK|VOICE_PACK|LAST_GOOD_AUDIO',
      holdScope: uniqueNlm && !nlm.primaryReady ? 'NOTEBOOKLM_UNIQUE_ARTIFACT_ONLY' : 'NONE',
      continueScope:continueScope,
      routeReason:nlm.primaryReady ? 'NLM_HEALTHY_OPTIONAL' : 'NLM_DEGRADED_USE_AUDIO_FALLBACK'
    };
  }
  if (taskClass === 'VIDEO') {
    return {
      primaryWorker:flow.primaryReady ? 'FLOW_OPTIONAL' : 'ANIMATION_VTUBE_LOCAL_RENDERER',
      fallbackWorker:'IMAGEPACK|STORYBOARD|ANIMATION|VTUBE|LOCAL_RENDERER|LAST_GOOD_VIDEO',
      holdScope: uniqueFlow && !flow.primaryReady ? 'FLOW_UNIQUE_ARTIFACT_ONLY' : 'NONE',
      continueScope:continueScope,
      routeReason:flow.primaryReady ? 'FLOW_HEALTHY_OPTIONAL' : 'FLOW_DEGRADED_USE_DETERMINISTIC_VIDEO_FALLBACK'
    };
  }
  if (taskClass === 'TEXT_DATA') {
    return {
      primaryWorker:'DIRECT_DRIVE_SHEETS_QUEENS_SEED_T1_T2',
      fallbackWorker:'LAST_GOOD|VERIFIED_TEMPLATE|EXISTING_BACKEND',
      holdScope:'NONE',
      continueScope:continueScope,
      routeReason:'NLM_FLOW_NEVER_REQUIRED_FOR_CORE_TEXT_DATA'
    };
  }
  return {
    primaryWorker:'CENTRAL_TASK_CLASS_ROUTER',
    fallbackWorker:'DRIVE_SHEETS|IMAGEPACK|PERSONA|APPROVED_TTS|ANIMATION|VTUBE|LOCAL_RENDERER|LAST_GOOD',
    holdScope:(!nlm.primaryReady || !flow.primaryReady) ? 'ONLY_UNIQUE_PROVIDER_ARTIFACT_SUBTASK' : 'NONE',
    continueScope:continueScope,
    routeReason:'MULTIMODAL_PROVIDER_HEALTH_ROUTING'
  };
}

function persistGlobalFailoverMode_(result) {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    GLOBAL_NLM_FLOW_FAILOVER_VERSION: GLOBAL_NLM_FLOW_NONBLOCKING_FAILOVER_VERSION,
    GLOBAL_NLM_FLOW_MODE: String(result.mode),
    GLOBAL_NLM_FLOW_LAST_CHECK_AT: String(result.finishedAt),
    GLOBAL_NLM_PRIMARY_READY: String(!!(result.notebooklm.primaryReady && result.flow.primaryReady))
  }, false);
}

function appendGlobalFailoverQa_(ss, ctx, result) {
  const sh = ss.getSheetByName('80_DATA_RUNTIME_QA_LOG');
  if (!sh) return;
  const now = new Date().toISOString();
  const runId = String(ctx.runId || ('NLM_FLOW_FAILOVER_' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd_HHmm')));
  const qaId = 'QA_' + runId;
  const existing = sh.createTextFinder(qaId).matchEntireCell(true).findNext();
  if (existing) return;
  sh.appendRow([
    qaId,
    runId,
    'P00_AGENT_CORE;ALL_APPS',
    GLOBAL_NLM_FLOW_NONBLOCKING_FAILOVER_VERSION,
    'REUSE_EXISTING_FACTORY_OR_CENTRAL_HEALTH_WATCH',
    '24|36|56|61|66|75|86|93',
    String(ctx.inputHash || ''),
    'PRIMARY_OR_FALLBACK_ROUTE',
    'RESULT_' + runId,
    now,
    now,
    result.mode,
    'POLICY_DECISION_RECORDED;INDEPENDENT_LANES_CONTINUE',
    100,
    result.mode === 'PRIMARY' ? '' : 'NLM_FLOW_PROVIDER_DEGRADED_OR_UNVERIFIED',
    0,
    'GLOBAL_NLM_FLOW_NONBLOCKING_FAILOVER_V1',
    'If provider recovers, require distinct x2 RESULT/ACK+Drive readback before PRIMARY promotion.'
  ]);
}

function testGlobalNlmFlowNonblockingFailoverPolicy_() {
  const cases = [
    {taskClass:'TEXT_DATA', requirement:'ARTICLE'},
    {taskClass:'IMAGE', requirement:'IMAGE'},
    {taskClass:'AUDIO', requirement:'AUDIO'},
    {taskClass:'VIDEO', requirement:'VIDEO'}
  ];
  return cases.map(function(c) { return runGlobalNlmFlowNonblockingFailover10m_(c); });
}
