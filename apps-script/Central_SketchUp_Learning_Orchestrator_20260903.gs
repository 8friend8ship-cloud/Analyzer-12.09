const CENTRAL_SKP_LEARNING_VERSION = 'CENTRAL_SKP_LEARNING_ORCHESTRATOR_V1_1_DRIVE_STAGING_20260903';
const CENTRAL_SKP_MASTER_SHEET_ID = '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI';
const CENTRAL_SKP_QUEENS_TASK_ID = 'Q_SKETCHUP_FILE_QUEENS_20260903';
const CENTRAL_SKP_RUNNER_ID = 'RUN-SKETCHUP-ASSET-001';
const CENTRAL_SKP_TASK_INBOX_FOLDER_ID = '1fNBh9hSGoQN8KctMTSwdCfk50Pw0NkV5';
const CENTRAL_SKP_NATIVE_EXPORT_FOLDER_ID = '1v11S6csbFbq3aY7Vc8Ei0Lt0vVF8zm3z';
const CENTRAL_SKP_SEED_BUNDLE_FOLDER_ID = '1gfm6NyvERCHrJSCIH-bWJe-X3LZMD-sG';
const CENTRAL_SKP_RECEIPT_FOLDER_ID = '1hSvEJlEOBiEPtcIYzSRhzqtL3l10dQhO';

/**
 * Logical-only stage. Reuses the already-installed processTaskQueue wake through
 * ContentOS_Unified_Scheduler. It NEVER installs a physical trigger.
 *
 * Role split:
 * - Apps Script: discover eligible Queens rows, enqueue exact file IDs, write
 *   a Drive-synced task JSON, and record state.
 * - Local SketchUp Ruby: open native SKP and export geometry/material/scene manifest.
 * - Python: transform manifest into Seed/prompt/template bundles.
 * - Local runner: place result JSON/files in the canonical Drive-synced staging folders.
 * - Apps Script receipt consumer: ingest native results and write dedicated SKP tabs.
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
  const existingTasks = new Set(queueValues.slice(1).map(function(r) { return String(r[0] || ''); }));
  const existingRuntimeKeys = new Set(
    runtime.getLastRow() > 1
      ? runtime.getRange(2, 1, runtime.getLastRow() - 1, 24).getDisplayValues().map(function(r) { return String(r[3] || ''); })
      : []
  );

  const maxBatch = 20;
  let scanned = 0;
  let queued = 0;
  let dedup = 0;
  let taskFilesCreated = 0;
  let taskFilesReused = 0;
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
    const taskFile = writeSkpDriveTaskFile_({
      taskId:taskId,
      fileId:fileId,
      fileName:fileName,
      queensResultId:resultId,
      createdAt:now
    });
    if (taskFile.created) taskFilesCreated++; else taskFilesReused++;

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
      'QUEENS_RESULT_ID=' + resultId + ';FILE_NAME=' + fileName + ';ROUTE=RT_SKETCHUP;TASK_FILE_ID=' + taskFile.fileId + ';EXPORTER=sketchup/ruby/central_skp_manifest_exporter.rb;BUILDER=python/central_skp_seed_builder.py;OUTPUT=manifest+seed_bundle+prompt_bundle+template_payload;NO_NEW_TRIGGER=TRUE',
      'CENTRAL_AGENT',
      now,
      now,
      1,
      '',
      'QUEUE+TASK_JSON_SOURCE_ONLY;LOCAL_RESULT_ACK_PENDING',
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
      taskFile.fileId ? 'TASK_JSON_DRIVE_CREATED' : 'PENDING',
      'QUEUED_LOCAL_RUNNER',
      'TASK_FILE_ID=' + taskFile.fileId + ';No local execution claimed by Apps Script; waits for exact native SKP exporter result.'
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
    taskFilesCreated:taskFilesCreated,
    taskFilesReused:taskFilesReused,
    taskInboxFolderId:CENTRAL_SKP_TASK_INBOX_FOLDER_ID,
    runnerId:CENTRAL_SKP_RUNNER_ID,
    physicalTriggerCreated:false,
    status:queued ? 'QUEUED_LOCAL_SKP_ANALYSIS_WITH_DRIVE_TASK_JSON' : 'NO_NEW_ELIGIBLE_ROWS',
    finishedAt:skpNow_()
  };
}

/**
 * Consumes local result receipts placed in 90_RUNTIME_RECEIPT by the existing
 * allowlisted local runner. Receipt processing is idempotent by Drive file ID.
 * A receipt alone never makes a production Seed; ingestCentral... still requires
 * finalQaPass + driveReadbackX2 for promotion to central 35.
 */
