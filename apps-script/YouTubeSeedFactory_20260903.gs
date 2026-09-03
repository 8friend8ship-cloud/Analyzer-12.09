var YT_SEED_FACTORY_VERSION = 'YT_SEED_FACTORY_V3_20260903';
var YT_SEED_SOURCE_ID = '1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ';
var YT_SEED_FACTORY_ID = '1vhcZfPBR9rpv9JGEozMVZXfDoL-oyvJsDwutcKQHboM';
var YT_VTUBE_FACTORY_ID = '1grF8sVLhb8LRZj08do2Cd2_x4Yp76XSFeNqrsG7ge5E';
var YT_VTUBE_APP_ID = 'APP_VTUBE_1011B';
var YT_SEED_APP_ID = 'APP_CONTENT_OS';

/**
 * Logical 10-minute YouTube Seed factory. It MUST be called from the existing
 * processTaskQueue / ContentOS unified scheduler. It creates no physical trigger.
 */
function youtubeSeedFactoryTick() {
  return youtubeSeedFactoryRun_(false);
}

function youtubeSeedFactoryHealth() {
  return youtubeSeedFactoryRun_(true);
}

function runYouTubeSeedFactoryFromFactoryWake() {
  return youtubeSeedFactoryTick();
}

function youtubeSeedFactoryRun_(healthOnly) {
  var now = new Date();
  var props = PropertiesService.getScriptProperties();
  var bucket = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMddHHmm').slice(0, 11);
  var dueKey = 'YT_SEED_FACTORY_LAST_10M_BUCKET';
  if (!healthOnly && props.getProperty(dueKey) === bucket) {
    return {ok:true, skipped:true, reason:'SAME_10M_BUCKET', version:YT_SEED_FACTORY_VERSION};
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return {ok:false, skipped:true, reason:'LOCK_BUSY', version:YT_SEED_FACTORY_VERSION};
  try {
    var sourceSs = SpreadsheetApp.openById(YT_SEED_SOURCE_ID);
    var seedSs = SpreadsheetApp.openById(YT_SEED_FACTORY_ID);
    var vtubeSs = SpreadsheetApp.openById(YT_VTUBE_FACTORY_ID);
    var source = sourceSs.getSheetByName('Video_Index');
    var videoSeed = seedSs.getSheetByName('Video_Seed');
    var scriptSeed = seedSs.getSheetByName('Script_Seed');
    var runLog = seedSs.getSheetByName('Run_Log');
    var vtVideo = vtubeSs.getSheetByName('Video_Source');
    var vtStoryboard = vtubeSs.getSheetByName('Storyboard_Seed');
    if (!source || !videoSeed || !scriptSeed || !runLog || !vtVideo || !vtStoryboard) {
      throw new Error('YT_SEED_REQUIRED_SHEET_MISSING');
    }
    var health = {
      ok:true,
      sourceRows:source.getLastRow(),
      videoSeedRows:videoSeed.getLastRow(),
      scriptSeedRows:scriptSeed.getLastRow(),
      vtubeVideoRows:vtVideo.getLastRow(),
      vtubeStoryboardRows:vtStoryboard.getLastRow(),
      physicalTriggerCreated:false,
      physicalWake:'processTaskQueue',
      logicalMinutes:10,
      version:YT_SEED_FACTORY_VERSION
    };
    if (healthOnly) return health;

    var last = source.getLastRow();
    if (last < 2) return {ok:true, skipped:true, reason:'SOURCE_EMPTY', version:YT_SEED_FACTORY_VERSION};
    var scanCount = Math.min(200, last - 1);
    var rows = source.getRange(last - scanCount + 1, 1, scanCount, 26).getDisplayValues();
    var headers = source.getRange(1,1,1,26).getDisplayValues()[0];
    var hi = ytSeedHeaderIndex_(headers);

    var existing = ytSeedRecentIdSet_(videoSeed, 4, 10000);
    var vtExisting = ytSeedRecentIdSet_(vtVideo, 4, 5000);
    var created = 0, duplicates = 0, rejected = 0, scriptCreated = 0, vtubeCreated = 0;
    var resultIds = [];
    var maxCreate = 50;

    for (var r = rows.length - 1; r >= 0 && created < maxCreate; r--) {
      var row = rows[r];
      var videoId = ytSeedCell_(row, hi, 'VIDEO_ID');
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) { rejected++; continue; }
      if (existing[videoId]) { duplicates++; continue; }

      var title = ytSeedCell_(row, hi, 'TITLE');
      var channel = ytSeedCell_(row, hi, 'CHANNEL_TITLE');
      var query = ytSeedCell_(row, hi, 'SUB_KEY') || ytSeedCell_(row, hi, 'PRIMARY_CODE') || 'youtube';
      var url = ytSeedCell_(row, hi, 'VIDEO_URL') || ('https://www.youtube.com/watch?v=' + videoId);
      var thumb = ytSeedCell_(row, hi, 'THUMBNAIL_URL') || ('https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg');
      var description = ytSeedCell_(row, hi, 'DESCRIPTION');
      var published = ytSeedCell_(row, hi, 'PUBLISHED_AT');
      var viewsRaw = ytSeedCell_(row, hi, 'VIEW_COUNT');
      var likeRaw = ytSeedCell_(row, hi, 'LIKE_COUNT');
      var commentRaw = ytSeedCell_(row, hi, 'COMMENT_COUNT');
      var duration = ytSeedCell_(row, hi, 'DURATION_ISO8601');
      var channelId = ytSeedCell_(row, hi, 'CHANNEL_ID');
      var lastSync = ytSeedCell_(row, hi, 'LAST_SYNC');
      var freshness = ytSeedFreshness_(lastSync, now);
      var createdAt = Utilities.formatDate(now,'Asia/Seoul',"yyyy-MM-dd'T'HH:mm:ssXXX");
      var videoSeedId = 'VSEED_' + videoId + '_' + Utilities.formatDate(now,'Asia/Seoul','yyyyMMdd');
      var scriptSeedId = 'SSEED_' + videoId + '_' + Utilities.formatDate(now,'Asia/Seoul','yyyyMMdd');
      var brief = ytSeedBrief_(description || (title + ' / ' + channel), 700);
      var chapters = ytSeedChapters_(description);
      var keyPoints = ytSeedKeyPoints_(description || title);
      var evidence = description ? 'PARTIAL_SCRIPT' : 'VERIFIED_METADATA';
      var scriptSource = chapters.length ? 'timestamps' : (description ? 'description' : 'none');

      videoSeed.appendRow([
        videoSeedId,YT_SEED_APP_ID,query,videoId,url,title,channel,published,
        ytSeedNumberOrBlank_(viewsRaw),'','PUBLIC_VIEW_V2_20260824',
        [ytSeedCell_(row,hi,'PRIMARY_CODE'),ytSeedCell_(row,hi,'SUB_KEY')].filter(String).join('|'),
        brief,'Video_Index:' + videoId,freshness,'REFERENCE_ONLY',0.75,'CANDIDATE',createdAt,
        thumb,ytSeedNumberOrBlank_(likeRaw),ytSeedNumberOrBlank_(commentRaw),duration,brief,scriptSeedId,lastSync || createdAt
      ]);
      scriptSeed.appendRow([
        scriptSeedId,videoSeedId,YT_SEED_APP_ID,'TITLE_TO_CONTEXT',
        'metadata→description→timestamps→new interpretation','Use verified remix seed',
        '', 'No full transcript unless accessible/authorized captions exist',
        description ? 'READY_REFORM_SEED' : 'METADATA_ONLY',createdAt,
        description ? 'METADATA_PLUS_ALLOWED_TEXT' : 'METADATA_ONLY',
        ytSeedCell_(row,hi,'DEFAULT_LANGUAGE') || ytSeedCell_(row,hi,'DEFAULT_AUDIO_LANGUAGE') || '',
        '',brief,JSON.stringify(keyPoints),JSON.stringify(chapters),0,evidence,
        '[]','[]',description ? '[]' : '["NO_ACCESSIBLE_CAPTION"]',
        JSON.stringify({mode:'REFORM_REMIX',videoId:videoId,videoUrl:url,thumbnailUrl:thumb,scriptSource:scriptSource}),
        'T1_YT_VTUBE_REFORM_V1','PENDING_RUNTIME_READBACK',createdAt,
        'Original wording/assets not copied; metadata/allowed text only'
      ]);
      created++;
      scriptCreated++;
      existing[videoId] = true;
      resultIds.push(videoSeedId);

      if (!vtExisting[videoId]) {
        vtVideo.appendRow([
          'VTY_' + videoId,url,'YOUTUBE',videoId,channelId,'','',
          'REFERENCE_MOTION_ONLY','REFERENCE_CAMERA_ONLY','','','',
          'YOUTUBE_REFORM_REMIX',brief,
          ['YOUTUBE',query,videoId].join('|'),'REINTERPRET_ONLY_NO_SOURCE_ASSET_COPY','REFERENCE_ONLY',
          'SEED_READY_FROM_YOUTUBE',createdAt
        ]);
        vtStoryboard.appendRow([
          'SB_YT_' + videoId + '_' + Utilities.formatDate(now,'Asia/Seoul','yyyyMMddHHmmss'),
          'YOUTUBE_SEED',scriptSeedId,url,'',title,
          title.slice(0,160),'원본 메타데이터/허용 텍스트를 새 구성으로 재해석',
          '원문·원영상·원에셋 복제 금지','HOOK>CONTEXT>KEY_POINTS>NEW_INTERPRETATION>CTA',
          'interest>clarity>new_value','새로운 설명/리믹스 가치 제공','','NEW_CAMERA_GRAMMAR',
          'VTUBE_DEFAULT','PLATFORM_SAFE','Y',brief,
          [query,'youtube','reform','remix'].join(','),['YT',videoId,query].join('|'),
          'CANDIDATE_REFORM_REMIX',createdAt
        ]);
        vtExisting[videoId] = true;
        vtubeCreated++;
      }
    }

    props.setProperty(dueKey, bucket);
    var runId = 'RUN_YT_FACTORY_' + Utilities.formatDate(now,'Asia/Seoul','yyyyMMdd_HHmmss');
    runLog.appendRow([
      runId,'JOB_YT_DRIVE_NORMALIZE_20260903','TASK_20260823_BACKDATA_FACTORY_RUNTIME_001',
      'YOUTUBE_SEED_FACTORY_AUTO',rows.length,created,0,duplicates,rejected,
      created ? 'AUTO_COLLECT_WRITEBACK_PASS' : 'NO_NEW_SOURCE_ROWS',
      created ? 'PASS_DRIVE_READBACK_PENDING_FRONT' : 'PASS_NOOP',createdAt,
      'Video_Index→Video_Seed→Script_Seed→VTube Video_Source/Storyboard_Seed; version=' + YT_SEED_FACTORY_VERSION
    ]);
    return {ok:true,scanned:rows.length,created:created,scriptCreated:scriptCreated,vtubeCreated:vtubeCreated,duplicates:duplicates,rejected:rejected,result_ids:resultIds,run_id:runId,version:YT_SEED_FACTORY_VERSION};
  } catch (err) {
    return {ok:false,error:String(err && err.message || err),version:YT_SEED_FACTORY_VERSION};
  } finally {
    lock.releaseLock();
  }
}

