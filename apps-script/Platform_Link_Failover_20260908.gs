/* PLATFORM_LINK_FAILOVER_V1_20260908
 * Logical-only stage. Reuses the existing processTaskQueue / ContentOS factory wake.
 * Creates no physical trigger and never overwrites original/RAW/master content.
 *
 * Canonical control:
 * - 106_PLATFORM_LINK_FAILOVER_REGISTRY: asset pointer/fallback state
 * - 105_GEMINI_CROSSCHECK_QUESTION_QUEUE: advisory crosscheck only
 *
 * Safety:
 * - two consecutive URL failures are required before succession
 * - exact same ASSET_ID row + readable Drive master + rights/provenance/hash gate
 * - only registered exact reference cells in REFERENCE_TARGETS_JSON may be changed
 * - LAST_GOOD + rollback token are written before pointer mutation
 * - two readbacks + consistency pass are required; otherwise rollback
 */
const PLATFORM_FAILOVER_V1 = Object.freeze({
  version: 'PLATFORM_LINK_FAILOVER_V1_20260908',
  registrySpreadsheetId: '1KCRFfuYZ0rEtO5S0ry1FXIG7ChaRMTDmraDEIbh4P70',
  registrySheetName: '106_PLATFORM_LINK_FAILOVER_REGISTRY',
  qaSpreadsheetId: '1ykHt9aY40VFtKhlU0aaOTJ_14DlvgqW7l7ebUnUXV3k',
  qaSheetName: '80_DATA_RUNTIME_QA_LOG',
  historySpreadsheetId: '1HJvep97yhC_9GlBljF5dmLSjTqfAjTsWWMrvRxy_l7c',
  historySheetName: '34_CHAT_COMMAND_HISTORY',
  taskId: 'TASK_20260908_PLATFORM_LINK_FAILOVER_001',
  logicalMinutes: 5,
  minConsecutiveFailures: 2,
  hashBlobMaxBytes: 20 * 1024 * 1024
});

function runPlatformLinkFailoverGuard() {
  const started = new Date();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(2000)) return {ok:true, skipped:true, reason:'LOCK_BUSY', version:PLATFORM_FAILOVER_V1.version};
  try {
    const ss = SpreadsheetApp.openById(PLATFORM_FAILOVER_V1.registrySpreadsheetId);
    const sh = ss.getSheetByName(PLATFORM_FAILOVER_V1.registrySheetName);
    if (!sh) return {ok:false, error:'REGISTRY_SHEET_MISSING', version:PLATFORM_FAILOVER_V1.version};
    const values = sh.getDataRange().getValues();
    if (values.length < 2) return {ok:true, skipped:true, reason:'NO_ROWS', version:PLATFORM_FAILOVER_V1.version};
    const ix = platformFailoverHeaderIndex_(values[0]);
    const required = ['ASSET_ID','ACTIVE_URL','URL_STATE','DRIVE_MASTER_FILE_ID','DRIVE_MASTER_URL','STORAGE_TIER','IMPORTANCE_SCORE','USE_FREQ_30D','CONTENT_HASH','FALLBACK_READY_YN','FAILOVER_TRIGGER_STATE','REPLACEMENT_URL','SUCCESSION_STATE','UPDATED_REFERENCES_COUNT','QA_X2_STATE','CONSISTENCY_STATE','LOG_STATE','LAST_GOOD_URL','LAST_GOOD_AT','RIGHTS_MODE','REFERENCE_TARGETS_JSON','FAIL_COUNT','LAST_FAIL_HTTP','ROLLBACK_TOKEN','ERROR_STATE'];
    const missing = required.filter(function(k){ return ix[k] == null; });
    if (missing.length) return {ok:false, error:'REGISTRY_SCHEMA_MISSING:'+missing.join(','), version:PLATFORM_FAILOVER_V1.version};

    const results = [];
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const assetId = platformFailoverStr_(row[ix.ASSET_ID]);
      if (!assetId || /^CONFIG_/.test(assetId)) continue;
      const result = platformFailoverProcessRow_(sh, r + 1, row, ix);
      results.push(result);
    }
    const ok = results.every(function(x){ return x.ok !== false || x.hold === true || x.skipped === true; });
    return {ok:ok, processed:results.length, results:results, startedAt:started.toISOString(), finishedAt:new Date().toISOString(), version:PLATFORM_FAILOVER_V1.version};
  } finally {
    lock.releaseLock();
  }
}

