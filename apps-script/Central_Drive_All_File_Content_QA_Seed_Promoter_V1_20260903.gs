const CAF_QA_V1_VERSION='CENTRAL_DRIVE_ALL_FILE_CONTENT_QA_SEED_PROMOTER_V1_20260903';
const CAF_QA_V1_MASTER='1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI';
const CAF_QA_V1_BATCH=15;
const CAF_QA_V1_BUDGET_MS=45000;

function runCentralDriveAllFileContentQaSeedFromFactory(forceRun){
  const force=forceRun===true,now=new Date(),props=PropertiesService.getScriptProperties(),due='CAF_QA_V1_'+Utilities.formatDate(now,'Asia/Seoul','yyyyMMddHH')+Math.floor(Number(Utilities.formatDate(now,'Asia/Seoul','m'))/10);
  if(!force&&props.getProperty('CAF_QA_V1_LAST_DUE')===due)return{ok:true,skipped:true,reason:'SAME_10M_BUCKET',version:CAF_QA_V1_VERSION};
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return{ok:true,skipped:true,reason:'LOCKED',version:CAF_QA_V1_VERSION};
  const started=Date.now();
  try{
    const ss=SpreadsheetApp.openById(CAF_QA_V1_MASTER),qr=ss.getSheetByName('37_QUEENS_RESEARCH_RESULTS'),seed=ss.getSheetByName('35_INTERNAL_SEED_REGISTRY'),cat=ss.getSheetByName('81_ALL_FILE_CATALOG'),runtime=cafV4Runtime_(ss),catIdx=cafV4CatalogIndex_(cat);if(!qr||!seed||!cat)throw new Error('CAF_QA_REQUIRED_SHEET_MISSING');
    const h=qr.getRange(1,1,1,qr.getLastColumn()).getDisplayValues()[0],hi=cafV4Header_(h),last=qr.getLastRow(),start=Math.max(2,last-5000),vals=last>=2?qr.getRange(start,1,last-start+1,h.length).getDisplayValues():[];
    let promoted=0,pending=0,failed=0,scanned=0;const runId='DRIVEQA_'+Utilities.formatDate(now,'Asia/Seoul','yyyyMMdd_HHmmss_SSS');
    for(let i=0;i<vals.length&&scanned<CAF_QA_V1_BATCH&&Date.now()-started<CAF_QA_V1_BUDGET_MS;i++){
      const r=vals[i];if(String(r[hi.QUEENS_TASK_ID]||'')!=='Q_DRIVE_ALL_FILE_AUTO')continue;const st=String(r[hi.SEED_STATUS]||'');if(!/QA_PENDING_CONTENT_EXTRACTION|CONTENT_BRIDGE_PENDING|ROUTE_PENDING/.test(st))continue;scanned++;
      const rowNo=start+i,notes=String(r[hi.NOTES]||''),fileId=cafQaField_(notes,'FILE_ID'),dataId=cafQaField_(notes,'DATA_ID'),route=cafQaField_(notes,'ROUTE'),qres=String(r[hi.RESULT_ID]||'');
      try{
        if(!fileId)throw new Error('FILE_ID_MISSING');const file=DriveApp.getFileById(fileId),catalog=cafV4CatalogRecord_(cat,catIdx,fileId),mime=String(file.getMimeType()||''),name=String(file.getName()||''),e=cafQaEvidence_(file,mime,catalog),rights=String(catalog&&catalog.RIGHTS_CLASS||'REVIEW_REQUIRED'),sens=String(catalog&&catalog.SENSITIVITY||'UNKNOWN'),rightsOk=cafQaRightsOk_(rights,sens);
        if(e.ok&&e.text&&rightsOk){
          const sid='SEED_DRIVE_'+cafV4Hash_(fileId+'|'+file.getLastUpdated().getTime()+'|CONTENT_QA_V1'),text=cafQaSeedText_(name,dataId,mime,route,e.text);
          cafV4UpsertMerge_(seed,'SEED_ID',sid,{SEED_ID:sid,APP_ID:'ALL_APPS',SOURCE_TYPE:'DRIVE_CONTENT_QA',SOURCE_IDS:'DRIVE_FILE_ID='+fileId+'|DATA_ID='+dataId+'|QRES='+qres,TOPIC_ID:'DRIVE_ALL_FILE_CONTENT',SEED_TEXT:text,INPUT_SCHEMA_VERSION:'DRIVE_CONTENT_QA_SEED_V1',QUEENS_STATUS:'CONTENT_READBACK_QA_PASS',STATUS:'SEED_READY_AUTO_ROUTE_T1',CREATED_AT:new Date().toISOString(),UPDATED_AT:new Date().toISOString(),EVIDENCE:'FILE_ID='+fileId+';DATA_ID='+dataId+';QRES='+qres+';EXTRACTION='+e.mode+';RIGHTS='+rights+';SENSITIVITY='+sens+';ROUTE='+route});
          cafV4UpsertMerge_(qr,'RESULT_ID',qres,{EVIDENCE_STATUS:'CONTENT_READBACK_QA_PASS',SEED_STATUS:'SEED_PROMOTED_CONTENT_QA_PASS',NOTES:cafV4AppendNote_(notes,'SEED_ID='+sid+';EXTRACTION='+e.mode+';CONTENT_QA=PASS')});
          cafV4CatalogUpsert_(cat,catIdx,fileId,{LINKED_FUNCTION_IDS:cafV4Pipe_(String(catalog&&catalog.LINKED_FUNCTION_IDS||''),'runCentralDriveAllFileContentQaSeedFromFactory'),REVIEW_STATE:cafQaReviewState_(catalog,'AUTO_CONTENT_QA_PASS'),NOTES:cafV4AppendNote_(String(catalog&&catalog.NOTES||''),'CONTENT_QA_SEED='+sid)});
          cafV4RuntimeWrite_(runtime,{runId,checkedAt:new Date().toISOString(),fileId,fileName:name,mimeType:mime,lastUpdated:file.getLastUpdated().toISOString(),sizeBytes:cafV4Size_(file),dataClass:String(catalog&&catalog.FILE_CLASS||''),projectId:cafQaField_(notes,'PROJECT_ID')||'P00_AGENT_CORE',queensStatus:'CONTENT_QA_PASS',seedStatus:'SEED_PROMOTED_CONTENT_QA_PASS',seedId:sid,templateRoute:cafQaField_(notes,'TEMPLATE'),bridgeRoute:route,dedupKey:fileId+'|'+file.getLastUpdated().getTime()+'|QA1',result:'SEED_PROMOTED_CONTENT_QA_PASS',ack:'ACK',driveReadback:'PASS',retryState:'READY',error:'',sourceUrl:String(r[hi.SOURCE_URL]||''),workflowId:'ORCH_DRIVE_ALL_FILE_SEED_V1',runtimeState:'CONTENT_QA_SEED_READY',notes:'QRES='+qres+';EXTRACTION='+e.mode});
          if(typeof centralPublishDataEvent==='function'){try{centralPublishDataEvent({producer_app_id:'APP_AGENT_CORE',data_stage:'SEED',entity_type:'DRIVE_CONTENT',entity_id:sid,summary:name,source_url:String(r[hi.SOURCE_URL]||''),lineage_ids:[fileId,dataId,qres,sid],consumer_scope:['ALL_APPS'],status:'READY',readback_status:'PASS',memo:route});}catch(_){}}
          promoted++;
        }else{
          const why=!e.ok?e.reason:(!rightsOk?'RIGHTS_OR_SENSITIVITY_GATE':'NO_CONTENT_TEXT');
          cafV4UpsertMerge_(qr,'RESULT_ID',qres,{EVIDENCE_STATUS:e.ok?'CONTENT_READBACK_ROUTE_QA_REQUIRED':'CONTENT_BRIDGE_REQUIRED',SEED_STATUS:'ROUTE_PENDING_'+(route||'RT_OTHER_REVIEW'),NOTES:cafV4AppendNote_(notes,'CONTENT_QA_PENDING='+why+';EXTRACTION='+e.mode)});
          cafV4RuntimeWrite_(runtime,{runId,checkedAt:new Date().toISOString(),fileId,fileName:name,mimeType:mime,lastUpdated:file.getLastUpdated().toISOString(),sizeBytes:cafV4Size_(file),dataClass:String(catalog&&catalog.FILE_CLASS||''),projectId:cafQaField_(notes,'PROJECT_ID')||'P00_AGENT_CORE',queensStatus:'CONTENT_QA_PENDING',seedStatus:'ROUTE_PENDING',seedId:'',templateRoute:cafQaField_(notes,'TEMPLATE'),bridgeRoute:route,dedupKey:fileId+'|'+file.getLastUpdated().getTime()+'|QA1',result:'CONTENT_BRIDGE_PENDING',ack:'ACK',driveReadback:'PASS',retryState:'WAIT_ROUTE_EVIDENCE',error:'',sourceUrl:String(r[hi.SOURCE_URL]||''),workflowId:'ORCH_DRIVE_ALL_FILE_SEED_V1',runtimeState:'CONTENT_QA_ROUTE_PENDING',notes:'QRES='+qres+';WHY='+why+';EXTRACTION='+e.mode});
          if(typeof centralPublishDataEvent==='function'){try{centralPublishDataEvent({producer_app_id:'APP_AGENT_CORE',data_stage:'QUEENS',entity_type:String(catalog&&catalog.FILE_CLASS||'DRIVE_FILE'),entity_id:qres,summary:name,source_url:String(r[hi.SOURCE_URL]||''),lineage_ids:[fileId,dataId,qres],consumer_scope:['ALL_APPS'],status:'ROUTE_PENDING',readback_status:'PASS',memo:(route||'RT_OTHER_REVIEW')+'|'+why});}catch(_){}}
          pending++;
        }
      }catch(err){failed++;cafV4UpsertMerge_(qr,'RESULT_ID',qres,{EVIDENCE_STATUS:'CONTENT_QA_ERROR',SEED_STATUS:'QA_PENDING_CONTENT_EXTRACTION',NOTES:cafV4AppendNote_(notes,'CONTENT_QA_ERROR='+String(err&&err.message||err).slice(0,160))});}
    }
    if(!force)props.setProperty('CAF_QA_V1_LAST_DUE',due);
    return{ok:failed===0,runId,scanned,promoted,pending,failed,version:CAF_QA_V1_VERSION};
  }finally{lock.releaseLock();}
}

