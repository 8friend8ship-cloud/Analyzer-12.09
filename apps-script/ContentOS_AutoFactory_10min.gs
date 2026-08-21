const CONTENTOS_AUTOFACTORY_VERSION = 'CONTENT_OS_AUTOFACTORY_V2_20260821';
const CONTENTOS_AUTOFACTORY_INTERVAL_MINUTES = 10;
const CONTENTOS_VIDEO_INDEX_PROP = 'CONTENTOS_LAST_VIDEO_INDEX_ROW';
const CONTENTOS_T1_PROP = 'CONTENTOS_LAST_T1_ROW';

function contentOsAutoFactoryTick() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok:false, reason:'LOCK_BUSY', version:CONTENTOS_AUTOFACTORY_VERSION };
  try {
    const sourceSs = SpreadsheetApp.openById(CONTENTOS_SOURCE_SHEET_ID);
    const pipelineSs = SpreadsheetApp.openById(CONTENTOS_PIPELINE_SHEET_ID);
    const source = sourceSs.getSheetByName('Video_Index');
    if (!source) throw new Error('Video_Index missing');

    const props = PropertiesService.getScriptProperties();
    const lastRow = source.getLastRow();
    let cursor = Number(props.getProperty(CONTENTOS_VIDEO_INDEX_PROP) || 1);
    if (cursor < 1) cursor = 1;

    const startRow = Math.max(2, cursor + 1);
    const newCount = Math.max(0, lastRow - startRow + 1);
    const boundedCount = Math.min(newCount, 500);
    const enqueued = [];

    if (boundedCount > 0) {
      const rows = source.getRange(startRow, 1, boundedCount, 10).getDisplayValues();
      const seen = {};
      rows.forEach(function(r) {
        const videoId = String(r[0] || '').trim();
        const title = String(r[1] || '').trim();
        const primaryCode = String(r[3] || '').trim();
        const subKey = String(r[4] || '').trim();
        if (!videoId || !title) return;

        const query = deriveContentOsQuery_(title, primaryCode, subKey);
        if (!query || seen[query]) return;
        seen[query] = true;
        const appId = mapContentOsApp_(primaryCode, title);
        const task = enqueueContentOsQuery(appId, query, 20);
        enqueued.push({ taskId:task.taskId, appId:appId, query:query, sourceVideoId:videoId });
      });
      props.setProperty(CONTENTOS_VIDEO_INDEX_PROP, String(startRow + boundedCount - 1));
    } else if (!props.getProperty(CONTENTOS_VIDEO_INDEX_PROP)) {
      props.setProperty(CONTENTOS_VIDEO_INDEX_PROP, String(lastRow));
    }

    const pipelineRun = contentOsPipelineTick();
    const enrichment = refreshSeedEnrichment_(sourceSs, pipelineSs);
    const animation = enqueueAnimationChecksFromNewT1_(pipelineSs, props);

    appendAutoFactoryLog_(pipelineSs, {
      sourceLastRow:lastRow,
      cursorBefore:cursor,
      scannedNewRows:boundedCount,
      enqueuedCount:enqueued.length,
      processed:Number(pipelineRun && pipelineRun.processed || 0),
      enrichmentUpdated:enrichment.updated,
      enrichmentRequested:enrichment.requested,
      animationQueued:animation.queued,
      status:'PASS'
    });

    return {
      ok:true,
      version:CONTENTOS_AUTOFACTORY_VERSION,
      intervalMinutes:CONTENTOS_AUTOFACTORY_INTERVAL_MINUTES,
      sourceLastRow:lastRow,
      cursorBefore:cursor,
      scannedNewRows:boundedCount,
      enqueued:enqueued,
      pipeline:pipelineRun,
      enrichment:enrichment,
      animation:animation
    };
  } finally {
    lock.releaseLock();
  }
}

