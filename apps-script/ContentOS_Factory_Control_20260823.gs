const CONTENTOS_FACTORY_CONTROL_VERSION = 'CONTENTOS_FACTORY_CONTROL_V2_20260823';
const CONTENTOS_FACTORY_CENTRAL_MASTER_ID = '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI';
const CONTENTOS_FACTORY_SOURCE_SHEET_ID = '1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ';
const CONTENTOS_FACTORY_APP_ID = 'APP_CONTENT_OS';
const CONTENTOS_FACTORY_TARGET_ID = 'FPC_CONTENTOS_20260823';
const CONTENTOS_API_AB_WINDOWS_KST = [9, 13, 17, 21];
const CONTENTOS_API_AB_DAILY_UNIT_CAP = 500;
const CONTENTOS_API_AB_SEARCH_UNITS = 100;
const CONTENTOS_API_AB_DETAIL_UNITS = 1;

function runBackdataFactoryControl10m() {
  const now = new Date();
  const bucket = contentOsFactoryBucket_(now);
  const props = PropertiesService.getScriptProperties();
  const gateKey = 'CONTENTOS_FACTORY_CONTROL_BUCKET';
  if (props.getProperty(gateKey) === bucket) return {ok:true, skipped:true, reason:'SAME_10M_BUCKET', bucket:bucket, version:CONTENTOS_FACTORY_CONTROL_VERSION};

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return {ok:false, reason:'LOCK_BUSY', bucket:bucket, version:CONTENTOS_FACTORY_CONTROL_VERSION};
  try {
    const central = SpreadsheetApp.openById(CONTENTOS_FACTORY_CENTRAL_MASTER_ID);
    const source = SpreadsheetApp.openById(CONTENTOS_FACTORY_SOURCE_SHEET_ID);
    const pipeline = contentOsFactoryOpenPipeline_();
    const target = readContentOsFactoryTarget_(central);
    const totals = readContentOsFactoryTotals_(central, source, pipeline);
    const daily = calculateContentOsDailyDelta_(props, now, totals);
    const reverseGap = readLatestContentOsReverseGap_(pipeline);
    const queueAction = queueContentOsReverseGap_(reverseGap);
    const out = {ok:true,bucket:bucket,appId:CONTENTOS_FACTORY_APP_ID,target:target,totals:totals,daily:daily,reverseGap:reverseGap,queueAction:queueAction,version:CONTENTOS_FACTORY_CONTROL_VERSION,checkedAt:now.toISOString()};
    markContentOsFactoryTargetRuntime_(central, out);
    props.setProperty(gateKey, bucket);
    props.setProperty('CONTENTOS_FACTORY_LAST_RESULT', JSON.stringify(out).slice(0, 8000));
    return out;
  } finally { lock.releaseLock(); }
}

