const CENTRAL_TABLET_REMOTE_DISPATCHER_VERSION = 'CENTRAL_TABLET_REMOTE_DISPATCHER_V2_IMMEDIATE_WARM_20260902';
const CENTRAL_TABLET_REMOTE = Object.freeze({
  tabletQueueSheetId: '1pZFNTeu-F0CjhYAuoKazD92UMn6A-9nkse6QyYwj2yA',
  workerStatusFileId: '1cH1q2h5qZQh7e4Mvgj1xYqbOflhBTMdw',
  actionStatusFileId: '1s0iZXTqL5dOIkQk9LuJr6Ijk63lHDdZ0',
  actionFileId: '1Weq2xnI9HUrtYhViLg3lZO8SG3a-2s4r',
  controlFileId: '1kuwEpCc80Yu2mB_E8MUel0zedAyftbCO',
  resultsFolderId: '1ck-o3m0551LY__E3Qd0rJ9tsvhydGWCF',
  workerId: 'TABLET_ANDROID_01',
  uiProofJobId: 'TASK_TABLET_RUNTIME_UI_PROOF_20260902_0738',
  flowJobId: 'TASK_TABLET_FLOW_RESUME_20260831_1204',
  staleHeartbeatSec: 180,
  controlRetrySec: 600,
  timeZone: 'Asia/Seoul'
});

/**
 * Central tablet remote dispatcher.
 *
 * P0 contract:
 * - Called logically from the existing processTaskQueue/factory wake.
 * - May ALSO be called synchronously by a central queue-writer immediately after it mutates
 *   TABLET_WORKER_QUEUE. This immediate call creates no trigger and does not depend on OpenAI Work.
 * - Existing 5m processTaskQueue remains recovery/fallback wake only for tablet dispatch latency.
 * - W1~W5 may supervise/audit, but ordinary dispatch is owned by central Apps Script.
 * - One physical tablet UI mutation at a time.
 * - Screen-off continuity is a background-only gate; it does not block foreground remote work.
 * - INPUT_CANARY is deprecated and must never be emitted.
 * - OPEN_FLOW is allowed before Automate Interact proof so Flow can be warm while the UI controller
 *   is validated; click/type/generate still requires a valid installation-specific Automate URI
 *   and runtime proof.
 * - Historical Work Cloud LAST_GOOD is evidence/fallback only, never a prerequisite.
 */
