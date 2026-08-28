var CONTENTOS_DRIVE_V3_SOURCE_ID = '1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ';
var CONTENTOS_DRIVE_V3_MASTER_ID = '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI';
var CONTENTOS_DRIVE_V3_CACHE_SHEET = 'Front_Query_Cache';
var CONTENTOS_DRIVE_V3_JSON_SHEET = '64_FRONTAPP_JSON_STORE';
var CONTENTOS_DRIVE_V3_BACKEND_VERSION = 'CONTENTOS_DRIVE_JSON_CACHE_V3_20260822';
var CONTENTOS_DRIVE_V3_CLIENT_CACHE_VERSION = 'CONTENTOS_YOUTUBE_DRIVE_CACHE_V2_20260822';
var CONTENTOS_DRIVE_V3_TTL_MS = 28 * 24 * 60 * 60 * 1000;
var CONTENTOS_DRIVE_V3_CHUNK = 45000;

function contentOsDriveStoreHealthV3() {
  var source = SpreadsheetApp.openById(CONTENTOS_DRIVE_V3_SOURCE_ID);
  var master = SpreadsheetApp.openById(CONTENTOS_DRIVE_V3_MASTER_ID);
  var missing = [];
  [CONTENTOS_DRIVE_V3_CACHE_SHEET,'Keyword_Query_Log','Keyword_Video_Map'].forEach(function(n) {
    if (!source.getSheetByName(n)) missing.push('SOURCE:' + n);
  });
  if (!master.getSheetByName(CONTENTOS_DRIVE_V3_JSON_SHEET)) missing.push('MASTER:' + CONTENTOS_DRIVE_V3_JSON_SHEET);
  return {
    ok: missing.length === 0,
    service: 'CONTENT_OS_DRIVE_JSON_CACHE_V3',
    storage: 'GOOGLE_DRIVE_SHEETS',
    firestore: false,
    missing: missing,
    version: CONTENTOS_DRIVE_V3_BACKEND_VERSION,
    at: new Date().toISOString()
  };
}

function contentOsDriveStoreHandlePostV3(body) {
  body = body || {};
  var action = String(body.action || '');
  var payload = body.payload || body;
  if (action === 'contentos.youtube.cache.lookup.v3') return contentOsYoutubeCacheLookupV3(payload);
  if (action === 'contentos.youtube.cache.store.v3') return contentOsYoutubeCacheStoreV3(payload);
  if (action === 'front.json.get.v3') return frontJsonStoreGetV3(payload);
  if (action === 'front.json.upsert.v3') return frontJsonStoreUpsertV3(payload);
  if (action === 'front.json.remove.v3') return frontJsonStoreRemoveV3(payload);
  if (action === 'contentos.drive.cache.health.v3') return contentOsDriveStoreHealthV3();
  return {ok:false,error:'UNKNOWN_DRIVE_STORE_V3_ACTION',action:action,version:CONTENTOS_DRIVE_V3_BACKEND_VERSION};
}

function contentOsDriveStoreHandleGetV3(e) {
  var p = (e && e.parameter) || {};
  var action = String(p.action || 'contentos.drive.cache.health.v3');
  if (action === 'contentos.youtube.cache.lookup.v3') {
    var filters = {};
    try { filters = JSON.parse(String(p.filters || '{}')); } catch (err) {}
    return contentOsYoutubeCacheLookupV3({
      cache_key:p.cache_key || '', signature:p.signature || '', query:p.query || '', mode:p.mode || 'video', filters:filters
    });
  }
  if (action === 'front.json.get.v3') return frontJsonStoreGetV3({store_key:p.store_key || ''});
  return contentOsDriveStoreHealthV3();
}