function cafQaEvidence_(file,mime,catalog){try{
  if(/google-apps\.spreadsheet/.test(mime)){const ss=SpreadsheetApp.openById(file.getId()),a=[];ss.getSheets().slice(0,3).forEach(sh=>{const r=Math.min(sh.getLastRow(),20),c=Math.min(sh.getLastColumn(),10);if(r&&c)a.push('['+sh.getName()+']\n'+sh.getRange(1,1,r,c).getDisplayValues().map(x=>x.join('\t')).join('\n'));});const t=cafQaSanitize_(a.join('\n').slice(0,15000));return{ok:!!t,text:t,mode:'SHEET_SAFE_SAMPLE',reason:t?'':'EMPTY'};}
  if(/google-apps\.(document|presentation)/.test(mime)){const t=cafQaExportText_(file.getId());return{ok:!!t,text:cafQaSanitize_(t.slice(0,15000)),mode:'DRIVE_EXPORT_TEXT',reason:t?'':'EMPTY_EXPORT'};}
  if(/google-apps\.script/.test(mime)){const t=cafQaExport_(file.getId(),'application/vnd.google-apps.script+json');return{ok:!!t,text:cafQaSanitize_(t.slice(0,15000)),mode:'DRIVE_EXPORT_SCRIPT_JSON',reason:t?'':'EMPTY_EXPORT'};}
  if(/text\//.test(mime)||/json|javascript|xml|yaml/.test(mime)||/\.(txt|md|json|js|ts|tsx|gs|py|ya?ml|html|css)$/i.test(file.getName())){if(Number(cafV4Size_(file)||0)>2*1024*1024)return{ok:false,text:'',mode:'TEXT_FILE',reason:'TEXT_TOO_LARGE'};const t=String(file.getBlob().getDataAsString('UTF-8')||'');return{ok:!!t,text:cafQaSanitize_(t.slice(0,15000)),mode:'DRIVE_BLOB_TEXT',reason:t?'':'EMPTY'};}
  return{ok:false,text:'',mode:'ROUTE_SPECIFIC',reason:'SPECIALIZED_ROUTE_QA_REQUIRED'};
}catch(e){return{ok:false,text:'',mode:'EXTRACTION_ERROR',reason:String(e&&e.message||e).slice(0,160)};}}
function cafQaExportText_(id){return cafQaExport_(id,'text/plain');}
function cafQaExport_(id,mime){const url='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'/export?mimeType='+encodeURIComponent(mime),res=UrlFetchApp.fetch(url,{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});return res.getResponseCode()>=200&&res.getResponseCode()<300?res.getContentText():'';}
function cafQaSanitize_(s){s=String(s||'');s=s.replace(/AIza[0-9A-Za-z_-]{30,}/g,'[REDACTED_GOOGLE_KEY]').replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g,'[REDACTED_API_KEY]').replace(/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,'[REDACTED_GITHUB_TOKEN]').replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,'[REDACTED_SLACK_TOKEN]').replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,'[REDACTED_PRIVATE_KEY]').replace(/Authorization\s*:\s*Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,'Authorization: Bearer [REDACTED]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[REDACTED_EMAIL]').replace(/\b01[016789]-?\d{3,4}-?\d{4}\b/g,'[REDACTED_PHONE]');return s.trim();}
function cafQaRightsOk_(rights,sens){return !/REVIEW_REQUIRED|UNKNOWN|PRIVATE|SENSITIVE|MIXED|LICENSE|SOURCE_RIGHTS|AUTH|DEPENDENT|RESTRICTED/.test((String(rights||'')+' '+String(sens||'')).toUpperCase());}
function cafQaField_(notes,key){const m=String(notes||'').match(new RegExp('(?:^|;)'+key+'=([^;]+)'));return m?m[1]:'';}
function cafQaSeedText_(name,dataId,mime,route,text){return(['TITLE='+name,'DATA_ID='+dataId,'MIME='+mime,'BRIDGE_ROUTE='+route,'CONTENT_EVIDENCE:'].join('\n')+'\n'+text).slice(0,16000);}
function cafQaReviewState_(cat,next){const cur=String(cat&&cat.REVIEW_STATE||'');return /^(REVIEWED|VERIFIED)/.test(cur.toUpperCase())?cur:next;}
function testCentralDriveAllFileContentQaSeedForceX2(){const a=runCentralDriveAllFileContentQaSeedFromFactory(true),b=runCentralDriveAllFileContentQaSeedFromFactory(true);return{ok:a&&a.ok!==false&&b&&b.ok!==false,first:a,second:b,version:CAF_QA_V1_VERSION};}
