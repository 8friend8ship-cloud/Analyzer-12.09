/**
 * Content OS / WEBAPP_TEMPLATE_05 runtime identity + dispatcher helpers.
 * Production code canonical is Analyzer-12.09. contents-os-git is the feature
 * upstream/reference only. This module preserves the existing Vercel project,
 * domain, Apps Script project, deployment, OAuth grants, and physical trigger.
 */
var CONTENTOS_RUNTIME_V3_VERSION = 'CONTENTOS_RUNTIME_REGISTRY_V7_ANALYZER_CANONICAL_20260828';
var CONTENTOS_RUNTIME_V3_SLOT_ID = 'WEBAPP_TEMPLATE_05';
var CONTENTOS_RUNTIME_V3_EXPECTED_SHEET_ID = '1gBuyuDyRZkRDYwl2DGj6oUWQUS-KnD1alapyTBWZXN8';
var CONTENTOS_RUNTIME_V3_CONFIG_MASTER_ID = '1nad93if8T5VCvf_c_LYJOn18U7bl_dApws2D2YIiMGc';
var CONTENTOS_RUNTIME_V3_MASTER_REGISTRY_ID = '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI';
var CONTENTOS_RUNTIME_V3_PRODUCTION_REPO = '8friend8ship-cloud/Analyzer-12.09';
var CONTENTOS_RUNTIME_V3_FEATURE_UPSTREAM = '8friend8ship-cloud/contents-os-git';
var CONTENTOS_INTELLIGENCE_V3_VERSION = 'CONTENTOS_INTELLIGENCE_BRIDGE_V5_ANALYZER_CANONICAL_20260828';
var CONTENTOS_INTELLIGENCE_V3_BUS_SHEET = '59_DATA_INTELLIGENCE_BUS';
var CONTENTOS_INTELLIGENCE_V3_SUB_SHEET = '60_APP_DATA_SUBSCRIPTION';
var CONTENTOS_INTELLIGENCE_V3_TRAVEL_PROBE_EVENT = 'EVT_20260825_SEOUL_LIFESTYLE_ROUTE_018';
var CONTENTOS_PIPELINE_RECOVERY_PROBE_TASK = 'TASK_CAMPING_20260824_1517';

function contentOsIntelligenceHealthV3() {
  var ss = SpreadsheetApp.openById(CONTENTOS_RUNTIME_V3_MASTER_REGISTRY_ID);
  var bus = ss.getSheetByName(CONTENTOS_INTELLIGENCE_V3_BUS_SHEET);
  var sub = ss.getSheetByName(CONTENTOS_INTELLIGENCE_V3_SUB_SHEET);
  return {
    ok: !!bus && !!sub,
    service: 'CONTENT_OS_CENTRAL_INTELLIGENCE_READ_BRIDGE',
    busRows: bus ? Math.max(0, bus.getLastRow() - 1) : 0,
    subscriptionRows: sub ? Math.max(0, sub.getLastRow() - 1) : 0,
    readOnly: true,
    productionRepo: CONTENTOS_RUNTIME_V3_PRODUCTION_REPO,
    featureUpstreamRepo: CONTENTOS_RUNTIME_V3_FEATURE_UPSTREAM,
    version: CONTENTOS_INTELLIGENCE_V3_VERSION,
    at: new Date().toISOString()
  };
}

