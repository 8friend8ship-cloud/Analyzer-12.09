var YT_FRONT_TREND30D_VERSION = 'YT_FRONT_TREND30D_STYLE_V1_20260908';
var YT_FRONT_TREND30D_CENTRAL_ID = '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI';
var YT_FRONT_TREND30D_SEARCH_CALL_CAP = 20;
var YT_FRONT_TREND30D_MAX_LANES = 16;
var YT_FRONT_TREND30D_RESULTS_PER_LANE = 10;
var YT_FRONT_TREND30D_VIEW_REGIME_DATE = '2026-08-24T00:00:00Z';

/** Daily logical stage. Reuses the existing processTaskQueue/unified scheduler. */
function youtubeFrontAppTrend30dDailyTick() {
  var now = new Date();
  var props = PropertiesService.getScriptProperties();
  var dateKey = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMdd');
  var doneKey = 'YT_FRONT_TREND30D_DONE_' + dateKey;
  if (props.getProperty(doneKey) === 'Y') {
    return {ok:true, skipped:true, reason:'DAILY_ALREADY_RUN', dateKey:dateKey, version:YT_FRONT_TREND30D_VERSION};
  }
  var out = youtubeFrontAppTrend30dRun_({force:false,maxLanes:YT_FRONT_TREND30D_MAX_LANES,write:true});
  if (out.ok) props.setProperty(doneKey, 'Y');
  return out;
}

function runYouTubeFrontTrend30dFromFactory() {
  return youtubeFrontAppTrend30dDailyTick();
}

/** Same-fixture real discovery x2. Pass2 should reproduce and dedupe. */
function runYouTubeFrontTrend30dForceTestX2V1() {
  var cfg = {force:true,maxLanes:2,write:true,testOnly:true};
  var a = youtubeFrontAppTrend30dRun_(cfg);
  Utilities.sleep(1200);
  var b = youtubeFrontAppTrend30dRun_(cfg);
  var sigA = frontTrendPassSignature_(a);
  var sigB = frontTrendPassSignature_(b);
  var same = !!sigA && sigA === sigB;
  return {ok:!!(a.ok && b.ok && same),x2:same?'PASS':'FAIL_DYNAMIC_OR_ROUTE',signature1:sigA,signature2:sigB,run1:a,run2:b,physicalTriggerCreated:false,version:YT_FRONT_TREND30D_VERSION};
}

function testYouTubeFrontTrend30dStaticV1() {
  var ss = SpreadsheetApp.openById(YT_FRONT_TREND30D_CENTRAL_ID);
  var need = ['39_CHANNEL_PUBLISH_MAP','62_TREND_RESEARCH_WAREHOUSE','77_TEMPLATE_EVOLUTION_FACTORY','100_FRONTAPP_PROJECT_CONTROL'];
  var missing = need.filter(function(n){return !ss.getSheetByName(n);});
  return {ok:missing.length===0,missing:missing,searchCallCap:YT_FRONT_TREND30D_SEARCH_CALL_CAP,physicalTriggerCreated:false,policy:'CACHE/URL/ID_FIRST;SEARCH_ONLY_DISCOVERY_GAP;REFERENCE_ONLY;NO_SOURCE_MEDIA_COPY',version:YT_FRONT_TREND30D_VERSION};
}

