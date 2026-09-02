/* CONTENTOS_UNIFIED_SCHEDULER_V13_OVERLAY_20260902
 * Logical-only union scheduler for the existing processTaskQueue wake.
 * It combines the previously separated ContentOS, image-supply, persona/seed,
 * central audit/CWBX and librarian stages without creating a physical trigger.
 */
var CONTENTOS_UNIFIED_SCHEDULER_V13_OVERLAY_VERSION='CONTENTOS_UNIFIED_SCHEDULER_V13_OVERLAY_20260902';

function runContentOsScheduledStagesFromFactoryV13() {
  var out={ok:true,version:CONTENTOS_UNIFIED_SCHEDULER_V13_OVERLAY_VERSION,startedAt:new Date().toISOString(),stages:{}};
  var names=[
    ['pipeline','contentOsPipelineTick'],['queensBridge','contentOsQueensBridgeTick'],['seedQualification','contentOsSeedQualification10mTick'],['frontLineage','contentOsFrontLineage10mTick'],['virtualFront','contentOsVirtualFront10mTick'],['factoryControl','runBackdataFactoryControl10m'],['apiAbQa','runApiAbQaControlServerFallback'],['allAppFactory','runAllAppBackdataFactoryControl10m'],['allAppApiAb','runAllAppApiAbQaRequestWindow'],['imageSupplyPre','runImageSupplyPreLearningV2_'],['imageLearning','runImageLearning10mTickV2'],['imageSupplyPost','runImageSupplyPostLearningV2_'],['autogrowGovernor','runCentralAutogrowPriorityTrafficGovernor10mIfDue_'],['dailyFreeCheck','runCentralDailyFreeProductionCheckIfDue_'],['personaSeedScale','runContentOsPersonaSeedScale10mIfDue_'],['apiCredentialUsage','runCentralApiCredentialUsageAuditHourly'],['centralSheetRuntimeAudit','runCentralSheetRuntimeAuditAutofix10m'],['centralWorkflowBridgeCrosscheck','runCentralWorkflowBridgeCrosscheck10m'],['centralLibrarian','runCentralLibrarianKnowledgeIndex15mIfDue_']
  ];
  names.forEach(function(pair){out.stages[pair[0]]=contentOsUnionStageV13_(pair[1]);});
  out.ok=Object.keys(out.stages).every(function(k){var r=out.stages[k];return r&&(r.ok!==false||r.skipped===true||r.degraded===true||r.hold===true);});
  out.finishedAt=new Date().toISOString();return out;
}
function contentOsUnionStageV13_(name){
  try{
    if(name==='contentOsPipelineTick'&&typeof contentOsPipelineTick==='function')return contentOsPipelineTick();
    if(name==='contentOsQueensBridgeTick'&&typeof contentOsQueensBridgeTick==='function')return contentOsQueensBridgeTick();
    if(name==='contentOsSeedQualification10mTick'&&typeof contentOsSeedQualification10mTick==='function')return contentOsSeedQualification10mTick();
    if(name==='contentOsFrontLineage10mTick'&&typeof contentOsFrontLineage10mTick==='function')return contentOsFrontLineage10mTick();
    if(name==='contentOsVirtualFront10mTick'&&typeof contentOsVirtualFront10mTick==='function')return contentOsVirtualFront10mTick();
    if(name==='runBackdataFactoryControl10m'&&typeof runBackdataFactoryControl10m==='function')return runBackdataFactoryControl10m();
    if(name==='runApiAbQaControlServerFallback'&&typeof runApiAbQaControlServerFallback==='function')return runApiAbQaControlServerFallback();
    if(name==='runAllAppBackdataFactoryControl10m'&&typeof runAllAppBackdataFactoryControl10m==='function')return runAllAppBackdataFactoryControl10m();
    if(name==='runAllAppApiAbQaRequestWindow'&&typeof runAllAppApiAbQaRequestWindow==='function')return runAllAppApiAbQaRequestWindow();
    if(name==='runImageSupplyPreLearningV2_'&&typeof runImageSupplyPreLearningV2_==='function')return runImageSupplyPreLearningV2_();
    if(name==='runImageLearning10mTickV2'&&typeof runImageLearning10mTickV2==='function')return runImageLearning10mTickV2();
    if(name==='runImageSupplyPostLearningV2_'&&typeof runImageSupplyPostLearningV2_==='function')return runImageSupplyPostLearningV2_();
    if(name==='runCentralAutogrowPriorityTrafficGovernor10mIfDue_'&&typeof runCentralAutogrowPriorityTrafficGovernor10mIfDue_==='function')return runCentralAutogrowPriorityTrafficGovernor10mIfDue_();
    if(name==='runCentralDailyFreeProductionCheckIfDue_'&&typeof runCentralDailyFreeProductionCheckIfDue_==='function')return runCentralDailyFreeProductionCheckIfDue_();
    if(name==='runContentOsPersonaSeedScale10mIfDue_'&&typeof runContentOsPersonaSeedScale10mIfDue_==='function')return runContentOsPersonaSeedScale10mIfDue_();
    if(name==='runCentralApiCredentialUsageAuditHourly'&&typeof runCentralApiCredentialUsageAuditHourly==='function')return runCentralApiCredentialUsageAuditHourly();
    if(name==='runCentralSheetRuntimeAuditAutofix10m'&&typeof runCentralSheetRuntimeAuditAutofix10m==='function')return runCentralSheetRuntimeAuditAutofix10m();
    if(name==='runCentralWorkflowBridgeCrosscheck10m'&&typeof runCentralWorkflowBridgeCrosscheck10m==='function')return runCentralWorkflowBridgeCrosscheck10m();
    if(name==='runCentralLibrarianKnowledgeIndex15mIfDue_'&&typeof runCentralLibrarianKnowledgeIndex15mIfDue_==='function')return runCentralLibrarianKnowledgeIndex15mIfDue_();
    return {ok:true,skipped:true,reason:'HANDLER_NOT_SYNCED',handler:name};
  }catch(err){return {ok:false,handler:name,error:String(err&&err.message||err)};}
}
function auditContentOsUnifiedSchedulerV13Overlay(){var triggers=ScriptApp.getProjectTriggers();var own=triggers.filter(function(t){return t.getHandlerFunction()==='runContentOsScheduledStagesFromFactoryV13';}).length;return {ok:own===0,physicalOwnTriggerCount:own,policy:'LOGICAL_ONLY_REUSE_EXISTING_PROCESS_TASK_QUEUE',version:CONTENTOS_UNIFIED_SCHEDULER_V13_OVERLAY_VERSION};}