function contentOsIntelligenceEventsV3(payload) {
  payload = payload || {};
  var appId = String(payload.app_id || payload.appId || 'ALL_APPS').trim() || 'ALL_APPS';
  var sinceText = String(payload.since || '').trim();
  var since = sinceText ? new Date(sinceText).getTime() : 0;
  if (sinceText && !isFinite(since)) return {ok:false,error:'INVALID_SINCE',version:CONTENTOS_INTELLIGENCE_V3_VERSION};
  var limit = Math.max(1, Math.min(Number(payload.limit || 100), 200));
  var eventId = String(payload.event_id || payload.eventId || '').trim();

  var sh = SpreadsheetApp.openById(CONTENTOS_RUNTIME_V3_MASTER_REGISTRY_ID).getSheetByName(CONTENTOS_INTELLIGENCE_V3_BUS_SHEET);
  if (!sh) return {ok:false,error:'INTELLIGENCE_BUS_SHEET_MISSING',version:CONTENTOS_INTELLIGENCE_V3_VERSION};
  if (sh.getLastRow() < 2) return {ok:true,mode:'LIVE_CENTRAL_BUS',app_id:appId,count:0,events:[],readOnly:true,version:CONTENTOS_INTELLIGENCE_V3_VERSION};

  var width = sh.getLastColumn();
  var header = sh.getRange(1,1,1,width).getDisplayValues()[0];
  var map = {};
  header.forEach(function(h,i){ if(h) map[String(h)] = i; });
  ['EVENT_ID','EVENT_AT','PRODUCER_APP_ID','CONSUMER_SCOPE'].forEach(function(required){
    if (map[required] === undefined) throw new Error('INTELLIGENCE_HEADER_MISSING_' + required);
  });

  var rows = sh.getRange(2,1,sh.getLastRow()-1,width).getValues();
  var events = rows.filter(function(row){
    var id = String(row[map.EVENT_ID] || '');
    if (eventId && id !== eventId) return false;
    var at = new Date(row[map.EVENT_AT]).getTime();
    if (since && (!isFinite(at) || at < since)) return false;
    if (appId === 'ALL_APPS') return true;
    var producer = String(row[map.PRODUCER_APP_ID] || '');
    var scope = String(row[map.CONSUMER_SCOPE] || '');
    return producer === appId || scope.indexOf('ALL_APPS') >= 0 || scope.indexOf(appId) >= 0;
  }).slice(-limit).map(function(row){
    var obj = {};
    header.forEach(function(h,i){ if(h) obj[String(h)] = row[i]; });
    return obj;
  });

  return {
    ok:true,
    mode:'LIVE_CENTRAL_BUS',
    app_id:appId,
    count:events.length,
    events:events,
    readOnly:true,
    version:CONTENTOS_INTELLIGENCE_V3_VERSION,
    at:new Date().toISOString()
  };
}

function contentOsIntelligenceHandleGetV3(e) {
  var p = (e && e.parameter) || {};
  var action = String(p.action || 'contentos.intelligence.health.v3');
  if (action === 'contentos.intelligence.health.v3') return contentOsIntelligenceHealthV3();
  if (action === 'contentos.intelligence.events.v3') return contentOsIntelligenceEventsV3({
    app_id:p.app_id || 'ALL_APPS', since:p.since || '', limit:p.limit || 100, event_id:p.event_id || ''
  });
  return {ok:false,error:'UNKNOWN_INTELLIGENCE_V3_ACTION',action:action,version:CONTENTOS_INTELLIGENCE_V3_VERSION};
}

function testContentOsIntelligenceBridgeV3() {
  var health = contentOsIntelligenceHealthV3();
  var r1 = contentOsIntelligenceEventsV3({app_id:'APP_TRAVEL',limit:100});
  Utilities.sleep(50);
  var r2 = contentOsIntelligenceEventsV3({app_id:'APP_TRAVEL',limit:100});
  var ids1 = (r1.events || []).map(function(e){return String(e.EVENT_ID || '');});
  var ids2 = (r2.events || []).map(function(e){return String(e.EVENT_ID || '');});
  var target1 = ids1.indexOf(CONTENTOS_INTELLIGENCE_V3_TRAVEL_PROBE_EVENT) >= 0;
  var target2 = ids2.indexOf(CONTENTOS_INTELLIGENCE_V3_TRAVEL_PROBE_EVENT) >= 0;
  var deterministic = r1.count === r2.count && ids1.join('|') === ids2.join('|');
  return {
    ok: !!health.ok && !!r1.ok && !!r2.ok && r1.count > 0 && target1 && target2 && deterministic,
    health:health,
    targetEvent:CONTENTOS_INTELLIGENCE_V3_TRAVEL_PROBE_EVENT,
    run1:{count:r1.count,eventIds:ids1.join('|'),targetFound:target1},
    run2:{count:r2.count,eventIds:ids2.join('|'),targetFound:target2},
    deterministic:deterministic,
    version:CONTENTOS_INTELLIGENCE_V3_VERSION
  };
}

