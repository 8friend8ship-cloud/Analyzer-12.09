var CENTRAL_SIDECAR_SLICE_V1 = {
  version: 'CENTRAL_SIDECAR_SLICE_V1_20260909',
  cursorKey: 'CENTRAL_SIDECAR_SLICE_CURSOR_V1',
  leaseUntilKey: 'CENTRAL_SIDECAR_SLICE_LEASE_UNTIL_V1',
  leaseOwnerKey: 'CENTRAL_SIDECAR_SLICE_LEASE_OWNER_V1',
  tz: 'Asia/Seoul'
};

function centralSidecarStagesV1_() {
  return [
    {id:'IMAGE_LEARNING',run:function(){if(typeof maybeRunImageLearningFromFactoryWakeV6_==='function')return maybeRunImageLearningFromFactoryWakeV6_();return (typeof runImageLearning10mTickV2==='function')?runImageLearning10mTickV2():{ok:true,skipped:true,reason:'IMAGE_HANDLER_ABSENT'};}},
    {id:'MUSIC_REVENUE',run:function(){return (typeof runMusicRevenueFlywheel10m_==='function')?runMusicRevenueFlywheel10m_():{ok:true,skipped:true,reason:'MUSIC_HANDLER_ABSENT'};}},
    {id:'CWBX',run:function(){return (typeof maybeRunCentralWorkflowBridgeCrosscheck10mPhysical_==='function')?maybeRunCentralWorkflowBridgeCrosscheck10mPhysical_():{ok:true,skipped:true,reason:'CWBX_HANDLER_ABSENT'};}},
    {id:'PROJECT_VERIFICATION',run:function(){return (typeof maybeRunProjectVerificationPack15mFromFactoryWake_==='function')?maybeRunProjectVerificationPack15mFromFactoryWake_():{ok:true,skipped:true,reason:'PROJECT_VERIFY_HANDLER_ABSENT'};}},
    {id:'PROJECT_TRIGGER_API_GOV',run:function(){return (typeof maybeRunCentralPromotionTriggerApiGovernance30m_==='function')?maybeRunCentralPromotionTriggerApiGovernance30m_():{ok:true,skipped:true,reason:'GOV_HANDLER_ABSENT'};}},
    {id:'GLOBAL_MATERIAL_QUEENS',run:function(){return (typeof runGlobalMaterialQueensCollectorV1==='function')?runGlobalMaterialQueensCollectorV1():{ok:true,skipped:true,reason:'GMQ_HANDLER_ABSENT'};}},
    {id:'GLOBAL_MATERIAL',run:function(){return (typeof runGlobalMaterialCollection10mFromFactory==='function')?runGlobalMaterialCollection10mFromFactory():{ok:true,skipped:true,reason:'GM_HANDLER_ABSENT'};}},
    {id:'GEMINI_PROJECT_AUDIT',run:function(){return (typeof maybeRunGeminiProjectAuditAutofix10mFromFactoryWake_==='function')?maybeRunGeminiProjectAuditAutofix10mFromFactoryWake_():{ok:true,skipped:true,reason:'CGPA_HANDLER_ABSENT'};}},
    {id:'NLM_FLOW_FAILOVER',run:function(){return (typeof runGlobalNlmFlowNonblockingFailover10m_==='function')?runGlobalNlmFlowNonblockingFailover10m_({source:'runCentralSidecarSliceV1'}):{ok:true,skipped:true,reason:'NLM_HANDLER_ABSENT'};}},
    {id:'QUEENS_ROUTE',run:function(){return (typeof runQueensRouteSyncV1_==='function')?runQueensRouteSyncV1_({maxPerLane:50}):{ok:true,skipped:true,reason:'QUEENS_ROUTE_HANDLER_ABSENT'};}}
  ];
}
function acquireCentralSidecarLeaseV1_() {
  var p=PropertiesService.getScriptProperties(),l=LockService.getScriptLock();
  if(!l.tryLock(1200))return {ok:false,reason:'SIDECAR_LOCK_BUSY'};
  try{
    var now=Date.now(),until=Number(p.getProperty(CENTRAL_SIDECAR_SLICE_V1.leaseUntilKey)||0);
    if(until>now)return {ok:false,reason:'SIDECAR_LEASE_ACTIVE',remainingMs:until-now};
    var runId='SIDECAR_'+Utilities.formatDate(new Date(),CENTRAL_SIDECAR_SLICE_V1.tz,'yyyyMMdd_HHmmss')+'_'+Utilities.getUuid().slice(0,8);
    p.setProperties((function(){var o={};o[CENTRAL_SIDECAR_SLICE_V1.leaseUntilKey]=String(now+390000);o[CENTRAL_SIDECAR_SLICE_V1.leaseOwnerKey]=runId;return o;})());
    return {ok:true,runId:runId};
  }finally{try{l.releaseLock();}catch(e){}}
}