function deriveContentOsQuery_(title, primaryCode, subKey) {
  const cleanSub = String(subKey || '').replace(/[|,_-]+/g,' ').trim();
  if (cleanSub.length >= 2) return cleanSub.slice(0,60);
  const tokens = String(title || '')
    .replace(/[\[\](){}<>:;,.!?~"']/g,' ')
    .split(/\s+/)
    .filter(function(x){ return x && x.length >= 2; })
    .slice(0,4);
  if (tokens.length) return tokens.join(' ');
  return String(primaryCode || '').trim();
}

function mapContentOsApp_(primaryCode, title) {
  const text = (String(primaryCode || '') + ' ' + String(title || '')).toUpperCase();
  if (/TRVL|TRAVEL|여행|관광/.test(text)) return 'APP_TRAVEL';
  if (/INTR|INTERIOR|REMODEL|인테리어|리모델링|욕실|주방/.test(text)) return 'APP_INTERIOR';
  if (/FOOD|COOK|라면|요리|레시피|먹방/.test(text)) return 'APP_CONTENT_OS';
  return 'APP_CONTENT_OS';
}

function refreshSeedEnrichment_(sourceSs, pipelineSs) {
  const queens = pipelineSs.getSheetByName('Queens_Work');
  const seed = pipelineSs.getSheetByName('Seed_Work');
  if (!queens || !seed) return { updated:0, requested:0, reason:'QUEENS_OR_SEED_MISSING' };

  const enrich = ensureSeedEnrichmentSheet_(pipelineSs);
  const requestQ = ensureEnrichmentRequestQueue_(pipelineSs);
  const source = sourceSs.getSheetByName('Video_Index');
  const qLast = queens.getLastRow();
  if (qLast < 2) return { updated:0, requested:0 };

  const qRows = queens.getRange(Math.max(2,qLast-199),1,Math.min(200,qLast-1),15).getDisplayValues();
  const existing = enrich.getLastRow() > 1 ? enrich.getRange(2,1,enrich.getLastRow()-1,1).getDisplayValues().map(function(r){return r[0];}) : [];
  const existingMap = {};
  existing.forEach(function(id){ existingMap[String(id)] = true; });
  let updated = 0;
  let requested = 0;

  qRows.forEach(function(q) {
    const queensId = String(q[0] || '');
    const appId = String(q[1] || '');
    const query = String(q[2] || '');
    const videoId = String(q[4] || '');
    const title = String(q[5] || '');
    const channel = String(q[6] || '');
    const sourceUrl = String(q[11] || '');
    if (!queensId || !videoId || existingMap[queensId]) return;

    const metric = findVideoIndexRowById_(source, videoId);
    const rawViews = metric ? String(metric[7] || '') : '';
    const viewCount = (/^\d+$/.test(rawViews) && Number(rawViews) > 0) ? Number(rawViews) : '';
    const viewStatus = viewCount ? 'VERIFIED_STORED' : 'METRIC_REFRESH_REQUIRED';

    const summary = buildRuleSummary_(query, title, channel);
    const keywords = buildSeedKeywords_(query, title);
    const transcriptStatus = 'TRANSCRIPT_REQUIRED';
    const likeStatus = 'LIKE_COUNT_REQUIRED';
    const subscriberStatus = 'SUBSCRIBER_COUNT_REQUIRED';

    enrich.appendRow([
      queensId, appId, query, videoId, title, channel, sourceUrl,
      viewCount, '', '', '', summary, keywords.join('|'),
      viewStatus, likeStatus, subscriberStatus, transcriptStatus,
      'SEED_ENRICHMENT_PARTIAL', new Date(), CONTENTOS_AUTOFACTORY_VERSION
    ]);
    existingMap[queensId] = true;
    updated++;

    const missing = [];
    if (!viewCount) missing.push('VIEW_COUNT');
    missing.push('LIKE_COUNT','SUBSCRIBER_COUNT','TRANSCRIPT');
    requestQ.appendRow([
      'ENRICH_'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMddHHmmss')+'_'+(requested+1),
      queensId, appId, query, videoId, sourceUrl, missing.join('|'),
      'QUEUED', 'API_FREE_OR_APPROVED_BACKEND_ONLY',
      'Do not fabricate zero. Refresh metrics/transcript, then rebuild summary/Seed fields.',
      new Date(), '', CONTENTOS_AUTOFACTORY_VERSION
    ]);
    requested++;
  });
  return { updated:updated, requested:requested };
}

function findVideoIndexRowById_(sheet, videoId) {
  if (!videoId) return null;
  const finder = sheet.getRange('A:A').createTextFinder(videoId).matchEntireCell(true).findNext();
  if (!finder) return null;
  return sheet.getRange(finder.getRow(),1,1,10).getDisplayValues()[0];
}

function buildRuleSummary_(query, title, channel) {
  const t = String(title || '').replace(/\s+/g,' ').trim();
  return (String(query || '') + ' 관련 영상: ' + t + (channel ? ' / 채널 '+channel : '')).slice(0,500);
}

function buildSeedKeywords_(query, title) {
  const text = (String(query || '')+' '+String(title || '')).toLowerCase();
  const out = [];
  String(query || '').split(/\s+/).forEach(function(x){ if (x && out.indexOf(x) < 0) out.push(x); });
  const rules = [
    ['먹방',/먹방|mukbang|eatingshow/],['레시피',/레시피|recipe|끓이는|조리/],['매운맛',/매운|spicy|맵/],
    ['리뷰',/리뷰|review/],['비교',/비교|vs|대결/],['여행',/여행|travel/],['인테리어',/인테리어|interior|리모델링|remodel/]
  ];
  rules.forEach(function(r){ if (r[1].test(text) && out.indexOf(r[0]) < 0) out.push(r[0]); });
  return out.slice(0,20);
}

function ensureSeedEnrichmentSheet_(ss) {
  let sh = ss.getSheetByName('Seed_Enrichment');
  if (!sh) {
    sh = ss.insertSheet('Seed_Enrichment');
    sh.appendRow(['QUEENS_ID','APP_ID','QUERY','VIDEO_ID','TITLE','CHANNEL','SOURCE_URL','VIEW_COUNT','LIKE_COUNT','SUBSCRIBER_COUNT','TRANSCRIPT','SUMMARY','KEYWORDS','VIEW_STATUS','LIKE_STATUS','SUBSCRIBER_STATUS','TRANSCRIPT_STATUS','STATUS','UPDATED_AT','VERSION']);
  }
  return sh;
}

function ensureEnrichmentRequestQueue_(ss) {
  let sh = ss.getSheetByName('Enrichment_Request_Queue');
  if (!sh) {
    sh = ss.insertSheet('Enrichment_Request_Queue');
    sh.appendRow(['REQUEST_ID','QUEENS_ID','APP_ID','QUERY','VIDEO_ID','SOURCE_URL','MISSING_FIELDS','STATUS','COLLECT_POLICY','NOTES','CREATED_AT','COMPLETED_AT','VERSION']);
  }
  return sh;
}

function enqueueAnimationChecksFromNewT1_(pipelineSs, props) {
  const t1 = pipelineSs.getSheetByName('Template_T1');
  if (!t1) return { queued:0, reason:'Template_T1 missing' };
  const queue = ensureAnimationQueue_(pipelineSs);
  const last = t1.getLastRow();
  let cursor = Number(props.getProperty(CONTENTOS_T1_PROP) || 1);
  if (cursor < 1) cursor = 1;
  const start = Math.max(2, cursor + 1);
  if (last < start) {
    if (!props.getProperty(CONTENTOS_T1_PROP)) props.setProperty(CONTENTOS_T1_PROP, String(last));
    return { queued:0, cursor:cursor, lastRow:last };
  }

  const count = Math.min(last - start + 1, 200);
  const rows = t1.getRange(start,1,count,Math.min(11,t1.getLastColumn())).getDisplayValues();
  const out = [];
  rows.forEach(function(r) {
    const t1Id = String(r[0] || '');
    const appId = String(r[1] || '');
    const seedId = String(r[2] || '');
    const query = String(r[3] || '');
    if (!t1Id) return;
    const exists = queue.getLastRow() > 1 && queue.getRange(2,2,queue.getLastRow()-1,1).getDisplayValues().some(function(x){ return x[0] === t1Id; });
    if (exists) return;
    const taskId = 'ANIM_'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMddHHmmss')+'_'+(out.length+1);
    queue.appendRow([
      taskId, t1Id, seedId, appId, query,
      'QUEUED','SEED_T1_ANIMATION_SMOKE_TEST','GITHUB_VERCEL_PREVIEW',
      'check storyboard/image/whiteboard/sketch-motion handoff; use Seed_Enrichment summary/keywords when present',
      new Date(), '', '', CONTENTOS_AUTOFACTORY_VERSION
    ]);
    out.push(taskId);
  });
  props.setProperty(CONTENTOS_T1_PROP, String(start + count - 1));
  return { queued:out.length, taskIds:out, cursorBefore:cursor, cursorAfter:start+count-1 };
}

function ensureAnimationQueue_(ss) {
  let sh = ss.getSheetByName('Animation_Check_Queue');
  if (!sh) {
    sh = ss.insertSheet('Animation_Check_Queue');
    sh.appendRow(['TASK_ID','T1_ID','SEED_ID','APP_ID','QUERY','STATUS','TEST_TYPE','TARGET','NOTES','CREATED_AT','STARTED_AT','COMPLETED_AT','VERSION']);
  }
  return sh;
}

function appendAutoFactoryLog_(ss, data) {
  let sh = ss.getSheetByName('AutoFactory_Log');
  if (!sh) {
    sh = ss.insertSheet('AutoFactory_Log');
    sh.appendRow(['RUN_AT','SOURCE_LAST_ROW','CURSOR_BEFORE','SCANNED_NEW_ROWS','ENQUEUED','PIPELINE_PROCESSED','ENRICHMENT_UPDATED','ENRICHMENT_REQUESTED','ANIMATION_QUEUED','STATUS','VERSION']);
  }
  sh.appendRow([
    new Date(), data.sourceLastRow, data.cursorBefore, data.scannedNewRows,
    data.enqueuedCount, data.processed, data.enrichmentUpdated, data.enrichmentRequested,
    data.animationQueued, data.status, CONTENTOS_AUTOFACTORY_VERSION
  ]);
}

function installContentOsAutoFactory10MinuteTrigger() {
  const handler = 'contentOsAutoFactoryTick';
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === handler || t.getHandlerFunction() === 'contentOsPipelineTick') ScriptApp.deleteTrigger(t);
  });
  const trigger = ScriptApp.newTrigger(handler).timeBased().everyMinutes(CONTENTOS_AUTOFACTORY_INTERVAL_MINUTES).create();
  return { ok:true, handler:handler, everyMinutes:CONTENTOS_AUTOFACTORY_INTERVAL_MINUTES, triggerId:trigger.getUniqueId(), version:CONTENTOS_AUTOFACTORY_VERSION };
}

function testContentOsAutoFactory() {
  const ss = SpreadsheetApp.openById(CONTENTOS_PIPELINE_SHEET_ID);
  const beforePipeline = ss.getSheetByName('Pipeline_Log').getLastRow();
  const result = contentOsAutoFactoryTick();
  const afterPipeline = ss.getSheetByName('Pipeline_Log').getLastRow();
  const animation = ensureAnimationQueue_(ss);
  return {
    ok:!!result.ok,
    pipelineLogDelta:afterPipeline-beforePipeline,
    animationQueueRows:animation.getLastRow()-1,
    result:result,
    version:CONTENTOS_AUTOFACTORY_VERSION
  };
}
