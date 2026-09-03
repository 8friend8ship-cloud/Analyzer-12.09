/* CONTENTOS_DRYWRITER_RUNTIME_CONFIG_REPAIR_V3_20260903
 * Existing-scope repair for WEBAPP_TEMPLATE_05..09 only.
 * Root cause class: CONFIG has DRYWRITER_WEBAPP_URL but the legacy factory bridge
 * reads Script Properties and emits DRYWRITER_WEBAPP_URL_NOT_CONFIGURED.
 * Safety: no new project/deployment/OAuth/trigger; same existing bound spreadsheet/script only.
 * Retry safety: reset at most one exact WAITING_BRIDGE + DRYWRITER_WEBAPP_URL_NOT_CONFIGURED row per request.
 * Runtime behavior: Script Property first; if missing/mismatched, use verified CONFIG and self-heal the property.
 */
var CONTENTOS_DRYWRITER_REPAIR_V1 = {
  version: 'CONTENTOS_DRYWRITER_RUNTIME_CONFIG_REPAIR_V3_CONFIG_FALLBACK_20260903',
  key: 'DRYWRITER_WEBAPP_URL',
  autoHealBucketKey: 'CONTENTOS_DRYWRITER_CONFIG_AUTOHEAL_BUCKET',
  retryKeyPrefix: 'CONTENTOS_DRYWRITER_CONFIG_RETRY_',
  boundTargets: {
    '1gBuyuDyRZkRDYwl2DGj6oUWQUS-KnD1alapyTBWZXN8': {slot:'WEBAPP_TEMPLATE_05', appIds:['APP_ANALYZER','APP_CONTENT_OS']},
    '1vW1tXBLL7B5iwPS41C4tExPvHH5eALER6yctoW7crdQ': {slot:'WEBAPP_TEMPLATE_06', appIds:['APP_INTERIOR']},
    '1De5GneJRng_RjYSpCyyWudZMA6fqJdgHStQAMBeh3lM': {slot:'WEBAPP_TEMPLATE_07', appIds:['APP_TRAVEL']},
    '1TGCmhXTz-XWIydv_tU0rPQ_CxrecRMdEflKRK4OApe4': {slot:'WEBAPP_TEMPLATE_08', appIds:['APP_SECURITIES_FRONT']},
    '1K4Bj0PnnLD-Wka8AlNmDprvfXFnsh9mCV3QXjgdbT2s': {slot:'WEBAPP_TEMPLATE_09', appIds:['APP_KFOOD']}
  }
};

function contentOsDryWriterTargetV1_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var id = ss.getId();
  var target = CONTENTOS_DRYWRITER_REPAIR_V1.boundTargets[id];
  if (!target) throw new Error('BOUND_SPREADSHEET_NOT_ALLOWED:' + id);
  var appId = String(contentOsDryWriterConfigValueV1_('APP_ID') || '').trim();
  if (target.appIds.indexOf(appId) < 0) throw new Error('APP_ID_NOT_ALLOWED_FOR_' + target.slot + ':' + appId);
  return {spreadsheet:ss, spreadsheetId:id, slot:target.slot, appId:appId};
}

function contentOsDryWriterValidExecUrlV1_(url) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(String(url || '').trim());
}

/**
 * Canonical runtime URL resolver.
 * 1) Reuse Script Property when it is valid and matches CONFIG.
 * 2) If the property is missing/stale but CONFIG is a valid canonical /exec URL,
 *    use CONFIG immediately and self-heal the Script Property with readback.
 * Never invents an endpoint.
 */