function consumeCentralSketchupLearningReceiptsFromFactory(forceRun) {
  const props = PropertiesService.getScriptProperties();
  const lastKey = 'CENTRAL_SKP_RECEIPT_SCAN_LAST_RUN_MS';
  const lastMs = Number(props.getProperty(lastKey) || 0);
  const dueMs = 10 * 60 * 1000;
  if (!forceRun && lastMs && Date.now() - lastMs < dueMs) {
    return {ok:true, skipped:true, reason:'NOT_DUE', version:CENTRAL_SKP_LEARNING_VERSION};
  }

  const folder = DriveApp.getFolderById(CENTRAL_SKP_RECEIPT_FOLDER_ID);
  const files = folder.getFiles();
  let scanned = 0;
  let ingested = 0;
  let failed = 0;
  let dedup = 0;
  const results = [];

  while (files.hasNext() && scanned < 20) {
    const file = files.next();
    const name = file.getName();
    if (!/^SKP_(?:RESULT|RECEIPT)_.*\.json$/i.test(name)) continue;
    scanned++;
    const doneKey = 'CENTRAL_SKP_RECEIPT_DONE_' + file.getId();
    if (props.getProperty(doneKey) === '1') {
      dedup++;
      continue;
    }

    try {
      const receipt = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
      if (receipt.schema_version !== 'SKP_LOCAL_RESULT_RECEIPT_V1') {
        throw new Error('INVALID_RECEIPT_SCHEMA');
      }
      if (!/^TASK_SKP_LEARN_[A-F0-9]+$/i.test(String(receipt.task_id || ''))) {
        throw new Error('INVALID_TASK_ID');
      }
      if (!receipt.file_id || !receipt.model_id) throw new Error('MISSING_RECEIPT_IDENTITY');

      const manifestFile = findSkpFileInFolder_(CENTRAL_SKP_NATIVE_EXPORT_FOLDER_ID, receipt.manifest_file_name);
      const seedFile = findSkpFileInFolder_(CENTRAL_SKP_SEED_BUNDLE_FOLDER_ID, receipt.seed_bundle_file_name);
      if (!manifestFile || !seedFile) throw new Error('RESULT_FILE_NOT_SYNCED_YET');

      const manifest = JSON.parse(manifestFile.getBlob().getDataAsString('UTF-8'));
      const seedBundle = JSON.parse(seedFile.getBlob().getDataAsString('UTF-8'));
      const templateFile = receipt.template_payload_file_name
        ? findSkpFileInFolder_(CENTRAL_SKP_SEED_BUNDLE_FOLDER_ID, receipt.template_payload_file_name)
        : null;

      const ingest = ingestCentralSketchupLearningResult({
        taskId:receipt.task_id,
        runId:receipt.run_id || '',
        fileId:receipt.file_id,
        modelId:receipt.model_id,
        queensResultId:receipt.queens_result_id || '',
        projectId:receipt.project_id || '',
        canonicalGroup:receipt.canonical_group || '',
        versionRole:receipt.version_role || '',
        skpVersion:receipt.skp_version || '',
        manifest:manifest,
        seedBundle:seedBundle,
        receipt:receipt,
        manifestFileId:manifestFile.getId(),
        seedBundleFileId:seedFile.getId(),
        templatePayloadFileId:templateFile ? templateFile.getId() : '',
        previewFileIds:Array.isArray(receipt.preview_file_ids) ? receipt.preview_file_ids : [],
        inputHash:receipt.input_hash || '',
        outputHash:receipt.output_hash || '',
        retryCount:Number(receipt.retry_count || 0),
        finalQaPass:receipt.final_qa_pass === true,
        driveReadbackX2:receipt.drive_readback_x2 === true
      });

      if (!ingest || ingest.ok !== true) throw new Error('INGEST_FAILED:' + JSON.stringify(ingest || {}));
      props.setProperty(doneKey, '1');
      skpUpdateTaskStatus_(receipt.task_id, ingest.status === 'SEED_PROMOTED' ? 'SKP_SEED_PROMOTED' : 'NATIVE_CONTENT_INGESTED_QA_PENDING', 'RECEIPT_FILE_ID=' + file.getId() + ';MANIFEST_FILE_ID=' + manifestFile.getId() + ';SEED_BUNDLE_FILE_ID=' + seedFile.getId());
      ingested++;
      results.push({receiptFileId:file.getId(), taskId:receipt.task_id, ok:true, ingest:ingest});
    } catch (err) {
      failed++;
      results.push({receiptFileId:file.getId(), name:name, ok:false, error:String(err && err.message || err)});
    }
  }

  props.setProperty(lastKey, String(Date.now()));
  return {
    ok:failed === 0,
    degraded:failed > 0 && ingested > 0,
    version:CENTRAL_SKP_LEARNING_VERSION,
    scanned:scanned,
    ingested:ingested,
    failed:failed,
    dedup:dedup,
    receiptFolderId:CENTRAL_SKP_RECEIPT_FOLDER_ID,
    results:results
  };
}

/**
 * Ingest contract for a local runner receipt. The local runner uploads/syncs
 * result files to Drive first, then this function writes structured data.
 */
