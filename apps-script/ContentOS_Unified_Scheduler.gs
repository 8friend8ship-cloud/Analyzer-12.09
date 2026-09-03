const CONTENTOS_UNIFIED_SCHEDULER_VERSION = 'CONTENTOS_UNIFIED_SCHEDULER_V16_YOUTUBE_SEED_20260903';

/**
 * Single logical entrypoint intended to be called by the already-installed
 * factory scheduler (for example processTaskQueue) after source sync.
 * It NEVER creates another physical trigger for pipeline stages.
 *
 * Central Sheet runtime auditor is included as a logical stage, while its own
 * independent watchdog trigger may be installed exactly once by
 * installOrRepairCentralSheetRuntimeAuditTrigger(). This is intentional: the
 * primary factory wake must not be its only watchdog.
 *
 * Central daily 001-800/STEP800 + W1-W5 operating audit is Apps Script-owned,
 * logical-only, and MUST reuse the existing processTaskQueue physical wake.
 * OpenAI Work is not a dependency for this daily governance automation.
 *
 * YouTube Seed is logical-only: youtubeSeedFactoryTick is called here and must
 * not receive its own time trigger. It reuses processTaskQueue through this
 * unified scheduler and writes Drive seed/VTube bridge data with deduplication.
 *
 * Central workflow/bridge crosscheck, central tablet remote dispatch, and
 * OpenAI W1-W5 supervision are logical-only and MUST reuse the existing
 * processTaskQueue physical wake. OpenAI Work is supervision/audit only and is
 * never a required scheduler for application automation.
 *
 * Image supply uses PRE→LEARNING→POST order so an already verified spatial PASS
 * is consumed before legacy feature extraction can downgrade its status, then
 * seeded rows are repaired after the legacy tick.
 */
function contentOsUnifiedSchedulerTick() {
  const out = {
    ok: true,
    version: CONTENTOS_UNIFIED_SCHEDULER_VERSION,
    startedAt: new Date().toISOString(),
    stages: {}
  };

  out.stages.daily800W1W5Audit = runOptionalContentOsStage_('runCentralDaily800W1W5AuditFromFactory_');
  out.stages.pipeline = runOptionalContentOsStage_('contentOsPipelineTick');
  out.stages.queensBridge = runOptionalContentOsStage_('contentOsQueensBridgeTick');
  out.stages.youtubeSeedFactory = runOptionalContentOsStage_('youtubeSeedFactoryTick');
  out.stages.seedQualification = runOptionalContentOsStage_('contentOsSeedQualification10mTick');
  out.stages.frontLineage = runOptionalContentOsStage_('contentOsFrontLineage10mTick');
  out.stages.virtualFront = runOptionalContentOsStage_('contentOsVirtualFront10mTick');
  out.stages.factoryControl = runOptionalContentOsStage_('runBackdataFactoryControl10m');
  out.stages.apiAbQa = runOptionalContentOsStage_('runApiAbQaControlServerFallback');
  out.stages.allAppFactory = runOptionalContentOsStage_('runAllAppBackdataFactoryControl10m');
  out.stages.allAppApiAb = runOptionalContentOsStage_('runAllAppApiAbQaRequestWindow');
  out.stages.imageSupplyPre = runOptionalContentOsStage_('runImageSupplyPreLearningV2_');
  out.stages.imageLearning = runOptionalContentOsStage_('runImageLearning10mTickV2');
  out.stages.imageSupplyPost = runOptionalContentOsStage_('runImageSupplyPostLearningV2_');
  out.stages.apiCredentialUsage = runOptionalContentOsStage_('runCentralApiCredentialUsageAuditHourly');
  out.stages.centralSheetRuntimeAudit = runOptionalContentOsStage_('runCentralSheetRuntimeAuditAutofix10m');
  out.stages.centralWorkflowBridgeCrosscheck = runOptionalContentOsStage_('runCentralWorkflowBridgeCrosscheck10m');
  out.stages.tabletRemoteDispatcher = runOptionalContentOsStage_('runCentralTabletRemoteDispatcherFromFactory');
  out.stages.openAi5Workers = runOptionalContentOsStage_('runOpenAi5WorkerControlCycleFromFactory');

  out.ok = Object.keys(out.stages).every(function(k) {
    const r = out.stages[k];
    return r && (r.ok !== false || r.skipped === true || r.degraded === true || r.hold === true);
  });
  out.finishedAt = new Date().toISOString();
  return out;
}