function findPipelineTaskRowV3_(sheet, taskId) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var values = sheet.getRange(2,1,last-1,1).getDisplayValues();
  for (var i=0;i<values.length;i++) {
    if (String(values[i][0] || '') === taskId) return i + 2;
  }
  return 0;
}

function contentOsPipelineRecoveryV3() {
  if (typeof contentOsPipelineTick !== 'function' || typeof CONTENTOS_PIPELINE_SHEET_ID === 'undefined') {
    return {ok:false,error:'PIPELINE_FUNCTIONS_NOT_SYNCED',version:CONTENTOS_RUNTIME_V3_VERSION};
  }
  var ss = SpreadsheetApp.openById(CONTENTOS_PIPELINE_SHEET_ID);
  var queue = ss.getSheetByName('Query_Queue');
  var log = ss.getSheetByName('Pipeline_Log');
  if (!queue || !log) return {ok:false,error:'PIPELINE_SHEETS_MISSING',version:CONTENTOS_RUNTIME_V3_VERSION};
  var row = findPipelineTaskRowV3_(queue, CONTENTOS_PIPELINE_RECOVERY_PROBE_TASK);
  if (!row) return {ok:false,error:'PIPELINE_PROBE_TASK_MISSING',taskId:CONTENTOS_PIPELINE_RECOVERY_PROBE_TASK,version:CONTENTOS_RUNTIME_V3_VERSION};

  var beforeStatus = String(queue.getRange(row,5).getDisplayValue() || '');
  var beforeResultId = String(queue.getRange(row,9).getDisplayValue() || '');
  var beforeLogRows = log.getLastRow();
  var first = contentOsPipelineTick();
  if (first && first.reason === 'LOCK_BUSY') {
    Utilities.sleep(1200);
    first = contentOsPipelineTick();
  }
  Utilities.sleep(100);
  var middleLogRows = log.getLastRow();
  var second = contentOsPipelineTick();
  if (second && second.reason === 'LOCK_BUSY') {
    Utilities.sleep(1200);
    second = contentOsPipelineTick();
  }
  var afterStatus = String(queue.getRange(row,5).getDisplayValue() || '');
  var afterResultId = String(queue.getRange(row,9).getDisplayValue() || '');
  var afterLogRows = log.getLastRow();
  var done = /^DONE/.test(afterStatus) && !!afterResultId;
  var secondClean = second && second.ok !== false && Number(second.processed || 0) === 0;
  return {
    ok: !!first && first.ok !== false && done && secondClean,
    taskId:CONTENTOS_PIPELINE_RECOVERY_PROBE_TASK,
    before:{status:beforeStatus,resultId:beforeResultId,logRows:beforeLogRows},
    first:first,
    middleLogRows:middleLogRows,
    second:second,
    after:{status:afterStatus,resultId:afterResultId,logRows:afterLogRows},
    version:CONTENTOS_RUNTIME_V3_VERSION
  };
}

function contentOsRuntimeIdentityV3() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var triggers = ScriptApp.getProjectTriggers().map(function(t) {
    return {
      handler: String(t.getHandlerFunction ? t.getHandlerFunction() : ''),
      uid: String(t.getUniqueId ? t.getUniqueId() : ''),
      source: String(t.getTriggerSource ? t.getTriggerSource() : ''),
      eventType: String(t.getEventType ? t.getEventType() : '')
    };
  });
  return {
    ok: ss.getId() === CONTENTOS_RUNTIME_V3_EXPECTED_SHEET_ID,
    slotId: CONTENTOS_RUNTIME_V3_SLOT_ID,
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    scriptId: ScriptApp.getScriptId(),
    productionRepo: CONTENTOS_RUNTIME_V3_PRODUCTION_REPO,
    featureUpstreamRepo: CONTENTOS_RUNTIME_V3_FEATURE_UPSTREAM,
    processTaskQueueTriggerCount: triggers.filter(function(t) { return t.handler === 'processTaskQueue'; }).length,
    triggers: triggers,
    driveCacheHealth: typeof contentOsDriveStoreHealthV3 === 'function' ? contentOsDriveStoreHealthV3() : {ok:false,error:'DRIVE_CACHE_V3_NOT_LOADED'},
    intelligenceHealth: contentOsIntelligenceHealthV3(),
    pipelineLoaded: typeof contentOsPipelineTick === 'function',
    schedulerLoaded: typeof runContentOsScheduledStagesFromFactory === 'function',
    version: CONTENTOS_RUNTIME_V3_VERSION,
    at: new Date().toISOString()
  };
}