function youtubeFrontAppTrend30dRun_(opt) {
  opt = opt || {};
  var now = new Date();
  var lock = LockService.getDocumentLock() || LockService.getScriptLock();
  if (!lock.tryLock(5000)) return {ok:false,skipped:true,reason:'LOCK_BUSY',version:YT_FRONT_TREND30D_VERSION};
  try {
    var ss = SpreadsheetApp.openById(YT_FRONT_TREND30D_CENTRAL_ID);
    var trend = ss.getSheetByName('62_TREND_RESEARCH_WAREHOUSE');
    var evo = ss.getSheetByName('77_TEMPLATE_EVOLUTION_FACTORY');
    if (!trend || !evo) throw new Error('YT30D_REQUIRED_CENTRAL_SHEET_MISSING');
    var lanes = frontTrendBuildLanes_(ss);
    if (opt.testOnly) lanes = frontTrendRepresentativeLanes_(lanes);
    lanes = lanes.slice(0,Number(opt.maxLanes||YT_FRONT_TREND30D_MAX_LANES));
    var dateKey = Utilities.formatDate(now,'Asia/Seoul','yyyyMMdd');
    var publishedAfter = new Date(now.getTime()-30*24*3600*1000).toISOString();
    var existing = frontTrendRecentResearchIdSet_(trend,12000);
    var results=[],totalWritten=0,totalDup=0,totalSearch=0,totalCore=0;

    lanes.forEach(function(lane){
      var query = frontTrendQueryForLane_(lane);
      var cached = opt.force ? null : frontTrendReadCachedLane_(trend,lane,query,now);
      if (cached && cached.count >= 5) {
        results.push({laneKey:lane.key,appId:lane.appId,frontName:lane.frontName,channel:lane.channelHandle||'',query:query,ok:true,count:cached.count,written:0,duplicates:cached.count,topStyles:cached.topStyles,videoIds:cached.videoIds,source:'CENTRAL_62_CACHE',searchQueryCalls:0,coreUnits:0});
        return;
      }
      var live = frontTrendSearchYouTube_(query,publishedAfter,YT_FRONT_TREND30D_RESULTS_PER_LANE,now);
      totalSearch += Number(live.searchQueryCalls||0);
      totalCore += Number(live.coreUnits||0);
      if (!live.ok) {
        results.push({laneKey:lane.key,appId:lane.appId,query:query,ok:false,error:live.error||'YT30D_SEARCH_FAILED',source:live.source||''});
        return;
      }
      var counts={},ids=[],laneWritten=0,laneDup=0;
      live.items.forEach(function(item){
        ids.push(item.videoId);
        var style = frontTrendStyleClass_(item);
        counts[style]=(counts[style]||0)+1;
        var researchId='YT30D_'+dateKey+'_'+frontTrendSafeId_(lane.key)+'_'+item.videoId;
        if (existing[researchId]) {laneDup++;totalDup++;return;}
        if (opt.write!==false) trend.appendRow(frontTrendResearchRow_(researchId,now,lane,query,item,style));
        existing[researchId]=true;laneWritten++;totalWritten++;
      });
      var topStyles=frontTrendTopStyles_(counts,3);
      if (opt.write!==false && live.items.length) frontTrendAppendEvolutionCandidate_(evo,dateKey,lane,query,live,topStyles);
      results.push({laneKey:lane.key,appId:lane.appId,frontName:lane.frontName,channel:lane.channelHandle||'',query:query,ok:true,count:live.items.length,written:laneWritten,duplicates:laneDup,topStyles:topStyles,videoIds:ids.sort(),source:live.source,searchQueryCalls:live.searchQueryCalls||0,coreUnits:live.coreUnits||0});
    });
    return {ok:results.length>0&&results.every(function(r){return r.ok;}),degraded:results.some(function(r){return !r.ok;}),runId:'RUN_YT_FRONT_TREND30D_'+Utilities.formatDate(now,'Asia/Seoul','yyyyMMdd_HHmmss'),publishedAfter:publishedAfter,laneCount:lanes.length,totalWritten:totalWritten,duplicates:totalDup,searchQueryCalls:totalSearch,coreUnits:totalCore,quotaTelemetry:'SEPARATE_SEARCH_QUERY_CALLS_AND_CORE_UNITS',rights:'REFERENCE_ONLY_METADATA_NO_SOURCE_MEDIA_COPY',metricGuard:'PUBLIC_VIEW_POST_20260824_ONLY_FOR_RAW_VELOCITY',results:results,physicalTriggerCreated:false,version:YT_FRONT_TREND30D_VERSION};
  } catch(err) {
    return {ok:false,error:String(err&&err.message||err),physicalTriggerCreated:false,version:YT_FRONT_TREND30D_VERSION};
  } finally {lock.releaseLock();}
}