function platformFailoverProcessRow_(sh, rowNumber, row, ix) {
  const assetId = platformFailoverStr_(row[ix.ASSET_ID]);
  const rightsMode = platformFailoverStr_(row[ix.RIGHTS_MODE]).toUpperCase();
  const importance = Number(row[ix.IMPORTANCE_SCORE] || 0);
  const use30d = Number(row[ix.USE_FREQ_30D] || 0);
  const tier = platformFailoverStorageTier_(importance, use30d, rightsMode);
  platformFailoverSet_(sh,rowNumber,ix.STORAGE_TIER,tier);

  const successionState = platformFailoverStr_(row[ix.SUCCESSION_STATE]).toUpperCase();
  if (/^PASS/.test(successionState) || /^DRIVE_ACTIVE/.test(successionState)) {
    return {ok:true, skipped:true, assetId:assetId, reason:'ALREADY_SUCCEEDED', storageTier:tier};
  }

  const activeUrl = platformFailoverStr_(row[ix.ACTIVE_URL]);
  if (!/^https?:\/\//i.test(activeUrl)) {
    platformFailoverSet_(sh,rowNumber,ix.ERROR_STATE,'ACTIVE_URL_NOT_HTTP');
    return {ok:true, skipped:true, assetId:assetId, reason:'ACTIVE_URL_NOT_HTTP', storageTier:tier};
  }

  const health = platformFailoverCheckUrl_(activeUrl);
  platformFailoverSet_(sh,rowNumber,ix.LAST_URL_CHECK_AT,new Date());
  if (health.ok) {
    platformFailoverSet_(sh,rowNumber,ix.URL_STATE,'HEALTHY');
    platformFailoverSet_(sh,rowNumber,ix.FAIL_COUNT,0);
    platformFailoverSet_(sh,rowNumber,ix.LAST_FAIL_HTTP,'');
    platformFailoverSet_(sh,rowNumber,ix.ERROR_STATE,'');
    return {ok:true, assetId:assetId, state:'HEALTHY', http:health.code, storageTier:tier};
  }

  const previousFailCount = Number(row[ix.FAIL_COUNT] || 0);
  const failCount = previousFailCount + 1;
  platformFailoverSet_(sh,rowNumber,ix.URL_STATE,'FAIL_CANDIDATE');
  platformFailoverSet_(sh,rowNumber,ix.FAIL_COUNT,failCount);
  platformFailoverSet_(sh,rowNumber,ix.LAST_FAIL_HTTP,health.code || health.error || 'FETCH_FAIL');
  platformFailoverSet_(sh,rowNumber,ix.FAILOVER_TRIGGER_STATE,'URL_FAILURE_DETECTED_'+failCount+'X');
  if (failCount < PLATFORM_FAILOVER_V1.minConsecutiveFailures) {
    return {ok:true, hold:true, assetId:assetId, reason:'WAIT_SECOND_DISTINCT_FAILURE', failCount:failCount, http:health.code || null, storageTier:tier};
  }

  const gate = platformFailoverResolveDriveMaster_(row, ix, tier, rightsMode);
  if (!gate.ok) {
    platformFailoverSet_(sh,rowNumber,ix.FALLBACK_READY_YN,'N');
    platformFailoverSet_(sh,rowNumber,ix.SUCCESSION_STATE,'HOLD_'+gate.reason);
    platformFailoverSet_(sh,rowNumber,ix.ERROR_STATE,gate.reason);
    platformFailoverLogQa_(assetId,'HOLD',gate.reason,activeUrl,'');
    return {ok:true, hold:true, assetId:assetId, reason:gate.reason, failCount:failCount, storageTier:tier};
  }

  platformFailoverSet_(sh,rowNumber,ix.FALLBACK_READY_YN,'Y');
  platformFailoverSet_(sh,rowNumber,ix.DRIVE_MASTER_URL,gate.driveUrl);
  if (gate.hash && !platformFailoverStr_(row[ix.CONTENT_HASH])) platformFailoverSet_(sh,rowNumber,ix.CONTENT_HASH,gate.hash);
  return applyPlatformPointerSuccession({sheet:sh,rowNumber:rowNumber,row:row,index:ix,assetId:assetId,oldUrl:activeUrl,driveFallbackUrl:gate.driveUrl,tier:tier,rightsMode:rightsMode});
}