function runOptionalContentOsStage_(handlerName) {
  try {
    if (handlerName === 'runCentralDaily800W1W5AuditFromFactory_' && typeof runCentralDaily800W1W5AuditFromFactory_ === 'function') return runCentralDaily800W1W5AuditFromFactory_();
    if (handlerName === 'contentOsPipelineTick' && typeof contentOsPipelineTick === 'function') return contentOsPipelineTick();
    if (handlerName === 'contentOsQueensBridgeTick' && typeof contentOsQueensBridgeTick === 'function') return contentOsQueensBridgeTick();
    if (handlerName === 'youtubeSeedFactoryTick' && typeof youtubeSeedFactoryTick === 'function') return youtubeSeedFactoryTick();
    if (handlerName === 'contentOsSeedQualification10mTick' && typeof contentOsSeedQualification10mTick === 'function') return contentOsSeedQualification10mTick();
    if (handlerName === 'contentOsFrontLineage10mTick' && typeof contentOsFrontLineage10mTick === 'function') return contentOsFrontLineage10mTick();
    if (handlerName === 'contentOsVirtualFront10mTick' && typeof contentOsVirtualFront10mTick === 'function') return contentOsVirtualFront10mTick();
    if (handlerName === 'runBackdataFactoryControl10m' && typeof runBackdataFactoryControl10m === 'function') return runBackdataFactoryControl10m();
    if (handlerName === 'runApiAbQaControlServerFallback' && typeof runApiAbQaControlServerFallback === 'function') return runApiAbQaControlServerFallback();
    if (handlerName === 'runApiAbQaControl' && typeof runApiAbQaControl === 'function') return runApiAbQaControl();
    if (handlerName === 'runAllAppBackdataFactoryControl10m' && typeof runAllAppBackdataFactoryControl10m === 'function') return runAllAppBackdataFactoryControl10m();
    if (handlerName === 'runAllAppApiAbQaRequestWindow' && typeof runAllAppApiAbQaRequestWindow === 'function') return runAllAppApiAbQaRequestWindow();
    if (handlerName === 'runImageSupplyPreLearningV2_' && typeof runImageSupplyPreLearningV2_ === 'function') return runImageSupplyPreLearningV2_();
    if (handlerName === 'runImageLearning10mTickV2' && typeof runImageLearning10mTickV2 === 'function') return runImageLearning10mTickV2();
    if (handlerName === 'runImageSupplyPostLearningV2_' && typeof runImageSupplyPostLearningV2_ === 'function') return runImageSupplyPostLearningV2_();
    if (handlerName === 'runCentralApiCredentialUsageAuditHourly' && typeof runCentralApiCredentialUsageAuditHourly === 'function') return runCentralApiCredentialUsageAuditHourly();
    if (handlerName === 'runCentralSheetRuntimeAuditAutofix10m' && typeof runCentralSheetRuntimeAuditAutofix10m === 'function') return runCentralSheetRuntimeAuditAutofix10m();
    if (handlerName === 'runCentralWorkflowBridgeCrosscheck10m' && typeof runCentralWorkflowBridgeCrosscheck10m === 'function') return runCentralWorkflowBridgeCrosscheck10m();
    if (handlerName === 'runCentralTabletRemoteDispatcherFromFactory' && typeof runCentralTabletRemoteDispatcherFromFactory === 'function') return runCentralTabletRemoteDispatcherFromFactory({source:'contentOsUnifiedSchedulerTick'});
    if (handlerName === 'runOpenAi5WorkerControlCycleFromFactory' && typeof runOpenAi5WorkerControlCycleFromFactory === 'function') return runOpenAi5WorkerControlCycleFromFactory();
    return {ok:true, skipped:true, reason:'HANDLER_NOT_SYNCED', handler:handlerName};
  } catch (err) {
    return {ok:false, handler:handlerName, error:String(err && err.message || err)};
  }
}

function runContentOsScheduledStagesFromFactory() {
  return contentOsUnifiedSchedulerTick();
}