function frontTrendBuildLanes_(ss) {
  var project=ss.getSheetByName('100_FRONTAPP_PROJECT_CONTROL');
  var channel=ss.getSheetByName('39_CHANNEL_PUBLISH_MAP');
  if (!project) throw new Error('100_FRONTAPP_PROJECT_CONTROL_MISSING');
  var hints=frontTrendReadChannelHints_(channel);
  var h=project.getRange(1,1,1,Math.min(26,project.getLastColumn())).getDisplayValues()[0];
  var hm=frontTrendHeaderMap_(h),last=project.getLastRow(),lanes=[],seen={};
  if (last<2) return lanes;
  project.getRange(2,1,last-1,Math.min(26,project.getLastColumn())).getDisplayValues().forEach(function(r){
    var key=frontTrendGet_(r,hm,'FRONT_PROJECT_ID')||frontTrendGet_(r,hm,'APP_ID');
    var appId=frontTrendGet_(r,hm,'APP_ID'),name=frontTrendGet_(r,hm,'FRONT_NAME'),status=frontTrendGet_(r,hm,'STATUS');
    if (!key||!appId||!name||seen[key]||/RETIRED|DELETED|DO_NOT_USE/i.test(status)) return;
    var hint=frontTrendFindChannelHint_(hints,appId+' '+name+' '+key);
    lanes.push({key:key,appId:appId,frontName:name,status:status,contentTags:hint.contentTags||'',channelName:hint.channelName||'',channelHandle:hint.channelHandle||'',publishMode:hint.publishMode||'RESEARCH_ONLY_NO_CHANNEL',channelStatus:hint.status||''});
    seen[key]=true;
  });
  return lanes;
}

function frontTrendReadChannelHints_(sh) {
  if (!sh||sh.getLastRow()<2) return [];
  var h=sh.getRange(1,1,1,Math.min(18,sh.getLastColumn())).getDisplayValues()[0],hm=frontTrendHeaderMap_(h);
  return sh.getRange(2,1,sh.getLastRow()-1,Math.min(18,sh.getLastColumn())).getDisplayValues().map(function(r){return {domain:frontTrendGet_(r,hm,'FRONT_APP_DOMAIN'),frontAppId:frontTrendGet_(r,hm,'FRONT_APP_ID'),channelName:frontTrendGet_(r,hm,'CHANNEL_NAME'),channelHandle:frontTrendGet_(r,hm,'CHANNEL_HANDLE'),contentTags:frontTrendGet_(r,hm,'CONTENT_TAGS'),publishMode:frontTrendGet_(r,hm,'PUBLISH_MODE'),status:frontTrendGet_(r,hm,'STATUS')};});
}

function frontTrendFindChannelHint_(hints,text) {
  var t=String(text||'').toUpperCase();
  for(var i=0;i<hints.length;i++) {
    var k=(String(hints[i].frontAppId||'')+' '+String(hints[i].domain||'')).toUpperCase();
    if(k&&k.split(/[\s_;|]+/).some(function(x){return x.length>3&&t.indexOf(x)>=0;})) return hints[i];
  }
  return {};
}

function frontTrendRepresentativeLanes_(lanes) {
  var out=[];
  ['INTERIOR','FOOD'].forEach(function(w){for(var i=0;i<lanes.length;i++){var t=(lanes[i].key+' '+lanes[i].appId+' '+lanes[i].frontName).toUpperCase();if(t.indexOf(w)>=0&&out.indexOf(lanes[i])<0){out.push(lanes[i]);break;}}});
  for(var j=0;j<lanes.length&&out.length<2;j++) if(out.indexOf(lanes[j])<0) out.push(lanes[j]);
  return out;
}

function frontTrendQueryForLane_(lane) {
  var t=(lane.key+' '+lane.appId+' '+lane.frontName+' '+lane.contentTags).toUpperCase();
  if(/BIBLE|PROVERB|성경|말씀/.test(t)) return '성경 묵상 잠언 쇼츠';
  if(/TRAVEL|여행/.test(t)) return '한국 여행 브이로그 캠핑';
  if(/KFOOD|FOOD|RECIPE|먹방|도시락/.test(t)) return 'K food 레시피 먹방 도시락';
  if(/INTERIOR|HOME|인테리어|리모델/.test(t)) return '인테리어 리모델링 비포 애프터';
  if(/SECUR|STOCK|주식|투자/.test(t)) return '주식 시장 분석 설명 영상';
  if(/DRY|WRITER|STORY|작가/.test(t)) return '스토리텔링 숏폼 이야기 영상';
  if(/SHORTS|AUTO_RANK/.test(t)) return '유튜브 쇼츠 트렌드 훅 검증';
  if(/VTUBE|ANIMATION|MEDIA|NOTEBOOK/.test(t)) return 'AI video animation VTuber workflow 2026';
  if(/CONTENT|ANALYZER|AI/.test(t)) return 'AI 영상 자동화 creator workflow 2026';
  return (lane.contentTags?lane.contentTags.split(',').slice(0,3).join(' '):lane.frontName)+' 유튜브 영상';
}

