/* CENTRAL_LEARNING_QUEENS_DRIVE_FLYWHEEL_V1_20260902
 * Map-first continuous learning lane.
 *
 * Canonical order:
 * HISTORY/LIBRARY/MAP -> QUEENS HEALTH -> NEW DATA?
 * -> Drive catalog fallback -> Queens candidate -> Seed QA -> Template gate
 * -> runtime/readback -> learning writeback.
 *
 * Safety:
 * - Reuse the existing processTaskQueue physical wake. No dedicated clock.
 * - Never promote binary/media metadata alone into a positive semantic Seed.
 * - Queens is mandatory provenance for promotion, but candidate production does
 *   not stop when fresh external data is unavailable: stored Drive evidence is
 *   classified first and remains DRAFT/QA_PENDING until content evidence exists.
 */

var CENTRAL_LEARNING_FLYWHEEL_V1 = {
  version: 'CENTRAL_LEARNING_QUEENS_DRIVE_FLYWHEEL_V1_20260902',
  centralSpreadsheetId: '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI',
  languageSpreadsheetId: '13Q5t70fb5hrj9hQ2GyU7FgO24Z96zl5I9-fdzgCRis8',
  mapId: 'ORCH_CENTRAL_LEARNING_QUEENS_DRIVE_FLYWHEEL_V1',
  triggerId: 'TRG_CENTRAL_LEARNING_FLYWHEEL_LOGICAL_20260902',
  handler: 'runCentralLearningFlywheelFromFactoryV1',
  logicalMinutes: 10,
  tz: 'Asia/Seoul',
  qttSheet: 'VOICE_TEST_TEXT_QUEENS',
  catalogSheet: '81_ALL_FILE_CATALOG',
  queensSheet: '37_QUEENS_RESEARCH_RESULTS',
  seedSheet: '35_INTERNAL_SEED_REGISTRY',
  mapSheet: '75_ORCHESTRA_WORKFLOW_MAP',
  qaSheet: '80_DATA_RUNTIME_QA_LOG',
  auditSheet: '08_AUDIT_LOG',
  learningLogSheet: '31_학습실행로그',
  seedIdKo: 'SEED_LANGUAGE_KO_PRONUNCIATION_COVERAGE_20260902_001',
  queensBatchIdKo: 'QRES_LANGUAGE_KO_QTT16_20260902_001',
  bucketProperty: 'CENTRAL_LEARNING_FLYWHEEL_LAST_10M_BUCKET_V1'
};