function contentOsYoutubeCacheLookupV3(payload) {
  payload = payload || {};
  var cacheKey = String(payload.cache_key || payload.cacheKey || '').trim();
  var signature = String(payload.signature || '').trim();
  if (!cacheKey) return {ok:false,hit:false,error:'CACHE_KEY_REQUIRED'};

  var sourceSs = SpreadsheetApp.openById(CONTENTOS_DRIVE_V3_SOURCE_ID);
  var cacheSheet = sourceSs.getSheetByName(CONTENTOS_DRIVE_V3_CACHE_SHEET);
  if (!cacheSheet) return {ok:false,hit:false,error:'CACHE_SHEET_MISSING'};

  var exact = findFreshExactCacheV3_(cacheSheet, cacheKey, signature);
  if (exact) return exact;

  var mode = String(payload.mode || 'video') === 'channel' ? 'channel' : 'video';
  var query = String(payload.query || '').trim();
  if (mode === 'video' && query) {
    var storedPayload = buildPayloadFromExistingYoutubeSheetV3_(sourceSs, cacheKey, signature, query, payload.filters || {});
    if (storedPayload && storedPayload.videos && storedPayload.videos.length) {
      var storeResult = contentOsYoutubeCacheStoreV3(storedPayload, 'EXISTING_YOUTUBE_SHEET');
      return {
        ok:true, hit:true, source:'DRIVE_YOUTUBE_INDEX', cache_key:cacheKey,
        payload:storedPayload, result_count:storedPayload.videos.length,
        expires_at:storedPayload.expiresAt, mirrored:!!storeResult.ok,
        version:CONTENTOS_DRIVE_V3_BACKEND_VERSION
      };
    }
  }

  return {ok:true,hit:false,cache_key:cacheKey,version:CONTENTOS_DRIVE_V3_BACKEND_VERSION};
}

function findFreshExactCacheV3_(sh, cacheKey, signature) {
  var last = sh.getLastRow();
  if (last < 2) return null;
  var rows = sh.getRange(2,1,last-1,18).getDisplayValues();
  for (var i=rows.length-1;i>=0;i--) {
    var r = rows[i];
    if (String(r[0]) !== cacheKey) continue;
    if (signature && String(r[3]) !== signature) continue;
    if (String(r[17]).toUpperCase() !== 'READY') continue;
    var expires = new Date(r[11]).getTime();
    if (!expires || Date.now() >= expires) {
      sh.getRange(i+2,18).setValue('EXPIRED');
      return null;
    }
    var text = String(r[4]||'')+String(r[5]||'')+String(r[6]||'')+String(r[7]||'');
    var parsed;
    try { parsed = JSON.parse(text); }
    catch (err) { sh.getRange(i+2,18).setValue('CORRUPT'); return null; }
    if (String(parsed.version || '') !== CONTENTOS_DRIVE_V3_CLIENT_CACHE_VERSION) return null;
    sh.getRange(i+2,13,1,2).setValues([[new Date(),Number(r[13]||0)+1]]);
    return {
      ok:true, hit:true, source:'DRIVE_SHEETS', cache_key:cacheKey, payload:parsed,
      stored_at:r[10], expires_at:r[11], serve_count:Number(r[13]||0)+1,
      version:CONTENTOS_DRIVE_V3_BACKEND_VERSION
    };
  }
  return null;
}