function frontTrendSearchYouTube_(query,publishedAfter,limit,now) {
  var dateKey=Utilities.formatDate(now,'Asia/Seoul','yyyyMMdd'),props=PropertiesService.getScriptProperties();
  var reserved=frontTrendReserveQuota_(props,dateKey,1,0);
  if(!reserved.ok) return {ok:false,error:reserved.error,searchQueryCalls:0,coreUnits:0,source:'QUOTA_GUARD'};
  try {
    if(typeof YouTube!=='undefined'&&YouTube.Search&&YouTube.Videos) {
      var s=YouTube.Search.list('id,snippet',{q:query,type:'video',order:'viewCount',maxResults:Number(limit||10),publishedAfter:publishedAfter,regionCode:'KR',relevanceLanguage:'ko'});
      var ids=(s.items||[]).map(function(x){return x&&x.id&&x.id.videoId;}).filter(String);
      if(!ids.length) return {ok:true,items:[],source:'YOUTUBE_ADVANCED_SERVICE',searchQueryCalls:1,coreUnits:0};
      var core=frontTrendReserveQuota_(props,dateKey,0,1);
      if(!core.ok) return {ok:false,error:core.error,source:'QUOTA_GUARD',searchQueryCalls:1,coreUnits:0};
      var d=YouTube.Videos.list('id,snippet,statistics,contentDetails,status',{id:ids.join(',')});
      return {ok:true,items:frontTrendNormalizeVideoItems_(d.items||[]),source:'YOUTUBE_ADVANCED_SERVICE',searchQueryCalls:1,coreUnits:1};
    }
    return frontTrendServerProxySearch_(query,publishedAfter,limit,props,dateKey);
  } catch(err) {return {ok:false,error:'YT30D_EXCEPTION:'+String(err&&err.message||err),source:'YOUTUBE_ADVANCED_SERVICE',searchQueryCalls:1,coreUnits:0};}
}

function frontTrendServerProxySearch_(query,publishedAfter,limit,props,dateKey) {
  var base=(typeof CONTENTOS_API_AB_SERVER_PROXY_BASE!=='undefined'&&CONTENTOS_API_AB_SERVER_PROXY_BASE)?CONTENTOS_API_AB_SERVER_PROXY_BASE:'https://contents-os.com/api/youtube-proxy';
  try {
    var u=base+'?endpoint=search&part=id%2Csnippet&type=video&order=viewCount&maxResults='+encodeURIComponent(String(limit||10))+'&publishedAfter='+encodeURIComponent(publishedAfter)+'&regionCode=KR&relevanceLanguage=ko&q='+encodeURIComponent(query);
    var sr=UrlFetchApp.fetch(u,{muteHttpExceptions:true,followRedirects:true});
    if(sr.getResponseCode()<200||sr.getResponseCode()>=300) return {ok:false,error:'YT30D_PROXY_SEARCH_HTTP_'+sr.getResponseCode(),source:'SERVER_YOUTUBE_PROXY',searchQueryCalls:1,coreUnits:0};
    var sj=JSON.parse(sr.getContentText()||'{}'),ids=(sj.items||[]).map(function(x){return x&&x.id&&x.id.videoId;}).filter(String);
    if(!ids.length) return {ok:true,items:[],source:'SERVER_YOUTUBE_PROXY',searchQueryCalls:1,coreUnits:0};
    var core=frontTrendReserveQuota_(props,dateKey,0,1);
    if(!core.ok) return {ok:false,error:core.error,source:'QUOTA_GUARD',searchQueryCalls:1,coreUnits:0};
    var du=base+'?endpoint=videos&part=id%2Csnippet%2Cstatistics%2CcontentDetails%2Cstatus&id='+encodeURIComponent(ids.join(','));
    var dr=UrlFetchApp.fetch(du,{muteHttpExceptions:true,followRedirects:true});
    if(dr.getResponseCode()<200||dr.getResponseCode()>=300) return {ok:false,error:'YT30D_PROXY_VIDEOS_HTTP_'+dr.getResponseCode(),source:'SERVER_YOUTUBE_PROXY',searchQueryCalls:1,coreUnits:1};
    return {ok:true,items:frontTrendNormalizeVideoItems_((JSON.parse(dr.getContentText()||'{}').items)||[]),source:'SERVER_YOUTUBE_PROXY',searchQueryCalls:1,coreUnits:1};
  } catch(err){return {ok:false,error:'YT30D_PROXY_EXCEPTION:'+String(err&&err.message||err),source:'SERVER_YOUTUBE_PROXY',searchQueryCalls:1,coreUnits:0};}
}