function ytSeedHeaderIndex_(headers) {
  var out = {};
  headers.forEach(function(h,i){out[String(h || '').trim().toUpperCase()] = i;});
  return out;
}
function ytSeedCell_(row, idx, name) {
  var i = idx[String(name || '').toUpperCase()];
  return i === undefined ? '' : String(row[i] || '').trim();
}
function ytSeedRecentIdSet_(sheet, col, limit) {
  var out = {}, last = sheet.getLastRow();
  if (last < 2) return out;
  var n = Math.min(limit, last - 1), vals = sheet.getRange(last - n + 1,col,n,1).getDisplayValues();
  vals.forEach(function(r){var v=String(r[0]||'').trim(); if(v) out[v]=true;});
  return out;
}
function ytSeedNumberOrBlank_(v) {
  var s = String(v || '').replace(/,/g,'').trim();
  if (!s) return '';
  var n = Number(s); return isFinite(n) ? n : '';
}
function ytSeedBrief_(s,max) { return String(s||'').replace(/\s+/g,' ').trim().slice(0,max||700); }
function ytSeedFreshness_(lastSync, now) {
  if (!lastSync) return 'UNKNOWN';
  var d = new Date(lastSync); if (isNaN(d.getTime())) return 'UNKNOWN';
  return (now.getTime()-d.getTime()) <= 168*3600*1000 ? 'FRESH' : 'STALE';
}
function ytSeedChapters_(description) {
  var out=[]; String(description||'').split(/\r?\n/).forEach(function(line){
    var m=line.match(/^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+?)\s*$/);
    if(m && out.length<30) out.push({start:m[1],title:m[2].slice(0,160)});
  }); return out;
}
function ytSeedKeyPoints_(text) {
  var parts=String(text||'').replace(/\r/g,'\n').split(/[\n.!?]+/).map(function(x){return x.trim();}).filter(function(x){return x.length>=8;});
  return parts.slice(0,6);
}

/** Narrow web action adapter. The authoritative doPost chain should call this and
 * use the returned TextOutput only when action starts with contentos.youtube.seed. */
function contentOsYouTubeSeedHandleWebPostV1(e) {
  var body={};
  try { body=JSON.parse(String(e&&e.postData&&e.postData.contents||'{}')); } catch(err) { return null; }
  var action=String(body.action||'');
  if(action.indexOf('contentos.youtube.seed.')!==0) return null;
  var result;
  if(action==='contentos.youtube.seed.tick.v1') result=youtubeSeedFactoryTick();
  else if(action==='contentos.youtube.seed.health.v1') result=youtubeSeedFactoryHealth();
  else result={ok:false,error:'UNKNOWN_YOUTUBE_SEED_ACTION',action:action};
  result.webAdapterVersion='CONTENTOS_YOUTUBE_SEED_WEB_V1_20260903';
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