function buildPayloadFromExistingYoutubeSheetV3_(sourceSs, cacheKey, signature, query, filters) {
  filters = filters || {};
  if (String(filters.videoLength || 'any') !== 'any') return null;
  if (String(filters.videoFormat || 'any') !== 'any') return null;
  if (String(filters.category || 'all') !== 'all') return null;

  var sh = sourceSs.getSheetByName('Keyword_Video_Map');
  if (!sh || sh.getLastRow() < 2) return null;
  var last = sh.getLastRow();
  var start = Math.max(2,last-19999);
  var rows = sh.getRange(start,1,last-start+1,18).getDisplayValues();
  var target = normalizeDriveV3_(query);
  var country = String(filters.country || 'WW').toUpperCase();
  var period = String(filters.period || 'any');
  var minViews = Math.max(0,Number(filters.minViews || 0));
  var wanted = Math.max(1,Math.min(Number(filters.resultsLimit || 50),100));
  var sortBy = String(filters.sortBy || 'relevance');
  var now = Date.now();
  var freshnessFloor = now - CONTENTOS_DRIVE_V3_TTL_MS;
  var periodFloor = period === 'any' ? 0 : now - Number(period || 0) * 86400000;
  var out = [];
  var seen = {};
  var earliestExpiry = now + CONTENTOS_DRIVE_V3_TTL_MS;

  for (var i=rows.length-1;i>=0;i--) {
    var r = rows[i];
    if (normalizeDriveV3_(r[0]) !== target) continue;
    var videoId = String(r[1] || '');
    if (!videoId || seen[videoId]) continue;
    var refreshed = new Date(r[16]).getTime();
    if (!refreshed || refreshed < freshnessFloor) continue;
    var published = new Date(r[5]).getTime();
    if (periodFloor && (!published || published < periodFloor)) continue;
    var views = Number(String(r[6] || '0').replace(/,/g,'')) || 0;
    if (views < minViews) continue;
    var qtag = String(r[14] || '').toUpperCase();
    if (country !== 'WW') {
      var countryToken = '|' + country;
      if (qtag.indexOf(countryToken) === -1 && qtag.indexOf(country + '|') === -1 && qtag !== country) continue;
    }
    var likes = Number(String(r[7] || '0').replace(/,/g,'')) || 0;
    seen[videoId] = true;
    earliestExpiry = Math.min(earliestExpiry,refreshed + CONTENTOS_DRIVE_V3_TTL_MS);
    out.push({
      id:videoId,
      channelId:'',
      title:String(r[3] || ''),
      thumbnailUrl:'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg',
      channelTitle:String(r[4] || ''),
      publishedAt:String(r[5] || ''),
      subscribers:0,
      viewCount:views,
      likeCount:likes,
      commentCount:0,
      durationMinutes:0,
      engagementRate:views > 0 ? (likes / views) * 100 : 0,
      channelCountry:country === 'WW' ? (qtag.indexOf('|KR') >= 0 ? 'KR' : '') : country
    });
  }

  if (!out.length) return null;
  if (sortBy === 'viewCount') out.sort(function(a,b){return b.viewCount-a.viewCount;});
  else if (sortBy === 'publishedAt') out.sort(function(a,b){return new Date(b.publishedAt).getTime()-new Date(a.publishedAt).getTime();});
  else if (sortBy === 'engagementRate') out.sort(function(a,b){return b.engagementRate-a.engagementRate;});
  out = out.slice(0,wanted);

  var expiresAt = new Date(Math.max(now + 60000,Math.min(now + CONTENTOS_DRIVE_V3_TTL_MS,earliestExpiry)));
  return {
    version:CONTENTOS_DRIVE_V3_CLIENT_CACHE_VERSION,
    cacheKey:cacheKey,
    signature:signature,
    query:query,
    normalizedQuery:String(query || '').trim().replace(/\s+/g,' ').toLowerCase(),
    mode:'video',
    filters:filters,
    videos:out,
    channels:[],
    storedAt:new Date(now).toISOString(),
    expiresAt:expiresAt.toISOString(),
    dataPolicy:'YOUTUBE_PUBLIC_METADATA_REFRESH_28D'
  };
}

function contentOsYoutubeCacheStoreV3(payload, sourceMode) {
  payload = payload || {};
  if (containsCredentialFieldV3_(payload)) return {ok:false,error:'SECRET_FIELD_REJECTED'};
  var cacheKey = String(payload.cacheKey || payload.cache_key || '').trim();
  var signature = String(payload.signature || '').trim();
  var query = String(payload.query || '').trim();
  var mode = String(payload.mode || 'video') === 'channel' ? 'channel' : 'video';
  if (!cacheKey || !signature || !query) return {ok:false,error:'INVALID_CACHE_PAYLOAD'};

  var videos = Array.isArray(payload.videos) ? payload.videos.slice(0,100) : [];
  var channels = Array.isArray(payload.channels) ? payload.channels.slice(0,100) : [];
  var now = new Date();
  var requestedExpiry = new Date(String(payload.expiresAt || '')).getTime();
  var maxExpiry = now.getTime() + CONTENTOS_DRIVE_V3_TTL_MS;
  var expires = new Date(requestedExpiry && requestedExpiry < maxExpiry ? requestedExpiry : maxExpiry);
  var safePayload = {
    version:CONTENTOS_DRIVE_V3_CLIENT_CACHE_VERSION,
    cacheKey:cacheKey,
    signature:signature,
    query:query,
    normalizedQuery:String(payload.normalizedQuery || query).trim().toLowerCase(),
    mode:mode,
    filters:payload.filters || {},
    videos:videos,
    channels:channels,
    storedAt:now.toISOString(),
    expiresAt:expires.toISOString(),
    dataPolicy:'YOUTUBE_PUBLIC_METADATA_REFRESH_28D'
  };
  var text = JSON.stringify(safePayload);
  var parts = splitDriveV3_(text);
  if (parts.length > 4) return {ok:false,error:'CACHE_PAYLOAD_TOO_LARGE',bytes:text.length};
  while (parts.length < 4) parts.push('');

  var sourceSs = SpreadsheetApp.openById(CONTENTOS_DRIVE_V3_SOURCE_ID);
  var sh = sourceSs.getSheetByName(CONTENTOS_DRIVE_V3_CACHE_SHEET);
  if (!sh) return {ok:false,error:'CACHE_SHEET_MISSING'};
  var row = chooseCacheRowV3_(sh,cacheKey,signature);
  var videoIds = videos.map(function(v){return String(v.id||'');}).filter(String).join('|');
  var count = mode === 'channel' ? channels.length : videos.length;
  sh.getRange(row,1,1,18).setValues([[
    cacheKey,safePayload.normalizedQuery,mode,signature,parts[0],parts[1],parts[2],parts[3],
    count,videoIds,now,expires,'',0,String(sourceMode || 'USER_LOCAL_YOUTUBE_API_TO_DRIVE_CACHE'),
    'PUBLIC_METADATA_REFRESH_OR_DELETE_WITHIN_30D;TARGET_TTL_28D',CONTENTOS_DRIVE_V3_CLIENT_CACHE_VERSION,'READY'
  ]]);

  if (mode === 'video' && videos.length && String(sourceMode || '') !== 'EXISTING_YOUTUBE_SHEET') {
    upsertVideosIntoKeywordMapV3_(sourceSs,query,videos,now);
    updateQueryLogV3_(sourceSs,query,cacheKey,count,videoIds,now,expires);
  }
  return {ok:true,mirrored:true,row:row,cache_key:cacheKey,result_count:count,expires_at:expires.toISOString(),version:CONTENTOS_DRIVE_V3_BACKEND_VERSION};
}