function runCentralLearningFlywheelFromFactoryV1(context) {
  context = context || {};
  var started = context.now instanceof Date ? context.now : new Date();
  var runId = 'RUN_CENTRAL_LEARNING_' + Utilities.formatDate(started, CENTRAL_LEARNING_FLYWHEEL_V1.tz, 'yyyyMMdd_HHmmss');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) return {ok:true, skipped:true, reason:'LOCK_BUSY', runId:runId, version:CENTRAL_LEARNING_FLYWHEEL_V1.version};

  try {
    var props = PropertiesService.getScriptProperties();
    var bucket = Math.floor(started.getTime() / (CENTRAL_LEARNING_FLYWHEEL_V1.logicalMinutes * 60 * 1000));
    var force = context.force === true;
    if (!force && String(props.getProperty(CENTRAL_LEARNING_FLYWHEEL_V1.bucketProperty) || '') === String(bucket)) {
      return {ok:true, skipped:true, reason:'IDEMPOTENT_10M_BUCKET', bucket:bucket, runId:runId, version:CENTRAL_LEARNING_FLYWHEEL_V1.version};
    }

    var central = SpreadsheetApp.openById(CENTRAL_LEARNING_FLYWHEEL_V1.centralSpreadsheetId);
    var mapState = centralLearningMapStateV1_(central);
    var queensHealth = centralLanguageQueensHealthV1_();
    var storedFallback = centralDriveStoredLearningFallbackV1_(central, {dryRun:context.dryRun === true, maxCandidates:context.maxCandidates || 20, now:started});
    var seedPromotion = centralPromoteLanguageQueensSeedV1_(central, queensHealth, {dryRun:context.dryRun === true, now:started});

    var driveAutoClassify = {ok:true, skipped:true, reason:'DRIVE_AUTO_CLASSIFIER_NOT_SYNCED'};
    if (typeof runDriveAutoClassifySeedWriteback10m === 'function' && context.skipDriveAutoClassify !== true) {
      try {
        driveAutoClassify = runDriveAutoClassifySeedWriteback10m({source:CENTRAL_LEARNING_FLYWHEEL_V1.handler, force:force});
      } catch (e) {
        driveAutoClassify = {ok:false, error:String(e && e.message || e)};
      }
    }

    var result = {
      ok: !!(mapState.ok && queensHealth.ok && seedPromotion.ok && storedFallback.ok && driveAutoClassify.ok !== false),
      runId:runId,
      bucket:bucket,
      map:mapState,
      queens:queensHealth,
      storedDriveFallback:storedFallback,
      seedPromotion:seedPromotion,
      driveAutoClassify:driveAutoClassify,
      physicalWakePolicy:'REUSE_EXISTING_PROCESS_TASK_QUEUE',
      newPhysicalTriggerCreated:false,
      runtimeVerified:false,
      version:CENTRAL_LEARNING_FLYWHEEL_V1.version,
      at:new Date().toISOString()
    };

    if (context.dryRun !== true) {
      props.setProperty(CENTRAL_LEARNING_FLYWHEEL_V1.bucketProperty, String(bucket));
      centralLearningWriteQaV1_(central, result, started);
      centralLearningWriteRunLogV1_(central, result, started);
    }
    return result;
  } catch (err) {
    return {ok:false, runId:runId, error:String(err && err.stack || err), version:CENTRAL_LEARNING_FLYWHEEL_V1.version};
  } finally {
    lock.releaseLock();
  }
}

/* Compatibility entrypoint referenced by the central file catalog. */
function runCentralDriveLearningQaCycleV1(context) {
  context = context || {};
  context.source = context.source || 'runCentralDriveLearningQaCycleV1';
  return runCentralLearningFlywheelFromFactoryV1(context);
}

/*
 * Compatibility asset analyzer. It performs metadata/provenance classification
 * only. It intentionally does NOT claim semantic learning for binary media.
 */
function analyzeNewAssetV1(asset) {
  asset = asset || {};
  var fileId = String(asset.fileId || asset.DRIVE_FILE_ID || '').trim();
  if (!fileId) return {ok:false, error:'DRIVE_FILE_ID_REQUIRED', version:CENTRAL_LEARNING_FLYWHEEL_V1.version};
  var mime = String(asset.mimeType || asset.MIME_TYPE || '');
  var title = String(asset.title || asset.TITLE || fileId);
  var url = String(asset.url || asset.DRIVE_URL || ('https://drive.google.com/open?id=' + fileId));
  var cls = centralLearningClassifyMimeV1_(mime, title);
  return {
    ok:true,
    fileId:fileId,
    title:title,
    fileClass:cls,
    sourceUrl:url,
    semanticPromotionAllowed:/^(TEXT|DOC|SHEET|JSON)$/.test(cls) && !!String(asset.extractedText || asset.CONTENT_TEXT || '').trim(),
    status:/^(TEXT|DOC|SHEET|JSON)$/.test(cls) && !!String(asset.extractedText || asset.CONTENT_TEXT || '').trim() ? 'CONTENT_EVIDENCE_AVAILABLE_QA_REQUIRED' : 'METADATA_ONLY_QUEENS_CANDIDATE',
    version:CENTRAL_LEARNING_FLYWHEEL_V1.version
  };
}

function runCentralSeedPromotionCycleV1(context) {
  context = context || {};
  var central = SpreadsheetApp.openById(CENTRAL_LEARNING_FLYWHEEL_V1.centralSpreadsheetId);
  var queensHealth = centralLanguageQueensHealthV1_();
  return centralPromoteLanguageQueensSeedV1_(central, queensHealth, {dryRun:context.dryRun === true, now:context.now instanceof Date ? context.now : new Date()});
}