function applyPlatformPointerSuccession(ctx) {
  const sh = ctx.sheet;
  const rowNumber = ctx.rowNumber;
  const ix = ctx.index;
  const oldUrl = ctx.oldUrl;
  const newUrl = ctx.driveFallbackUrl;
  const assetId = ctx.assetId;
  const rawTargets = platformFailoverStr_(ctx.row[ix.REFERENCE_TARGETS_JSON]) || '[]';
  let targets;
  try { targets = JSON.parse(rawTargets); } catch (e) { targets = null; }
  if (!Array.isArray(targets)) {
    platformFailoverSet_(sh,rowNumber,ix.SUCCESSION_STATE,'HOLD_BAD_REFERENCE_TARGETS_JSON');
    platformFailoverSet_(sh,rowNumber,ix.ERROR_STATE,'BAD_REFERENCE_TARGETS_JSON');
    return {ok:true, hold:true, assetId:assetId, reason:'BAD_REFERENCE_TARGETS_JSON'};
  }

  const snapshots = [];
  try {
    targets.forEach(function(t){
      if (!t || !t.spreadsheetId || !t.sheetName || !t.a1) throw new Error('REFERENCE_TARGET_INCOMPLETE');
      const targetSs = SpreadsheetApp.openById(String(t.spreadsheetId));
      const targetSh = targetSs.getSheetByName(String(t.sheetName));
      if (!targetSh) throw new Error('REFERENCE_SHEET_MISSING:'+t.sheetName);
      const range = targetSh.getRange(String(t.a1));
      if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) throw new Error('REFERENCE_TARGET_MUST_BE_SINGLE_CELL');
      const before = platformFailoverStr_(range.getValue());
      if (before !== oldUrl) throw new Error('REFERENCE_OLD_URL_MISMATCH:'+t.spreadsheetId+':'+t.sheetName+':'+t.a1);
      snapshots.push({spreadsheetId:String(t.spreadsheetId),sheetName:String(t.sheetName),a1:String(t.a1),oldValue:before,newValue:newUrl});
    });

    const rollbackToken = JSON.stringify({assetId:assetId,at:new Date().toISOString(),oldActiveUrl:oldUrl,newActiveUrl:newUrl,targets:snapshots});
    platformFailoverSet_(sh,rowNumber,ix.LAST_GOOD_URL,oldUrl);
    platformFailoverSet_(sh,rowNumber,ix.LAST_GOOD_AT,new Date());
    platformFailoverSet_(sh,rowNumber,ix.ROLLBACK_TOKEN,rollbackToken);
    SpreadsheetApp.flush();

    snapshots.forEach(function(s){
      SpreadsheetApp.openById(s.spreadsheetId).getSheetByName(s.sheetName).getRange(s.a1).setValue(newUrl);
    });
    platformFailoverSet_(sh,rowNumber,ix.REPLACEMENT_URL,newUrl);
    platformFailoverSet_(sh,rowNumber,ix.ACTIVE_URL,newUrl);
    platformFailoverSet_(sh,rowNumber,ix.SUCCESSION_STATE,'APPLIED_WAIT_X2');
    platformFailoverSet_(sh,rowNumber,ix.UPDATED_REFERENCES_COUNT,snapshots.length);
    SpreadsheetApp.flush();

    const rb1 = platformFailoverReadbackTargets_(snapshots,newUrl) && platformFailoverStr_(sh.getRange(rowNumber,ix.ACTIVE_URL+1).getValue()) === newUrl;
    Utilities.sleep(500);
    SpreadsheetApp.flush();
    const rb2 = platformFailoverReadbackTargets_(snapshots,newUrl) && platformFailoverStr_(sh.getRange(rowNumber,ix.ACTIVE_URL+1).getValue()) === newUrl;
    if (!rb1 || !rb2) throw new Error('READBACK_X2_FAIL');

    platformFailoverSet_(sh,rowNumber,ix.QA_X2_STATE,'PASS_X2');
    platformFailoverSet_(sh,rowNumber,ix.CONSISTENCY_STATE,'PASS');
    platformFailoverSet_(sh,rowNumber,ix.SUCCESSION_STATE,'PASS_X2_DRIVE_ACTIVE');
    platformFailoverSet_(sh,rowNumber,ix.LOG_STATE,'PASS_LOGGED');
    platformFailoverSet_(sh,rowNumber,ix.ERROR_STATE,'');
    SpreadsheetApp.flush();
    platformFailoverLogQa_(assetId,'PASS','POINTER_SUCCESSION_X2_PASS',oldUrl,newUrl);
    platformFailoverLogHistory_(assetId,'COMPLETE_VERIFIED_X2',oldUrl,newUrl,snapshots.length);
    return {ok:true, assetId:assetId, succession:'PASS_X2_DRIVE_ACTIVE', updatedReferences:snapshots.length, readback1:rb1, readback2:rb2, driveUrl:newUrl};
  } catch (err) {
    try {
      snapshots.forEach(function(s){ SpreadsheetApp.openById(s.spreadsheetId).getSheetByName(s.sheetName).getRange(s.a1).setValue(s.oldValue); });
      platformFailoverSet_(sh,rowNumber,ix.ACTIVE_URL,oldUrl);
      platformFailoverSet_(sh,rowNumber,ix.REPLACEMENT_URL,'');
      platformFailoverSet_(sh,rowNumber,ix.SUCCESSION_STATE,'ROLLED_BACK');
      platformFailoverSet_(sh,rowNumber,ix.QA_X2_STATE,'FAIL');
      platformFailoverSet_(sh,rowNumber,ix.CONSISTENCY_STATE,'ROLLBACK_REQUIRED');
      platformFailoverSet_(sh,rowNumber,ix.LOG_STATE,'FAIL_LOGGED');
      platformFailoverSet_(sh,rowNumber,ix.ERROR_STATE,String(err && err.message || err));
      SpreadsheetApp.flush();
    } catch (rollbackErr) {
      platformFailoverSet_(sh,rowNumber,ix.SUCCESSION_STATE,'ROLLBACK_ERROR');
      platformFailoverSet_(sh,rowNumber,ix.ERROR_STATE,'FAIL:'+String(err && err.message || err)+';ROLLBACK:'+String(rollbackErr && rollbackErr.message || rollbackErr));
    }
    platformFailoverLogQa_(assetId,'FAIL','SUCCESSION_ROLLBACK:'+String(err && err.message || err),oldUrl,newUrl);
    return {ok:false, assetId:assetId, error:String(err && err.message || err), rolledBack:true};
  }
}