function registerContentOsRuntimeIdentityV3() {
  var identity = contentOsRuntimeIdentityV3();
  if (!identity.ok) throw new Error('WRONG_BOUND_SPREADSHEET:' + identity.spreadsheetId);
  if (!identity.scriptId) throw new Error('SCRIPT_ID_EMPTY');
  if (!identity.pipelineLoaded || !identity.schedulerLoaded) throw new Error('PIPELINE_OR_UNIFIED_SCHEDULER_NOT_SYNCED');

  var intelligenceGate = testContentOsIntelligenceBridgeV3();
  if (!intelligenceGate.ok) throw new Error('INTELLIGENCE_BRIDGE_X2_GATE_FAILED:' + JSON.stringify(intelligenceGate));

  var configSs = SpreadsheetApp.openById(CONTENTOS_RUNTIME_V3_CONFIG_MASTER_ID);
  var projectRegistry = configSs.getSheetByName('PROJECT_REGISTRY');
  if (!projectRegistry) throw new Error('PROJECT_REGISTRY_MISSING');
  var projectRow = findSlotRowV3_(projectRegistry, CONTENTOS_RUNTIME_V3_SLOT_ID, 1);
  if (!projectRow) throw new Error('PROJECT_REGISTRY_SLOT_MISSING');
  projectRegistry.getRange(projectRow, 6).setValue(identity.scriptId);
  projectRegistry.getRange(projectRow, 13).setValue('RUNTIME_IDENTITY_VERIFIED_SOURCE_SYNC');
  projectRegistry.getRange(projectRow, 14).setValue(CONTENTOS_RUNTIME_V3_VERSION);
  projectRegistry.getRange(projectRow, 15).setValue('Production repo Analyzer-12.09; feature upstream contents-os-git; same Script/deployment preserved; Drive cache + APP_TRAVEL live Bus x2 + pipeline/unified scheduler loaded; no new project/deployment/OAuth/trigger.');

  var masterSs = SpreadsheetApp.openById(CONTENTOS_RUNTIME_V3_MASTER_REGISTRY_ID);
  var scriptRegistry = masterSs.getSheetByName('03_SHEET_SCRIPT_REGISTRY');
  if (!scriptRegistry) throw new Error('03_SHEET_SCRIPT_REGISTRY_MISSING');
  var masterRow = findSlotRowV3_(scriptRegistry, CONTENTOS_RUNTIME_V3_SLOT_ID, 1);
  if (!masterRow) throw new Error('MASTER_SCRIPT_REGISTRY_SLOT_MISSING');
  scriptRegistry.getRange(masterRow, 5).setValue(identity.scriptId);
  scriptRegistry.getRange(masterRow, 11).setValue(CONTENTOS_RUNTIME_V3_PRODUCTION_REPO);
  scriptRegistry.getRange(masterRow, 12).setValue('RUNTIME_IDENTITY_VERIFIED_SOURCE_SYNC');
  scriptRegistry.getRange(masterRow, 13).setValue('Runtime scriptId registered by ' + CONTENTOS_RUNTIME_V3_VERSION + '; Analyzer-12.09 production canonical; contents-os-git feature upstream; existing deployment preserved; APP_TRAVEL Bus x2 and pipeline scheduler loaded.');

  var verifyConfig = String(projectRegistry.getRange(projectRow, 6).getDisplayValue() || '');
  var verifyMaster = String(scriptRegistry.getRange(masterRow, 5).getDisplayValue() || '');
  if (verifyConfig !== identity.scriptId || verifyMaster !== identity.scriptId) {
    throw new Error('SCRIPT_ID_REGISTRY_READBACK_MISMATCH');
  }
  return {
    ok: true,
    scriptId: identity.scriptId,
    projectRegistryRow: projectRow,
    masterRegistryRow: masterRow,
    triggerCount: identity.processTaskQueueTriggerCount,
    driveCacheHealth: identity.driveCacheHealth,
    intelligenceHealth: identity.intelligenceHealth,
    intelligenceGate:intelligenceGate,
    pipelineLoaded:identity.pipelineLoaded,
    schedulerLoaded:identity.schedulerLoaded,
    productionRepo:CONTENTOS_RUNTIME_V3_PRODUCTION_REPO,
    featureUpstreamRepo:CONTENTOS_RUNTIME_V3_FEATURE_UPSTREAM,
    readback: {config: verifyConfig, master: verifyMaster},
    version: CONTENTOS_RUNTIME_V3_VERSION
  };
}

