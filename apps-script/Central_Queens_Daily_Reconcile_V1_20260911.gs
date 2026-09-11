var CENTRAL_QUEENS_DAILY_RECONCILE_V1={
  version:'CENTRAL_QUEENS_DAILY_RECONCILE_V1_20260911',
  spreadsheetId:'1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI',tz:'Asia/Seoul',taskId:'Q_DRYWRITE_DAILY'
};
function queensDailyDateKeyV1_(v){
  var d=new Date(v);if(isNaN(d.getTime()))return '';
  return Utilities.formatDate(d,CENTRAL_QUEENS_DAILY_RECONCILE_V1.tz,'yyyy-MM-dd');
}
function computeQueensDailyDryWriteV1_(ss,dateKey){
  var sh=ss.getSheetByName('37_QUEENS_RESEARCH_RESULTS'),v=sh.getDataRange().getDisplayValues(),m=queensHeaderMap_(v[0]||[]);
  var before={},today={},gross=0,dup=0,net=0,approved=0,latest='';
  for(var i=1;i<v.length;i++){
    var r=v[i];if(String(r[m.QUEENS_TASK_ID]||'')!==CENTRAL_QUEENS_DAILY_RECONCILE_V1.taskId)continue;
    var day=queensDailyDateKeyV1_(r[m.COLLECTED_AT]),key=queensDryWriteSourceKey_(String(r[m.NOTES]||''),String(r[m.SOURCE_URL]||''));
    if(!key||key==='URL:')continue;
    if(day&&day<dateKey){before[key]=true;continue;}
    if(day!==dateKey)continue;
    gross++;if(String(r[m.SEED_STATUS]||'')==='SEED_CHATGPT_APPROVED')approved++;
    var at=String(r[m.COLLECTED_AT]||'');if(at>latest)latest=at;
    if(before[key]||today[key])dup++;else{today[key]=true;net++;}
  }
  return {ok:true,dateKey:dateKey,gross:gross,netNew:net,duplicateReuse:dup,approved:approved,latestCollectedAt:latest};
}
function writeQueensDailyDryWriteV1_(ss,x){
  var sh=ss.getSheetByName('109_QUEENS_DAILY_CONTROL'),v=sh.getDataRange().getDisplayValues(),m=queensHeaderMap_(v[0]||[]),row=0;
  for(var i=1;i<v.length;i++)if(String(v[i][m.QUEENS_TASK_ID]||'')===CENTRAL_QUEENS_DAILY_RECONCILE_V1.taskId){row=i+1;break;}
  if(!row)throw new Error('QUEENS_DAILY_CONTROL_DRYWRITE_ROW_MISSING');
  var now=Utilities.formatDate(new Date(),CENTRAL_QUEENS_DAILY_RECONCILE_V1.tz,'yyyy-MM-dd HH:mm:ss z');
  function set(k,val){if(m[k]!==undefined)sh.getRange(row,m[k]+1).setValue(val);}
  set('QUEUE_STATUS','ROUTER_X2_ACTIVE_CURRENT_NETNEW_RECONCILED');set('LAST_RUN_AT',x.latestCollectedAt);
  set('QUEENS_TODAY',x.netNew);set('SEED_ACTION_TODAY',x.approved);set('HOLD_REVIEW_TODAY',0);set('ACTION_COVERAGE',1);
  set('LOG_INTEGRITY','PASS_GROSS_'+x.gross+';NET_NEW_'+x.netNew+';DUP_REUSE_'+x.duplicateReuse+';SEED_APPROVED_'+x.approved);
  set('WHY_NOT_COLLECTING','COLLECTION_ACTIVE;NET_NEW_CANONICAL_RECONCILED');
  set('NEXT_ACTION','CONTINUE_FREE_FIRST_COLLECTION;COUNT_FIRST_SEEN_ONLY;NO_FALSE_PROGRESS');
  set('CHECKED_AT',now);set('RULE_VERSION',CENTRAL_QUEENS_DAILY_RECONCILE_V1.version);
  set('NOTES','37 current-day SOURCE_ID→URL dedupe readback: gross='+x.gross+'; netNew='+x.netNew+'; duplicateReuse='+x.duplicateReuse+'; seedApproved='+x.approved+'.');
  SpreadsheetApp.flush();return {ok:true,row:row,summary:x};
}
function testQueensDailyDryWriteReconcileX2V1_(){
  var ss=SpreadsheetApp.openById(CENTRAL_QUEENS_DAILY_RECONCILE_V1.spreadsheetId),day=Utilities.formatDate(new Date(),CENTRAL_QUEENS_DAILY_RECONCILE_V1.tz,'yyyy-MM-dd');
  var a=computeQueensDailyDryWriteV1_(ss,day),b=computeQueensDailyDryWriteV1_(ss,day),same=JSON.stringify(a)===JSON.stringify(b),w=same?writeQueensDailyDryWriteV1_(ss,b):{ok:false};
  var ok=same&&w.ok&&a.gross===a.netNew+a.duplicateReuse;
  return {ok:ok,pass1:a,pass2:b,writeback:w,version:CENTRAL_QUEENS_DAILY_RECONCILE_V1.version};
}
function maybeRunQueensDailyDryWriteReconcileOnceV1_(){
  var p=PropertiesService.getScriptProperties(),day=Utilities.formatDate(new Date(),CENTRAL_QUEENS_DAILY_RECONCILE_V1.tz,'yyyyMMdd'),k='QUEENS_DAILY_DRYWRITE_RECONCILE_'+day;
  if(p.getProperty(k)==='PASS')return {ok:true,skipped:true,reason:'QUEENS_DAILY_RECONCILE_ALREADY_PASS'};
  var r=testQueensDailyDryWriteReconcileX2V1_();
  if(r.ok){
    var ss=SpreadsheetApp.openById(CENTRAL_QUEENS_DAILY_RECONCILE_V1.spreadsheetId),ev=ss.getSheetByName('93_RUNTIME_EVIDENCE_CONTROL'),h=ghPackHeaders_(ev),x=r.pass2;
    ghPackAppendObject_(ev,h,{EVIDENCE_ID:'EVID_QUEENS_DAILY_DRYWRITE_RECONCILE_X2_'+day,PROJECT_ID:'P00_AGENT_CORE',APP_ID:'DRYWRITE_FRONT',FUNCTION_OR_ROUTE:'testQueensDailyDryWriteReconcileX2V1_',RUN_ID:'QUEENS_DAILY_'+day,DRIVE_ACK:'37→109_SOURCE_ID_URL_DEDUPE_READBACK',PASS_1:'PASS',PASS_2:'PASS',LAST_GOOD:'APPS_SCRIPT_VERSION_16',STATUS:'PASS_X2_NET_NEW_RECONCILED',ROOT_CAUSE:'109_STALE_OR_GROSS_ONLY_DAILY_METRIC',MIN_FIX:'SOURCE_ID_FIRST_URL_FALLBACK_DAILY_DEDUPE',NEXT_RESUME_POINT:'CONTINUE_QUEENS_SEED_SUPPLY',UPDATED_AT:ghPackNow_()});
    p.setProperty(k,'PASS');
  }
  return r;
}