function platformFailoverStorageTier_(importance,use30d,rightsMode) {
  if (/REFERENCE_ONLY|NO_COPY|UNVERIFIED/.test(rightsMode || '')) return 'REFERENCE_ONLY';
  if (importance >= 80 || use30d >= 10) return 'P0_HOT';
  if (importance >= 50 || use30d >= 3) return 'P1_WARM';
  return 'P2_COLD';
}

function platformFailoverCheckUrl_(url) {
  try {
    const response = UrlFetchApp.fetch(url,{method:'get',muteHttpExceptions:true,followRedirects:true,validateHttpsCertificates:true,headers:{'User-Agent':'CentralAgent-LinkHealth/1.0'}});
    const code = response.getResponseCode();
    return {ok:code >= 200 && code < 400, code:code};
  } catch (err) {
    return {ok:false, code:0, error:String(err && err.message || err)};
  }
}

function platformFailoverResolveDriveMaster_(row,ix,tier,rightsMode) {
  if (tier === 'REFERENCE_ONLY' || /REFERENCE_ONLY|NO_COPY|UNVERIFIED/.test(rightsMode || '')) return {ok:false,reason:'RIGHTS_REFERENCE_ONLY'};
  let fileId = platformFailoverStr_(row[ix.DRIVE_MASTER_FILE_ID]);
  let driveUrl = platformFailoverStr_(row[ix.DRIVE_MASTER_URL]);
  if (!fileId && driveUrl) fileId = platformFailoverExtractDriveId_(driveUrl);
  if (!fileId) return {ok:false,reason:'DRIVE_MASTER_REQUIRED'};
  try {
    const file = DriveApp.getFileById(fileId);
    file.getName();
    driveUrl = driveUrl || file.getUrl();
    const mime = String(file.getMimeType() || '');
    let hash = platformFailoverStr_(row[ix.CONTENT_HASH]);
    const isGoogleNative = /^application\/vnd\.google-apps\./.test(mime);
    if (!hash && !isGoogleNative) hash = platformFailoverTryHash_(file);
    if (!hash && (tier === 'P0_HOT' || tier === 'P1_WARM') && !isGoogleNative) return {ok:false,reason:'CONTENT_HASH_REQUIRED_FOR_HOT_WARM_MASTER'};
    return {ok:true,fileId:fileId,driveUrl:driveUrl,hash:hash,mime:mime};
  } catch (err) {
    return {ok:false,reason:'DRIVE_MASTER_UNREADABLE:'+String(err && err.message || err)};
  }
}

