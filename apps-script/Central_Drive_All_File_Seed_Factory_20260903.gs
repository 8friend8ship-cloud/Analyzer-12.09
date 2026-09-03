const CENTRAL_DRIVE_ALL_FILE_SEED_VERSION = 'CENTRAL_DRIVE_ALL_FILE_SEED_V2_QA_GATE_20260903';
const CENTRAL_DRIVE_ALL_FILE_SEED_MASTER_ID = '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI';
const CENTRAL_DRIVE_ALL_FILE_SEED_RUNTIME_SHEET = 'DRIVE_ALL_FILE_SEED_RUNTIME';
const CENTRAL_DRIVE_ALL_FILE_QUEENS = '14_QUEENS_RESEARCH_QUEUE';
const CENTRAL_DRIVE_ALL_FILE_BATCH = 60;
const CENTRAL_DRIVE_ALL_FILE_BUDGET_MS = 110000;

/**
 * Logical-only all-Drive intake lane.
 * MUST be called from the existing processTaskQueue/contentOsUnifiedSchedulerTick wake.
 * Never creates a physical trigger/project/deployment/OAuth grant.
 *
 * IMPORTANT QA GATE:
 * - File name/MIME/metadata are enough only to create a Queens candidate.
 * - They are NEVER enough to promote a semantic Seed or T1/T2 entry.
 * - Image/video/audio/general binary items must be inspected by their registered
 *   content-analysis bridge before any Seed promotion.
 * - Text/sheet/slide/code items also require actual content readback/evidence.
 */
