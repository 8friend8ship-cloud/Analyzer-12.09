const CENTRAL_SKP_LEARNING_VERSION = 'CENTRAL_SKP_LEARNING_ORCHESTRATOR_V1_20260903';
const CENTRAL_SKP_MASTER_SHEET_ID = '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI';
const CENTRAL_SKP_QUEENS_TASK_ID = 'Q_SKETCHUP_FILE_QUEENS_20260903';
const CENTRAL_SKP_RUNNER_ID = 'RUN-SKETCHUP-ASSET-001';

/**
 * Logical-only stage. Reuses the already-installed processTaskQueue wake through
 * ContentOS_Unified_Scheduler. It NEVER installs a physical trigger.
 *
 * Role split:
 * - Apps Script: discover eligible Queens rows, enqueue exact file IDs, record state.
 * - Local SketchUp Ruby: open native SKP and export geometry/material/scene manifest.
 * - Python: transform manifest into Seed/prompt/template bundles.
 * - Apps Script ingest: write dedicated SKP tabs and promote only after QA gates.
 */
function runCentralSketchupLearningOrchestratorFromFactory(forceRun) {
  const started = new Date();
  const props = PropertiesService.getScriptProperties();
  const lastKey = 'CENTRAL_SKP_LEARNING_LAST_RUN_MS';
  const lastMs = Number(props.getProperty(lastKey) || 0);
  const dueMs = 10 * 60 * 1000;
  if (!forceRun && lastMs && started.getTime() - lastMs < dueMs) {
    return {ok:true, skipped:true, reason:'NOT_DUE', version:CENTRAL_SKP_LEARNING_VERSION};
  }

  const ss = SpreadsheetApp.openById(CENTRAL_SKP_MASTER_SHEET_ID);
  const queens = requireSkpSheet_(ss, '37_QUEENS_RESEARCH_RESULTS');
  const queue = requireSkpSheet_(ss, '07_EXECUTION_QUEUE');
  const runtime = requireSkpSheet_(ss, 'SKP_RUNTIME_LOG');

  const qValues = queens.getDataRange().getDisplayValues();
  const qHeader = skpHeaderIndex_(qValues[0]);
  const queueValues = queue.getDataRange().getDisplayValues();
  const existingTasks = new Set(queueValues.slice(1).map(r => String(r[0] || '')));
  const existingRuntimeKeys = new Set(
    runtime.getLastRow() > 1
      ? runtime.getRange(2, 1, runtime.getLastRow() - 1, 24).getDisplayValues().map(r => String(r[3] || ''))
      : []
  );

  const maxBatch = 20;
  let scanned = 0;
  let queued = 0;
  let dedup = 0;
  const newQueueRows = [];
  const newRuntimeRows = [];

  for (let i = 1; i < qValues.length && queued < maxBatch; i++) {
    const row = qValues[i];
    if (String(row[qHeader.QUEENS_TASK_ID] || '') !== CENTRAL_SKP_QUEENS_TASK_ID) continue;
    const seedStatus = String(row[qHeader.SEED_STATUS] || '');
    if (!/CONTENT_QA_PENDING|QUEENS_PROFILE_READY_CONTENT_QA_PENDING|QA_PENDING/i.test(seedStatus)) continue;
    scanned++;

    const notes = String(row[qHeader.NOTES] || '');
    const fileId = skpNoteField_(notes, 'FILE_ID');
    if (!fileId) continue;
    const resultId = String(row[qHeader.RESULT_ID] || '');
    const fileName = String(row[qHeader.SOURCE_TITLE] || '');
    const taskId = 'TASK_SKP_LEARN_' + skpShortHash_(fileId);
    if (existingTasks.has(taskId) || existingRuntimeKeys.has(taskId)) {
      dedup++;
      continue;
    }

    const now = skpNow_();
    newQueueRows.push([
      taskId,
      'SKP1',
      'SKETCHUP_LOCAL_ANALYSIS',
      fileId,
      'NATIVE_SKP_EXPORT_MANIFEST_THEN_PYTHON_SEED_TEMPLATE',
      'P0',
      'APPROVED_BY_USER_EXISTING_SCOPE',
      CENTRAL_SKP_RUNNER_ID,
      'QUEUED_LOCAL_RUNNER',
      0,
      now,
      now,
      'QUEENS_RESULT_ID=' + resultId + ';FILE_NAME=' + fileName + ';ROUTE=RT_SKETCHUP;EXPORTER=sketchup/ruby/central_skp_manifest_exporter.rb;BUILDER=python/central_skp_seed_builder.py;OUTPUT=manifest+seed_bundle+prompt_bundle+template_payload;NO_NEW_TRIGGER=TRUE',
      'CENTRAL_AGENT',
      now,
      now,
      1,
      '',
      'SOURCE_QUEUE_ONLY;LOCAL_RESULT_ACK_PENDING',
      'EXISTING_SCOPE_APPROVAL'
    ]);

    newRuntimeRows.push([
      'SKPQUEUE_' + skpShortHash_(taskId + now),
      '',
      fileId,
      taskId,
      'QUEUE',
      now,
      '',
      'runCentralSketchupLearningOrchestratorFromFactory',
      CENTRAL_SKP_RUNNER_ID,
      'QUEUED',
      'LOCAL_ACK_PENDING',
      skpShortHash_(resultId + fileId),
      '', '', '', '', '', '', '', 0,
      '',
      'PENDING',
      'QUEUED_LOCAL_RUNNER',
      'No local execution claimed by Apps Script; waits for exact native SKP exporter result.'
    ]);

    existingTasks.add(taskId);
    existingRuntimeKeys.add(taskId);
    queued++;
  }

  if (newQueueRows.length) {
    queue.getRange(queue.getLastRow() + 1, 1, newQueueRows.length, 20).setValues(newQueueRows);
  }
  if (newRuntimeRows.length) {
    runtime.getRange(runtime.getLastRow() + 1, 1, newRuntimeRows.length, 24).setValues(newRuntimeRows);
  }

  props.setProperty(lastKey, String(Date.now()));
  SpreadsheetApp.flush();
  return {
    ok:true,
    version:CENTRAL_SKP_LEARNING_VERSION,
    scanned:scanned,
    queued:queued,
    dedup:dedup,
    runnerId:CENTRAL_SKP_RUNNER_ID,
    physicalTriggerCreated:false,
    status:queued ? 'QUEUED_LOCAL_SKP_ANALYSIS' : 'NO_NEW_ELIGIBLE_ROWS',
    finishedAt:skpNow_()
  };
}

