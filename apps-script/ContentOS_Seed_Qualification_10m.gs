const CONTENTOS_SEED_QUAL_VERSION = 'CONTENTOS_SEED_QUAL_V1_20260821';
const CONTENTOS_SEED_QUAL_SOURCE_ID = '1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ';
const CONTENTOS_SEED_QUAL_CENTRAL_ID = '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI';

function contentOsSeedQualification10mTick() {
  const now = new Date();
  const minute = Number(Utilities.formatDate(now, 'Asia/Seoul', 'm'));
  if (minute % 10 !== 0 && minute % 10 !== 1) {
    return {ok:true, skipped:true, reason:'NOT_10_MINUTE_BUCKET', minute:minute, version:CONTENTOS_SEED_QUAL_VERSION};
  }
  const bucket = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMdd_HH') + '_' + Math.floor(minute / 10);
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('CONTENTOS_SEED_QUAL_LAST_BUCKET') === bucket) {
    return {ok:true, skipped:true, reason:'ALREADY_RAN_BUCKET', bucket:bucket, version:CONTENTOS_SEED_QUAL_VERSION};
  }
  props.setProperty('CONTENTOS_SEED_QUAL_LAST_BUCKET', bucket);

  const bridge = (typeof contentOsQueensBridgeTick === 'function') ? contentOsQueensBridgeTick() : {ok:false, reason:'BRIDGE_NOT_SYNCED'};
  const result = qualifyAllInvestigatedKeywordsForSeed_();
  return {ok:true, bucket:bucket, bridge:bridge, qualification:result, version:CONTENTOS_SEED_QUAL_VERSION};
}

function qualifyAllInvestigatedKeywordsForSeed_() {
  const sourceSs = SpreadsheetApp.openById(CONTENTOS_SEED_QUAL_SOURCE_ID);
  const centralSs = SpreadsheetApp.openById(CONTENTOS_SEED_QUAL_CENTRAL_ID);
  const qlog = sourceSs.getSheetByName('Keyword_Query_Log');
  const map = sourceSs.getSheetByName('Keyword_Video_Map');
  const rank = sourceSs.getSheetByName('Keyword_Rank');
  const seed = centralSs.getSheetByName('35_INTERNAL_SEED_REGISTRY');
  if (!qlog || !map || !rank || !seed) throw new Error('Seed qualification required sheet missing');

  const last = qlog.getLastRow();
  if (last < 2) return {scanned:0, passed:0, pending:0, refreshed:0, rows:[]};
  const start = Math.max(2, last - 4999);
  const rows = qlog.getRange(start,1,last-start+1,12).getDisplayValues();
  let scanned=0, passed=0, pending=0, refreshed=0;
  const out=[];

  for (let i=rows.length-1; i>=0 && scanned<100; i--) {
    const r=rows[i];
    if (String(r[2]) !== 'APP_CONTENT_OS' && String(r[2]) !== 'APP_ANALYZER') continue;
    const query=String(r[1]||'').trim();
    if (!query) continue;
    scanned++;
    const expanded=parseExpandedKeywords_(query, r[6]);
    const qa=evaluateSeedSufficiency_(qlog, map, rank, start+i, r, expanded);
    if (qa.pass) {
      const promoted=upsertQualifiedSeed_(seed, query, r[0], expanded, qa);
      passed++;
      out.push({query:query,status:'SEED_PASS',score:qa.score,seedId:promoted.seedId,reasons:qa.reasons});
    } else {
      pending++;
      if (String(r[10]).toUpperCase() !== 'Y') {
        qlog.getRange(start+i,11).setValue('Y');
        refreshed++;
      }
      out.push({query:query,status:'RESEARCH_REQUIRED',score:qa.score,reasons:qa.reasons});
    }
  }
  return {scanned:scanned,passed:passed,pending:pending,refreshed:refreshed,rows:out,version:CONTENTOS_SEED_QUAL_VERSION};
}