function platformFailoverTryHash_(file) {
  try {
    if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.get) {
      const meta = Drive.Files.get(file.getId(),{fields:'md5Checksum,size'});
      if (meta && meta.md5Checksum) return 'MD5:'+meta.md5Checksum;
    }
  } catch (e) {}
  try {
    if (Number(file.getSize() || 0) > PLATFORM_FAILOVER_V1.hashBlobMaxBytes) return '';
    const bytes = file.getBlob().getBytes();
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes);
    return 'SHA256:'+digest.map(function(b){ const v=(b<0?b+256:b); return ('0'+v.toString(16)).slice(-2); }).join('');
  } catch (e2) { return ''; }
}

function platformFailoverReadbackTargets_(snapshots,newUrl) {
  return snapshots.every(function(s){
    try { return platformFailoverStr_(SpreadsheetApp.openById(s.spreadsheetId).getSheetByName(s.sheetName).getRange(s.a1).getValue()) === newUrl; }
    catch (e) { return false; }
  });
}

function platformFailoverLogQa_(assetId,status,detail,oldUrl,newUrl) {
  try {
    const ss = SpreadsheetApp.openById(PLATFORM_FAILOVER_V1.qaSpreadsheetId);
    const sh = ss.getSheetByName(PLATFORM_FAILOVER_V1.qaSheetName);
    if (!sh) return;
    platformFailoverAppendMapped_(sh,{
      QA_ID:'QA_PLATFORM_FAILOVER_'+assetId+'_'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMddHHmmss'),
      RUN_ID:'RUN_PLATFORM_FAILOVER_'+assetId,
      APP_ID:'ALL_APPS',
      FUNCTION_ID:'runPlatformLinkFailoverGuard',
      TRIGGER_ID:'TRG_PLATFORM_LINK_FAILOVER_REUSE_20260908',
      INPUT_DATA_IDS:assetId,
      OUTPUT_DATA_IDS:newUrl || '',
      RESULT_ID:status+'_'+detail,
      STARTED_AT:new Date(),
      FINISHED_AT:new Date(),
      STATUS:status,
      READBACK_STATE:detail,
      EVIDENCE_POINTER:'106_PLATFORM_LINK_FAILOVER_REGISTRY|'+oldUrl+'|'+newUrl,
      NEXT_ACTION:status === 'PASS' ? 'MONITOR' : 'PRESERVE_LAST_GOOD_AND_REPAIR'
    });
  } catch (e) {}
}

