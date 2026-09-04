const YT_SEED_FACTORY_BRIDGE_VERSION = 'YT_SEED_FACTORY_BRIDGE_V1_20260903';
const YT_SEED_FACTORY_EXPECTED_SCRIPT_ID = '14OHCqUDMAgpqB6JvPw_XQfFH8NlIUlVUK163RrFH1Drz3HxIc53B4IL2';
const YT_SEED_FACTORY_SHEET_ID = '1gBuyuDyRZkRDYwl2DGj6oUWQUS-KnD1alapyTBWZXN8';
const YT_SEED_SOURCE_SHEET_ID = '1vhcZfPBR9rpv9JGEozMVZXfDoL-oyvJsDwutcKQHboM';
const YT_SEED_FACTORY_MAX_PROMOTIONS_PER_RUN = 10;

/**
 * Logical-only YouTube Seed -> Analyzer factory bridge.
 * Called by ContentOS_Unified_Scheduler from the existing processTaskQueue wake.
 * Never creates a trigger, project, deployment, or OAuth grant.
 */
function youtubeSeedToAnalyzerBridgeTick() {
  const scriptId = String(ScriptApp.getScriptId() || '');
  if (scriptId !== YT_SEED_FACTORY_EXPECTED_SCRIPT_ID) {
    return {
      ok: true,
      hold: true,
      reason: 'FACTORY_SCRIPT_ID_MISMATCH',
      expectedScriptId: YT_SEED_FACTORY_EXPECTED_SCRIPT_ID,
      actualScriptId: scriptId,
      version: YT_SEED_FACTORY_BRIDGE_VERSION
    };
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1500)) {
    return {ok: true, skipped: true, reason: 'LOCK_BUSY', version: YT_SEED_FACTORY_BRIDGE_VERSION};
  }

  try {
    const factory = SpreadsheetApp.openById(YT_SEED_FACTORY_SHEET_ID);
    const guard = ytSeedFactoryGuard_(factory);
    if (!guard.ok) return guard;

    const drywriter = ytSeedFactoryRepairDryWriterConfig_(factory);
    const source = SpreadsheetApp.openById(YT_SEED_SOURCE_SHEET_ID);
    const promotion = ytSeedFactoryPromoteFreshVideoSeeds_(source, factory, YT_SEED_FACTORY_MAX_PROMOTIONS_PER_RUN);

    let repairTask = null;
    if (drywriter.resetRows > 0 && promotion.queued === 0) {
      repairTask = ytSeedFactoryQueueRepairCycle_(factory, 'drywriter_property_sync');
    }

    return {
      ok: true,
      version: YT_SEED_FACTORY_BRIDGE_VERSION,
      scriptId: scriptId,
      drywriter: drywriter,
      promotion: promotion,
      repairTask: repairTask,
      at: new Date().toISOString()
    };
  } finally {
    lock.releaseLock();
  }
}

function ytSeedFactoryGuard_(factory) {
  const config = factory.getSheetByName('CONFIG');
  if (!config) return {ok: false, reason: 'SHEET_MISSING:CONFIG', version: YT_SEED_FACTORY_BRIDGE_VERSION};
  const values = config.getRange(1, 1, Math.max(1, config.getLastRow()), 2).getValues();
  const map = {};
  values.forEach(function(r) {
    const key = String(r[0] || '').trim();
    if (key) map[key] = String(r[1] || '').trim();
  });
  if (map.APP_ID !== 'APP_ANALYZER' || map.SLOT_ID !== 'WEBAPP_TEMPLATE_05') {
    return {
      ok: false,
      hold: true,
      reason: 'FACTORY_CONFIG_MISMATCH',
      appId: map.APP_ID || '',
      slotId: map.SLOT_ID || '',
      version: YT_SEED_FACTORY_BRIDGE_VERSION
    };
  }
  return {ok: true, appId: map.APP_ID, slotId: map.SLOT_ID};
}