function runCentralDriveAllFileSeedFactoryFromFactory() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    return {ok:true, skipped:true, reason:'LOCKED', version:CENTRAL_DRIVE_ALL_FILE_SEED_VERSION};
  }

  const started = Date.now();
  try {
    const props = PropertiesService.getScriptProperties();
    const tokenKey = 'CENTRAL_DRIVE_ALL_FILE_ITERATOR_TOKEN';
    const sweepKey = 'CENTRAL_DRIVE_ALL_FILE_SWEEP_ID';
    let sweepId = props.getProperty(sweepKey) || newDriveAllFileSweepId_();
    let it;
    const token = props.getProperty(tokenKey);

    try {
      it = token ? DriveApp.continueFileIterator(token) : DriveApp.getFiles();
    } catch (e) {
      it = DriveApp.getFiles();
      props.deleteProperty(tokenKey);
      sweepId = newDriveAllFileSweepId_();
    }
    props.setProperty(sweepKey, sweepId);

    const ss = SpreadsheetApp.openById(CENTRAL_DRIVE_ALL_FILE_SEED_MASTER_ID);
    const runtime = ensureDriveAllFileRuntimeSheet_(ss);
    const queensSheet = ss.getSheetByName(CENTRAL_DRIVE_ALL_FILE_QUEENS);
    let processed = 0;
    let unchanged = 0;
    let failed = 0;
    const runId = 'DRIVEINTAKE_' + Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmmss');

    while (
      it.hasNext() &&
      processed + unchanged + failed < CENTRAL_DRIVE_ALL_FILE_BATCH &&
      Date.now() - started < CENTRAL_DRIVE_ALL_FILE_BUDGET_MS
    ) {
      const f = it.next();
      try {
        if (f.isTrashed()) {
          unchanged++;
          continue;
        }

        const fileId = f.getId();
        const updated = f.getLastUpdated();
        const dedupKey = fileId + '|' + updated.getTime();
        const existing = findRuntimeByFileId_(runtime, fileId);
        if (
          existing &&
          String(existing.dedupKey) === dedupKey &&
          isDriveAllFileIntakeCompleteResult_(existing.result)
        ) {
          unchanged++;
          continue;
        }

        const mime = String(f.getMimeType() || 'application/octet-stream');
        const name = String(f.getName() || '');
        const dataClass = classifyDriveFileForSeed_(mime, name);
        const sourceUrl = 'https://drive.google.com/open?id=' + encodeURIComponent(fileId);
        const projectId = inferDriveProjectId_(name, mime);
        const route = routeDriveFileForLearning_(dataClass, mime, name);
        const queensTaskId = 'Q_DRIVE_FILE_' + shortHashDriveSeed_(fileId);

        const queensStatus = upsertQueensFileCandidate_(queensSheet, {
          QUEENS_TASK_ID: queensTaskId,
          APP_ID: 'ALL_APPS',
          RESEARCH_TYPE: 'DRIVE_FILE_CONTENT_EXTRACTION',
          QUERY: 'FILE_ID=' + fileId + ';NAME=' + name + ';MIME=' + mime + ';ROUTE=' + route.bridge,
          MARKET_ID: 'GLOBAL',
          LOCALE_ID: 'AUTO',
          PERIOD: 'STATIC_FILE',
          LIMIT: 1,
          SOURCE_PROVIDER: 'GOOGLE_DRIVE',
          PRIORITY: 'P0',
          STATUS: 'READY',
          ERROR: '',
          UPDATED_AT: new Date().toISOString()
        });

        upsertRuntimeRow_(runtime, {
          runId: runId,
          checkedAt: new Date().toISOString(),
          fileId: fileId,
          fileName: name,
          mimeType: mime,
          lastUpdated: updated.toISOString(),
          sizeBytes: safeDriveFileSize_(f),
          dataClass: dataClass,
          projectId: projectId,
          queensStatus: queensStatus,
          seedStatus: 'QA_PENDING_CONTENT_EXTRACTION',
          seedId: '',
          templateRoute: route.template,
          bridgeRoute: route.bridge,
          dedupKey: dedupKey,
          result: 'QUEENS_REGISTERED_PENDING_SEED_QA',
          ack: 'ACK',
          driveReadback: 'PASS',
          retryState: 'WAIT_CONTENT_EVIDENCE',
          error: '',
          sourceUrl: sourceUrl,
          workflowId: 'ORCH_DRIVE_ALL_FILE_SEED_V1',
          runtimeState: 'FACTORY_LOGICAL_QA_GATE',
          notes: 'Metadata-only intake. Seed/T1/T2 promotion prohibited until route-specific content evidence + QA/readback.'
        });

        if (typeof centralPublishDataEvent === 'function') {
          try {
            centralPublishDataEvent({
              producer_app_id:'APP_AGENT_CORE',
              data_stage:'QUEENS',
              entity_type:dataClass,
              entity_id:queensTaskId,
              summary:name,
              source_url:sourceUrl,
              lineage_ids:[fileId,queensTaskId],
              consumer_scope:['ALL_APPS'],
              status:'QA_PENDING',
              readback_status:'PASS',
              memo:'CONTENT_EVIDENCE_REQUIRED|' + route.template + '|' + route.bridge
            });
          } catch (_) {}
        }

        processed++;
      } catch (err) {
        failed++;
        try {
          upsertRuntimeRow_(runtime, {
            runId:runId,
            checkedAt:new Date().toISOString(),
            fileId:safeFn_(function(){return f.getId();},''),
            fileName:safeFn_(function(){return f.getName();},''),
            mimeType:safeFn_(function(){return f.getMimeType();},''),
            lastUpdated:'',
            sizeBytes:'',
            dataClass:'ERROR',
            projectId:'AUTO',
            queensStatus:'FAILED',
            seedStatus:'FAILED',
            seedId:'',
            templateRoute:'',
            bridgeRoute:'',
            dedupKey:'',
            result:'FAILED',
            ack:'NO_ACK',
            driveReadback:'FAIL',
            retryState:'RETRY_NEXT_WAKE',
            error:String(err && err.message || err),
            sourceUrl:'',
            workflowId:'ORCH_DRIVE_ALL_FILE_SEED_V1',
            runtimeState:'DEGRADED',
            notes:'Preserve failure evidence; next existing wake retries. No Seed promotion.'
          });
        } catch (_) {}
      }
    }

    if (it.hasNext()) {
      props.setProperty(tokenKey, it.getContinuationToken());
    } else {
      props.deleteProperty(tokenKey);
      props.setProperty(sweepKey, newDriveAllFileSweepId_());
    }

    return {
      ok: failed === 0,
      runId: runId,
      sweepId: sweepId,
      processed: processed,
      unchanged: unchanged,
      failed: failed,
      more: it.hasNext(),
      seedPromoted: 0,
      seedGate: 'CONTENT_EVIDENCE_AND_QA_REQUIRED',
      version: CENTRAL_DRIVE_ALL_FILE_SEED_VERSION
    };
  } finally {
    lock.releaseLock();
  }
}