function chooseCacheRowV3_(sh,cacheKey,signature) {
  var maxRows = sh.getMaxRows();
  var last = sh.getLastRow();
  if (last >= 2) {
    var rows = sh.getRange(2,1,last-1,18).getDisplayValues();
    var oldestRow = 0, oldestTime = 9e15;
    for (var i=rows.length-1;i>=0;i--) {
      var r = rows[i];
      if (String(r[0]) === cacheKey && String(r[3]) === signature) return i+2;
      var expiry = new Date(r[11]).getTime();
      if (expiry && expiry < Date.now()) return i+2;
      var stored = new Date(r[10]).getTime() || 0;
      if (stored < oldestTime) {oldestTime=stored;oldestRow=i+2;}
    }
    if (last >= maxRows) return oldestRow || 2;
  }
  return Math.min(last+1,maxRows);
}

function upsertVideosIntoKeywordMapV3_(sourceSs,query,videos,now) {
  var sh = sourceSs.getSheetByName('Keyword_Video_Map');
  if (!sh) return;
  var last = sh.getLastRow();
  var start = Math.max(2,last-19999);
  var existing = {};
  if (last >= 2) {
    var data = sh.getRange(start,1,last-start+1,18).getDisplayValues();
    for (var i=0;i<data.length;i++) existing[normalizeDriveV3_(data[i][0])+'|'+String(data[i][1]||'')] = start+i;
  }
  var append = [];
  videos.forEach(function(v) {
    var id = String(v.id || '');
    if (!id) return;
    var views = Number(v.viewCount || 0), likes = Number(v.likeCount || 0), comments = Number(v.commentCount || 0);
    var engagement = views > 0 ? (likes + comments) / views : 0;
    var age = v.publishedAt ? Math.max(0,Math.floor((Date.now()-new Date(v.publishedAt).getTime())/86400000)) : '';
    var rowData = [
      query,id,'https://www.youtube.com/watch?v='+id,String(v.title||''),String(v.channelTitle||''),String(v.publishedAt||''),
      views,likes,0,0,0,engagement,age,0,'CONTENT_OS_FRONT_CACHE|YOUTUBE_API|PUBLIC',
      'Content OS API result cached once; reuse before any repeat API call',now,'FRONT_API_CACHE:'+id
    ];
    var key = normalizeDriveV3_(query)+'|'+id;
    if (existing[key]) sh.getRange(existing[key],1,1,18).setValues([rowData]);
    else append.push(rowData);
  });
  if (append.length) sh.getRange(sh.getLastRow()+1,1,append.length,18).setValues(append);
}

