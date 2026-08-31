var IMAGE_LEARNING_V2_VERSION = 'IMAGE_QUEENS_SEED_AUTOLEARN_V2_20260831';
var IMAGE_LEARNING_PACK_ID = '1vjB64BlUFsDmblwWaVdVE8iXw-JhK8T6A3z9Hk6J_hk';
var IMAGE_LEARNING_MASTER_ID = '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI';
var IMAGE_LEARNING_TABS = {
  QUEENS: 'PINTEREST_QUEENS_INTAKE',
  FEATURES: 'VISUAL_FEATURE_EXTRACTOR',
  ASSET_GATE: 'ASSET_QUEENS_SEED_GATE',
  MASTER: 'IMAGE_PACK_MASTER',
  PROMOTION: 'PROMOTION_GATE',
  SEED: '35_INTERNAL_SEED_REGISTRY',
  LEARNING_LOG: '31_학습실행로그',
  QA_LOG: '80_DATA_RUNTIME_QA_LOG',
  CHANGELOG: '63_EVOLUTION_CHANGELOG'
};

function runImageLearning10mTickV2() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return {ok:true, skipped:true, reason:'LOCK_BUSY', version:IMAGE_LEARNING_V2_VERSION};
  var started = new Date();
  var bucket = Utilities.formatDate(started, 'Asia/Seoul', 'yyyyMMddHH') + Math.floor(Number(Utilities.formatDate(started, 'Asia/Seoul', 'mm')) / 10);
  var props = PropertiesService.getScriptProperties();
  try {
    if (props.getProperty('IMG_LEARN_LAST_BUCKET') === bucket) {
      return {ok:true, skipped:true, reason:'SAME_10M_BUCKET', bucket:bucket, version:IMAGE_LEARNING_V2_VERSION};
    }
    var out = {ok:true, bucket:bucket, version:IMAGE_LEARNING_V2_VERSION, stages:{}};
    out.stages.collect = collectPinterestImageQueensV2();
    out.stages.features = extractImageQueensVisualSpatialFeaturesV2();
    out.stages.seed = promoteVerifiedImageQueensToSeedV2();
    out.stages.gate = evaluateImageAssetSeedGateV2();
    out.health = imageLearningHealthV2();
    out.ok = [out.stages.collect, out.stages.features, out.stages.seed, out.stages.gate, out.health].every(function(x) {
      return x && (x.ok !== false || x.skipped === true || x.hold === true);
    });
    out.finishedAt = new Date().toISOString();
    recordImageLearningRunV2_(out, started);
    if (out.ok) props.setProperty('IMG_LEARN_LAST_BUCKET', bucket);
    else recordImageLearningFailureV2_(out);
    return out;
  } catch (err) {
    var failure = {ok:false, bucket:bucket, error:String(err && err.message || err), version:IMAGE_LEARNING_V2_VERSION};
    recordImageLearningRunV2_(failure, started);
    recordImageLearningFailureV2_(failure);
    return failure;
  } finally {
    lock.releaseLock();
  }
}

function runImageLearningFromFactoryWakeV2() {
  return runImageLearning10mTickV2();
}

function collectPinterestImageQueensV2() {
  var sheet = imgPackSheetV2_(IMAGE_LEARNING_TABS.QUEENS);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 2) return {ok:true, scanned:0, collected:0, skipped:0, status:'PASS_NO_INPUT'};
  var idx = imgIndexV2_(data[0]);
  var collected = 0, skipped = 0;
  for (var r = 1; r < data.length; r++) {
    var qid = String(data[r][idx.QUEENS_ID] || '');
    if (!qid || String(data[r][idx.REQUEST_ID] || '') === 'POLICY') continue;
    var url = String(data[r][idx.SOURCE_URL] || '');
    if (!url) { skipped++; continue; }
    var pin = String(data[r][idx.SOURCE_PIN_ID] || '');
    var hash = String(data[r][idx.SOURCE_HASH] || '') || imgSha256V2_(url + '|' + pin);
    imgSetV2_(sheet, r + 1, idx, {
      SOURCE_HASH: hash,
      COLLECTED_AT: data[r][idx.COLLECTED_AT] || new Date(),
      RIGHTS_ROLE: data[r][idx.RIGHTS_ROLE] || 'REFERENCE_ONLY',
      REFERENCE_ONLY: 'Y',
      FEATURE_STATUS: data[r][idx.FEATURE_STATUS] || 'PENDING_FEATURE_EVIDENCE',
      STATUS: data[r][idx.STATUS] || 'QUEENS_COLLECTED'
    });
    collected++;
  }
  return {ok:true, scanned:data.length-2, collected:collected, skipped:skipped};
}