function auditCentralLearningFlywheelV1() {
  var central = SpreadsheetApp.openById(CENTRAL_LEARNING_FLYWHEEL_V1.centralSpreadsheetId);
  var map = centralLearningMapStateV1_(central);
  var queens = centralLanguageQueensHealthV1_();
  var triggers = ScriptApp.getProjectTriggers();
  var factory = triggers.filter(function(t){ return t.getHandlerFunction() === 'processTaskQueue'; });
  var forbiddenOwn = triggers.filter(function(t){ return t.getHandlerFunction() === CENTRAL_LEARNING_FLYWHEEL_V1.handler; });
  return {
    ok:map.ok && queens.ok && typeof runCentralLearningFlywheelFromFactoryV1 === 'function' && factory.length === 1 && forbiddenOwn.length === 0,
    scriptId:ScriptApp.getScriptId(),
    map:map,
    queens:queens,
    processTaskQueueCount:factory.length,
    processTaskQueueTriggerUid:factory.length ? centralLearningTriggerUidV1_(factory[0]) : '',
    dedicatedLearningPhysicalTriggerCount:forbiddenOwn.length,
    requiredPhysicalPolicy:'EXACTLY_ONE_PROCESS_TASK_QUEUE_AND_ZERO_DEDICATED_LEARNING_CLOCKS',
    version:CENTRAL_LEARNING_FLYWHEEL_V1.version
  };
}

/*
 * Do not create a duplicate physical timer. This is an explicit repair helper:
 * if processTaskQueue is missing, return a fail-closed state so the canonical
 * bound factory wake can be repaired rather than creating a parallel project.
 */
function ensureCentralLearningFlywheelTriggerV1() {
  var triggers = ScriptApp.getProjectTriggers();
  var factory = triggers.filter(function(t){ return t.getHandlerFunction() === 'processTaskQueue'; });
  var dedicated = triggers.filter(function(t){ return t.getHandlerFunction() === CENTRAL_LEARNING_FLYWHEEL_V1.handler; });
  return {
    ok:factory.length === 1 && dedicated.length === 0,
    action:factory.length === 1 ? 'REUSE_EXISTING_FACTORY_WAKE' : 'REPAIR_CANONICAL_FACTORY_WAKE_REQUIRED',
    processTaskQueueCount:factory.length,
    dedicatedLearningTriggerCount:dedicated.length,
    created:false,
    noStandaloneProject:true,
    version:CENTRAL_LEARNING_FLYWHEEL_V1.version
  };
}

function testCentralLearningFlywheelX2V1() {
  var t1 = new Date();
  var p1 = runCentralLearningFlywheelFromFactoryV1({force:true,dryRun:true,skipDriveAutoClassify:true,maxCandidates:10,now:t1});
  var t2 = new Date(t1.getTime() + 1000);
  var p2 = runCentralLearningFlywheelFromFactoryV1({force:true,dryRun:true,skipDriveAutoClassify:true,maxCandidates:10,now:t2});
  var sameQueens = p1 && p2 && p1.queens && p2.queens && p1.queens.readyCount === p2.queens.readyCount;
  var sameSeed = p1 && p2 && p1.seedPromotion && p2.seedPromotion && p1.seedPromotion.sourceCount === p2.seedPromotion.sourceCount;
  return {
    ok:!!(p1 && p1.ok && p2 && p2.ok && sameQueens && sameSeed),
    pass1:p1,
    pass2:p2,
    deterministicQueens:sameQueens,
    deterministicSeedInput:sameSeed,
    mutationMode:'DRY_RUN_X2',
    runtimeTriggerProofRequiredSeparately:true,
    version:CENTRAL_LEARNING_FLYWHEEL_V1.version
  };
}