function updateQueryLogV3_(sourceSs,query,cacheKey,count,videoIds,storedAt,expiresAt) {
  var sh = sourceSs.getSheetByName('Keyword_Query_Log');
  if (!sh) return;
  var last=sh.getLastRow(), target=normalizeDriveV3_(query), row=0;
  if (last>=2) {
    var start=Math.max(2,last-4999), values=sh.getRange(start,1,last-start+1,12).getDisplayValues();
    for (var i=values.length-1;i>=0;i--) if (normalizeDriveV3_(values[i][1])===target) {row=start+i;break;}
  }
  var topId=String(videoIds||'').split('|')[0]||'';
  var queryId=row?String(sh.getRange(row,1).getDisplayValue()):'QRY_CACHE_'+Utilities.formatDate(storedAt,'Asia/Seoul','yyyyMMdd_HHmmss');
  var data=[queryId,query,'APP_CONTENT_OS','FRONT_API_CACHE_WRITEBACK',count,topId,'','CONTENT_OS_FRONT_CACHE',storedAt,'Y','N',
    'CACHE_KEY='+cacheKey+'; EXPIRES_AT='+expiresAt.toISOString()+'; Drive/Sheets cache first; no repeated API call while fresh.'];
  if (row) sh.getRange(row,1,1,12).setValues([data]); else sh.appendRow(data);
}

function frontJsonStoreUpsertV3(payload) {
  payload = payload || {};
  var rawPayload = payload.json_payload !== undefined ? payload.json_payload : payload.jsonPayload;
  if (String(payload.secret_yn || payload.secretYn || 'N').toUpperCase() === 'Y' || containsCredentialFieldV3_(rawPayload)) {
    return {ok:false,error:'SECRET_STORAGE_FORBIDDEN'};
  }
  var storeKey=String(payload.store_key||payload.storeKey||'').trim();
  var appId=String(payload.app_id||payload.appId||'APP_CONTENT_OS').trim();
  if (!storeKey) return {ok:false,error:'STORE_KEY_REQUIRED'};
  var text=typeof rawPayload==='string'?rawPayload:JSON.stringify(rawPayload==null?{}:rawPayload);
  if (text.length>45000) return {ok:false,error:'JSON_PAYLOAD_TOO_LARGE_FOR_SHEET',bytes:text.length};
  var sh=SpreadsheetApp.openById(CONTENTOS_DRIVE_V3_MASTER_ID).getSheetByName(CONTENTOS_DRIVE_V3_JSON_SHEET);
  if (!sh) return {ok:false,error:'FRONT_JSON_SHEET_MISSING'};
  var now=new Date(), row=findFrontJsonRowV3_(sh,storeKey), created=row?(sh.getRange(row,7).getValue()||now):now;
  var hash=sha256DriveV3_(appId+'|'+storeKey+'|'+text);
  var values=[storeKey,appId,String(payload.user_scope_hash||payload.userScopeHash||'SHARED_APP'),String(payload.data_type||payload.dataType||'JSON'),
    String(payload.entity_id||payload.entityId||''),text,created,now,payload.expires_at||payload.expiresAt||'',String(payload.source||'FRONT_APP'),
    String(payload.version||'1'),String(payload.status||'ACTIVE'),hash,String(payload.lineage||''),String(payload.rights_class||payload.rightsClass||'USER_APP_DATA'),
    'N','',String(payload.notes||'')];
  if (row) sh.getRange(row,1,1,18).setValues([values]); else sh.appendRow(values);
  return {ok:true,store_key:storeKey,row:row||sh.getLastRow(),dedupe_hash:hash,version:CONTENTOS_DRIVE_V3_BACKEND_VERSION};
}

function frontJsonStoreGetV3(payload) {
  payload=payload||{};
  var storeKey=String(payload.store_key||payload.storeKey||'').trim();
  if (!storeKey) return {ok:false,hit:false,error:'STORE_KEY_REQUIRED'};
  var sh=SpreadsheetApp.openById(CONTENTOS_DRIVE_V3_MASTER_ID).getSheetByName(CONTENTOS_DRIVE_V3_JSON_SHEET);
  if (!sh) return {ok:false,hit:false,error:'FRONT_JSON_SHEET_MISSING'};
  var row=findFrontJsonRowV3_(sh,storeKey);
  if (!row) return {ok:true,hit:false,store_key:storeKey};
  var r=sh.getRange(row,1,1,18).getValues()[0];
  if (String(r[11]).toUpperCase()==='DELETED') return {ok:true,hit:false,deleted:true,store_key:storeKey};
  var expiry=r[8]?new Date(r[8]).getTime():0;
  if (expiry&&Date.now()>=expiry) return {ok:true,hit:false,expired:true,store_key:storeKey};
  sh.getRange(row,17).setValue(new Date());
  var parsed=r[5]; try {parsed=JSON.parse(String(r[5]||'{}'));} catch(err) {}
  return {ok:true,hit:true,store_key:storeKey,app_id:r[1],user_scope_hash:r[2],data_type:r[3],entity_id:r[4],json_payload:parsed,updated_at:r[7],version:r[10],lineage:r[13],backend_version:CONTENTOS_DRIVE_V3_BACKEND_VERSION};
}