function releaseCentralSidecarLeaseV1_(runId) {
  var p=PropertiesService.getScriptProperties(),l=LockService.getScriptLock();if(!l.tryLock(1200))return false;
  try{if(p.getProperty(CENTRAL_SIDECAR_SLICE_V1.leaseOwnerKey)===String(runId||'')){var o={};o[CENTRAL_SIDECAR_SLICE_V1.leaseUntilKey]='0';o[CENTRAL_SIDECAR_SLICE_V1.leaseOwnerKey]='';p.setProperties(o);}return true;}
  finally{try{l.releaseLock();}catch(e){}}
}

function centralSidecarLogV1_(runId,stageId,status,elapsed,result) {
  try{withBackend_('APP_ANALYZER',function(){var sh=sheet_(SHEETS.LOGS);if(sh.getLastRow()>=sh.getMaxRows())sh.insertRowsAfter(sh.getMaxRows(),100);sh.appendRow(['LOG_'+Utilities.getUuid(),appId_(),'CENTRAL_SIDECAR_SLICE_V1',iso_(),status,elapsed,JSON.stringify({runId:runId,stage:stageId,result:result}).substring(0,3000),0]);});}catch(e){}
}
function runCentralSidecarSliceV1() {
  var lease=acquireCentralSidecarLeaseV1_();
  if(!lease.ok)return {ok:true,skipped:true,reason:lease.reason,lease:lease,at:iso_()};
  var started=Date.now(),p=PropertiesService.getScriptProperties(),stages=centralSidecarStagesV1_(),cur=Math.max(0,Number(p.getProperty(CENTRAL_SIDECAR_SLICE_V1.cursorKey)||0))%stages.length,stage=stages[cur],result;
  var githubWorkflowPackX2={ok:true,skipped:true,reason:'GH_WFPACK_V2_HANDLER_ABSENT'};
  try{githubWorkflowPackX2=(typeof maybeRunCentralGitHubWorkflowPackV2ApprovedX2Once_==='function')?maybeRunCentralGitHubWorkflowPackV2ApprovedX2Once_():githubWorkflowPackX2;}catch(ghErr){githubWorkflowPackX2={ok:false,error:String(ghErr&&ghErr.message||ghErr)};}
  var metaSignalLineageX2={ok:true,skipped:true,reason:'META_SIGNAL_LINEAGE_HANDLER_ABSENT'};
  try{metaSignalLineageX2=(typeof maybeRunMetaSignalLineageBootstrapOnceV1_==='function')?maybeRunMetaSignalLineageBootstrapOnceV1_():metaSignalLineageX2;}catch(metaErr){metaSignalLineageX2={ok:false,error:String(metaErr&&metaErr.message||metaErr)};}
  var govRepoBaseline={ok:true,skipped:true,reason:'GOV_REPO_BASELINE_HANDLER_ABSENT'};
  try{govRepoBaseline=(typeof maybeInitializeGovRepoBaselineOnceV2_==='function')?maybeInitializeGovRepoBaselineOnceV2_():govRepoBaseline;}catch(govBaseErr){govRepoBaseline={ok:false,error:String(govBaseErr&&govBaseErr.message||govBaseErr)};}
  var govDiscoveryX2={ok:true,skipped:true,reason:'GOV_DISCOVERY_X2_HANDLER_ABSENT'};
  try{govDiscoveryX2=(typeof maybeRunGovDiscoveryX2OnceV2_==='function')?maybeRunGovDiscoveryX2OnceV2_():govDiscoveryX2;}catch(govX2Err){govDiscoveryX2={ok:false,error:String(govX2Err&&govX2Err.message||govX2Err)};}
  try{
    try{result=stage.run();}catch(e){result={ok:false,error:String(e&&e.message||e)};}
    p.setProperty(CENTRAL_SIDECAR_SLICE_V1.cursorKey,String((cur+1)%stages.length));
    centralSidecarLogV1_(lease.runId,stage.id,result&&result.ok===false?'FAILED':'INFO',Date.now()-started,result);
    return {ok:!(result&&result.ok===false),version:CENTRAL_SIDECAR_SLICE_V1.version,runId:lease.runId,stage:stage.id,cursorBefore:cur,cursorAfter:(cur+1)%stages.length,elapsedMs:Date.now()-started,githubWorkflowPackX2:githubWorkflowPackX2,metaSignalLineageX2:metaSignalLineageX2,govRepoBaseline:govRepoBaseline,govDiscoveryX2:govDiscoveryX2,result:result,at:iso_()};
  }finally{releaseCentralSidecarLeaseV1_(lease.runId);}
}