function centralLanguageQueensHealthV1_() {
  var ss = SpreadsheetApp.openById(CENTRAL_LEARNING_FLYWHEEL_V1.languageSpreadsheetId);
  var sh = ss.getSheetByName(CENTRAL_LEARNING_FLYWHEEL_V1.qttSheet);
  if (!sh) return {ok:false, reason:'VOICE_TEST_TEXT_QUEENS_MISSING', readyCount:0, categories:[]};
  var rows = centralLearningRowsV1_(sh);
  var ko = rows.filter(function(r){ return String(r.LOCALE) === 'ko-KR' && String(r.ACTIVE_YN).toUpperCase() === 'Y' && /QUEENS_READY|ACTIVE|READY/.test(String(r.STATUS)); });
  var categories = [];
  ko.forEach(function(r){ var c=String(r.CATEGORY||''); if(c && categories.indexOf(c)<0) categories.push(c); });
  var ids = ko.map(function(r){return String(r.TEST_TEXT_ID||'');}).filter(Boolean);
  return {
    ok:ko.length >= 16 && categories.length >= 16,
    locale:'ko-KR',
    readyCount:ko.length,
    categoryCount:categories.length,
    categories:categories,
    testTextIds:ids,
    lowUseFirst:ko.slice().sort(function(a,b){return Number(a.USE_COUNT||0)-Number(b.USE_COUNT||0);}).slice(0,4).map(function(r){return r.TEST_TEXT_ID;}),
    sourceSheetId:CENTRAL_LEARNING_FLYWHEEL_V1.languageSpreadsheetId,
    status:ko.length >= 16 && categories.length >= 16 ? 'QUEENS_16_CATEGORY_READBACK_PASS' : 'QUEENS_COVERAGE_GAP'
  };
}

function centralPromoteLanguageQueensSeedV1_(central, queensHealth, options) {
  options = options || {};
  var sourceIds = (queensHealth.testTextIds || []).slice(0,16);
  if (!queensHealth.ok || sourceIds.length < 16) {
    return {ok:false, promoted:false, status:'QUEENS_GATE_BLOCKED', sourceCount:sourceIds.length, reason:'KO_16_CATEGORY_QUEENS_REQUIRED'};
  }
  var sh = central.getSheetByName(CENTRAL_LEARNING_FLYWHEEL_V1.seedSheet);
  if (!sh) return {ok:false, promoted:false, status:'SEED_SHEET_MISSING', sourceCount:sourceIds.length};
  var existing = centralLearningFindRowV1_(sh,'SEED_ID',CENTRAL_LEARNING_FLYWHEEL_V1.seedIdKo);
  var seedText = [
    '한국어 음성 QA는 초성, 평음/경음/격음, 받침, 연음/동화, 모음대조, 숫자/날짜/시간/금액,',
    '외래어/기술용어, 질문/감탄, 속도/쉼/호흡, 전문용어, 지명/인명, 높임말/반말, 장문, 최소대립, 단위, 감정절제를 모두 포함한다.',
    'VOICE_TEST_TEXT_QUEENS에서 USE_COUNT가 낮은 문장을 우선 회전하고, 피치만으로 음성 품질을 통과시키지 않는다.',
    '실제 T1/T2 승격은 ASR+조음+자연스러움 및 런타임 readback x2를 별도 통과해야 한다.'
  ].join(' ');
  if (options.dryRun === true) {
    return {ok:true, promoted:false, dryRun:true, status:existing ? 'SEED_EXISTS_WOULD_UPSERT' : 'SEED_WOULD_CREATE', seedId:CENTRAL_LEARNING_FLYWHEEL_V1.seedIdKo, sourceCount:sourceIds.length, existing:!!existing};
  }
  centralLearningUpsertV1_(sh,'SEED_ID',CENTRAL_LEARNING_FLYWHEEL_V1.seedIdKo,{
    SEED_ID:CENTRAL_LEARNING_FLYWHEEL_V1.seedIdKo,
    APP_ID:'APP_BOTS',
    SOURCE_TYPE:'LANGUAGE_QUEENS_TEST_TEXT_BATCH',
    SOURCE_IDS:sourceIds.join('|'),
    TOPIC_ID:'KO_PRONUNCIATION_TEST_COVERAGE_16',
    SEED_TEXT:seedText,
    INPUT_SCHEMA_VERSION:'LANGUAGE_QUEENS_SEED_V1_20260902',
    QUEENS_STATUS:'QUEENS_16_CATEGORY_READBACK_PASS',
    STATUS:'SEED_DRAFT_QA_READY_RUNTIME_X2_PENDING',
    CREATED_AT:existing ? existing.CREATED_AT : (options.now || new Date()).toISOString(),
    UPDATED_AT:(options.now || new Date()).toISOString(),
    DRYWRITER_CONTENT_ID:'',
    FRONT_PACKAGE_ID:'',
    EVIDENCE:'LanguageApp-BSH-ResearchPackFactory:'+CENTRAL_LEARNING_FLYWHEEL_V1.languageSpreadsheetId+';QTT-KO-001..016;Bots PR9/PR10 source recovery;runtime trigger proof pending'
  });
  return {ok:true, promoted:true, status:existing ? 'SEED_UPSERTED_DRAFT' : 'SEED_CREATED_DRAFT', seedId:CENTRAL_LEARNING_FLYWHEEL_V1.seedIdKo, sourceCount:sourceIds.length, runtimeVerified:false};
}

