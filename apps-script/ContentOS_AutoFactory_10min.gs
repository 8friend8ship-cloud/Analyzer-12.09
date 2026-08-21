const CONTENTOS_AUTOFACTORY_VERSION = 'CONTENT_OS_AUTOFACTORY_V1_20260821';
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
    const animation = enqueueAnimationChecksFromNewT1_(pipelineSs, props);

    appendAutoFactoryLog_(pipelineSs, {
      sourceLastRow:lastRow,
      cursorBefore:cursor,
      scannedNewRows:boundedCount,
      enqueuedCount:enqueued.length,
      processed:Number(pipelineRun && pipelineRun.processed || 0),
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
      'QUEUED',
      'SEED_T1_ANIMATION_SMOKE_TEST',
      'GITHUB_VERCEL_PREVIEW',
      'check storyboard/image/whiteboard/sketch-motion handoff; no paid AI required for smoke test',
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
    sh.appendRow(['RUN_AT','SOURCE_LAST_ROW','CURSOR_BEFORE','SCANNED_NEW_ROWS','ENQUEUED','PIPELINE_PROCESSED','ANIMATION_QUEUED','STATUS','VERSION']);
  }
  sh.appendRow([
    new Date(), data.sourceLastRow, data.cursorBefore, data.scannedNewRows,
    data.enqueuedCount, data.processed, data.animationQueued, data.status, CONTENTOS_AUTOFACTORY_VERSION
  ]);
}

function installContentOsAutoFactory10MinuteTrigger() {
  const handler = 'contentOsAutoFactoryTick';
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === handler || t.getHandlerFunction() === 'contentOsPipelineTick') {
      ScriptApp.deleteTrigger(t);
    }
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