function extractImageQueensVisualSpatialFeaturesV2() {
  var queens = imgPackSheetV2_(IMAGE_LEARNING_TABS.QUEENS);
  var features = imgPackSheetV2_(IMAGE_LEARNING_TABS.FEATURES);
  var qData = queens.getDataRange().getValues();
  var fData = features.getDataRange().getValues();
  var qi = imgIndexV2_(qData[0]);
  var fi = imgIndexV2_(fData[0]);
  var requiredSpatial = ['HUMAN_SCALE','CLEARANCE','CIRCULATION','DEPTH'];
  var missingSchema = requiredSpatial.filter(function(k){ return typeof fi[k] !== 'number'; });
  if (missingSchema.length) return {ok:false, error:'SPATIAL_FEATURE_COLUMNS_MISSING:' + missingSchema.join(',')};
  var byUrl = {};
  for (var f = 1; f < fData.length; f++) {
    var u = String(fData[f][fi.SOURCE_URL] || '');
    if (u && String(fData[f][fi.VERIFIED] || '').toUpperCase() === 'Y') byUrl[u] = fData[f];
  }
  var matched = 0, held = 0;
  for (var r = 1; r < qData.length; r++) {
    if (String(qData[r][qi.REQUEST_ID] || '') === 'POLICY') continue;
    var url = String(qData[r][qi.SOURCE_URL] || '');
    if (!url || !byUrl[url]) { if (url) held++; continue; }
    var fr = byUrl[url];
    var spatial = imgIsSpatialClassV2_(String(qData[r][qi.ASSET_CLASS] || ''));
    var spatialComplete = requiredSpatial.every(function(k){ return String(fr[fi[k]] || '').trim() !== ''; });
    var patch = {FEATURE_STATUS:'PASS_VERIFIED_FEATURE'};
    if (spatial) {
      patch.SPATIAL_STATUS = spatialComplete ? 'FEATURE_SPATIAL_EVIDENCE_READY_QA_PENDING' : 'WAITING_HUMAN_SCALE_CLEARANCE_CIRCULATION_DEPTH';
      if (!spatialComplete) patch.FEATURE_STATUS = 'HOLD_SPATIAL_FEATURE_INCOMPLETE';
    } else {
      patch.SPATIAL_STATUS = 'NOT_REQUIRED';
    }
    imgSetV2_(queens, r + 1, qi, patch);
    if (patch.FEATURE_STATUS === 'PASS_VERIFIED_FEATURE') matched++; else held++;
  }
  return {ok:true, matched:matched, held:held, noFabrication:true};
}

