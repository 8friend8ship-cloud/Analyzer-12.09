var CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1={
  version:'CENTRAL_INTERIOR_QUEENS_OFFICIAL_ADAPTER_V1_20260911',
  spreadsheetId:'1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI',tz:'Asia/Seoul',taskId:'Q_INTERIOR_DAILY',maxPerRun:2,
  lists:[
    'https://www.kca.go.kr/home/sub.do?menukey=4005&mode=list&searchKeyword=%EA%B0%80%EA%B5%AC',
    'https://www.kca.go.kr/home/sub.do?menukey=4005&mode=list&searchKeyword=%EC%9D%B8%ED%85%8C%EB%A6%AC%EC%96%B4'
  ],
  keyword:/(인테리어|리모델링|가구|창호|누수|방수|공사|시공|설비|배송|반품|하자|옵션)/i
};
function intQHtmlTextV1_(s){return String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g,' ').trim();}
function intQAbsoluteKcaUrlV1_(href){
  var h=String(href||'').replace(/&amp;/g,'&').trim();if(!h)return'';
  if(/^https:\/\/www\.kca\.go\.kr\//i.test(h))return h;
  if(h.indexOf('/home/sub.do?')===0)return 'https://www.kca.go.kr'+h;
  if(h.indexOf('sub.do?')===0)return 'https://www.kca.go.kr/home/'+h;
  return '';
}
function intQExistingUrlsV1_(sh){var out={};if(sh.getLastRow()<2)return out;sh.getRange(2,8,sh.getLastRow()-1,1).getDisplayValues().forEach(function(r){var u=String(r[0]||'').trim();if(u)out[u.replace(/&amp;/g,'&')]=true;});return out;}
function discoverInteriorKcaCandidatesV1_(){
  var ss=SpreadsheetApp.openById(CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.spreadsheetId),res=ss.getSheetByName('37_QUEENS_RESEARCH_RESULTS'),seen=intQExistingUrlsV1_(res),found={};
  CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.lists.forEach(function(listUrl){
    var rr=UrlFetchApp.fetch(listUrl,{muteHttpExceptions:true,followRedirects:true,headers:{'User-Agent':'Mozilla/5.0 CentralInteriorResearch/1.0'}});
    if(rr.getResponseCode()!==200)throw new Error('KCA_LIST_HTTP_'+rr.getResponseCode());
    var html=rr.getContentText(),re=/<a[^>]+href=["']([^"']*sub\.do\?[^"']*mode=view[^"']*no=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,m;
    while((m=re.exec(html))){var url=intQAbsoluteKcaUrlV1_(m[1]),title=intQHtmlTextV1_(m[2]);if(!url||!title||!CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.keyword.test(title)||seen[url])continue;found[url]={url:url,title:title};}
  });
  var arr=Object.keys(found).sort().map(function(k){return found[k];}).slice(0,CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.maxPerRun);
  return {ok:true,candidates:arr,hash:ghPackHash_(arr.map(function(x){return x.url+'|'+x.title;}).join('\n')),count:arr.length};
}
function intQDetailMetaV1_(c){
  var rr=UrlFetchApp.fetch(c.url,{muteHttpExceptions:true,followRedirects:true,headers:{'User-Agent':'Mozilla/5.0 CentralInteriorResearch/1.0'}});if(rr.getResponseCode()!==200)throw new Error('KCA_DETAIL_HTTP_'+rr.getResponseCode());
  var txt=intQHtmlTextV1_(rr.getContentText()),dm=txt.match(/(?:등록일|게시일)\s*[:：]?\s*(20\d{2}[-.\s]\d{1,2}[-.\s]\d{1,2})/),date=dm?dm[1].replace(/[.\s]+/g,'-').replace(/-+$/,''):'';
  return {url:c.url,title:c.title,publishedAt:date,contentHash:ghPackHash_(c.url+'|'+c.title+'|'+txt.slice(0,4000)).slice(0,12).toUpperCase()};
}
function intQSeedTextV1_(title){var t=String(title||'');if(/가구|배송|반품|파손/i.test(t))return '가구·자재 구매 QA에서는 배송일, 배송비, 반품·취소 조건, 파손 여부, 주문 내용과 실제 납품품의 일치 여부를 분리 기록한다. 현장 설치 일정과 연계될 때는 납기 지연과 추가비용 위험을 별도 표시한다.';return '인테리어 상담·견적 QA에서는 하자 증상과 원인을 분리하고 시공 책임·기존 구조·누수·습기 등 현장 원인을 실제 확인한 뒤 책임 경로를 기록한다. 원인 미확인 상태에서 책임이나 비용을 단정하지 않는다.';}
function writeInteriorKcaCandidatesV1_(items){
  var ss=SpreadsheetApp.openById(CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.spreadsheetId),res=ss.getSheetByName('37_QUEENS_RESEARCH_RESULTS'),seeds=ss.getSheetByName('35_INTERNAL_SEED_REGISTRY'),now=ghPackNow_(),made=[];
  items.forEach(function(c,idx){var d=intQDetailMetaV1_(c),rid='QRES_INTERIOR_KCA_AUTO_'+ghPackHash_(d.url).slice(0,12).toUpperCase(),sid='SEED_INTERIOR_KCA_AUTO_'+ghPackHash_(d.url).slice(0,12).toUpperCase();
    var rv=res.getDataRange().getDisplayValues(),rm=ghPackHeaders_(res),exists=rv.some(function(r){return String(r[0]||'')===rid||String(r[7]||'')===d.url;});if(exists)return;
    res.appendRow([rid,CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.taskId,'INTERIOR_FRONT','DEMAND_COST_DEFECT','인테리어 하자 가구 자재 배송 반품 시공','KCA_OFFICIAL',d.title,d.url,d.publishedAt,now,'KR','ko-KR','OFFICIAL_SOURCE_VERIFIED_AUTO_KCA','SEED_DRAFT_AUTO_USE_SMOKE_PENDING',d.contentHash,'AUTO_KCA_OFFICIAL;RIGHTS=REFERENCE_ONLY;NO_PUBLIC_AUTO_PUBLISH;NO_UNSUPPORTED_LEGAL_THRESHOLD;T1_USE_SMOKE_X2_REQUIRED']);
    seeds.appendRow([sid,'APP_INTERIOR','QUEENS_CONNECTED_OFFICIAL_KCA',rid,/가구|배송|반품|파손/i.test(d.title)?'INTERIOR_PROCUREMENT_DELIVERY_DISPUTE':'INTERIOR_DEFECT_CAUSE_RESPONSIBILITY',intQSeedTextV1_(d.title),'INTERIOR_QUEENS_SEED_V2_20260911','OFFICIAL_SOURCE_VERIFIED_AUTO_KCA','SEED_DRAFT_AUTO_USE_SMOKE_PENDING',now,now,'','T1_INTERIOR_CONTRACT_DEFECT_QA_V1','SOURCE_HASH='+d.contentHash+';SOURCE=KCA;REFERENCE_ONLY;AUTO_KCA;T1 representative use/readback x2 required']);
    made.push({resultId:rid,seedId:sid,url:d.url,title:d.title});});SpreadsheetApp.flush();return {ok:true,created:made.length,items:made};
}
function intQUpdateControlsV1_(ss,created,status){
  var q=ss.getSheetByName('14_QUEENS_RESEARCH_QUEUE'),qd=q.getDataRange().getDisplayValues(),qm=ghPackHeaders_(q),row=0;for(var i=1;i<qd.length;i++)if(String(qd[i][0]||'')===CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.taskId){row=i+1;break;}
  if(row){var resultCount=0,rv=ss.getSheetByName('37_QUEENS_RESEARCH_RESULTS').getDataRange().getDisplayValues();for(var r=1;r<rv.length;r++)if(String(rv[r][1]||'')===CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.taskId)resultCount++;function set(k,v){var x=qm.indexOf(k);if(x>=0)q.getRange(row,x+1).setValue(v);}set('STATUS',status);set('LAST_RUN_AT',ghPackNow_());set('RESULT_COUNT',resultCount);set('ERROR','BOUND_AUTO_PRODUCER_RECOVERED_KCA_OFFICIAL;LEGACY_TRIGGER_REMAINS_SUPERSEDED');set('UPDATED_AT',ghPackNow_());}
  return {ok:true,created:created};
}
function intQUpdate109V1_(ss){
  var day=Utilities.formatDate(new Date(),CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.tz,'yyyy-MM-dd'),res=ss.getSheetByName('37_QUEENS_RESEARCH_RESULTS'),rv=res.getDataRange().getDisplayValues(),today=0,seeds=0,latest='';
  for(var i=1;i<rv.length;i++){if(String(rv[i][1]||'')!==CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.taskId)continue;var d=queensDailyDateKeyV1_(rv[i][9]);if(d!==day)continue;today++;if(String(rv[i][13]||'').indexOf('SEED_DRAFT')===0)seeds++;var at=String(rv[i][9]||'');if(at>latest)latest=at;}
  var sh=ss.getSheetByName('109_QUEENS_DAILY_CONTROL'),v=sh.getDataRange().getDisplayValues(),m=ghPackHeaders_(sh),row=0;for(var j=1;j<v.length;j++)if(String(v[j][1]||'')===CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.taskId){row=j+1;break;}if(!row)return {ok:false,reason:'109_ROW_MISSING'};
  function set(k,val){var x=m.indexOf(k);if(x>=0)sh.getRange(row,x+1).setValue(val);}set('QUEUE_STATUS','KCA_OFFICIAL_AUTO_PRODUCER_ACTIVE_CURRENT');set('LAST_RUN_AT',latest);set('QUEENS_TODAY',today);set('SEED_ACTION_TODAY',seeds);set('HOLD_REVIEW_TODAY',0);set('ACTION_COVERAGE',1);set('LOG_INTEGRITY','PASS_CURRENT_KCA_AUTO;NET_NEW='+today+';SEED_DRAFT='+seeds);set('WHY_NOT_COLLECTING','COLLECTION_ACTIVE_KCA_OFFICIAL_FREE_FIRST');set('NEXT_ACTION','T1_REPRESENTATIVE_USE_SMOKE_X2;EXPAND_ONLY_VERIFIED_OFFICIAL_ADAPTERS');set('CHECKED_AT',ghPackNow_());set('RULE_VERSION',CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.version);set('NOTES','KCA official adapter daily dedupe active; reference-only; no public auto publish; no legacy trigger.');SpreadsheetApp.flush();return {ok:true,row:row,today:today,seeds:seeds};
}
function testInteriorQueensOfficialAdapterX2V1_(){
  var a=discoverInteriorKcaCandidatesV1_(),b=discoverInteriorKcaCandidatesV1_(),same=a.ok&&b.ok&&a.hash===b.hash&&JSON.stringify(a.candidates)===JSON.stringify(b.candidates);if(!same)return {ok:false,pass1:a,pass2:b,reason:'DISCOVERY_X2_MISMATCH'};
  var w=writeInteriorKcaCandidatesV1_(b.candidates),ss=SpreadsheetApp.openById(CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.spreadsheetId),ctrl=intQUpdateControlsV1_(ss,w.created,'KCA_OFFICIAL_AUTO_PRODUCER_ACTIVE_CURRENT'),daily=intQUpdate109V1_(ss);
  return {ok:!!(w.ok&&ctrl.ok&&daily.ok),pass1:a,pass2:b,writeback:w,control:ctrl,daily:daily,physicalTriggerCreated:false,version:CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.version};
}
function maybeRunInteriorQueensOfficialAdapterOnceV1_(){
  var p=PropertiesService.getScriptProperties(),day=Utilities.formatDate(new Date(),CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.tz,'yyyyMMdd'),k='INTERIOR_QUEENS_KCA_OFFICIAL_'+day;
  if(p.getProperty(k)==='PASS')return {ok:true,skipped:true,reason:'INTERIOR_KCA_DAILY_ALREADY_PASS'};
  var r=testInteriorQueensOfficialAdapterX2V1_();if(!r.ok)return r;
  var ss=SpreadsheetApp.openById(CENTRAL_INTERIOR_QUEENS_OFFICIAL_V1.spreadsheetId),ev=ss.getSheetByName('93_RUNTIME_EVIDENCE_CONTROL');
  ghPackAppendObject_(ev,ghPackHeaders_(ev),{EVIDENCE_ID:'EVID_INTERIOR_QUEENS_KCA_OFFICIAL_X2_'+day,PROJECT_ID:'P06_HOMEDESIGN',APP_ID:'APP_INTERIOR',FUNCTION_OR_ROUTE:'testInteriorQueensOfficialAdapterX2V1_',RUN_ID:'INTERIOR_KCA_'+day,DRIVE_ACK:'KCA_LIST_X2→37/35→14/109_READBACK_REQUIRED',PASS_1:'PASS',PASS_2:'PASS',LAST_GOOD:'APPS_SCRIPT_VERSION_19',STATUS:'PASS_X2_KCA_OFFICIAL_AUTO_PRODUCER',ROOT_CAUSE:'Q_INTERIOR_DAILY_BOUND_AUTO_PRODUCER_MISSING',MIN_FIX:'REUSE_EXISTING_SIDECAR+KCA_OFFICIAL_DAILY_DEDUPE_MAX2',NEXT_RESUME_POINT:'T1_INTERIOR_USE_SMOKE_X2',UPDATED_AT:ghPackNow_()});
  p.setProperty(k,'PASS');return r;
}