function frontJsonStoreRemoveV3(payload) {
  payload=payload||{};
  var storeKey=String(payload.store_key||payload.storeKey||'').trim();
  if (!storeKey) return {ok:false,error:'STORE_KEY_REQUIRED'};
  var sh=SpreadsheetApp.openById(CONTENTOS_DRIVE_V3_MASTER_ID).getSheetByName(CONTENTOS_DRIVE_V3_JSON_SHEET);
  if (!sh) return {ok:false,error:'FRONT_JSON_SHEET_MISSING'};
  var row=findFrontJsonRowV3_(sh,storeKey);
  if (!row) return {ok:true,removed:false,store_key:storeKey};
  sh.getRange(row,12).setValue('DELETED'); sh.getRange(row,8).setValue(new Date());
  return {ok:true,removed:true,store_key:storeKey,row:row};
}

function findFrontJsonRowV3_(sh,storeKey) {
  var last=sh.getLastRow(); if(last<2)return 0;
  var start=Math.max(2,last-4999), values=sh.getRange(start,1,last-start+1,1).getDisplayValues();
  for(var i=values.length-1;i>=0;i--) if(String(values[i][0])===storeKey)return start+i;
  return 0;
}

function containsCredentialFieldV3_(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.some(containsCredentialFieldV3_);
  if (typeof value !== 'object') return false;
  var forbidden=/^(api.?key|youtube.?key|access.?token|refresh.?token|token|secret|password|credential|authorization)$/i;
  var keys=Object.keys(value);
  for(var i=0;i<keys.length;i++) {
    if(forbidden.test(keys[i])) return true;
    if(containsCredentialFieldV3_(value[keys[i]])) return true;
  }
  return false;
}

function splitDriveV3_(text){var out=[];for(var i=0;i<text.length;i+=CONTENTOS_DRIVE_V3_CHUNK)out.push(text.slice(i,i+CONTENTOS_DRIVE_V3_CHUNK));return out;}
function normalizeDriveV3_(value){return String(value||'').toLowerCase().replace(/\s+/g,'').replace(/[^0-9a-z가-힣]/g,'');}
function sha256DriveV3_(value){var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value||''),Utilities.Charset.UTF_8);return bytes.map(function(b){var v=b<0?b+256:b;return('0'+v.toString(16)).slice(-2);}).join('');}

function testContentOsDriveJsonCacheV3() {
  var health=contentOsDriveStoreHealthV3(); if(!health.ok)return health;
  var probe={version:CONTENTOS_DRIVE_V3_CLIENT_CACHE_VERSION,cacheKey:'TEST_CACHE_V3_'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmmss'),signature:'test-signature',query:'cache-test',normalizedQuery:'cache-test',mode:'video',filters:{resultsLimit:1},videos:[],channels:[],expiresAt:new Date(Date.now()+3600000).toISOString()};
  var stored=contentOsYoutubeCacheStoreV3(probe,'SELF_TEST');
  var read1=contentOsYoutubeCacheLookupV3({cache_key:probe.cacheKey,signature:probe.signature});
  var read2=contentOsYoutubeCacheLookupV3({cache_key:probe.cacheKey,signature:probe.signature});
  return {ok:!!stored.ok&&!!read1.hit&&!!read2.hit,health:health,stored:stored,readback1:read1.hit,readback2:read2.hit,version:CONTENTOS_DRIVE_V3_BACKEND_VERSION};
}

function testFrontJsonStoreV3() {
  var key='TEST_FRONT_JSON_V3_'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmmss');
  var stored=frontJsonStoreUpsertV3({store_key:key,app_id:'APP_CONTENT_OS',user_scope_hash:'usr_test',data_type:'SELF_TEST',json_payload:{ok:true,value:1},secret_yn:'N',source:'SELF_TEST'});
  var read1=frontJsonStoreGetV3({store_key:key});
  var read2=frontJsonStoreGetV3({store_key:key});
  var removed=frontJsonStoreRemoveV3({store_key:key});
  return {ok:!!stored.ok&&!!read1.hit&&!!read2.hit&&!!removed.removed,stored:stored,readback1:read1.hit,readback2:read2.hit,removed:removed.removed,version:CONTENTOS_DRIVE_V3_BACKEND_VERSION};
}