function ensureDriveAllFileRuntimeSheet_(ss) {
  let sh = ss.getSheetByName(CENTRAL_DRIVE_ALL_FILE_SEED_RUNTIME_SHEET);
  if (!sh) sh = ss.insertSheet(CENTRAL_DRIVE_ALL_FILE_SEED_RUNTIME_SHEET);
  const headers = [
    'RUN_ID','CHECKED_AT','FILE_ID','FILE_NAME','MIME_TYPE','LAST_UPDATED','SIZE_BYTES','DATA_CLASS',
    'PROJECT_ID','QUEENS_STATUS','SEED_STATUS','SEED_ID','TEMPLATE_ROUTE','BRIDGE_ROUTE','DEDUP_KEY',
    'RESULT','ACK','DRIVE_READBACK','RETRY_STATE','ERROR','SOURCE_URL','WORKFLOW_ID','RUNTIME_STATE','NOTES'
  ];
  if (sh.getLastRow() === 0) sh.getRange(1,1,1,headers.length).setValues([headers]);
  return sh;
}

function findRuntimeByFileId_(sh, fileId) {
  const last = sh.getLastRow();
  if (last < 2) return null;
  const start = Math.max(2, last - 800);
  const vals = sh.getRange(start,1,last-start+1,24).getValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][2]) === String(fileId)) {
      return {dedupKey:vals[i][14], result:vals[i][15], row:start+i};
    }
  }
  return null;
}

function isDriveAllFileIntakeCompleteResult_(result) {
  return ['QUEENS_REGISTERED_PENDING_SEED_QA','SEED_REGISTERED'].indexOf(String(result || '')) >= 0;
}

function upsertRuntimeRow_(sh, x) {
  const row = [
    x.runId,x.checkedAt,x.fileId,x.fileName,x.mimeType,x.lastUpdated,x.sizeBytes,x.dataClass,x.projectId,
    x.queensStatus,x.seedStatus,x.seedId,x.templateRoute,x.bridgeRoute,x.dedupKey,x.result,x.ack,x.driveReadback,
    x.retryState,x.error,x.sourceUrl,x.workflowId,x.runtimeState,x.notes
  ];
  const old = findRuntimeByFileId_(sh, x.fileId);
  if (old) sh.getRange(old.row,1,1,row.length).setValues([row]);
  else sh.appendRow(row);
}

function upsertQueensFileCandidate_(sh, obj) {
  return upsertByHeaderBestEffort_(sh, 'QUEENS_TASK_ID', obj.QUEENS_TASK_ID, obj, 'QUEENS_QUEUED');
}

function upsertByHeaderBestEffort_(sh, keyHeader, keyValue, obj, successLabel) {
  if (!sh) return 'TARGET_SHEET_MISSING';
  const lastCol = sh.getLastColumn();
  if (lastCol < 1) return 'TARGET_HEADER_MISSING';
  const headers = sh.getRange(1,1,1,lastCol).getValues()[0].map(String);
  const keyCol = headers.indexOf(keyHeader);
  if (keyCol < 0) return 'TARGET_KEY_HEADER_MISSING';

  let rowNo = 0;
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const vals = sh.getRange(2,keyCol+1,lastRow-1,1).getValues();
    for (let i = 0; i < vals.length; i++) {
      if (String(vals[i][0]) === String(keyValue)) {
        rowNo = i + 2;
        break;
      }
    }
  }

  const row = new Array(lastCol).fill('');
  headers.forEach(function(h,i){
    if (Object.prototype.hasOwnProperty.call(obj,h)) row[i] = obj[h];
  });
  if (rowNo) sh.getRange(rowNo,1,1,lastCol).setValues([row]);
  else sh.appendRow(row);
  return successLabel;
}