function contentOsDryWriterResolveRuntimeUrlV1_() {
  contentOsDryWriterTargetV1_();
  var configUrl = String(contentOsDryWriterConfigValueV1_(CONTENTOS_DRYWRITER_REPAIR_V1.key) || '').trim();
  var props = PropertiesService.getScriptProperties();
  var propUrl = String(props.getProperty(CONTENTOS_DRYWRITER_REPAIR_V1.key) || '').trim();

  if (contentOsDryWriterValidExecUrlV1_(propUrl) && propUrl === configUrl) {
    return {ok:true,url:propUrl,source:'SCRIPT_PROPERTY',healed:false};
  }
  if (!contentOsDryWriterValidExecUrlV1_(configUrl)) {
    return {ok:false,url:'',source:'NONE',healed:false,error:'INVALID_OR_MISSING_CONFIG_DRYWRITER_WEBAPP_URL'};
  }

  props.setProperty(CONTENTOS_DRYWRITER_REPAIR_V1.key, configUrl);
  var readback = String(props.getProperty(CONTENTOS_DRYWRITER_REPAIR_V1.key) || '').trim();
  if (readback !== configUrl) {
    return {ok:false,url:'',source:'CONFIG',healed:false,error:'SCRIPT_PROPERTY_READBACK_MISMATCH'};
  }
  return {ok:true,url:configUrl,source:'CONFIG_FALLBACK_SELF_HEALED',healed:true};
}

function inspectContentOsDryWriterRuntimeConfigV1() {
  var target = contentOsDryWriterTargetV1_();
  var configUrl = String(contentOsDryWriterConfigValueV1_(CONTENTOS_DRYWRITER_REPAIR_V1.key) || '').trim();
  var propUrl = String(PropertiesService.getScriptProperties().getProperty(CONTENTOS_DRYWRITER_REPAIR_V1.key) || '').trim();
  var triggers = ScriptApp.getProjectTriggers().map(function(t){
    return {handler:String(t.getHandlerFunction()), uid:contentOsDryWriterTriggerUidV1_(t)};
  });
  return {
    ok:true,
    version:CONTENTOS_DRYWRITER_REPAIR_V1.version,
    slot:target.slot,
    spreadsheetId:target.spreadsheetId,
    spreadsheetName:target.spreadsheet.getName(),
    appId:target.appId,
    scriptId:ScriptApp.getScriptId(),
    configUrlPresent:!!configUrl,
    configUrlValid:contentOsDryWriterValidExecUrlV1_(configUrl),
    scriptPropertyUrlPresent:!!propUrl,
    scriptPropertyUrlValid:contentOsDryWriterValidExecUrlV1_(propUrl),
    urlMatches:!!configUrl && configUrl === propUrl,
    processTaskQueueTriggerCount:triggers.filter(function(x){return x.handler === 'processTaskQueue';}).length,
    drywriter:contentOsDryWriterStatsV1_(),
    checkedAt:new Date().toISOString()
  };
}

function repairContentOsDryWriterRuntimeConfigV1() {
  var target = contentOsDryWriterTargetV1_();
  var resolved = contentOsDryWriterResolveRuntimeUrlV1_();
  if (!resolved.ok) throw new Error(resolved.error || 'DRYWRITER_URL_RESOLUTION_FAILED');
  var reset = contentOsDryWriterResetExactFailuresV1_(1, true);
  var inspect = inspectContentOsDryWriterRuntimeConfigV1();
  if (!inspect.ok || !inspect.urlMatches || inspect.processTaskQueueTriggerCount !== 1) {
    throw new Error('DRYWRITER_RUNTIME_CONFIG_VERIFY_FAILED:' + JSON.stringify(inspect));
  }
  return {
    ok:true,
    version:CONTENTOS_DRYWRITER_REPAIR_V1.version,
    slot:target.slot,
    appId:target.appId,
    scriptId:inspect.scriptId,
    runtimeUrlSource:resolved.source,
    propertyChanged:resolved.healed,
    resetRows:reset,
    inspect:inspect,
    next:'Existing processTaskQueue handles the single exact reset request; require Writer RESPONSE_JSON/RECEIVED_AT and same-condition x2 before VERIFIED.'
  };
}

/**
 * Logical auto-heal stage for the existing processTaskQueue/unified scheduler.
 * No physical trigger is installed. Runs at most once per 10-minute KST bucket.
 */