function contentOsDriveV3HandleWebPost(e) {
  var body = {};
  try { body = JSON.parse(String(e && e.postData && e.postData.contents || '{}')); }
  catch (err) { return contentOsRuntimeJsonV3_({ok:false,error:'INVALID_JSON'}); }
  var action = String(body.action || '');
  if (!/\.v3$/.test(action)) return null;
  if (action === 'contentos.runtime.register.v3') return contentOsRuntimeJsonV3_(registerContentOsRuntimeIdentityV3());
  if (action === 'contentos.runtime.identity.v3') return contentOsRuntimeJsonV3_(contentOsRuntimeIdentityV3());
  if (action === 'contentos.drive.cache.selftest.v3') return contentOsRuntimeJsonV3_(testContentOsDriveJsonCacheV3());
  if (action === 'front.json.selftest.v3') return contentOsRuntimeJsonV3_(testFrontJsonStoreV3());
  if (action === 'contentos.intelligence.selftest.v3') return contentOsRuntimeJsonV3_(testContentOsIntelligenceBridgeV3());
  if (action === 'contentos.pipeline.recovery.v3') return contentOsRuntimeJsonV3_(contentOsPipelineRecoveryV3());
  if (action.indexOf('contentos.intelligence.') === 0) return contentOsRuntimeJsonV3_({ok:false,error:'INTELLIGENCE_V3_READ_ONLY',action:action});
  return contentOsRuntimeJsonV3_(contentOsDriveStoreHandlePostV3(body));
}

function contentOsDriveV3HandleWebGet(e) {
  var action = String(e && e.parameter && e.parameter.action || '');
  if (!/\.v3$/.test(action)) return null;
  if (action === 'contentos.runtime.identity.v3') return contentOsRuntimeJsonV3_(contentOsRuntimeIdentityV3());
  if (action === 'contentos.intelligence.health.v3' || action === 'contentos.intelligence.events.v3') {
    return contentOsRuntimeJsonV3_(contentOsIntelligenceHandleGetV3(e));
  }
  return contentOsRuntimeJsonV3_(contentOsDriveStoreHandleGetV3(e));
}

function contentOsRuntimeJsonV3_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function findSlotRowV3_(sheet, target, column) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var values = sheet.getRange(2, column, last - 1, 1).getDisplayValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === target) return i + 2;
  }
  return 0;
}

function testContentOsRuntimeRegistryV3() {
  var before = contentOsRuntimeIdentityV3();
  var registered = registerContentOsRuntimeIdentityV3();
  var after = contentOsRuntimeIdentityV3();
  var pipeline = contentOsPipelineRecoveryV3();
  return {
    ok: !!before.ok && !!registered.ok && !!after.ok && before.scriptId === after.scriptId && !!registered.intelligenceGate && !!registered.intelligenceGate.ok && !!pipeline.ok,
    before: before,
    registered: registered,
    after: after,
    intelligence: registered.intelligenceGate,
    pipeline:pipeline,
    version: CONTENTOS_RUNTIME_V3_VERSION
  };
}