function auditContentOsTriggerContract() {
  const triggers = ScriptApp.getProjectTriggers();
  const rows = triggers.map(function(t) {
    return {handler:t.getHandlerFunction(), source:String(t.getTriggerSource()), eventType:String(t.getEventType())};
  });
  const duplicateOwn = rows.filter(function(r) { return r.handler === 'contentOsUnifiedSchedulerTick'; }).length;
  const duplicateAllApp = rows.filter(function(r) { return r.handler === 'runAllAppBackdataFactoryControl10m'; }).length;
  const duplicateImage = rows.filter(function(r) { return r.handler === 'runImageLearning10mTickV2' || r.handler === 'runImageLearningFromFactoryWakeV2'; }).length;
  const duplicateImageSupply = rows.filter(function(r) {
    return r.handler === 'runImageSupplyGovernor10mV1_' || r.handler === 'runImageSupplyPreLearningV2_' || r.handler === 'runImageSupplyPostLearningV2_' ||
      r.handler === 'runImageSupplyPriorityGovernorV1_' || r.handler === 'runGeneratedImageReingestV1_' || r.handler === 'runImageDailyTargetAutoScaleV1_';
  }).length;
  const duplicateApiAudit = rows.filter(function(r) { return r.handler === 'runCentralApiCredentialUsageAuditHourly'; }).length;
  const duplicateYouTubeSeed = rows.filter(function(r) { return r.handler === 'youtubeSeedFactoryTick' || r.handler === 'runYouTubeSeedFactoryFromFactoryWake'; }).length;
  const centralSheetAudit = rows.filter(function(r) { return r.handler === 'runCentralSheetRuntimeAuditAutofix10m'; }).length;
  const workflowBridgeCrosscheck = rows.filter(function(r) { return r.handler === 'runCentralWorkflowBridgeCrosscheck10m'; }).length;
  const tabletRemotePhysical = rows.filter(function(r) { return r.handler === 'runCentralTabletRemoteDispatcherFromFactory'; }).length;
  const openAi5Physical = rows.filter(function(r) { return /^runOpenAi(5|Worker)/.test(r.handler); }).length;
  const daily800Physical = rows.filter(function(r) { return r.handler === 'runCentralDaily800W1W5AuditFromFactory_' || r.handler === 'runCentralDaily800W1W5AuditNow'; }).length;
  return {
    ok: duplicateOwn <= 1 && duplicateAllApp === 0 && duplicateImage === 0 && duplicateImageSupply === 0 && duplicateApiAudit === 0 && duplicateYouTubeSeed === 0 && centralSheetAudit <= 1 && workflowBridgeCrosscheck === 0 && tabletRemotePhysical === 0 && openAi5Physical === 0 && daily800Physical === 0,
    physicalTriggerPolicy: 'REUSE_EXISTING_FACTORY_PROCESS_TASK_QUEUE_FOR_PIPELINE_YOUTUBE_SEED_DAILY800_CWBX_TABLET_REMOTE_OPENAI5;NO_YOUTUBE_SEED_DAILY800_TABLET_REMOTE_OR_OPENAI5_DEDICATED_PHYSICAL_TRIGGER;ONE_DEDICATED_CENTRAL_SHEET_WATCHDOG_ALLOWED',
    unifiedTriggerCount: duplicateOwn,
    allAppPhysicalTriggerCount: duplicateAllApp,
    imageLearningPhysicalTriggerCount: duplicateImage,
    imageSupplyPhysicalTriggerCount: duplicateImageSupply,
    apiCredentialAuditPhysicalTriggerCount: duplicateApiAudit,
    youtubeSeedPhysicalTriggerCount: duplicateYouTubeSeed,
    centralSheetAuditTriggerCount: centralSheetAudit,
    workflowBridgeCrosscheckPhysicalTriggerCount: workflowBridgeCrosscheck,
    tabletRemotePhysicalTriggerCount: tabletRemotePhysical,
    openAi5PhysicalTriggerCount: openAi5Physical,
    daily800W1W5PhysicalTriggerCount: daily800Physical,
    youtubeSeedLogicalMinutes: 10,
    imageLearningLogicalMinutes: 10,
    imageSupplyLogicalMinutes: 10,
    apiCredentialAuditLogicalMinutes: 60,
    centralSheetAuditLogicalMinutes: 10,
    workflowBridgeCrosscheckLogicalMinutes: 10,
    tabletRemoteLogicalMinutes: 5,
    openAi5LogicalMinutes: 5,
    daily800W1W5LogicalMinutes: 1440,
    openAiWorkDependency: false,
    triggers: rows,
    version: CONTENTOS_UNIFIED_SCHEDULER_VERSION
  };
}

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
  const readiness = typeof testContentOsVirtualFrontReadinessX2 === 'function' ? testContentOsVirtualFrontReadinessX2() : {ok:false, reason:'VIRTUAL_FRONT_QA_NOT_SYNCED'};
  const pass = pipelinePass && readiness && readiness.ok === true;
  return {ok:pass,API_FREE_FINAL_PASS:pass,pipelinePass:pipelinePass,readinessPass:readiness&&readiness.ok===true,run1Added:run1Added,run2Added:run2Added,logDelta:after-before,fixtures:[f1,f2],runs:[r1,r2],readiness:readiness,version:CONTENTOS_UNIFIED_SCHEDULER_VERSION};
}