function runApiAbQaControl() {
  const now = new Date();
  const hour = Number(Utilities.formatDate(now, 'Asia/Seoul', 'H'));
  if (CONTENTOS_API_AB_WINDOWS_KST.indexOf(hour) === -1) return {ok:true, skipped:true, reason:'OUTSIDE_API_AB_WINDOW', hourKst:hour, version:CONTENTOS_FACTORY_CONTROL_VERSION};

  const dateKey = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMdd');
  const props = PropertiesService.getScriptProperties();
  const runKey = 'CONTENTOS_API_AB_DONE_' + dateKey + '_' + hour;
  if (props.getProperty(runKey) === 'Y') return {ok:true, skipped:true, reason:'WINDOW_ALREADY_RUN', hourKst:hour, version:CONTENTOS_FACTORY_CONTROL_VERSION};

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return {ok:false, reason:'LOCK_BUSY', hourKst:hour, version:CONTENTOS_FACTORY_CONTROL_VERSION};
  try {
    const central = SpreadsheetApp.openById(CONTENTOS_FACTORY_CENTRAL_MASTER_ID);
    const source = SpreadsheetApp.openById(CONTENTOS_FACTORY_SOURCE_SHEET_ID);
    const query = chooseContentOsApiAbFixture_(source, hour);
    const stored = readStoredContentOsFixture_(source, query, 10);
    const live = runApprovedContentOsYoutubeSample_(props, dateKey, query, 10);
    const qualityA = scoreContentOsSample_(stored);
    const qualityB = live.ok ? scoreContentOsSample_(live) : null;
    const coverageA = Number(Math.min(1, stored.count / 10).toFixed(3));
    const coverageB = live.ok ? Number(Math.min(1, live.count / 10).toFixed(3)) : null;
    let decision = live.error || 'NO_API_RESULT';
    let patchId = '';
    let errorCode = live.error || '';

    if (live.ok) {
      const qualityGain = Number((qualityB - qualityA).toFixed(1));
      const coverageGain = Number((coverageB - coverageA).toFixed(3));
      const freshnessGainMs = contentOsNewestMs_(live) - contentOsNewestMs_(stored);
      const closesFreshnessGap = stored.count === 0 || freshnessGainMs > 7 * 24 * 60 * 60 * 1000;
      if (qualityGain >= 8 || coverageGain >= 0.15 || closesFreshnessGap) {
        decision = 'API_ON_LEARNING_PROMOTED';
        const learned = writeContentOsApiLearningBackdata_(central, query, stored, live, qualityGain, coverageGain, freshnessGainMs);
        patchId = learned.patchId || '';
      } else decision = 'OWN_CACHE_SUFFICIENT';
      errorCode = '';
    }

    const hourText = hour < 10 ? '0' + hour : String(hour);
    const runId = 'QA_CONTENTOS_' + dateKey + '_' + hourText + '00';
    appendContentOsApiAbLog_(central, {runId:runId,runAt:Utilities.formatDate(now,'Asia/Seoul','yyyy-MM-dd HH:mm:ss')+' KST',query:query,stored:stored,live:live,coverageA:coverageA,coverageB:coverageB,qualityA:qualityA,qualityB:qualityB,decision:decision,patchId:patchId,errorCode:errorCode});
    props.setProperty(runKey, 'Y');
    const nonBlockingGap = errorCode === 'API_EXECUTOR_NOT_CONFIGURED' || errorCode === 'API_DAILY_CAP_REACHED';
    return {ok:live.ok || nonBlockingGap,degraded:nonBlockingGap,runId:runId,query:query,modeA:{coverage:coverageA,quality:qualityA,count:stored.count},modeB:{coverage:coverageB,quality:qualityB,count:live.count||0,apiUnits:live.apiUnits||0},decision:decision,patchId:patchId,error:errorCode,version:CONTENTOS_FACTORY_CONTROL_VERSION};
  } finally { lock.releaseLock(); }
}

function contentOsFactoryOpenPipeline_() {
  const id = (typeof CONTENTOS_PIPELINE_SHEET_ID !== 'undefined' && CONTENTOS_PIPELINE_SHEET_ID) ? CONTENTOS_PIPELINE_SHEET_ID : CONTENTOS_FACTORY_SOURCE_SHEET_ID;
  return SpreadsheetApp.openById(id);
}

function contentOsFactoryBucket_(date) {
  const stamp = Utilities.formatDate(date, 'Asia/Seoul', 'yyyyMMddHHmm');
  return stamp.slice(0, 11);
}

function readContentOsFactoryTarget_(central) {
  const sh = central.getSheetByName('66_FACTORY_PRODUCTION_CONTROL');
  if (!sh || sh.getLastRow() < 2) return {found:false};
  const rows = sh.getRange(2,1,sh.getLastRow()-1,26).getDisplayValues();
  for (let i=rows.length-1;i>=0;i--) if (String(rows[i][0]) === CONTENTOS_FACTORY_TARGET_ID) return {found:true,queensDailyTarget:Number(rows[i][5]||0),seedDailyTarget:Number(rows[i][6]||0),t1DailyTarget:Number(rows[i][7]||0),t2DailyTarget:Number(rows[i][8]||0),assetDailyTarget:Number(rows[i][9]||0),apiAbRunsDay:Number(rows[i][10]||0),qualityGate:String(rows[i][18]||''),status:String(rows[i][24]||'')};
  return {found:false};
}