function ingestCentralSketchupLearningResult(payload) {
  payload = payload || {};
  const required = ['fileId','modelId','manifest','seedBundle','receipt'];
  const missing = required.filter(function(k) { return payload[k] == null || payload[k] === ''; });
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
  const bundle = payload.seedBundle || {};
  const seeds = Array.isArray(bundle.seeds) ? bundle.seeds : [];

  const manifestQaPass = Boolean(receipt.ok === true && manifest.qa && manifest.qa.content_extracted === true);
  const finalQaPass = Boolean(payload.finalQaPass === true);
  const driveReadbackX2 = Boolean(payload.driveReadbackX2 === true);

  if (!skpFindInColumn_(manifestSheet, 1, payload.modelId)) {
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
  }

  const seedRows = [];
  seeds.forEach(function(seed) {
    const seedId = seed.seed_id || ('SEED_SKP_' + skpShortHash_(payload.modelId + JSON.stringify(seed)));
    if (skpFindInColumn_(seedSheet, 1, seedId)) return;
    seedRows.push([
      seedId,
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
    ]);
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
  if (!skpFindInColumn_(runtime, 1, runId)) {
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
  }

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
      h === 'consumeCentralSketchupLearningReceiptsFromFactory' ||
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
  const r = consumeCentralSketchupLearningReceiptsFromFactory(true);
  return {
    ok:a.ok === true && b.ok === true && r.ok !== false,
    run1:a,
    run2:b,
    receiptScan:r,
    duplicatePolicy:'SECOND_RUN_MUST_DEDUP_ALREADY_QUEUED_FILE_IDS_AND_TASK_JSON',
    triggerAudit:auditCentralSketchupLearningTriggerContract(),
    version:CENTRAL_SKP_LEARNING_VERSION
  };
}

function writeSkpDriveTaskFile_(task) {
  const folder = DriveApp.getFolderById(CENTRAL_SKP_TASK_INBOX_FOLDER_ID);
  const fileName = 'SKP_TASK_' + task.taskId + '.json';
  const existing = folder.getFilesByName(fileName);
  if (existing.hasNext()) {
    const file = existing.next();
    return {created:false, fileId:file.getId(), fileName:fileName};
  }
  const payload = {
    schema_version:'SKP_LOCAL_TASK_V1',
    task_id:task.taskId,
    file_id:task.fileId,
    file_name:task.fileName,
    queens_result_id:task.queensResultId,
    action:'NATIVE_SKP_EXPORT_MANIFEST_THEN_PYTHON_SEED_TEMPLATE',
    runner_id:CENTRAL_SKP_RUNNER_ID,
    route:'RT_SKETCHUP',
    exporter:'sketchup/ruby/central_skp_manifest_exporter.rb',
    builder:'python/central_skp_seed_builder.py',
    native_export_folder_id:CENTRAL_SKP_NATIVE_EXPORT_FOLDER_ID,
    seed_bundle_folder_id:CENTRAL_SKP_SEED_BUNDLE_FOLDER_ID,
    receipt_folder_id:CENTRAL_SKP_RECEIPT_FOLDER_ID,
    created_at:task.createdAt,
    security:{network_in_ruby:false,arbitrary_shell:false,credential_payload:false,metadata_only_seed_forbidden:true}
  };
  const file = folder.createFile(fileName, JSON.stringify(payload, null, 2), MimeType.PLAIN_TEXT);
  return {created:true, fileId:file.getId(), fileName:fileName};
}

function findSkpFileInFolder_(folderId, fileName) {
  if (!fileName) return null;
  if (!/^[A-Za-z0-9가-힣_().\- ]+\.json$/i.test(String(fileName))) throw new Error('UNSAFE_RESULT_FILENAME');
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFilesByName(String(fileName));
  return files.hasNext() ? files.next() : null;
}

function skpUpdateTaskStatus_(taskId, status, evidence) {
  const ss = SpreadsheetApp.openById(CENTRAL_SKP_MASTER_SHEET_ID);
  const queue = requireSkpSheet_(ss, '07_EXECUTION_QUEUE');
  if (queue.getLastRow() < 2) return false;
  const values = queue.getRange(2, 1, queue.getLastRow() - 1, 20).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) !== String(taskId)) continue;
    const row = i + 2;
    queue.getRange(row, 9).setValue(status);
    queue.getRange(row, 12).setValue(skpNow_());
    queue.getRange(row, 19).setValue(evidence || '');
    return true;
  }
  return false;
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
  return digest.slice(0, 8).map(function(b) {
    const v = (b + 256) % 256;
    return ('0' + v.toString(16)).slice(-2);
  }).join('').toUpperCase();
}

function skpNow_() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function skpFindInColumn_(sheet, col, value) {
  if (sheet.getLastRow() < 2) return false;
  const finder = sheet.getRange(2, col, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(value)).matchEntireCell(true).findNext();
  return !!finder;
}