function evaluateSeedSufficiency_(qlog,map,rank,rowIndex,qrow,expanded) {
  const resultCount=Number(qrow[4]||0);
  const needsRefresh=String(qrow[10]||'').toUpperCase();
  const searchedAt=parseDateSafe_(qrow[8]);
  const ageHours=searchedAt ? (Date.now()-searchedAt.getTime())/3600000 : 9999;
  const mapHits=findSeedQualMapHits_(map,expanded,20);
  const rankHit=findSeedQualRankHit_(rank,expanded);
  const hasDerived=expanded.length>=2;
  const hasQtag=String(qrow[7]||'').trim().length>0;
  const hasSummary=mapHits.some(h=>String(h.summary||'').trim().length>0);
  const hasLineage=mapHits.every(h=>h.videoId && h.url);

  let score=0; const reasons=[];
  if (hasDerived) score+=15; else reasons.push('EXPANSION_INSUFFICIENT');
  if (resultCount>0) score+=20; else reasons.push('NO_RESULT_COUNT');
  if (mapHits.length>=2) score+=20; else if (mapHits.length===1) {score+=10; reasons.push('MAP_ONLY_ONE');} else reasons.push('NO_MAP_READBACK');
  if (rankHit) score+=15; else reasons.push('NO_RANK_SIGNAL');
  if (ageHours<=24) score+=10; else if (ageHours<=168) score+=5; else reasons.push('STALE_SEARCH');
  if (hasQtag) score+=5; else reasons.push('NO_QTAG');
  if (hasSummary) score+=5; else reasons.push('NO_SUMMARY');
  if (hasLineage && mapHits.length>0) score+=10; else reasons.push('SOURCE_LINEAGE_INCOMPLETE');
  if (needsRefresh==='Y') reasons.push('REFRESH_PENDING');

  const internalHit = String(qrow[3]||'').indexOf('INTERNAL_') !== -1 && resultCount>0;
  const pass = internalHit ? (score>=45) : (score>=70 && resultCount>0 && mapHits.length>0 && needsRefresh!=='Y');
  return {pass:pass,score:score,resultCount:resultCount,mapHits:mapHits,rankHit:rankHit,ageHours:ageHours,reasons:reasons,internalHit:internalHit};
}

function parseExpandedKeywords_(query,derived) {
  const out=[];
  const add=v=>{v=String(v||'').trim(); if(v && out.indexOf(v)===-1) out.push(v);};
  add(query);
  String(derived||'').split('|').forEach(add);
  if (typeof expandContentOsQueries_ === 'function') expandContentOsQueries_(query).forEach(add);
  return out.slice(0,20);
}

function findSeedQualMapHits_(sh,queries,limit) {
  const last=sh.getLastRow(); if(last<2) return [];
  const start=Math.max(2,last-19999);
  const rows=sh.getRange(start,1,last-start+1,18).getDisplayValues();
  const targets={}; (queries||[]).forEach(q=>targets[normalizeSeedQual_(q)]=true);
  const out=[],seen={};
  for(let i=rows.length-1;i>=0 && out.length<limit;i--){
    if(!targets[normalizeSeedQual_(rows[i][0])]) continue;
    const id=String(rows[i][1]||''); if(!id||seen[id]) continue; seen[id]=true;
    out.push({row:start+i,keyword:rows[i][0],videoId:id,url:rows[i][2],title:rows[i][3],channel:rows[i][4],publishedAt:rows[i][5],views:rows[i][6],qtag:rows[i][14],summary:rows[i][15]});
  }
  return out;
}

function findSeedQualRankHit_(sh,queries) {
  const last=sh.getLastRow(); if(last<2) return null;
  const start=Math.max(2,last-4999);
  const rows=sh.getRange(start,1,last-start+1,20).getDisplayValues();
  const targets={}; (queries||[]).forEach(q=>targets[normalizeSeedQual_(q)]=true);
  for(let i=rows.length-1;i>=0;i--){
    if(targets[normalizeSeedQual_(rows[i][0])]) return {row:start+i,keyword:rows[i][0],rank:rows[i][1],score:rows[i][2],videoCount:rows[i][3],topVideoId:rows[i][12]};
  }
  return null;
}