function promoteVerifiedImageQueensToSeedV2() {
  var queens = imgPackSheetV2_(IMAGE_LEARNING_TABS.QUEENS);
  var features = imgPackSheetV2_(IMAGE_LEARNING_TABS.FEATURES);
  var seedSheet = imgMasterSheetV2_(IMAGE_LEARNING_TABS.SEED);
  var qData = queens.getDataRange().getValues();
  var fData = features.getDataRange().getValues();
  var sData = seedSheet.getDataRange().getValues();
  var qi = imgIndexV2_(qData[0]), fi = imgIndexV2_(fData[0]), si = imgIndexV2_(sData[0]);
  var byUrl = {}, existing = {};
  for (var f = 1; f < fData.length; f++) {
    var fu = String(fData[f][fi.SOURCE_URL] || '');
    if (fu && String(fData[f][fi.VERIFIED] || '').toUpperCase() === 'Y') byUrl[fu] = fData[f];
  }
  for (var s = 1; s < sData.length; s++) existing[String(sData[s][si.SEED_ID] || '')] = true;
  var promoted = 0, held = 0;
  for (var r = 1; r < qData.length; r++) {
    if (String(qData[r][qi.REQUEST_ID] || '') === 'POLICY') continue;
    var featureState = String(qData[r][qi.FEATURE_STATUS] || '');
    var rights = String(qData[r][qi.RIGHTS_ROLE] || '');
    var url = String(qData[r][qi.SOURCE_URL] || '');
    var fr = byUrl[url];
    if (featureState !== 'PASS_VERIFIED_FEATURE' || !rights || !fr) { held++; continue; }
    var spatial = imgIsSpatialClassV2_(String(qData[r][qi.ASSET_CLASS] || ''));
    var spatialState = String(qData[r][qi.SPATIAL_STATUS] || '');
    if (spatial && spatialState.indexOf('PASS') !== 0) {
      imgSetV2_(queens, r + 1, qi, {SEED_STATUS:'HOLD_SPATIAL_QA_REQUIRED'});
      held++; continue;
    }
    var qid = String(qData[r][qi.QUEENS_ID] || '');
    var sourceHash = String(qData[r][qi.SOURCE_HASH] || imgSha256V2_(url));
    var seedId = 'IMGSEED_' + sourceHash.substring(0, 16).toUpperCase();
    if (!existing[seedId]) {
      var seedText = imgFeatureSeedTextV2_(fr, fi);
      seedSheet.appendRow([
        seedId,
        String(qData[r][qi.PROJECT_ID] || 'ALL_IMAGE_WORKFLOWS'),
        'PINTEREST_REFERENCE_FEATURE_SEED',
        qid + '|' + sourceHash,
        String(qData[r][qi.TOPIC] || 'IMAGE_REFERENCE'),
        seedText,
        'IMAGE_QUEENS_FEATURE_SEED_V2',
        'VERIFIED_REFERENCE_FEATURE',
        'REFERENCE_SEED_TEMPLATE_PENDING',
        new Date().toISOString(),
        new Date().toISOString(),
        '', '',
        'QUEENS_ID=' + qid + ';SOURCE_URL=' + url + ';RIGHTS=' + rights + ';FEATURE_VERIFIED=Y'
      ]);
      existing[seedId] = true;
    }
    imgSetV2_(queens, r + 1, qi, {SEED_ID:seedId, SEED_STATUS:'SEEDED_REFERENCE_TEMPLATE_PENDING'});
    promoted++;
  }
  return {ok:true, promoted:promoted, held:held};
}

function evaluateImageAssetSeedGateV2(requestId) {
  var queens = imgPackSheetV2_(IMAGE_LEARNING_TABS.QUEENS);
  var qData = queens.getDataRange().getValues();
  var qi = imgIndexV2_(qData[0]);
  var checked = 0, pass = 0, blocked = 0, reasons = [];
  for (var r = 1; r < qData.length; r++) {
    if (String(qData[r][qi.REQUEST_ID] || '') === 'POLICY') continue;
    if (requestId && String(qData[r][qi.REQUEST_ID] || '') !== String(requestId)) continue;
    checked++;
    var misses = [];
    if (!qData[r][qi.QUEENS_ID]) misses.push('QUEENS_ID');
    if (!qData[r][qi.SEED_ID]) misses.push('SEED_ID');
    if (!qData[r][qi.TEMPLATE_ID]) misses.push('TEMPLATE_ID');
    if (String(qData[r][qi.TEMPLATE_STATUS] || '').indexOf('ACTIVE') < 0) misses.push('ACTIVE_TEMPLATE');
    if (!qData[r][qi.RIGHTS_ROLE]) misses.push('RIGHTS');
    if (imgIsSpatialClassV2_(String(qData[r][qi.ASSET_CLASS] || '')) && String(qData[r][qi.SPATIAL_STATUS] || '').indexOf('PASS') !== 0) misses.push('SPATIAL_QA');
    if (misses.length) { blocked++; reasons.push({queensId:qData[r][qi.QUEENS_ID], missing:misses}); }
    else pass++;
  }
  return {ok:true, checked:checked, pass:pass, blocked:blocked, generationAllowed:checked > 0 && blocked === 0, reasons:reasons};
}