function centralDriveStoredLearningFallbackV1_(central, options) {
  options = options || {};
  var catalog = central.getSheetByName(CENTRAL_LEARNING_FLYWHEEL_V1.catalogSheet);
  var queens = central.getSheetByName(CENTRAL_LEARNING_FLYWHEEL_V1.queensSheet);
  if (!catalog || !queens) return {ok:false, reason:'CATALOG_OR_QUEENS_SHEET_MISSING'};
  var rows = centralLearningRowsV1_(catalog);
  var candidates = rows.filter(function(r){
    var modes = String(r.USAGE_MODES || '');
    var review = String(r.REVIEW_STATE || '');
    return /QUEENS|SEED_CANDIDATE|TEMPLATE_LEARNING/.test(modes) && /PENDING|REVIEW_REQUIRED|ANALYSIS_PENDING/.test(review);
  }).slice(0,Math.max(1,Math.min(50,Number(options.maxCandidates||20))));
  var created = 0, existing = 0, mediaHeld = 0;
  candidates.forEach(function(r){
    var fileId = String(r.DRIVE_FILE_ID || '');
    if (!fileId) return;
    var resultId = 'QRES_DRIVE_CATALOG_' + centralLearningShortIdV1_(fileId);
    if (centralLearningFindRowV1_(queens,'RESULT_ID',resultId)) { existing++; return; }
    var cls = centralLearningClassifyMimeV1_(String(r.MIME_TYPE||''),String(r.TITLE||''));
    var contentBacked = /^(TEXT|DOC|SHEET|JSON)$/.test(cls) && /CONTENT_REVIEWED|SEMANTIC_VERIFIED|TEXT_EXTRACTED/.test(String(r.REVIEW_STATE||''));
    if (/^(AUDIO|VIDEO|IMAGE)$/.test(cls) && !contentBacked) mediaHeld++;
    if (options.dryRun === true) { created++; return; }
    centralLearningAppendByHeadersV1_(queens,{
      RESULT_ID:resultId,
      QUEENS_TASK_ID:'Q_DRIVE_STORED_LEARNING_FALLBACK',
      APP_ID:String(r.APP_SCOPE || 'CENTRAL_AGENT'),
      RESEARCH_TYPE:'DRIVE_STORED_FILE_FALLBACK',
      QUERY:String(r.TITLE || fileId),
      SOURCE_PROVIDER:'GOOGLE_DRIVE_STORED_CANONICAL',
      SOURCE_TITLE:String(r.TITLE || fileId),
      SOURCE_URL:String(r.DRIVE_URL || ''),
      SOURCE_PUBLISHED_AT:String(r.CREATED_AT || ''),
      COLLECTED_AT:(options.now || new Date()).toISOString(),
      MARKET_ID:'INTERNAL',
      LOCALE_ID:'ko-KR',
      EVIDENCE_STATUS:contentBacked ? 'STORED_CONTENT_EVIDENCE_AVAILABLE_QA_REQUIRED' : 'DRIVE_METADATA_ONLY_READBACK_PASS',
      SEED_STATUS:contentBacked ? 'SEED_CANDIDATE_QA_REQUIRED' : 'CANDIDATE_CONTENT_EXTRACTION_REQUIRED',
      SOURCE_HASH:String(r.CONTENT_HASH || ''),
      NOTES:'FILE_RECORD_ID='+String(r.FILE_RECORD_ID||'')+';FILE_ID='+fileId+';CLASS='+cls+';REVIEW='+String(r.REVIEW_STATE||'')+';RAW_PRESERVED;NO_FILENAME_ONLY_SEED_PROMOTION'
    });
    created++;
  });
  return {ok:true, scanned:rows.length, candidateCount:candidates.length, queensCreatedOrWouldCreate:created, alreadyKnown:existing, binaryMediaHeldForContentQa:mediaHeld, status:candidates.length ? 'STORED_DRIVE_FALLBACK_PROCESSED' : 'NO_PENDING_STORED_CANDIDATE'};
}