function ytSeedFactoryRepairDryWriterConfig_(factory) {
  const config = factory.getSheetByName('CONFIG');
  const last = config.getLastRow();
  const rows = last > 1 ? config.getRange(2, 1, last - 1, 2).getValues() : [];
  let url = '';
  rows.some(function(r) {
    if (String(r[0] || '').trim() === 'DRYWRITER_WEBAPP_URL') {
      url = String(r[1] || '').trim();
      return true;
    }
    return false;
  });

  const valid = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(url);
  if (!valid) {
    return {ok: false, hold: true, reason: 'INVALID_OR_MISSING_CONFIG_DRYWRITER_WEBAPP_URL', resetRows: 0};
  }

  const props = PropertiesService.getScriptProperties();
  const before = String(props.getProperty('DRYWRITER_WEBAPP_URL') || '').trim();
  let changed = false;
  if (before !== url) {
    props.setProperty('DRYWRITER_WEBAPP_URL', url);
    changed = true;
  }
  const after = String(props.getProperty('DRYWRITER_WEBAPP_URL') || '').trim();
  if (after !== url) {
    return {ok: false, reason: 'DRYWRITER_SCRIPT_PROPERTY_READBACK_MISMATCH', resetRows: 0};
  }

  const dry = factory.getSheetByName('DRYWRITER_QUEUE');
  let resetRows = 0;
  if (dry && dry.getLastRow() > 1) {
    const rowCount = dry.getLastRow() - 1;
    const values = dry.getRange(2, 1, rowCount, Math.min(dry.getLastColumn(), 9)).getValues();
    for (let i = 0; i < values.length; i++) {
      const status = String(values[i][4] || '').trim();
      const error = String(values[i][8] || '').trim();
      if (status === 'WAITING_BRIDGE' && error === 'DRYWRITER_WEBAPP_URL_NOT_CONFIGURED') {
        dry.getRange(i + 2, 5).setValue('PENDING');
        dry.getRange(i + 2, 9).clearContent();
        resetRows++;
      }
    }
  }

  return {
    ok: true,
    configPresent: true,
    scriptPropertyChanged: changed,
    scriptPropertyPresent: !!after,
    resetRows: resetRows
  };
}

function ytSeedFactoryPromoteFreshVideoSeeds_(source, factory, maxPromotions) {
  const video = source.getSheetByName('Video_Seed');
  const queens = factory.getSheetByName('QUEENS_SOURCE');
  const tasks = factory.getSheetByName('TASK_QUEUE');
  if (!video || !queens || !tasks) {
    return {ok: false, reason: 'REQUIRED_SHEET_MISSING', promoted: 0, queued: 0};
  }

  const sourceHeaders = video.getRange(1, 1, 1, 26).getValues()[0];
  const idx = {};
  sourceHeaders.forEach(function(h, i) { idx[String(h || '').trim()] = i; });
  const required = ['VIDEO_SEED_ID','QUERY','VIDEO_ID','SOURCE_URL','TITLE','QTAG','SUMMARY','SOURCE_ID','FRESHNESS_STATUS','RIGHTS_USAGE','CONFIDENCE','SEED_STATUS','CREATED_AT'];
  const missing = required.filter(function(k) { return typeof idx[k] !== 'number'; });
  if (missing.length) return {ok: false, reason: 'VIDEO_SEED_SCHEMA_MISSING', missing: missing, promoted: 0, queued: 0};

  const existingSourceIds = {};
  if (queens.getLastRow() > 1) {
    const qRows = queens.getRange(2, 1, queens.getLastRow() - 1, 13).getValues();
    qRows.forEach(function(r) { if (r[0]) existingSourceIds[String(r[0])] = true; });
  }

  const existingTaskKeys = {};
  if (tasks.getLastRow() > 1) {
    const taskRows = tasks.getRange(2, 1, tasks.getLastRow() - 1, 13).getValues();
    taskRows.forEach(function(r) { if (r[12]) existingTaskKeys[String(r[12])] = true; });
  }

  const lastRow = video.getLastRow();
  if (lastRow < 2) return {ok: true, promoted: 0, queued: 0, scanned: 0};
  const scanCount = Math.min(500, lastRow - 1);
  const startRow = lastRow - scanCount + 1;
  const rows = video.getRange(startRow, 1, scanCount, 26).getValues();

  let promoted = 0;
  let queued = 0;
  const items = [];
  const now = new Date();

  for (let i = rows.length - 1; i >= 0 && promoted < maxPromotions; i--) {
    const r = rows[i];
    const videoSeedId = String(r[idx.VIDEO_SEED_ID] || '').trim();
    const freshness = String(r[idx.FRESHNESS_STATUS] || '').trim();
    const rights = String(r[idx.RIGHTS_USAGE] || '').trim();
    const seedStatus = String(r[idx.SEED_STATUS] || '').trim();
    const confidence = Number(r[idx.CONFIDENCE] || 0);
    const sourceUrl = String(r[idx.SOURCE_URL] || '').trim();
    const videoId = String(r[idx.VIDEO_ID] || '').trim();
    if (!videoSeedId || freshness !== 'FRESH' || rights !== 'REFERENCE_ONLY' || seedStatus.indexOf('QUALIFIED') !== 0 || confidence < 0.8) continue;
    if (!/^https:\/\/www\.youtube\.com\/watch\?v=/.test(sourceUrl) || !videoId) continue;

    const sourceId = 'YTSYNC_' + videoSeedId;
    if (existingSourceIds[sourceId]) continue;

    const title = String(r[idx.TITLE] || '').trim();
    const summary = String(r[idx.SUMMARY] || '').trim();
    const query = String(r[idx.QUERY] || '').trim();
    const qtag = String(r[idx.QTAG] || '').trim();
    const upstreamSourceId = String(r[idx.SOURCE_ID] || '').trim();
    const createdAt = r[idx.CREATED_AT] instanceof Date ? r[idx.CREATED_AT].toISOString() : String(r[idx.CREATED_AT] || now.toISOString());
    const contentHash = 'YT_' + videoId + '_' + videoSeedId;
    const keywords = [query, qtag, 'YouTube', 'AUTO_SEED_BRIDGE'].filter(Boolean).join(';');

    queens.appendRow([
      sourceId,
      'APP_ANALYZER',
      'VIDEO',
      'YOUTUBE',
      'YOUTUBE_SEED_AUTO',
      title,
      summary,
      keywords,
      sourceUrl,
      'VERIFIED',
      createdAt,
      contentHash,
      'READY'
    ]);
    existingSourceIds[sourceId] = true;
    promoted++;

    const idempotencyKey = 'YT_SEED_FACTORY_' + videoSeedId;
    if (!existingTaskKeys[idempotencyKey]) {
      const taskId = 'TASK_YTSEED_' + Utilities.getUuid();
      const payload = {
        source: 'youtubeSeedToAnalyzerBridgeTick',
        source_id: sourceId,
        video_seed_id: videoSeedId,
        upstream_source_id: upstreamSourceId,
        expected: 'QUEENS_TO_SEED_TO_TEMPLATE1_TO_TEMPLATE2',
        bridge_version: YT_SEED_FACTORY_BRIDGE_VERSION
      };
      tasks.appendRow([taskId, 'APP_ANALYZER', 'FACTORY_CYCLE', JSON.stringify(payload), 'QUEUED', 1, now.toISOString(), '', '', 0, '', '', idempotencyKey]);
      existingTaskKeys[idempotencyKey] = true;
      queued++;
      items.push({sourceId: sourceId, taskId: taskId, videoSeedId: videoSeedId});
    }
  }

  return {ok: true, scanned: scanCount, promoted: promoted, queued: queued, items: items};
}

