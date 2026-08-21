const CONTENTOS_FRONT_LINEAGE_VERSION = 'CONTENTOS_FRONT_LINEAGE_V1_20260821';

function getContentOsFrontContract_(){
  return {
    searchTabs:['video','channel'],
    resultsLimits:[25,50,75,100],
    compatibilityLimits:[20],
    defaultFilters:{minViews:100000,videoLength:'any',videoFormat:'any',period:'30',sortBy:'viewCount',resultsLimit:50,country:'KR',category:'all'},
    sortBy:['relevance','viewCount','publishedAt','engagementRate'],
    periods:['any','7','30','90'],
    videoLengths:['any','short','medium','long'],
    videoFormats:['any','longform','shorts'],
    videoFields:['id','channelId','title','thumbnailUrl','channelTitle','publishedAt','subscribers','viewCount','likeCount','commentCount','durationMinutes','engagementRate','channelCountry'],
    featureRoutes:['main','topCharts','channelDetail','workflow','videoDetail','thumbnailAnalysis','outlierAnalysis','myChannel','abTestGame','identityFinder','collections','comparison','influencerMarketing']
  };
}

function normalizeContentOsFrontRequest_(req){
  req=req||{}; const c=getContentOsFrontContract_(); const f=Object.assign({},c.defaultFilters,req.filters||{});
  const requested=Number(f.resultsLimit||50); const pool=requested===20?25:(c.resultsLimits.indexOf(requested)>=0?requested:50);
  f.resultsLimit=pool;
  return {query:String(req.query||'').trim(),searchTab:req.searchTab==='channel'?'channel':'video',requestedResults:requested,poolResults:pool,filters:f,feature:String(req.feature||'main')};
}

function buildContentOsLineagePackage_(req, seed){
  const r=normalizeContentOsFrontRequest_(req); seed=seed||{};
  const kw=buildContentOsKeywordExpansionPlan_(seed,r.poolResults);
  const seedPack={stage:'SEED',query:r.query,normalizedQuery:seed.normalizedQuery||r.query,keywordPlan:kw,scriptFeatures:seed.scriptFeatures||[],evidence:seed.evidence||[],frontContract:getContentOsFrontContract_(),status:'SEED_READY_FRONT_ANALYSIS'};
  const t1={stage:'T1',intent:r.searchTab==='channel'?'CHANNEL_SEARCH':'VIDEO_SEARCH',request:r,keywordPlan:kw,requiredVideoFields:getContentOsFrontContract_().videoFields,ranking:{sortBy:r.filters.sortBy,minViews:r.filters.minViews,period:r.filters.period,country:r.filters.country,category:r.filters.category,videoFormat:r.filters.videoFormat,videoLength:r.filters.videoLength},resultTarget:{requested:r.requestedResults,pool:r.poolResults},status:'T1_READY_FRONT_RENDER'};
  const t2={stage:'T2',feature:r.feature,contentAngles:deriveT2AnglesFromSeed_(seed),scriptFeatures:seed.scriptFeatures||[],mediaHints:deriveT2MediaHints_(seed),platformActions:['SHORTS','LONGFORM','BLOG','SOCIAL_CARD'],confidenceRule:'VERIFIED_TRANSCRIPT>VERIFIED_DESCRIPTION>METADATA_INFERRED',status:'T2_READY_FEATURE_COOK'};
  return {version:CONTENTOS_FRONT_LINEAGE_VERSION,seed:seedPack,t1:t1,t2:t2,nextAction:kw.searchQueries.length?'SEARCH_OR_REUSE_QUEENS':'NEEDS_KEYWORD_EXPANSION'};
}

function deriveT2AnglesFromSeed_(seed){
  const sf=seed.scriptFeatures||[]; const out=[];
  sf.forEach(x=>{ if(x.type) out.push(x.type); if(x.front_use) out.push(x.front_use); });
  return Array.from(new Set(out)).slice(0,12);
}
function deriveT2MediaHints_(seed){
  return (seed.scriptFeatures||[]).map(x=>({video_id:x.video_id||'',hook:x.hook||'',tone:x.tone||'',structure:x.structure||'',confidence:x.confidence||'UNKNOWN'}));
}

function contentOsFrontLineage10mTick(){
  const now=new Date(); const bucket=Math.floor(now.getMinutes()/10);
  const key=Utilities.formatDate(now,Session.getScriptTimeZone()||'Asia/Seoul','yyyyMMddHH')+'_'+bucket;
  const props=PropertiesService.getScriptProperties();
  if(props.getProperty('CONTENTOS_FRONT_LINEAGE_BUCKET')===key) return {ok:true,skipped:true,key:key,version:CONTENTOS_FRONT_LINEAGE_VERSION};
  props.setProperty('CONTENTOS_FRONT_LINEAGE_BUCKET',key);
  return {ok:true,skipped:false,key:key,actions:['FRONT_CONTRACT_CHECK','QUEENS_REUSE_OR_EXPAND','SEED_GATE','T1_BUILD','T2_BUILD','LINEAGE_READBACK'],version:CONTENTOS_FRONT_LINEAGE_VERSION};
}

function testContentOsFrontLineageDubjjonku(){
  const seed={normalizedQuery:'두바이 쫀득 쿠키',primaryKeywords:['두바이 쫀득 쿠키','두쫀쿠'],synonyms:['두바이 초콜릿 쫀득 쿠키'],intentKeywords:['두쫀쿠 먹방','두바이 쫀득 쿠키 만들기','두쫀쿠 가격','두쫀쿠 편의점'],trendingKeywords:['두쫀쿠'],categoryKeywords:['디저트 트렌드','먹방','레시피'],scriptFeatureKeywords:['중독 쇼츠','맛비교','원조논란','ASMR'],scriptFeatures:[{video_id:'6vI8ooWwTvM',type:'SHORTS_COMEDY_REACTION',hook:'끊기 선언',tone:'셀프디스·반복개그',structure:'선언→실패→반전→결론',confidence:'VERIFIED_SECONDARY_DESCRIPTION'},{video_id:'GHd73FxzAj0',type:'CHARACTER_MUKBANG_COMPARE',hook:'핫한 두쫀쿠 대량 제시',tone:'캐릭터·ASMR',structure:'등장→소개→비교→먹방→댓글CTA',confidence:'VERIFIED_DESCRIPTION_TIMELINE'}],evidence:['QRY_20260821_DUBAI_CHEWY_COOKIE_001','MAP_ROWS_6_9','RANK_ROW_4']};
  return buildContentOsLineagePackage_({query:'두바이쫀쿠티',searchTab:'video',filters:{resultsLimit:100,country:'KR',period:'30',sortBy:'viewCount',minViews:100000,videoFormat:'any',videoLength:'any',category:'all'},feature:'outlierAnalysis'},seed);
}