function upsertQualifiedSeed_(sh,query,queryId,expanded,qa) {
  const topicId='CONTENTOS_SEED_' + normalizeSeedQual_(query).toUpperCase();
  const hits=qa.mapHits||[];
  const sourceIds=[queryId].concat(hits.map(h=>h.videoId)).join('|');
  const seedText=[
    '검색어='+query,
    '확장키워드='+expanded.join('|'),
    '결과수='+qa.resultCount,
    'Seed충분조건점수='+qa.score,
    '상위영상='+hits.slice(0,5).map(h=>h.title).join(' / '),
    'QTAG='+hits.map(h=>h.qtag).filter(Boolean).join('|'),
    '앱프런트분석조건=관련성·신선도·성과·출처계보·요약·확장키워드 확보'
  ].join('; ');
  const evidence='QLOG='+queryId+';MAP='+hits.map(h=>h.row).join(',')+';RANK='+(qa.rankHit?qa.rankHit.row:'NONE')+';SCORE='+qa.score;
  const last=sh.getLastRow();
  if(last>=2){
    const start=Math.max(2,last-4999);
    const rows=sh.getRange(start,1,last-start+1,14).getDisplayValues();
    for(let i=rows.length-1;i>=0;i--){
      if(String(rows[i][4])!==topicId) continue;
      const row=start+i;
      sh.getRange(row,1,1,14).setValues([[rows[i][0]||('SEED_CONTENTOS_'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmmss')),'APP_CONTENT_OS','CONTENT_OS_10M_QUALIFIED_SEED',sourceIds,topicId,seedText,CONTENTOS_SEED_QUAL_VERSION,'QUEENS_SUFFICIENCY_PASS','SEED_READY_FRONT_ANALYSIS',rows[i][9]||new Date(),new Date(),'','',evidence]]);
      return {created:false,seedId:rows[i][0],row:row};
    }
  }
  const seedId='SEED_CONTENTOS_'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmmss');
  sh.appendRow([seedId,'APP_CONTENT_OS','CONTENT_OS_10M_QUALIFIED_SEED',sourceIds,topicId,seedText,CONTENTOS_SEED_QUAL_VERSION,'QUEENS_SUFFICIENCY_PASS','SEED_READY_FRONT_ANALYSIS',new Date(),new Date(),'','',evidence]);
  return {created:true,seedId:seedId,row:sh.getLastRow()};
}

function normalizeSeedQual_(v){return String(v||'').toLowerCase().replace(/\s+/g,'').replace(/[^0-9a-z가-힣]/g,'');}
function parseDateSafe_(v){const d=new Date(v); return isNaN(d.getTime())?null:d;}

function contentOsSeedQualificationHealth(){
  const sourceSs=SpreadsheetApp.openById(CONTENTOS_SEED_QUAL_SOURCE_ID);
  const centralSs=SpreadsheetApp.openById(CONTENTOS_SEED_QUAL_CENTRAL_ID);
  const missing=[];
  ['Keyword_Query_Log','Keyword_Video_Map','Keyword_Rank'].forEach(n=>{if(!sourceSs.getSheetByName(n))missing.push('SOURCE:'+n);});
  ['35_INTERNAL_SEED_REGISTRY','36_AUTOMATION_TRIGGER_REGISTRY','61_BACKEND_FUNCTION_CONTRACT'].forEach(n=>{if(!centralSs.getSheetByName(n))missing.push('CENTRAL:'+n);});
  return {ok:missing.length===0,missing:missing,logicalIntervalMin:10,physicalTriggerPolicy:'REUSE_EXISTING_5M_TRIGGER_WITH_10M_BUCKET_GATE',version:CONTENTOS_SEED_QUAL_VERSION};
}