function imageLearningHealthV2() {
  var requiredPack = [IMAGE_LEARNING_TABS.QUEENS, IMAGE_LEARNING_TABS.FEATURES, IMAGE_LEARNING_TABS.ASSET_GATE, IMAGE_LEARNING_TABS.MASTER, IMAGE_LEARNING_TABS.PROMOTION];
  var pack = SpreadsheetApp.openById(IMAGE_LEARNING_PACK_ID);
  var missing = requiredPack.filter(function(n){ return !pack.getSheetByName(n); });
  var feature = pack.getSheetByName(IMAGE_LEARNING_TABS.FEATURES);
  if (feature) {
    var h = imgIndexV2_(feature.getRange(1,1,1,feature.getLastColumn()).getValues()[0]);
    ['HUMAN_SCALE','CLEARANCE','CIRCULATION','DEPTH'].forEach(function(k){ if (typeof h[k] !== 'number') missing.push('FEATURE_COLUMN:' + k); });
  }
  var triggers = ScriptApp.getProjectTriggers().map(function(t){ return t.getHandlerFunction(); });
  var imagePhysical = triggers.filter(function(h){ return h === 'runImageLearning10mTickV2' || h === 'runImageLearningFromFactoryWakeV2'; }).length;
  var factoryWake = triggers.filter(function(h){ return h === 'processTaskQueue'; }).length;
  return {
    ok:missing.length === 0 && imagePhysical === 0,
    missing:missing,
    factoryProcessTaskQueueCount:factoryWake,
    duplicateImagePhysicalTriggerCount:imagePhysical,
    physicalPolicy:'REUSE_EXISTING_FACTORY_WAKE_ONLY',
    logicalIntervalMinutes:10,
    version:IMAGE_LEARNING_V2_VERSION
  };
}

function testImageLearningStaticContractV2() {
  var health = imageLearningHealthV2();
  var q = imgPackSheetV2_(IMAGE_LEARNING_TABS.QUEENS).getRange(1,1,1,24).getValues()[0];
  var requiredQ = ['QUEENS_ID','PROJECT_ID','REQUEST_ID','SOURCE_URL','SOURCE_HASH','RIGHTS_ROLE','FEATURE_STATUS','SPATIAL_STATUS','SEED_STATUS','SEED_ID','TEMPLATE_STATUS','TEMPLATE_ID','STATUS','LAST_ERROR'];
  var qi = imgIndexV2_(q);
  var missingQ = requiredQ.filter(function(k){ return typeof qi[k] !== 'number'; });
  return {ok:health.ok && missingQ.length === 0, health:health, missingQueensColumns:missingQ, noNewPhysicalTrigger:true, version:IMAGE_LEARNING_V2_VERSION};
}

function recordImageLearningRunV2_(out, started) {
  try {
    var ss = SpreadsheetApp.openById(IMAGE_LEARNING_MASTER_ID);
    var learn = ss.getSheetByName(IMAGE_LEARNING_TABS.LEARNING_LOG);
    var qa = ss.getSheetByName(IMAGE_LEARNING_TABS.QA_LOG);
    var runId = 'IMGLEARN_' + Utilities.formatDate(started, 'Asia/Seoul', 'yyyyMMdd_HHmmss');
    var status = out.ok === false ? 'FAIL' : (out.skipped ? 'SKIPPED' : 'PASS_OR_HOLD');
    var evidence = JSON.stringify(out).substring(0, 4000);
    if (learn) learn.appendRow([runId,new Date().toISOString(),'PINTEREST_QUEENS_INTAKE|VISUAL_FEATURE_EXTRACTOR','10분 이미지 Queens→Seed 학습','실제 증거만 승격, 공간증거 누락 시 HOLD','Queens→Feature/Spatial→Seed→Gate→History/QA','IMAGE_PACK|35|63|75|77|80',status,evidence,'YES','다음 10분 bucket 또는 bound runtime x2']);
    if (qa) qa.appendRow(['QA_' + runId,runId,'ALL_IMAGE_WORKFLOWS','runImageLearning10mTickV2','EXISTING_PROCESS_TASK_QUEUE_5M_REUSE','IMAGE_PACK_V2',out.bucket || '','QUEENS|FEATURE|SEED|GATE',runId,started.toISOString(),new Date().toISOString(),status,'DRIVE_SHEET_READBACK_REQUIRED',out.ok === false ? 0 : 90,out.error || '',0,evidence,'same fixture x2 before runtime VERIFIED']);
  } catch (ignored) {}
}