/** Separate current quota buckets; never revive the legacy search+=100 accounting. */
function frontTrendReserveQuota_(props,dateKey,searchCalls,coreUnits) {
  var sk='YT_FRONT_TREND30D_SEARCH_CALLS_'+dateKey,ck='YT_FRONT_TREND30D_CORE_UNITS_'+dateKey;
  var s=Number(props.getProperty(sk)||0),c=Number(props.getProperty(ck)||0);
  if(s+searchCalls>YT_FRONT_TREND30D_SEARCH_CALL_CAP) return {ok:false,error:'SEARCH_QUERY_DAILY_CAP_REACHED',searchCalls:s,coreUnits:c};
  props.setProperty(sk,String(s+searchCalls));props.setProperty(ck,String(c+coreUnits));
  return {ok:true,searchCalls:s+searchCalls,coreUnits:c+coreUnits};
}

function frontTrendReadCachedLane_(sh,lane,query,now) {
  if(!sh||sh.getLastRow()<2) return null;
  var last=sh.getLastRow(),start=Math.max(2,last-4999);
  var rows=sh.getRange(start,1,last-start+1,30).getDisplayValues();
  var cutoff=now.getTime()-24*3600*1000,ids=[],counts={};
  for(var i=rows.length-1;i>=0;i--){
    if(String(rows[i][2])!=='YOUTUBE_DATA_API_30D'||String(rows[i][3])!==lane.frontName||String(rows[i][4])!==query) continue;
    var t=new Date(rows[i][1]).getTime(); if(!isFinite(t)||t<cutoff) continue;
    var m=String(rows[i][23]||'').match(/STYLE=([^;]+)/); if(m) counts[m[1]]=(counts[m[1]]||0)+1;
    var u=String(rows[i][10]||''); var vm=u.match(/[?&]v=([A-Za-z0-9_-]{11})/); if(vm) ids.push(vm[1]);
    if(ids.length>=YT_FRONT_TREND30D_RESULTS_PER_LANE) break;
  }
  return ids.length?{count:ids.length,videoIds:ids.sort(),topStyles:frontTrendTopStyles_(counts,3)}:null;
}

function frontTrendNormalizeVideoItems_(items) {
  return items.map(function(x){return {videoId:String(x.id||''),title:String(x.snippet&&x.snippet.title||''),description:String(x.snippet&&x.snippet.description||''),channelTitle:String(x.snippet&&x.snippet.channelTitle||''),channelId:String(x.snippet&&x.snippet.channelId||''),publishedAt:String(x.snippet&&x.snippet.publishedAt||''),viewCount:Number(x.statistics&&x.statistics.viewCount||0),likeCount:Number(x.statistics&&x.statistics.likeCount||0),commentCount:Number(x.statistics&&x.statistics.commentCount||0),durationIso:String(x.contentDetails&&x.contentDetails.duration||''),durationSec:frontTrendDurationSec_(String(x.contentDetails&&x.contentDetails.duration||'')),embeddable:!(x.status&&x.status.embeddable===false)};}).filter(function(x){return /^[A-Za-z0-9_-]{11}$/.test(x.videoId);});
}