function centralLearningMapStateV1_(central) {
  var sh = central.getSheetByName(CENTRAL_LEARNING_FLYWHEEL_V1.mapSheet);
  if (!sh) return {ok:false, status:'WORKFLOW_MAP_SHEET_MISSING'};
  var row = centralLearningFindRowV1_(sh,'MAP_ID',CENTRAL_LEARNING_FLYWHEEL_V1.mapId);
  return {ok:!!row, status:row ? String(row.STATUS || 'MAP_PRESENT') : 'MAP_ROW_MISSING', mapId:CENTRAL_LEARNING_FLYWHEEL_V1.mapId};
}

function centralLearningWriteQaV1_(central, result, started) {
  var sh = central.getSheetByName(CENTRAL_LEARNING_FLYWHEEL_V1.qaSheet);
  if (!sh) return;
  centralLearningAppendByHeadersV1_(sh,{
    QA_ID:'QA_'+result.runId,
    RUN_ID:result.runId,
    APP_ID:'P00_AGENT_CORE;APP_BOTS;ALL_PROJECTS',
    FUNCTION_ID:CENTRAL_LEARNING_FLYWHEEL_V1.handler,
    TRIGGER_ID:CENTRAL_LEARNING_FLYWHEEL_V1.triggerId,
    INPUT_DATA_IDS:'75_MAP;VOICE_TEST_TEXT_QUEENS;81_ALL_FILE_CATALOG;37_QUEENS;35_SEED',
    INPUT_HASH:'QUEENS_'+String(result.queens.readyCount||0)+'_DRIVE_'+String(result.storedDriveFallback.candidateCount||0),
    OUTPUT_DATA_IDS:'37_QUEENS_RESEARCH_RESULTS;35_INTERNAL_SEED_REGISTRY;80_DATA_RUNTIME_QA_LOG',
    RESULT_ID:'RESULT_'+result.runId,
    STARTED_AT:started.toISOString(),
    FINISHED_AT:new Date().toISOString(),
    STATUS:result.ok ? 'LOGICAL_LEARNING_CYCLE_PASS_RUNTIME_TRIGGER_PROOF_PENDING' : 'LOGICAL_LEARNING_CYCLE_DEGRADED',
    READBACK_STATE:'MAP='+result.map.status+';QUEENS='+result.queens.status+';SEED='+result.seedPromotion.status+';DRIVE='+result.storedDriveFallback.status,
    QUALITY_SCORE:result.ok ? '90' : '60',
    ERROR_CLASS:result.ok ? '' : 'LEARNING_FLYWHEEL_STAGE_GAP',
    RETRY_COUNT:'0',
    EVIDENCE_POINTER:'LanguageApp-BSH-ResearchPackFactory;81_ALL_FILE_CATALOG;37;35;75',
    NEXT_ACTION:'BOUND_TO_EXISTING_PROCESS_TASK_QUEUE→DISTINCT_RUNTIME_X2→TEMPLATE_PROMOTION;NO_NEW_PHYSICAL_TRIGGER'
  });
}