function recordImageLearningFailureV2_(out) {
  try {
    var props = PropertiesService.getScriptProperties();
    var signature = String(out.error || JSON.stringify(out.stages || {})).substring(0, 500);
    var sigHash = imgSha256V2_(signature).substring(0, 12);
    if (props.getProperty('IMG_LAST_FAILURE_SIG') === sigHash) return;
    props.setProperty('IMG_LAST_FAILURE_SIG', sigHash);
    var ss = SpreadsheetApp.openById(IMAGE_LEARNING_MASTER_ID);
    var ch = ss.getSheetByName(IMAGE_LEARNING_TABS.CHANGELOG);
    if (!ch) return;
    var id = 'CHG_IMG_LEARN_' + Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmmss');
    ch.appendRow([id,new Date().toISOString(),'IMG_LEARNING_FAILURE_' + sigHash,'ALL_IMAGE_WORKFLOWS','WORKFLOW','FAILURE_PREVENTION','Unverified/missing evidence could be mistaken for learned Seed/Template','Fail-close on missing Queens/features/spatial QA/rights/template; preserve resume point','10m learning runtime failure or evidence gap',sigHash,'Prevent false Seed/Template promotion','LOW','TASK_' + id,'8friend8ship-cloud/contents-os-git','main','','','runImageLearning10mTickV2','same fixture x2',signature,'','APPLY_MIN_FIX_AND_RETEST','ACTIVE','FALSE',new Date().toISOString()]);
  } catch (ignored) {}
}

function imgPackSheetV2_(name) {
  var s = SpreadsheetApp.openById(IMAGE_LEARNING_PACK_ID).getSheetByName(name);
  if (!s) throw new Error('IMAGE_PACK_TAB_MISSING:' + name);
  return s;
}
function imgMasterSheetV2_(name) {
  var s = SpreadsheetApp.openById(IMAGE_LEARNING_MASTER_ID).getSheetByName(name);
  if (!s) throw new Error('MASTER_TAB_MISSING:' + name);
  return s;
}
function imgIndexV2_(header) {
  var out = {}; header.forEach(function(h,i){ out[String(h)] = i; }); return out;
}
function imgSetV2_(sheet, row, idx, patch) {
  Object.keys(patch).forEach(function(k){ if (typeof idx[k] === 'number') sheet.getRange(row, idx[k] + 1).setValue(patch[k]); });
}
function imgSha256V2_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8).map(function(b){ var v=(b<0?b+256:b).toString(16); return v.length===1?'0'+v:v; }).join('');
}
function imgIsSpatialClassV2_(assetClass) {
  return /SPACE|FURNITURE|FIXTURE|OBJECT/i.test(String(assetClass || ''));
}
function imgFeatureSeedTextV2_(row, idx) {
  var keys = ['STYLE','COMPOSITION','COLOR_TONE','LIGHTING','OBJECTS','BACKGROUND_TYPE','HUMAN_SCALE','CLEARANCE','CIRCULATION','DEPTH'];
  return keys.map(function(k){ return k + '=' + String(typeof idx[k] === 'number' ? row[idx[k]] || '' : ''); }).join('; ');
}