function runContentOsDryWriterRuntimeConfigAutoHealFromFactory_() {
  var target = contentOsDryWriterTargetV1_();
  var props = PropertiesService.getScriptProperties();
  var bucket = Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMddHHmm').slice(0,11);
  if (props.getProperty(CONTENTOS_DRYWRITER_REPAIR_V1.autoHealBucketKey) === bucket) {
    return {ok:true,skipped:true,reason:'SAME_10M_BUCKET',slot:target.slot,version:CONTENTOS_DRYWRITER_REPAIR_V1.version};
  }

  var resolved = contentOsDryWriterResolveRuntimeUrlV1_();
  var statsBefore = contentOsDryWriterStatsV1_();
  var reset = 0;
  if (resolved.ok && statsBefore.pending === 0 && statsBefore.waitingMissingUrl > 0) {
    reset = contentOsDryWriterResetExactFailuresV1_(1, false);
  }
  props.setProperty(CONTENTOS_DRYWRITER_REPAIR_V1.autoHealBucketKey, bucket);
  var inspect = inspectContentOsDryWriterRuntimeConfigV1();
  return {
    ok:resolved.ok && inspect.processTaskQueueTriggerCount === 1,
    degraded:!resolved.ok,
    slot:target.slot,
    appId:target.appId,
    urlSource:resolved.source,
    propertyHealed:resolved.healed,
    resetRows:reset,
    statsBefore:statsBefore,
    inspect:inspect,
    version:CONTENTOS_DRYWRITER_REPAIR_V1.version
  };
}

function contentOsDryWriterConfigValueV1_(key) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CONFIG');
  if (!sh) throw new Error('SHEET_MISSING:CONFIG');
  if (sh.getLastRow() < 2) return '';
  var vals = sh.getRange(2,1,sh.getLastRow()-1,2).getValues();
  for (var i=0;i<vals.length;i++) if (String(vals[i][0]||'').trim() === key) return vals[i][1];
  return '';
}

function contentOsDryWriterStatsV1_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DRYWRITER_QUEUE');
  if (!sh || sh.getLastRow() < 2) return {total:0, waitingMissingUrl:0, pending:0, success:0};
  var vals = sh.getRange(2,1,sh.getLastRow()-1,Math.min(9,sh.getLastColumn())).getDisplayValues();
  var out={total:vals.length,waitingMissingUrl:0,pending:0,success:0};
  vals.forEach(function(r){
    var s=String(r[4]||''), e=String(r[8]||'');
    if (s==='WAITING_BRIDGE' && e==='DRYWRITER_WEBAPP_URL_NOT_CONFIGURED') out.waitingMissingUrl++;
    if (s==='PENDING') out.pending++;
    if (/SUCCESS|DONE|COMPLETED/.test(s)) out.success++;
  });
  return out;
}

function contentOsDryWriterResetExactFailuresV1_(limit, forceOnce) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DRYWRITER_QUEUE');
  if (!sh || sh.getLastRow() < 2) return 0;
  var vals = sh.getRange(2,1,sh.getLastRow()-1,Math.min(9,sh.getLastColumn())).getDisplayValues();
  var props = PropertiesService.getScriptProperties();
  var max=Math.max(1,Number(limit||1)), changed=0;
  for (var i=vals.length-1;i>=0 && changed<max;i--) {
    if (String(vals[i][4]||'')==='WAITING_BRIDGE' && String(vals[i][8]||'')==='DRYWRITER_WEBAPP_URL_NOT_CONFIGURED') {
      var requestId = String(vals[i][0] || ('ROW_'+(i+2))).trim();
      var retryKey = CONTENTOS_DRYWRITER_REPAIR_V1.retryKeyPrefix + requestId;
      if (!forceOnce && props.getProperty(retryKey) === 'Y') continue;
      sh.getRange(i+2,5).setValue('PENDING');
      sh.getRange(i+2,9).clearContent();
      props.setProperty(retryKey,'Y');
      changed++;
    }
  }
  return changed;
}

function contentOsDryWriterTriggerUidV1_(t){try{return String(t.getUniqueId());}catch(e){return '';}}