function centralLearningWriteRunLogV1_(central, result, started) {
  var sh = central.getSheetByName(CENTRAL_LEARNING_FLYWHEEL_V1.learningLogSheet);
  if (!sh) return;
  centralLearningAppendByHeadersV1_(sh,{
    RUN_ID:result.runId,
    STARTED_AT:started.toISOString(),
    FINISHED_AT:new Date().toISOString(),
    STATUS:result.ok ? 'PASS_RUNTIME_BIND_PENDING' : 'DEGRADED',
    SOURCE:'CENTRAL_LEARNING_FLYWHEEL',
    RESULT:JSON.stringify({map:result.map,queens:result.queens,drive:result.storedDriveFallback,seed:result.seedPromotion}).slice(0,12000),
    VERSION:CENTRAL_LEARNING_FLYWHEEL_V1.version,
    NOTES:'Queens-first promotion; Drive stored-data fallback; no filename-only semantic promotion; existing factory wake reuse'
  });
}

function centralLearningRowsV1_(sh) {
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  return values.slice(1).filter(function(r){return r.some(function(v){return v!=='' && v!==null;});}).map(function(r){
    var o={}; headers.forEach(function(h,i){o[h]=r[i];}); return o;
  });
}

function centralLearningFindRowV1_(sh, keyName, keyValue) {
  var rows = centralLearningRowsV1_(sh);
  for (var i=0;i<rows.length;i++) if (String(rows[i][keyName]||'') === String(keyValue)) return rows[i];
  return null;
}

function centralLearningAppendByHeadersV1_(sh, payload) {
  var width = sh.getLastColumn();
  var headers = sh.getRange(1,1,1,width).getValues()[0].map(String);
  var row = headers.map(function(h){ return Object.prototype.hasOwnProperty.call(payload,h) ? payload[h] : ''; });
  sh.appendRow(row);
  return sh.getLastRow();
}

function centralLearningUpsertV1_(sh,keyName,keyValue,payload) {
  var values=sh.getDataRange().getValues();
  var headers=values[0].map(String);
  var keyIndex=headers.indexOf(keyName);
  if(keyIndex<0) throw new Error('HEADER_NOT_FOUND:'+sh.getName()+':'+keyName);
  var row=headers.map(function(h){return Object.prototype.hasOwnProperty.call(payload,h)?payload[h]:'';});
  for(var i=1;i<values.length;i++){
    if(String(values[i][keyIndex]||'')===String(keyValue)){
      sh.getRange(i+1,1,1,row.length).setValues([row]);
      return {mode:'UPDATE',row:i+1};
    }
  }
  sh.appendRow(row); return {mode:'INSERT',row:sh.getLastRow()};
}

function centralLearningClassifyMimeV1_(mime,title) {
  mime=String(mime||'').toLowerCase(); title=String(title||'').toLowerCase();
  if(/^image\//.test(mime)||/\.(png|jpe?g|webp|gif|heic)$/.test(title)) return 'IMAGE';
  if(/^video\//.test(mime)||/\.(mp4|mov|webm|mkv)$/.test(title)) return 'VIDEO';
  if(/^audio\//.test(mime)||/\.(m4a|mp3|wav|aac|ogg)$/.test(title)) return 'AUDIO';
  if(/spreadsheet|excel/.test(mime)||/\.(xlsx?|csv)$/.test(title)) return 'SHEET';
  if(/document|word/.test(mime)||/\.(docx?)$/.test(title)) return 'DOC';
  if(/json/.test(mime)||/\.json$/.test(title)) return 'JSON';
  if(/text\//.test(mime)||/\.(txt|md|html?)$/.test(title)) return 'TEXT';
  if(mime==='application/pdf'||/\.pdf$/.test(title)) return 'PDF';
  return 'OTHER';
}

function centralLearningShortIdV1_(s) {
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s||''),Utilities.Charset.UTF_8);
  return bytes.slice(0,8).map(function(b){var n=b<0?b+256:b;return ('0'+n.toString(16)).slice(-2);}).join('').toUpperCase();
}

function centralLearningTriggerUidV1_(t) {
  try { return String(t.getUniqueId()); } catch (_e) { return ''; }
}