function classifyDriveFileForSeed_(mime, name) {
  if (/spreadsheet|excel|csv|sheet/i.test(mime + ' ' + name)) return 'SHEET_DATA';
  if (/document|word|text|markdown|pdf/i.test(mime + ' ' + name)) return 'TEXT_DOC';
  if (/presentation|powerpoint|slide/i.test(mime + ' ' + name)) return 'SLIDE';
  if (/image\//i.test(mime)) return 'IMAGE';
  if (/video\//i.test(mime)) return 'VIDEO';
  if (/audio\//i.test(mime)) return 'AUDIO';
  if (/json|javascript|zip|octet-stream|script/i.test(mime + ' ' + name)) return 'CODE_DATA';
  return 'GENERAL_FILE';
}

function routeDriveFileForLearning_(dataClass, mime, name) {
  const map = {
    SHEET_DATA:{template:'DATA_TABLE_SEED_TEMPLATE',bridge:'SHEETS_DATA_BRIDGE'},
    TEXT_DOC:{template:'DOC_KNOWLEDGE_SEED_TEMPLATE',bridge:'DOCS_TEXT_BRIDGE'},
    SLIDE:{template:'SLIDE_STRUCTURE_SEED_TEMPLATE',bridge:'SLIDES_BRIDGE'},
    IMAGE:{template:'IMAGE_PACK_SEED_TEMPLATE',bridge:'IMAGE_QUEENS_SEED_BRIDGE'},
    VIDEO:{template:'VIDEO_ANALYSIS_SEED_TEMPLATE',bridge:'VTUBE_CONTENTOS_BRIDGE'},
    AUDIO:{template:'VOICE_AUDIO_SEED_TEMPLATE',bridge:'VOICE_AUDIO_BRIDGE'},
    CODE_DATA:{template:'CODE_WORKFLOW_SEED_TEMPLATE',bridge:'GITHUB_WEBAPP_APPSCRIPT_BRIDGE'},
    GENERAL_FILE:{template:'GENERAL_ASSET_SEED_TEMPLATE',bridge:'DRIVE_RUNTIME_BRIDGE'}
  };
  return map[dataClass] || map.GENERAL_FILE;
}

function inferDriveProjectId_(name, mime) {
  const s = (name + ' ' + mime).toLowerCase();
  if (/travel|여행/.test(s)) return 'P07_TRAVEL';
  if (/interior|인테리어|견적/.test(s)) return 'P06_HOMEDESIGN';
  if (/youtube|content|analyzer|seed/.test(s)) return 'P01_RESEARCH';
  if (/notebook|flow|video|image|audio|voice/.test(s)) return 'P03_MEDIA';
  if (/food|먹방|kfood/.test(s)) return 'P09_FOOD';
  return 'P00_AGENT_CORE';
}

function newDriveAllFileSweepId_() {
  return 'SWEEP_' + Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmmss');
}

function shortHashDriveSeed_(s) {
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s));
  return d.slice(0,10).map(function(b){
    return ('0' + ((b + 256) % 256).toString(16)).slice(-2);
  }).join('').toUpperCase();
}

function safeDriveFileSize_(f) {
  try { return f.getSize(); } catch (_) { return ''; }
}

function safeFn_(fn, fallback) {
  try { return fn(); } catch (_) { return fallback; }
}

function testCentralDriveAllFileSeedFactoryForceX2() {
  const a = runCentralDriveAllFileSeedFactoryFromFactory();
  Utilities.sleep(100);
  const b = runCentralDriveAllFileSeedFactoryFromFactory();
  const ok = a && a.ok !== false && b && b.ok !== false && Number(a.seedPromoted || 0) === 0 && Number(b.seedPromoted || 0) === 0;
  return {
    ok:ok,
    first:a,
    second:b,
    policy:'QUEENS_FIRST_CONTENT_EVIDENCE_REQUIRED_NO_METADATA_ONLY_SEED',
    version:CENTRAL_DRIVE_ALL_FILE_SEED_VERSION
  };
}

/** Deprecated: all-file intake must reuse existing factory wake. */
function installCentralDriveAllFileSeedTrigger() {
  return {
    ok:false,
    blocked:true,
    reason:'NO_NEW_PHYSICAL_TRIGGER_REUSE_PROCESS_TASK_QUEUE',
    version:CENTRAL_DRIVE_ALL_FILE_SEED_VERSION
  };
}