function testCentralSidecarSliceV1() {
  var a=runCentralSidecarSliceV1(),b=runCentralSidecarSliceV1();
  return {ok:!!a&&!!b&&a.stage!==b.stage,first:a,second:b,stageAdvanced:!!a&&!!b&&a.stage!==b.stage,at:iso_()};
}

function auditCentralSidecarTriggerV1() {
  var list=ScriptApp.getProjectTriggers().map(function(t){return {id:String(t.getUniqueId()),handler:t.getHandlerFunction(),source:String(t.getTriggerSource()),eventType:String(t.getEventType())};});
  var side=list.filter(function(t){return t.handler==='runCentralSidecarSliceV1'&&t.source==='CLOCK';});
  var factory=list.filter(function(t){return t.handler==='processAllTaskQueues'&&t.source==='CLOCK';});
  var daily=list.filter(function(t){return t.handler==='runFactoryAll'&&t.source==='CLOCK';});
  return {ok:factory.length===1&&daily.length===1&&side.length<=1,triggerCount:list.length,factoryCount:factory.length,dailyCount:daily.length,sidecarCount:side.length,triggers:list,version:CENTRAL_SIDECAR_SLICE_V1.version,at:iso_()};
}
function installCentralSidecarTriggerV1() {
  requireAdmin_();
  var before=auditCentralSidecarTriggerV1();
  if(before.factoryCount!==1||before.dailyCount!==1)return {ok:false,hold:true,reason:'BASE_TRIGGER_COUNT_INVALID',audit:before};
  if(before.sidecarCount===1)return {ok:true,created:false,reason:'EXACT_SIDECAR_TRIGGER_ALREADY_EXISTS',audit:before};
  if(before.sidecarCount>1)return {ok:false,hold:true,reason:'DUPLICATE_SIDECAR_TRIGGER_HOLD',audit:before};
  var t=ScriptApp.newTrigger('runCentralSidecarSliceV1').timeBased().everyMinutes(1).create();
  var after=auditCentralSidecarTriggerV1();
  return {ok:after.sidecarCount===1&&after.factoryCount===1&&after.dailyCount===1,created:true,uid:String(t.getUniqueId()),intervalMin:1,audit:after,version:CENTRAL_SIDECAR_SLICE_V1.version};
}
function testCentralSidecarTriggerPolicyV1X2() {
  var a=auditCentralSidecarTriggerV1(),b=auditCentralSidecarTriggerV1();
  return {ok:a.ok&&b.ok&&a.triggerCount===b.triggerCount&&a.sidecarCount===b.sidecarCount,x2:(a.triggerCount===b.triggerCount&&a.sidecarCount===b.sidecarCount)?'PASS':'FAIL',run1:a,run2:b,version:CENTRAL_SIDECAR_SLICE_V1.version};
}

function ensureCentralSidecarTriggerFromFactoryV1_() {
  var before=auditCentralSidecarTriggerV1();
  if(before.factoryCount!==1||before.dailyCount!==1)return {ok:false,hold:true,reason:'BASE_TRIGGER_COUNT_INVALID',audit:before};
  if(before.sidecarCount===1)return {ok:true,created:false,reason:'EXACT_SIDECAR_TRIGGER_ALREADY_EXISTS',audit:before};
  if(before.sidecarCount>1)return {ok:false,hold:true,reason:'DUPLICATE_SIDECAR_TRIGGER_HOLD',audit:before};
  var t=ScriptApp.newTrigger('runCentralSidecarSliceV1').timeBased().everyMinutes(1).create();
  var after=auditCentralSidecarTriggerV1();
  return {ok:after.sidecarCount===1&&after.factoryCount===1&&after.dailyCount===1,created:true,uid:String(t.getUniqueId()),intervalMin:1,audit:after,source:'EXISTING_PROCESS_ALL_TASK_QUEUES_BOOTSTRAP',version:CENTRAL_SIDECAR_SLICE_V1.version};
}