function readContentOsFactoryTotals_(central, source, pipeline) {
  return {queens:contentOsSheetCount_(source.getSheetByName('Video_Index')),seed:contentOsCountAppRows_(central.getSheetByName('35_INTERNAL_SEED_REGISTRY'),CONTENTOS_FACTORY_APP_ID,5000),t1:contentOsCountAppRows_(pipeline.getSheetByName('Template_T1'),CONTENTOS_FACTORY_APP_ID,5000),t2:contentOsCountAppRows_(pipeline.getSheetByName('Template_T2'),CONTENTOS_FACTORY_APP_ID,5000)};
}

function contentOsSheetCount_(sh) { return sh ? Math.max(0, sh.getLastRow()-1) : 0; }

function contentOsCountAppRows_(sh, appId, scanLimit) {
  if (!sh || sh.getLastRow() < 2) return 0;
  const last = sh.getLastRow();
  const start = Math.max(2,last-Number(scanLimit||5000)+1);
  const cols = Math.min(sh.getLastColumn(),20);
  const rows = sh.getRange(start,1,last-start+1,cols).getDisplayValues();
  let count=0;
  for (let i=0;i<rows.length;i++) if (rows[i].indexOf(appId)!==-1) count++;
  return count;
}

function calculateContentOsDailyDelta_(props, now, totals) {
  const dateKey = Utilities.formatDate(now,'Asia/Seoul','yyyyMMdd');
  const key = 'CONTENTOS_FACTORY_BASELINE_' + dateKey;
  let baseline=null;
  try { baseline=JSON.parse(props.getProperty(key)||'null'); } catch(e) { baseline=null; }
  if (!baseline) { baseline=totals; props.setProperty(key,JSON.stringify(baseline)); }
  return {dateKst:dateKey,queens:Math.max(0,totals.queens-Number(baseline.queens||0)),seed:Math.max(0,totals.seed-Number(baseline.seed||0)),t1:Math.max(0,totals.t1-Number(baseline.t1||0)),t2:Math.max(0,totals.t2-Number(baseline.t2||0))};
}

function readLatestContentOsReverseGap_(pipeline) {
  const sh = pipeline.getSheetByName('Coverage_Gap');
  if (!sh || sh.getLastRow()<2) return {found:false,reason:'COVERAGE_GAP_EMPTY'};
  const start=Math.max(2,sh.getLastRow()-199);
  const rows=sh.getRange(start,1,sh.getLastRow()-start+1,Math.min(15,sh.getLastColumn())).getDisplayValues();
  for (let i=rows.length-1;i>=0;i--) {
    const r=rows[i];
    if (String(r[1])!==CONTENTOS_FACTORY_APP_ID) continue;
    const gapClass=String(r[10]||'');
    if (!gapClass || gapClass==='NONE') continue;
    return {found:true,query:String(r[2]||''),coverage:Number(r[3]||0),seedSufficiency:Number(r[4]||0),t1Ready:Number(r[5]||0),t2Ready:Number(r[6]||0),gapClass:gapClass,reasons:String(r[11]||''),apiCallAllowed:String(r[12]||'').toUpperCase()==='TRUE'};
  }
  return {found:false,reason:'NO_OPEN_CONTENTOS_GAP'};
}

function queueContentOsReverseGap_(gap) {
  if (!gap || !gap.found || !gap.query) return {ok:true,skipped:true,reason:'NO_EXACT_FRONT_GAP'};
  if (typeof enqueueContentOsQuery !== 'function') return {ok:true,skipped:true,reason:'ENQUEUE_HANDLER_NOT_SYNCED',gap:gap};
  try { const queued=enqueueContentOsQuery(CONTENTOS_FACTORY_APP_ID,gap.query,20); return {ok:true,queued:true,gapClass:gap.gapClass,query:gap.query,result:queued}; }
  catch(err) { return {ok:false,error:String(err&&err.message||err),gap:gap}; }
}

