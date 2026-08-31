const CONTENTOS_UNIFIED_SCHEDULER_VERSION = 'CONTENTOS_UNIFIED_SCHEDULER_V6_IMAGE_LEARNING_20260831';

/**
 * Single logical entrypoint intended to be called by the already-installed
 * factory scheduler (for example processTaskQueue) after source sync.
 * It NEVER creates another physical trigger.
 */
function contentOsUnifiedSchedulerTick() {
  const out = {
    ok: true,
    version: CONTENTOS_UNIFIED_SCHEDULER_VERSION,
    startedAt: new Date().toISOString(),
    stages: {}
  };

  out.stages.pipeline = runOptionalContentOsStage_('contentOsPipelineTick');
  out.stages.queensBridge = runOptionalContentOsStage_('contentOsQueensBridgeTick');
  out.stages.seedQualification = runOptionalContentOsStage_('contentOsSeedQualification10mTick');
  out.stages.frontLineage = runOptionalContentOsStage_('contentOsFrontLineage10mTick');
  out.stages.virtualFront = runOptionalContentOsStage_('contentOsVirtualFront10mTick');
  out.stages.factoryControl = runOptionalContentOsStage_('runBackdataFactoryControl10m');
  out.stages.apiAbQa = runOptionalContentOsStage_('runApiAbQaControlServerFallback');
  out.stages.allAppFactory = runOptionalContentOsStage_('runAllAppBackdataFactoryControl10m');
  out.stages.allAppApiAb = runOptionalContentOsStage_('runAllAppApiAbQaRequestWindow');
  out.stages.imageLearning = runOptionalContentOsStage_('runImageLearning10mTickV2');

  out.ok = Object.keys(out.stages).every(function(k) {
    const r = out.stages[k];
    return r && (r.ok !== false || r.skipped === true || r.degraded === true || r.hold === true);
  });
  out.finishedAt = new Date().toISOString();
  return out;
}

function runOptionalContentOsStage_(handlerName) {
  try {
    if (handlerName === 'contentOsPipelineTick' && typeof contentOsPipelineTick === 'function') {
      return contentOsPipelineTick();
    }
    if (handlerName === 'contentOsQueensBridgeTick' && typeof contentOsQueensBridgeTick === 'function') {
      return contentOsQueensBridgeTick();
    }
    if (handlerName === 'contentOsSeedQualification10mTick' && typeof contentOsSeedQualification10mTick === 'function') {
      return contentOsSeedQualification10mTick();
    }
    if (handlerName === 'contentOsFrontLineage10mTick' && typeof contentOsFrontLineage10mTick === 'function') {
      return contentOsFrontLineage10mTick();
    }
    if (handlerName === 'contentOsVirtualFront10mTick' && typeof contentOsVirtualFront10mTick === 'function') {
      return contentOsVirtualFront10mTick();
    }
    if (handlerName === 'runBackdataFactoryControl10m' && typeof runBackdataFactoryControl10m === 'function') {
      return runBackdataFactoryControl10m();
    }
    if (handlerName === 'runApiAbQaControlServerFallback' && typeof runApiAbQaControlServerFallback === 'function') {
      return runApiAbQaControlServerFallback();
    }
    if (handlerName === 'runApiAbQaControl' && typeof runApiAbQaControl === 'function') {
      return runApiAbQaControl();
    }
    if (handlerName === 'runAllAppBackdataFactoryControl10m' && typeof runAllAppBackdataFactoryControl10m === 'function') {
      return runAllAppBackdataFactoryControl10m();
    }
    if (handlerName === 'runAllAppApiAbQaRequestWindow' && typeof runAllAppApiAbQaRequestWindow === 'function') {
      return runAllAppApiAbQaRequestWindow();
    }
    if (handlerName === 'runImageLearning10mTickV2' && typeof runImageLearning10mTickV2 === 'function') {
      return runImageLearning10mTickV2();
    }
    return {ok:true, skipped:true, reason:'HANDLER_NOT_SYNCED', handler:handlerName};
  } catch (err) {
    return {ok:false, handler:handlerName, error:String(err && err.message || err)};
  }
}