/**
 * Ingest contract for a local runner receipt. The local runner should upload
 * result files to Drive first, then pass IDs + structured payload here.
 */
function ingestCentralSketchupLearningResult(payload) {
  payload = payload || {};
  const required = ['fileId','modelId','manifest','seedBundle','receipt'];
  const missing = required.filter(k => payload[k] == null || payload[k] === '');
  if (missing.length) return {ok:false, reason:'MISSING_REQUIRED_FIELDS', missing:missing};

  const ss = SpreadsheetApp.openById(CENTRAL_SKP_MASTER_SHEET_ID);
  const manifestSheet = requireSkpSheet_(ss, 'SKP_MODEL_MANIFEST');
  const seedSheet = requireSkpSheet_(ss, 'SKP_SEED_LIBRARY');
  const runtime = requireSkpSheet_(ss, 'SKP_RUNTIME_LOG');
  const centralSeeds = requireSkpSheet_(ss, '35_INTERNAL_SEED_REGISTRY');

  const now = skpNow_();
  const manifest = payload.manifest || {};
  const model = manifest.model || {};
  const receipt = payload.receipt || {};
  const qa = payload.qa || {};
  const bundle = payload.seedBundle || {};
  const seeds = Array.isArray(bundle.seeds) ? bundle.seeds : [];

  const manifestQaPass = Boolean(receipt.ok === true && manifest.qa && manifest.qa.content_extracted === true);
  const finalQaPass = Boolean(payload.finalQaPass === true);
  const driveReadbackX2 = Boolean(payload.driveReadbackX2 === true);

  manifestSheet.appendRow([
    payload.modelId,
    payload.fileId,
    model.file_name || '',
    payload.projectId || '',
    payload.canonicalGroup || '',
    payload.versionRole || '',
    manifest.extracted_at || now,
    payload.skpVersion || '',
    model.unit && model.unit.length_unit_code != null ? model.unit.length_unit_code : '',
    model.unit && model.unit.length_unit_label || '',
    JSON.stringify(model.bounds_mm || {}),
    JSON.stringify(manifest.entity_counts || {}),
    (manifest.components || []).length,
    (manifest.materials || []).length,
    (manifest.tags || []).length,
    (manifest.scenes || []).length,
    JSON.stringify(manifest.components || []),
    JSON.stringify(manifest.materials || []),
    JSON.stringify(manifest.tags || []),
    JSON.stringify(manifest.scenes || []),
    JSON.stringify(manifest.active_camera || {}),
    JSON.stringify(manifest.bom || []),
    manifestQaPass ? 'MANIFEST_CONTENT_EXTRACTED_QA_PENDING' : 'MANIFEST_QA_FAIL',
    'QUEENS=' + (payload.queensResultId || '') + ';RUNNER=' + CENTRAL_SKP_RUNNER_ID + ';MANIFEST_FILE_ID=' + (payload.manifestFileId || '')
  ]);

  const seedRows = seeds.map(function(seed) {
    return [
      seed.seed_id || ('SEED_SKP_' + skpShortHash_(payload.modelId + JSON.stringify(seed))),
      payload.modelId,
      payload.fileId,
      payload.projectId || '',
      seed.seed_type || '',
      Array.isArray(seed.room_type) ? seed.room_type.join('|') : (seed.room_type || ''),
      seed.topic_id || '',
      seed.seed_text || '',
      JSON.stringify(seed.feature_json || {}),
      JSON.stringify(seed.hard_constraints || {}),
      JSON.stringify(seed.component_refs || []),
      JSON.stringify(seed.material_refs || []),
      JSON.stringify(seed.scene_refs || []),
      JSON.stringify(seed.camera_refs || []),
      JSON.stringify(bundle.estimate_rules || {}),
      JSON.stringify(bundle.prompt_bundle && bundle.prompt_bundle.video_support || {}),
      JSON.stringify(bundle.prompt_bundle && bundle.prompt_bundle.image_support || {}),
      seed.rights_status || 'SOURCE_RIGHTS_REVIEW_REQUIRED',
      seed.qa_status || 'CONTENT_QA_PENDING',
      payload.queensResultId || '',
      seed.template_id || 'MMT_SKETCHUP_SPATIAL_DESIGN_V1',
      seed.created_at || now,
      now,
      'MANIFEST_FILE_ID=' + (payload.manifestFileId || '') + ';SEED_BUNDLE_FILE_ID=' + (payload.seedBundleFileId || '')
    ];
  });
  if (seedRows.length) seedSheet.getRange(seedSheet.getLastRow() + 1, 1, seedRows.length, 24).setValues(seedRows);

  let promoted = 0;
  if (manifestQaPass && finalQaPass && driveReadbackX2) {
    seeds.forEach(function(seed) {
      const seedId = seed.seed_id || '';
      if (!seedId) return;
      if (skpFindInColumn_(centralSeeds, 1, seedId)) return;
      centralSeeds.appendRow([
        seedId,
        'APP_INTERIOR|APP_ANIMATION|ALL_SPACE_FRONTS',
        'CENTRAL_SKETCHUP_NATIVE_CONTENT_QA',
        [payload.fileId,payload.queensResultId,payload.manifestFileId,payload.seedBundleFileId].filter(Boolean).join('|'),
        seed.topic_id || seed.seed_type || 'SKETCHUP_SEED',
        seed.seed_text || '',
        'SKETCHUP_NATIVE_CONTENT_SEED_V1',
        'QUEENS_NATIVE_CONTENT_QA_PASS',
        'SEED_READY_TEMPLATE_ROUTE',
        now,
        now,
        '',
        seed.template_id || 'MMT_SKETCHUP_SPATIAL_DESIGN_V1',
        'MODEL_ID=' + payload.modelId + ';FINAL_QA_PASS=TRUE;DRIVE_READBACK_X2=TRUE'
      ]);
      promoted++;
    });
  }

  const runId = payload.runId || ('SKPINGEST_' + skpShortHash_(payload.modelId + now));
  runtime.appendRow([
    runId,
    payload.modelId,
    payload.fileId,
    payload.taskId || '',
    'INGEST',
    payload.startedAt || '',
    now,
    'ingestCentralSketchupLearningResult',
    CENTRAL_SKP_RUNNER_ID,
    manifestQaPass ? 'PASS' : 'FAIL',
    receipt.ok === true ? 'ACK' : 'NO_ACK',
    payload.inputHash || '',
    payload.outputHash || '',
    payload.manifestFileId || '',
    payload.seedBundleFileId || '',
    payload.templatePayloadFileId || '',
    (payload.previewFileIds || []).join('|'),
    manifestQaPass ? '' : (receipt.error_class || 'MANIFEST_QA_FAIL'),
    manifestQaPass ? '' : (receipt.error || ''),
    Number(payload.retryCount || 0),
    payload.lastGood || '',
    driveReadbackX2 ? 'PASS_X2' : 'PENDING',
    finalQaPass && driveReadbackX2 ? 'FINAL_QA_PASS' : 'CONTENT_EXTRACTED_FURTHER_QA_PENDING',
    'centralSeedPromoted=' + promoted + ';metadataOnlyPromotionForbidden=true'
  ]);

  SpreadsheetApp.flush();
  return {
    ok:manifestQaPass,
    version:CENTRAL_SKP_LEARNING_VERSION,
    modelId:payload.modelId,
    seedRowsWritten:seedRows.length,
    centralSeedPromoted:promoted,
    finalQaPass:finalQaPass,
    driveReadbackX2:driveReadbackX2,
    status:finalQaPass && driveReadbackX2 ? 'SEED_PROMOTED' : 'SKP_CONTENT_QA_PENDING'
  };
}