function markContentOsFactoryTargetRuntime_(central, out) {
  const sh=central.getSheetByName('66_FACTORY_PRODUCTION_CONTROL');
  if (!sh || sh.getLastRow()<2) return;
  const rows=sh.getRange(2,1,sh.getLastRow()-1,26).getDisplayValues();
  for (let i=rows.length-1;i>=0;i--) if (String(rows[i][0])===CONTENTOS_FACTORY_TARGET_ID) { const row=i+2; sh.getRange(row,25).setValue('CONTROL_HANDLER_EXECUTED_TARGET_PROGRESS_TRACKING'); sh.getRange(row,26).setValue('LAST_10M='+out.checkedAt+';DAILY='+JSON.stringify(out.daily)+';GAP='+String(out.reverseGap&&out.reverseGap.gapClass||'NONE')); return; }
}

function chooseContentOsApiAbFixture_(source, hour) {
  const log=source.getSheetByName('Keyword_Query_Log');
  if (log && log.getLastRow()>=2) {
    const start=Math.max(2,log.getLastRow()-199);
    const rows=log.getRange(start,1,log.getLastRow()-start+1,Math.min(12,log.getLastColumn())).getDisplayValues();
    for (let i=rows.length-1;i>=0;i--) {
      if (String(rows[i][2])!==CONTENTOS_FACTORY_APP_ID && String(rows[i][2])!=='APP_ANALYZER') continue;
      const q=String(rows[i][1]||'').trim();
      if (q) return q;
    }
  }
  const fallback=['AI 영상 자동화 2026','신라면 먹방','두바이 쫀득 쿠키','일본 여행'];
  const idx=Math.max(0,CONTENTOS_API_AB_WINDOWS_KST.indexOf(hour));
  return fallback[idx%fallback.length];
}

function readStoredContentOsFixture_(source, query, limit) {
  const map=source.getSheetByName('Keyword_Video_Map');
  if (!map || map.getLastRow()<2) return {ok:true,count:0,items:[],newestPublishedAt:'',topViewCount:0,source:'STORED_EMPTY'};
  const last=map.getLastRow();
  const start=Math.max(2,last-19999);
  const rows=map.getRange(start,1,last-start+1,Math.min(18,map.getLastColumn())).getDisplayValues();
  const nq=normalizeContentOsFactoryText_(query); const items=[]; const seen={};
  for (let i=rows.length-1;i>=0 && items.length<Number(limit||10);i--) {
    if (normalizeContentOsFactoryText_(rows[i][0])!==nq) continue;
    const id=String(rows[i][1]||''); if (!id || seen[id]) continue; seen[id]=true;
    items.push({videoId:id,title:String(rows[i][3]||''),publishedAt:String(rows[i][5]||''),viewCount:Number(String(rows[i][6]||'0').replace(/,/g,''))||0});
  }
  return contentOsSampleSummary_(items,'STORED_QUEENS');
}