function runCentralTabletRemoteDispatcherFromFactory(context) {
  const cfg = CENTRAL_TABLET_REMOTE;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) return {ok:false, hold:true, status:'LOCK_BUSY', version:CENTRAL_TABLET_REMOTE_DISPATCHER_VERSION};
  try {
    const now = new Date();
    const worker = readTabletJsonFile_(cfg.workerStatusFileId);
    const actionStatus = readTabletJsonFile_(cfg.actionStatusFileId);
    const workerTime = worker.time ? new Date(worker.time) : null;
    const heartbeatAgeSec = workerTime && !isNaN(workerTime.getTime()) ? Math.max(0, Math.floor((now.getTime()-workerTime.getTime())/1000)) : 999999;
    const heartbeatFresh = heartbeatAgeSec <= cfg.staleHeartbeatSec;

    const ss = SpreadsheetApp.openById(cfg.tabletQueueSheetId);
    const queue = ss.getSheetByName('QUEUE') || ss.getSheets()[0];
    if (!queue) throw new Error('TABLET_QUEUE_MISSING');
    const data = queue.getDataRange().getValues();
    if (data.length < 2) return {ok:true, hold:true, status:'QUEUE_EMPTY', heartbeatAgeSec:heartbeatAgeSec, version:CENTRAL_TABLET_REMOTE_DISPATCHER_VERSION};
    const idx = tabletHeaderIndex_(data[0]);
    const rows = data.slice(1);
    const proofRow = tabletFindJob_(rows, idx, cfg.uiProofJobId);
    const flowRow = tabletFindJob_(rows, idx, cfg.flowJobId);

    const currentControl = readTabletTextFile_(cfg.controlFileId);
    const currentAction = readTabletTextFile_(cfg.actionFileId);

    if (!heartbeatFresh) {
      const lastControlTime = workerTime && !isNaN(workerTime.getTime()) ? workerTime.getTime() : 0;
      const mayRetry = (now.getTime() - lastControlTime) >= cfg.controlRetrySec * 1000;
      if (mayRetry && !/^CENTRALRUN_[^|]+\|RUN$/i.test(currentControl)) {
        const id = 'CENTRALRUN_' + Utilities.formatDate(now, cfg.timeZone, 'yyyyMMdd_HHmmss');
        writeTabletTextFile_(cfg.controlFileId, id + '|RUN\n');
        return {ok:true, hold:true, status:'CONTROL_RUN_PUBLISHED_WAIT_HEARTBEAT', controlId:id, heartbeatAgeSec:heartbeatAgeSec, version:CENTRAL_TABLET_REMOTE_DISPATCHER_VERSION};
      }
      return {ok:true, hold:true, status:'WAIT_FRESH_TABLET_HEARTBEAT', heartbeatAgeSec:heartbeatAgeSec, currentControl:currentControl, version:CENTRAL_TABLET_REMOTE_DISPATCHER_VERSION};
    }

    const proof = readLatestTabletRuntimeProof_(cfg.resultsFolderId);
    const proofPass = proof && proof.valid === true;
    const scriptProps = PropertiesService.getScriptProperties();
    const canaryUri = String(scriptProps.getProperty('TABLET_AUTOMATE_CANARY_URI') || '').trim();
    const flowE2eUri = String(scriptProps.getProperty('TABLET_AUTOMATE_FLOW_E2E_URI') || '').trim();

    // Warm Flow immediately whenever a live Flow job exists. OPEN_FLOW is transport-only and is
    // allowed before Automate Interact proof. Do not repeat it when the current command or latest
    // ACK already represents a successful Flow open.
    if (flowRow && !tabletTerminalRow_(flowRow, idx)) {
      const openAck = String(actionStatus.action || '').toUpperCase() === 'OPEN_FLOW' && String(actionStatus.result || '').toUpperCase() === 'OPEN_STARTED';
      if (!sameTabletCommand_(currentAction, 'OPEN_FLOW', '') && !openAck) {
        const id = 'FLOWOPEN_' + Utilities.formatDate(now, cfg.timeZone, 'yyyyMMdd_HHmmss');
        writeTabletTextFile_(cfg.actionFileId, id + '|OPEN_FLOW|https://labs.google/fx/tools/flow\n');
        tabletPatchQueueStatus_(queue, flowRow.__sheetRow, idx, 'WAITING_FLOW_OPEN_ACK', 'IMMEDIATE_CENTRAL_FUNCTION→OPEN_FLOW→ACTION_ACK; UI proof may continue in parallel after Flow is warm');
        return {ok:true, hold:true, status:'FLOW_WARM_OPEN_PUBLISHED', actionId:id, heartbeatAgeSec:heartbeatAgeSec, proofPass:proofPass, source:String(context && context.source || 'factory'), version:CENTRAL_TABLET_REMOTE_DISPATCHER_VERSION};
      }
    }

    if (!proofPass && proofRow && !tabletTerminalRow_(proofRow, idx)) {
      if (canaryUri && /^automate:/.test(canaryUri) && canaryUri !== 'automate:central-agent') {
        const id = 'TABPROOF_' + Utilities.formatDate(now, cfg.timeZone, 'yyyyMMdd_HHmmss');
        const desired = id + '|RUN_AUTOMATE_CANARY|' + canaryUri;
        if (!sameTabletCommand_(currentAction, 'RUN_AUTOMATE_CANARY', canaryUri) && String(actionStatus.action_id || '') !== id) {
          writeTabletTextFile_(cfg.actionFileId, desired + '\n');
          tabletPatchQueueStatus_(queue, proofRow.__sheetRow, idx, 'WAITING_AUTOMATE_CANARY_ACK', 'CENTRAL_FUNCTION→RUN_AUTOMATE_CANARY→TABLET_RUNTIME_UI_PROOF.json→readback');
          return {ok:true, hold:true, status:'AUTOMATE_CANARY_PUBLISHED', actionId:id, heartbeatAgeSec:heartbeatAgeSec, version:CENTRAL_TABLET_REMOTE_DISPATCHER_VERSION};
        }
      }

      if (!sameTabletCommand_(currentAction, 'DISCOVER_AUTOMATE_RUNTIME_HINTS', '')) {
        const id = 'TABHINT_' + Utilities.formatDate(now, cfg.timeZone, 'yyyyMMdd_HHmmss');
        writeTabletTextFile_(cfg.actionFileId, id + '|DISCOVER_AUTOMATE_RUNTIME_HINTS\n');
        tabletPatchQueueStatus_(queue, proofRow.__sheetRow, idx, 'WAITING_AUTOMATE_URI_DISCOVERY_ACK', 'CENTRAL_FUNCTION→DISCOVER_AUTOMATE_RUNTIME_HINTS; if no installation URI is found, preserve task and require one-time Automate flow URI setup');
        return {ok:true, hold:true, status:'AUTOMATE_HINT_DISCOVERY_PUBLISHED', actionId:id, heartbeatAgeSec:heartbeatAgeSec, version:CENTRAL_TABLET_REMOTE_DISPATCHER_VERSION};
      }

      tabletPatchQueueStatus_(queue, proofRow.__sheetRow, idx, 'HOLD_AUTOMATE_INTERACT_URI_NOT_REGISTERED', 'Set TABLET_AUTOMATE_CANARY_URI once from the installed Automate flow; OpenAI Work is not a dependency');
      return {ok:true, hold:true, status:'AUTOMATE_URI_REQUIRED_ONCE', heartbeatAgeSec:heartbeatAgeSec, lastActionResult:String(actionStatus.result || ''), version:CENTRAL_TABLET_REMOTE_DISPATCHER_VERSION};
    }

    if (proofPass && flowRow && !tabletTerminalRow_(flowRow, idx)) {
      if (flowE2eUri && /^automate:/.test(flowE2eUri) && flowE2eUri !== 'automate:central-agent') {
        const id = 'FLOWE2E_' + Utilities.formatDate(now, cfg.timeZone, 'yyyyMMdd_HHmmss');
        if (!sameTabletCommand_(currentAction, 'RUN_AUTOMATE_URI', flowE2eUri)) {
          writeTabletTextFile_(cfg.actionFileId, id + '|RUN_AUTOMATE_URI|' + flowE2eUri + '\n');
          tabletPatchQueueStatus_(queue, flowRow.__sheetRow, idx, 'WAITING_FLOW_E2E_ACK_AND_DRIVE_RESULT', 'IMMEDIATE_CENTRAL_FUNCTION→RUN_AUTOMATE_URI→Flow generate exactly 1→Drive file metadata→ACK');
          return {ok:true, hold:true, status:'FLOW_E2E_AUTOMATE_PUBLISHED', actionId:id, heartbeatAgeSec:heartbeatAgeSec, version:CENTRAL_TABLET_REMOTE_DISPATCHER_VERSION};
        }
      }
      tabletPatchQueueStatus_(queue, flowRow.__sheetRow, idx, 'HOLD_FLOW_E2E_URI_NOT_REGISTERED', 'OPEN_FLOW transport is proven; register TABLET_AUTOMATE_FLOW_E2E_URI once for click/type/generate. Do not use OpenAI Work as scheduler.');
      return {ok:true, hold:true, status:'FLOW_E2E_URI_REQUIRED_ONCE', heartbeatAgeSec:heartbeatAgeSec, version:CENTRAL_TABLET_REMOTE_DISPATCHER_VERSION};
    }

    return {ok:true, status:'NO_SAFE_TABLET_MUTATION_DUE', heartbeatAgeSec:heartbeatAgeSec, proofPass:proofPass, actionResult:String(actionStatus.result || ''), version:CENTRAL_TABLET_REMOTE_DISPATCHER_VERSION};
  } catch (err) {
    return {ok:false, hold:true, status:'CENTRAL_TABLET_DISPATCH_ERROR', error:String(err && err.message || err), version:CENTRAL_TABLET_REMOTE_DISPATCHER_VERSION};
  } finally {
    lock.releaseLock();
  }
}