/**
 * Adapter for the existing factory processTaskQueue handler.
 * Add exactly one call to this function at the END of the existing
 * processTaskQueue implementation in the bound Apps Script slot.
 */
function runContentOsScheduledStagesFromFactory() {
  return contentOsUnifiedSchedulerTick();
}

/**
 * Trigger audit only. It does not create/delete physical triggers.
 */
function auditContentOsTriggerContract() {
  const triggers = ScriptApp.getProjectTriggers();
  const rows = triggers.map(function(t) {
    return {handler:t.getHandlerFunction(), source:String(t.getTriggerSource()), eventType:String(t.getEventType())};
  });
  const duplicateOwn = rows.filter(function(r) { return r.handler === 'contentOsUnifiedSchedulerTick'; }).length;
  const duplicateAllApp = rows.filter(function(r) { return r.handler === 'runAllAppBackdataFactoryControl10m'; }).length;
  const duplicateImage = rows.filter(function(r) { return r.handler === 'runImageLearning10mTickV2' || r.handler === 'runImageLearningFromFactoryWakeV2'; }).length;
  return {
    ok: duplicateOwn <= 1 && duplicateAllApp === 0 && duplicateImage === 0,
    physicalTriggerPolicy: 'REUSE_EXISTING_FACTORY_PROCESS_TASK_QUEUE',
    unifiedTriggerCount: duplicateOwn,
    allAppPhysicalTriggerCount: duplicateAllApp,
    imageLearningPhysicalTriggerCount: duplicateImage,
    imageLearningLogicalMinutes: 10,
    triggers: rows,
    version: CONTENTOS_UNIFIED_SCHEDULER_VERSION
  };
}

/**
 * API-free virtual-front x2 QA. Two independent fixtures are enqueued and
 * processed; PASS requires two new pipeline log rows and T1/T2 readiness.
 */
function testContentOsApiFreeVirtualFrontX2() {
  if (typeof enqueueContentOsQuery !== 'function' || typeof contentOsPipelineTick !== 'function') {
    return {ok:false, reason:'PIPELINE_FUNCTIONS_NOT_SYNCED', version:CONTENTOS_UNIFIED_SCHEDULER_VERSION};
  }
  const ss = SpreadsheetApp.openById(CONTENTOS_PIPELINE_SHEET_ID);
  const log = ss.getSheetByName('Pipeline_Log');
  if (!log) return {ok:false, reason:'Pipeline_Log missing'};
  const before = log.getLastRow();
  const suffix = Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMddHHmmss');
  const f1 = enqueueContentOsQuery('APP_CONTENT_OS','두바이 쫀득 쿠키 '+suffix,20);
  const r1 = contentOsPipelineTick();
  const middle = log.getLastRow();
  Utilities.sleep(50);
  const f2 = enqueueContentOsQuery('APP_CONTENT_OS','신라면 먹방 '+suffix,20);
  const r2 = contentOsPipelineTick();
  const after = log.getLastRow();

  const run1Added = middle > before;
  const run2Added = after > middle;
  const pipelinePass = run1Added && run2Added && r1 && r1.ok !== false && r2 && r2.ok !== false;
  const readiness = typeof testContentOsVirtualFrontReadinessX2 === 'function'
    ? testContentOsVirtualFrontReadinessX2()
    : {ok:false, reason:'VIRTUAL_FRONT_QA_NOT_SYNCED'};
  const pass = pipelinePass && readiness && readiness.ok === true;
  return {
    ok: pass,
    API_FREE_FINAL_PASS: pass,
    pipelinePass:pipelinePass,
    readinessPass:readiness && readiness.ok === true,
    run1Added: run1Added,
    run2Added: run2Added,
    logDelta: after-before,
    fixtures:[f1,f2],
    runs:[r1,r2],
    readiness:readiness,
    version:CONTENTOS_UNIFIED_SCHEDULER_VERSION
  };
}