function platformFailoverLogHistory_(assetId,status,oldUrl,newUrl,count) {
  try {
    const ss = SpreadsheetApp.openById(PLATFORM_FAILOVER_V1.historySpreadsheetId);
    const sh = ss.getSheetByName(PLATFORM_FAILOVER_V1.historySheetName);
    if (!sh) return;
    platformFailoverAppendMapped_(sh,{
      CHAT_CMD_ID:'AUTO_PLATFORM_FAILOVER_'+assetId+'_'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMddHHmmss'),
      RECEIVED_AT:new Date(),
      SOURCE_CHAT:'CENTRAL_FACTORY_AUTO',
      USER_REQUEST_SUMMARY:'Platform URL failover '+assetId,
      PROJECT_ID:'ALL_PROJECTS',
      ROUTE:'PLATFORM_POINTER→DRIVE_MASTER',
      TASK_ID:PLATFORM_FAILOVER_V1.taskId,
      PRIORITY:'P0',
      STATUS:status,
      WORK_REQUIRED:'AUTO_POINTER_ONLY',
      WORKFLOW_CHECK:'same ASSET_ID→Drive master→x2→consistency→log',
      EVIDENCE:'OLD='+oldUrl+';NEW='+newUrl+';UPDATED='+count,
      LAST_UPDATED_AT:new Date(),
      NEXT_ACTION:'MONITOR_AND_PRESERVE_LAST_GOOD',
      NOTES:'Original/RAW/master immutable; no new physical trigger.'
    });
  } catch (e) {}
}

function platformFailoverAppendMapped_(sh,obj) {
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const row = headers.map(function(h){ return Object.prototype.hasOwnProperty.call(obj,h) ? obj[h] : ''; });
  sh.appendRow(row);
}

function platformFailoverHeaderIndex_(headers) {
  const out = {};
  headers.forEach(function(h,i){ out[String(h).trim()] = i; });
  return out;
}
function platformFailoverSet_(sh,rowNumber,zeroBasedColumn,value) { sh.getRange(rowNumber,zeroBasedColumn+1).setValue(value); }
function platformFailoverStr_(v) { return v == null ? '' : String(v).trim(); }
function platformFailoverExtractDriveId_(url) {
  const s = String(url || '');
  const m = s.match(/(?:\/d\/|id=)([-_A-Za-z0-9]{20,})/) || s.match(/[-_A-Za-z0-9]{25,}/);
  return m ? (m[1] || m[0]) : '';
}

function testPlatformLinkFailoverPolicyNoMutation() {
  const ss = SpreadsheetApp.openById(PLATFORM_FAILOVER_V1.registrySpreadsheetId);
  const sh = ss.getSheetByName(PLATFORM_FAILOVER_V1.registrySheetName);
  const values = sh.getDataRange().getValues();
  const ix = platformFailoverHeaderIndex_(values[0] || []);
  const triggers = ScriptApp.getProjectTriggers().map(function(t){ return t.getHandlerFunction(); });
  return {
    ok:!!sh && ix.ASSET_ID != null && ix.REFERENCE_TARGETS_JSON != null,
    registryRows:Math.max(0,values.length-1),
    physicalFailoverTriggerCount:triggers.filter(function(h){ return h === 'runPlatformLinkFailoverGuard' || h === 'applyPlatformPointerSuccession'; }).length,
    expectedPhysicalFailoverTriggerCount:0,
    existingFactoryTriggerCount:triggers.filter(function(h){ return h === 'processTaskQueue' || h === 'processAllTaskQueues'; }).length,
    version:PLATFORM_FAILOVER_V1.version
  };
}
