var NOTEBOOK_CLOUD_DISPATCH_V1={
  v:'NOTEBOOK_CLOUD_DISPATCH_V2_PERSISTENCE_FIRST_20260919',
  queueId:'1qTrJI_GSjxOQlSFzY3Dm-6MJ5PTVxdy6Eibke3PkVA4',
  queueTab:'07_EXECUTION_QUEUE',
  targetTasks:['TASK_20260919_LOCAL_CONSUMER_PERSISTENCE_REPAIR_001','TASK_PYTHON_DRIVE_API_WORKER_001'],
  parentTask:'TASK_20260909_REMOTE_DC_DISPLAY_OFF_RECOVERY_001',
  tz:'Asia/Seoul'
};

function runNotebookCloudQueueDispatchFromFactory(context){
  var cfg=NOTEBOOK_CLOUD_DISPATCH_V1;
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(8000)) return {ok:false,hold:true,status:'LOCK_BUSY',version:cfg.v};
  try{
    var ss=SpreadsheetApp.openById(cfg.queueId);
    var sh=ss.getSheetByName(cfg.queueTab);
    if(!sh) throw new Error('QUEUE_TAB_MISSING');
    var d=sh.getDataRange().getValues();
    if(d.length<2) return {ok:true,hold:true,status:'QUEUE_EMPTY',version:cfg.v};
    var h={}; d[0].forEach(function(v,i){h[String(v)]=i});
    ['TASK_ID','STATUS','EXECUTION_METHOD','UPDATED_AT','NOTES','OWNER','LAST_REQUESTED_AT','REQUEST_COUNT','BLOCKED_TASK_ID'].forEach(function(k){
      if(h[k]===undefined) throw new Error('QUEUE_COLUMN_MISSING_'+k);
    });
    var row=-1, selectedTask='';
    for(var t=0;t<cfg.targetTasks.length && row<1;t++){
      for(var i=1;i<d.length;i++){
        if(String(d[i][h.TASK_ID])===cfg.targetTasks[t]){
          var cand=String(d[i][h.STATUS]||'').toUpperCase();
          if(/^(RETRY|READY|OPEN_RETRYABLE|AUTO_RECOVERY_PENDING|READY_LOCAL_CONSUMER)$/.test(cand)){row=i;selectedTask=cfg.targetTasks[t];break}
        }
      }
    }
    if(row<1) return {ok:false,hold:true,status:'TARGET_TASK_NOT_FOUND_OR_NOT_CLAIMABLE',targets:cfg.targetTasks,version:cfg.v};
    var st=String(d[row][h.STATUS]||'').toUpperCase();
    var claimable=/^(RETRY|READY|OPEN_RETRYABLE|AUTO_RECOVERY_PENDING)$/.test(st);
    if(!claimable) return {ok:true,hold:true,status:'NO_CLAIMABLE_STATE',currentStatus:st,version:cfg.v};

    var now=Utilities.formatDate(new Date(),cfg.tz,'yyyy-MM-dd HH:mm:ss')+' KST';
    var method=String(d[row][h.EXECUTION_METHOD]||'');
    if(method.indexOf('EXISTING_5M_WATCHDOG')<0) method+=(method?';':'')+'EXISTING_5M_WATCHDOG';
    if(method.indexOf('LOCAL_PYTHON')<0) method+=';LOCAL_PYTHON';
    if(method.indexOf('LOCAL_POWERSHELL_ASYNC')<0) method+=';LOCAL_POWERSHELL_ASYNC';

    sh.getRange(row+1,h.STATUS+1).setValue('READY_LOCAL_CONSUMER');
    sh.getRange(row+1,h.EXECUTION_METHOD+1).setValue(method);
    sh.getRange(row+1,h.UPDATED_AT+1).setValue(now);
    sh.getRange(row+1,h.LAST_REQUESTED_AT+1).setValue(now);
    sh.getRange(row+1,h.REQUEST_COUNT+1).setValue(Number(d[row][h.REQUEST_COUNT]||0)+1);
    sh.getRange(row+1,h.BLOCKED_TASK_ID+1).setValue(cfg.parentTask);
    var note=String(d[row][h.NOTES]||'');
    note+=' | '+now+' CLOUD_DISPATCH: RemoteDC-independent R3->R2 route armed. Local Watchdog/Python/PowerShell must consume same task; no reboot/reauth/new OAuth/broad kill.';
    sh.getRange(row+1,h.NOTES+1).setValue(note.slice(-9000));
    SpreadsheetApp.flush();

    var rb=sh.getRange(row+1,1,1,sh.getLastColumn()).getDisplayValues()[0];
    return {ok:true,status:'READY_LOCAL_CONSUMER',taskId:selectedTask,parentTask:cfg.parentTask,source:String(context&&context.source||'factory'),readbackStatus:rb[h.STATUS],version:cfg.v};
  }catch(e){
    return {ok:false,hold:true,status:'DISPATCH_ERROR',error:String(e&&e.message||e),version:cfg.v};
  }finally{lock.releaseLock()}
}

function auditNotebookCloudQueueDispatchContract(){
  var handlers=ScriptApp.getProjectTriggers().map(function(t){return t.getHandlerFunction()});
  var dedicated=handlers.filter(function(h){return h==='runNotebookCloudQueueDispatchFromFactory'}).length;
  return {ok:dedicated===0,dedicatedTriggerCount:dedicated,policy:'LOGICAL_ONLY_REUSE_EXISTING_PROCESS_ALL_TASK_QUEUES',remoteDcDependency:false,version:NOTEBOOK_CLOUD_DISPATCH_V1.v};
}