/**
 * Immediate logical dispatch entrypoint for central queue writers.
 * Call this synchronously AFTER an approved TABLET_WORKER_QUEUE mutation.
 * It creates no trigger. The existing 5m processTaskQueue wake remains only fallback/self-heal.
 */
function runCentralTabletRemoteDispatcherImmediate(context) {
  const ctx = context || {};
  ctx.source = String(ctx.source || 'central_queue_write_immediate');
  ctx.immediate = true;
  return runCentralTabletRemoteDispatcherFromFactory(ctx);
}

/**
 * Canonical hook to be called by any central function that creates/resumes/reprioritizes a tablet job.
 * This keeps queue mutation and dispatch in the same Apps Script execution instead of waiting up to 5m.
 */
function notifyCentralTabletQueueMutationAndDispatch(context) {
  return runCentralTabletRemoteDispatcherImmediate(context || {source:'tablet_queue_mutation'});
}

function readTabletJsonFile_(fileId) {
  try { return JSON.parse(DriveApp.getFileById(fileId).getBlob().getDataAsString('UTF-8') || '{}'); }
  catch (e) { return {}; }
}
function readTabletTextFile_(fileId) {
  try { return String(DriveApp.getFileById(fileId).getBlob().getDataAsString('UTF-8') || '').trim(); }
  catch (e) { return ''; }
}
function writeTabletTextFile_(fileId, text) { DriveApp.getFileById(fileId).setContent(String(text || '')); }
function tabletHeaderIndex_(header) {
  const out = {}; header.forEach(function(v,i){ out[String(v)] = i; });
  ['JOB_ID','STATUS','RESUME_POINT','VERIFIED'].forEach(function(k){ if (out[k] === undefined) throw new Error('TABLET_QUEUE_COLUMN_MISSING_' + k); });
  return out;
}
function tabletFindJob_(rows, idx, jobId) {
  for (var i=0;i<rows.length;i++) if (String(rows[i][idx.JOB_ID] || '') === jobId) { var copy=rows[i].slice(); copy.__sheetRow=i+2; return copy; }
  return null;
}
function tabletTerminalRow_(row, idx) {
  if (!row) return true;
  const status = String(row[idx.STATUS] || '').toUpperCase();
  const verified = row[idx.VERIFIED] === true || String(row[idx.VERIFIED] || '').toUpperCase() === 'TRUE';
  return verified || /DONE|VERIFIED|STOPPED|SUPERSEDED/.test(status);
}
function tabletPatchQueueStatus_(sheet, sheetRow, idx, status, resume) {
  if (!sheetRow) return;
  sheet.getRange(sheetRow, idx.STATUS + 1).setValue(status);
  sheet.getRange(sheetRow, idx.RESUME_POINT + 1).setValue(resume);
}
function sameTabletCommand_(current, command, arg) {
  const p = String(current || '').split('|');
  const c = String(p[1] || '').toUpperCase();
  const a = p.length > 2 ? p.slice(2).join('|') : '';
  return c === String(command || '').toUpperCase() && (!arg || a === arg);
}
function readLatestTabletRuntimeProof_(folderId) {
  try {
    const it = DriveApp.getFolderById(folderId).getFilesByName('TABLET_RUNTIME_UI_PROOF.json');
    if (!it.hasNext()) return {valid:false, reason:'PROOF_FILE_ABSENT'};
    const f = it.next();
    const obj = JSON.parse(f.getBlob().getDataAsString('UTF-8') || '{}');
    const result = String(obj.result || obj.status || '').toUpperCase();
    return {valid:/PASS|VERIFIED|INTERACT/.test(result) && !/FAIL|ERROR|NOT_RETURNED/.test(result), fileId:f.getId(), result:result, raw:obj};
  } catch (e) { return {valid:false, reason:String(e)}; }
}

function auditCentralTabletRemoteTriggerContract() {
  const handlers = ScriptApp.getProjectTriggers().map(function(t){return t.getHandlerFunction();});
  const own = handlers.filter(function(h){ return h === 'runCentralTabletRemoteDispatcherFromFactory' || h === 'runCentralTabletRemoteDispatcherImmediate' || h === 'notifyCentralTabletQueueMutationAndDispatch'; }).length;
  return {
    ok: own === 0,
    physicalTriggerCount: own,
    physicalWakePolicy:'IMMEDIATE_ON_QUEUE_MUTATION_PLUS_EXISTING_PROCESS_TASK_QUEUE_FALLBACK;NO_DEDICATED_TABLET_DISPATCH_TRIGGER',
    targetDispatchLatencySec:'0-30 tablet poll + function execution; 5m wake fallback only',
    openAiWorkDependency:false,
    workerStatusFileId:CENTRAL_TABLET_REMOTE.workerStatusFileId,
    version:CENTRAL_TABLET_REMOTE_DISPATCHER_VERSION
  };
}