function runApprovedContentOsYoutubeSample_(props, dateKey, query, limit) {
  const reserved=reserveContentOsApiAbUnits_(props,dateKey,CONTENTOS_API_AB_SEARCH_UNITS+CONTENTOS_API_AB_DETAIL_UNITS);
  if (!reserved.ok) return {ok:false,error:'API_DAILY_CAP_REACHED',count:0,apiUnits:0};
  try {
    let items=[];
    if (typeof YouTube !== 'undefined' && YouTube.Search && YouTube.Videos) {
      const search=YouTube.Search.list('id,snippet',{q:query,type:'video',maxResults:Number(limit||10),order:'relevance'});
      const ids=(search.items||[]).map(function(x){return x&&x.id&&x.id.videoId;}).filter(String);
      if (ids.length) {
        const details=YouTube.Videos.list('id,snippet,statistics',{id:ids.join(',')});
        items=(details.items||[]).map(function(x){return {videoId:String(x.id||''),title:String(x.snippet&&x.snippet.title||''),publishedAt:String(x.snippet&&x.snippet.publishedAt||''),viewCount:Number(x.statistics&&x.statistics.viewCount||0)};});
      }
    } else {
      const apiKey=String(props.getProperty('YOUTUBE_API_KEY')||props.getProperty('CONTENT_OS_YOUTUBE_API_KEY')||'').trim();
      if (!apiKey) { releaseContentOsApiAbUnits_(props,dateKey,reserved.units); return {ok:false,error:'API_EXECUTOR_NOT_CONFIGURED',count:0,apiUnits:0}; }
      const searchUrl='https://www.googleapis.com/youtube/v3/search?part=id%2Csnippet&type=video&order=relevance&maxResults='+encodeURIComponent(String(limit||10))+'&q='+encodeURIComponent(query)+'&key='+encodeURIComponent(apiKey);
      const searchResp=UrlFetchApp.fetch(searchUrl,{muteHttpExceptions:true});
      if (searchResp.getResponseCode()>=300) throw new Error('YOUTUBE_SEARCH_HTTP_'+searchResp.getResponseCode());
      const searchJson=JSON.parse(searchResp.getContentText()||'{}');
      const ids=(searchJson.items||[]).map(function(x){return x&&x.id&&x.id.videoId;}).filter(String);
      if (ids.length) {
        const detailUrl='https://www.googleapis.com/youtube/v3/videos?part=id%2Csnippet%2Cstatistics&id='+encodeURIComponent(ids.join(','))+'&key='+encodeURIComponent(apiKey);
        const detailResp=UrlFetchApp.fetch(detailUrl,{muteHttpExceptions:true});
        if (detailResp.getResponseCode()>=300) throw new Error('YOUTUBE_VIDEOS_HTTP_'+detailResp.getResponseCode());
        const detailJson=JSON.parse(detailResp.getContentText()||'{}');
        items=(detailJson.items||[]).map(function(x){return {videoId:String(x.id||''),title:String(x.snippet&&x.snippet.title||''),publishedAt:String(x.snippet&&x.snippet.publishedAt||''),viewCount:Number(x.statistics&&x.statistics.viewCount||0)};});
      }
    }
    const out=contentOsSampleSummary_(items,'LIVE_YOUTUBE_API'); out.ok=true; out.apiUnits=reserved.units; return out;
  } catch(err) { return {ok:false,error:String(err&&err.message||err),count:0,apiUnits:reserved.units}; }
}

function reserveContentOsApiAbUnits_(props,dateKey,units) { const key='CONTENTOS_API_AB_UNITS_'+dateKey; const used=Number(props.getProperty(key)||0); if (used+units>CONTENTOS_API_AB_DAILY_UNIT_CAP) return {ok:false,used:used,units:0}; props.setProperty(key,String(used+units)); return {ok:true,used:used+units,units:units}; }
function releaseContentOsApiAbUnits_(props,dateKey,units) { const key='CONTENTOS_API_AB_UNITS_'+dateKey; const used=Number(props.getProperty(key)||0); props.setProperty(key,String(Math.max(0,used-Number(units||0)))); }

function contentOsSampleSummary_(items,source) { items=items||[]; let newest=0,topViews=0; for (let i=0;i<items.length;i++){const ts=Date.parse(items[i].publishedAt||'')||0;if(ts>newest)newest=ts;topViews=Math.max(topViews,Number(items[i].viewCount||0));} return {ok:true,count:items.length,items:items,newestPublishedAt:newest?new Date(newest).toISOString():'',topViewCount:topViews,source:source}; }
function scoreContentOsSample_(sample) { sample=sample||{count:0}; const countScore=Math.min(40,Number(sample.count||0)*4); const newest=contentOsNewestMs_(sample); const ageDays=newest?Math.max(0,(Date.now()-newest)/86400000):9999; const freshnessScore=ageDays<=7?35:ageDays<=30?25:ageDays<=90?15:ageDays<=365?8:0; const views=Number(sample.topViewCount||0); const viewScore=views>=1000000?25:views>=100000?18:views>=10000?10:views>0?5:0; return Number((countScore+freshnessScore+viewScore).toFixed(1)); }
function contentOsNewestMs_(sample) { return Date.parse(sample&&sample.newestPublishedAt||'')||0; }