function ytSeedFactoryQueueRepairCycle_(factory, reason) {
  const tasks = factory.getSheetByName('TASK_QUEUE');
  if (!tasks) return {ok: false, reason: 'SHEET_MISSING:TASK_QUEUE'};
  const now = new Date();
  const hourBucket = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMdd_HH');
  const key = 'YT_SEED_FACTORY_REPAIR_' + String(reason || 'repair') + '_' + hourBucket;
  if (tasks.getLastRow() > 1) {
    const keys = tasks.getRange(2, 13, tasks.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < keys.length; i++) {
      if (String(keys[i][0] || '') === key) return {ok: true, skipped: true, reason: 'IDEMPOTENCY_KEY_EXISTS', idempotencyKey: key};
    }
  }
  const taskId = 'TASK_YTSEED_REPAIR_' + Utilities.getUuid();
  const payload = {source: 'youtubeSeedToAnalyzerBridgeTick', repair_reason: reason || 'repair', bridge_version: YT_SEED_FACTORY_BRIDGE_VERSION};
  tasks.appendRow([taskId, 'APP_ANALYZER', 'FACTORY_CYCLE', JSON.stringify(payload), 'QUEUED', 1, now.toISOString(), '', '', 0, '', '', key]);
  return {ok: true, taskId: taskId, idempotencyKey: key, status: 'QUEUED'};
}

function inspectYoutubeSeedFactoryBridge() {
  const factory = SpreadsheetApp.openById(YT_SEED_FACTORY_SHEET_ID);
  const guard = ytSeedFactoryGuard_(factory);
  return {
    ok: guard.ok === true,
    version: YT_SEED_FACTORY_BRIDGE_VERSION,
    actualScriptId: String(ScriptApp.getScriptId() || ''),
    expectedScriptId: YT_SEED_FACTORY_EXPECTED_SCRIPT_ID,
    guard: guard,
    processTaskQueueTriggerCount: ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction() === 'processTaskQueue'; }).length,
    youtubeSeedBridgePhysicalTriggerCount: ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction() === 'youtubeSeedToAnalyzerBridgeTick'; }).length,
    at: new Date().toISOString()
  };
}