function frontTrendStyleClass_(item) {
  var t=(item.title+' '+item.description).toLowerCase();
  if((item.durationSec&&item.durationSec<=75)||/#shorts|\bshorts\b|쇼츠/.test(t)) return 'SHORTS_HOOK_FAST_PAYOFF';
  if(/before.?after|비포.?애프터|전후|변신|makeover|setup|desk setup/.test(t)) return 'BEFORE_AFTER_TRANSFORMATION';
  if(/how to|tutorial|방법|만드는 법|레시피|recipe|가이드|guide/.test(t)) return 'TUTORIAL_STEP_BY_STEP';
  if(/routine|루틴|ambient|asmr|calm|relax|공부|수면/.test(t)) return 'ROUTINE_AMBIENT_CONTINUOUS';
  if(/behind|bts|making|process|과정|비하인드|제작기/.test(t)) return 'PROCESS_BTS';
  if(/pov|reaction|리액션|반응|challenge|챌린지/.test(t)) return 'POV_REACTION_CHALLENGE';
  if(/test|verify|검증|실험|진짜|vs\.?|비교/.test(t)) return 'VERIFY_TWIST_PAYOFF';
  if(/vlog|브이로그|trip|travel|여행|camping|캠핑/.test(t)) return 'VLOG_JOURNEY_EVENT';
  if(/bible|성경|말씀|묵상|devotional|proverb/.test(t)) return 'DEVOTIONAL_REFLECTION';
  if(/stock|market|주식|시장|분석|data|ai|automation|자동화/.test(t)) return 'EXPLAINER_DATA_EVIDENCE';
  if(/shopping|review|추천|구매|amazon|제품/.test(t)) return 'COMMERCE_REVIEW';
  if(item.durationSec>=600) return 'LONGFORM_DEEP_DIVE';
  return 'EXPLAINER_STORY';
}

function frontTrendResearchRow_(id,now,lane,query,item,style) {
  var pubMs=new Date(item.publishedAt).getTime(),age=isFinite(pubMs)?Math.max(0,(now.getTime()-pubMs)/3600000):'';
  var post=isFinite(pubMs)&&pubMs>=new Date(YT_FRONT_TREND30D_VIEW_REGIME_DATE).getTime();
  var vel=post&&age>0?Number((item.viewCount/age).toFixed(2)):'',eng=item.viewCount>0?Number(((item.likeCount+item.commentCount)/item.viewCount).toFixed(5)):'';
  var format=item.durationSec<=75?'SHORTS':(item.durationSec>=600?'LONGFORM_DEEP':'STANDARD_VIDEO');
  var signal='STYLE='+style+';FORMAT='+format+';VIEW_REGIME='+(post?'POST_20260824_PUBLIC_VIEW_V2':'PRE_OR_CROSS_REGIME_NO_RAW_VELOCITY')+';EMBEDDABLE='+item.embeddable;
  var platforms='YOUTUBE_'+format+';YOUTUBE_SHORTS;IG_REELS;TIKTOK;PINTEREST_VIDEO_TRANSFER_ONLY';
  return [id,Utilities.formatDate(now,'Asia/Seoul',"yyyy-MM-dd'T'HH:mm:ssXXX"),'YOUTUBE_DATA_API_30D',lane.frontName,query,'ko-KR','',item.title,item.channelTitle,'https://www.youtube.com/watch?v='+item.videoId,item.publishedAt,item.viewCount,item.likeCount,item.commentCount,'',age===''?'':Number(age.toFixed(2)),vel,eng,'STYLE:'+style,'NOT_FETCHED_METADATA_ONLY','','videoId='+item.videoId+';duration='+item.durationIso+';front='+lane.key+';channel='+String(lane.channelHandle||'UNMAPPED'),signal,frontTrendScore_(item,age,post),'APP_STYLE_VALIDATION_CANDIDATE;REFERENCE_ONLY;NO_SOURCE_MEDIA_COPY',lane.appId+';'+lane.key,platforms,'FRONT='+lane.key+'; validate '+style+' in VIDEO_PACK/T2_PLATFORM_STYLE; cross-platform transfer requires native platform feedback; no source asset copy.',item.viewCount>=100000?'HIGH':'MEDIUM','YT30D_METADATA_VERIFIED_REFERENCE_ONLY'];
}

function frontTrendAppendEvolutionCandidate_(sh,dateKey,lane,query,live,topStyles) {
  var id='EVOLVE_YT30D_'+dateKey+'_'+frontTrendSafeId_(lane.key);
  if(frontTrendEvolutionExists_(sh,id,5000)) return;
  sh.appendRow([id,'DAILY_FRONTAPP_YOUTUBE_LAST30D_STYLE_RESEARCH','front='+lane.key+';query='+query+';videos='+live.items.length+';source='+live.source,'published<=30d;views;engagement;duration;format;style;public-view-regime',topStyles.join('|')||'NO_DOMINANT_STYLE','cross-platform transfer not native evidence; pre-20260824 raw public-view velocity not directly comparable','VIDEO_STYLE_30D_'+frontTrendSafeId_(lane.key)+'_V1','62_TREND_RESEARCH_WAREHOUSE;YouTube metadata reference-only','SOURCE_BRANCH_ONLY_UNTIL_BOUND_X2','FrontApp_YouTube_Trend30D_20260908.gs;existing unified scheduler logical stage','searchQueryCalls separate bucket <=20/day; videos.list batch; no new key/OAuth/paid plan','same fixture x2 + exact cohort/style readback + representative downstream render x2 before ACTIVE','no source media copy; no duplicate trigger; metric-regime guard; publish/commerce remains separately gated','62/77 now; after verified runtime x2→63/75/80/93/70/76 eligible','CANDIDATE_RUNTIME_X2_PENDING',YT_FRONT_TREND30D_VERSION,'CENTRAL_AGENT','channel='+String(lane.channelHandle||'UNMAPPED')+';publishMode='+lane.publishMode+';rights=REFERENCE_ONLY']);
}

function frontTrendEvolutionExists_(sh,id,limit){if(!sh||sh.getLastRow()<2)return false;var last=sh.getLastRow(),start=Math.max(2,last-Number(limit||5000)+1);return sh.getRange(start,1,last-start+1,1).getDisplayValues().some(function(r){return String(r[0])===id;});}
function frontTrendRecentResearchIdSet_(sh,limit){var out={};if(!sh||sh.getLastRow()<2)return out;var last=sh.getLastRow(),start=Math.max(2,last-Number(limit||12000)+1);sh.getRange(start,1,last-start+1,1).getDisplayValues().forEach(function(r){if(r[0])out[String(r[0])]=true;});return out;}
function frontTrendTopStyles_(counts,limit){return Object.keys(counts).sort(function(a,b){return counts[b]-counts[a]||a.localeCompare(b);}).slice(0,limit||3).map(function(k){return k+':'+counts[k];});}
function frontTrendScore_(item,age,post){var v=item.viewCount>0?Math.min(45,Math.log(item.viewCount+1)/Math.LN10*9):0,e=item.viewCount>0?(item.likeCount+item.commentCount)/item.viewCount:0,r=age===''?5:Math.max(0,25-Math.min(25,Number(age)/720*25));return Math.max(0,Math.min(100,Math.round(v+Math.min(30,e*500)+r+(post?0:-5))));}
function frontTrendDurationSec_(iso){var m=String(iso||'').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);return m?Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0):0;}
function frontTrendPassSignature_(out){if(!out||!out.results)return '';return out.results.filter(function(r){return r.ok;}).map(function(r){return r.laneKey+':'+(r.videoIds||[]).join(',')+':'+(r.topStyles||[]).join(',');}).sort().join('||');}
function frontTrendHeaderMap_(h){var m={};h.forEach(function(v,i){m[String(v||'').trim().toUpperCase()]=i;});return m;}
function frontTrendGet_(r,hm,n){var i=hm[String(n||'').toUpperCase()];return i===undefined?'':String(r[i]||'').trim();}
function frontTrendSafeId_(s){return String(s||'UNKNOWN').toUpperCase().replace(/[^A-Z0-9_]+/g,'_').slice(0,48);}