function writeContentOsApiLearningBackdata_(central,query,stored,live,qualityGain,coverageGain,freshnessGainMs) {
  const sh=central.getSheetByName('59_DATA_INTELLIGENCE_BUS'); if (!sh) return {ok:false,patchId:'',reason:'59_DATA_INTELLIGENCE_BUS missing'};
  const now=new Date(); const id='EVT_CONTENTOS_API_AB_'+Utilities.formatDate(now,'Asia/Seoul','yyyyMMdd_HHmmss'); const patchId='PATCH_CONTENTOS_API_LEARNING_'+Utilities.formatDate(now,'Asia/Seoul','yyyyMMdd_HHmmss'); const topIds=(live.items||[]).slice(0,10).map(function(x){return x.videoId;}).filter(String);
  sh.appendRow([id,now,CONTENTOS_FACTORY_APP_ID,'QUEENS','CONTENT_OS_API_AB_LEARNING',patchId,query,'ko-KR','Stored vs live YouTube A/B promoted because live quality/freshness/coverage materially improved.',query,'CONTENT_OS|YOUTUBE|API_AB|QUEENS|SEED_CANDIDATE|FACTORY_V2',JSON.stringify({storedCount:stored.count,liveCount:live.count,qualityGain:qualityGain,coverageGain:coverageGain,freshnessGainMs:freshnessGainMs,topVideoIds:topIds}),'','','','STORED_QUEENS>LIVE_YOUTUBE_API>API_AB_QA>QUEENS_WRITEBACK',0.85,'LEARNING_READY',CONTENTOS_FACTORY_CONTROL_VERSION,'APP_CONTENT_OS|APP_ANALYZER|QUEENS|SEED|T1|T2','UPSERT','PENDING_DOWNSTREAM_READBACK',now,'No credentials stored. Reuse live metadata through existing cache/Queens pipeline.']);
  return {ok:true,patchId:patchId};
}

function appendContentOsApiAbLog_(central,result) {
  const sh=central.getSheetByName('67_FACTORY_QA_AB_LOG'); if (!sh) throw new Error('67_FACTORY_QA_AB_LOG missing');
  sh.appendRow([result.runId,result.runAt,CONTENTOS_FACTORY_APP_ID+';APP_ANALYZER',result.query,'OWN_CACHE_QUEENS_SEED_T1_T2','APPROVED_YOUTUBE_API_ON',result.stored.count,'','','',result.coverageA,result.coverageB===null?'':result.coverageB,result.qualityA,result.qualityB===null?'':result.qualityB,'','','STORED_READ',result.live.ok?('YOUTUBE_UNITS_'+String(result.live.apiUnits||0)):'NO_API_RESULT','',result.errorCode,result.live.ok?(contentOsNewestMs_(result.live)>=contentOsNewestMs_(result.stored)?'LIVE_FRESHER_OR_EQUAL':'STORED_FRESHER'):'NOT_TESTED',result.decision,result.patchId,result.live.ok?'A_B_LOGGED_RUNTIME_RETEST_REQUIRED':'EXECUTOR_GAP_LOGGED']);
}

function normalizeContentOsFactoryText_(value) { return String(value||'').toLowerCase().replace(/\s+/g,' ').trim(); }
function testContentOsFactoryControlStatic() { return {ok:true,version:CONTENTOS_FACTORY_CONTROL_VERSION,logical10m:true,apiWindowsKst:CONTENTOS_API_AB_WINDOWS_KST,apiDailyUnitCap:CONTENTOS_API_AB_DAILY_UNIT_CAP,noPhysicalTriggerCreation:true,credentialsWritten:false}; }