function auditCentralSketchupLearningTriggerContract() {
  const triggers = ScriptApp.getProjectTriggers();
  const forbidden = triggers.filter(function(t) {
    const h = String(t.getHandlerFunction());
    return h === 'runCentralSketchupLearningOrchestratorFromFactory' ||
      h === 'ingestCentralSketchupLearningResult';
  });
  return {
    ok:forbidden.length === 0,
    forbiddenPhysicalTriggerCount:forbidden.length,
    policy:'REUSE_EXISTING_PROCESS_TASK_QUEUE_ONLY',
    version:CENTRAL_SKP_LEARNING_VERSION
  };
}

function testCentralSketchupLearningQueueForceX2() {
  const a = runCentralSketchupLearningOrchestratorFromFactory(true);
  Utilities.sleep(50);
  const b = runCentralSketchupLearningOrchestratorFromFactory(true);
  return {
    ok:a.ok === true && b.ok === true,
    run1:a,
    run2:b,
    duplicatePolicy:'SECOND_RUN_MUST_DEDUP_ALREADY_QUEUED_FILE_IDS',
    triggerAudit:auditCentralSketchupLearningTriggerContract(),
    version:CENTRAL_SKP_LEARNING_VERSION
  };
}

function requireSkpSheet_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Missing required sheet: ' + name);
  return sh;
}

function skpHeaderIndex_(header) {
  const out = {};
  header.forEach(function(v, i) { out[String(v)] = i; });
  ['RESULT_ID','QUEENS_TASK_ID','SOURCE_TITLE','SEED_STATUS','NOTES'].forEach(function(k) {
    if (out[k] == null) throw new Error('Missing header ' + k);
  });
  return out;
}

function skpNoteField_(notes, key) {
  const m = String(notes || '').match(new RegExp('(?:^|;)' + key + '=([^;]+)'));
  return m ? m[1] : '';
}

function skpShortHash_(value) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return digest.slice(0, 8).map(function(b) { const v = (b + 256) % 256; return ('0' + v.toString(16)).slice(-2); }).join('').toUpperCase();
}

function skpNow_() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function skpFindInColumn_(sheet, col, value) {
  if (sheet.getLastRow() < 2) return false;
  const finder = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).createTextFinder(String(value)).matchEntireCell(true).findNext();
  return !!finder;
}
