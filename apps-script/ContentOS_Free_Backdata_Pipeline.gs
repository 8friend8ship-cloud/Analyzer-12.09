const CONTENTOS_SOURCE_SHEET_ID = '1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ';
const CONTENTOS_PIPELINE_SHEET_ID = '1vEPZ67A5TgxRZP_SiWOSgqvJ8zXBoWvtT2bZrs8RYLE';
const PIPELINE_VERSION = 'CONTENT_OS_FREE_PIPELINE_V1_20260820';

function contentOsPipelineTick() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok:false, reason:'LOCK_BUSY' };
  try {
    const ss = SpreadsheetApp.openById(CONTENTOS_PIPELINE_SHEET_ID);
    const q = ss.getSheetByName('Query_Queue');
    if (!q) throw new Error('Query_Queue missing');
    const last = q.getLastRow();
    if (last < 2) return { ok:true, processed:0 };
    const rows = q.getRange(2,1,last-1,10).getValues();
    let processed = 0;
    rows.forEach((r,i) => {
      if (String(r[4]) !== 'QUEUED') return;
      const taskId = String(r[0]);
      const appId = String(r[1]);
      const query = String(r[2]);
      const limit = Math.max(1, Math.min(Number(r[3]) || 20, 50));
      q.getRange(i+2,5,1,3).setValues([['RUNNING', r[5] || new Date(), new Date()]]);
      try {
        const result = runContentOsPipeline_(taskId, appId, query, limit);
        q.getRange(i+2,5,1,6).setValues([['DONE', r[5] || new Date(), new Date(), new Date(), result.runId, '']]);
        processed++;
      } catch (e) {
        q.getRange(i+2,5,1,6).setValues([['ERROR', r[5] || new Date(), new Date(), new Date(), '', String(e && e.message || e)]]);
      }
    });
    return { ok:true, processed:processed, version:PIPELINE_VERSION };
  } finally { lock.releaseLock(); }
}

function runContentOsPipeline_(taskId, appId, query, limit) {
  const sourceSs = SpreadsheetApp.openById(CONTENTOS_SOURCE_SHEET_ID);
  const pipelineSs = SpreadsheetApp.openById(CONTENTOS_PIPELINE_SHEET_ID);
  const source = sourceSs.getSheetByName('Video_Index');
  if (!source) throw new Error('Video_Index missing');
  const req = getAppRequirement_(pipelineSs, appId);
  const candidates = searchVideoIndexBounded_(source, query, limit);
  const now = new Date();
  const stamp = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMdd_HHmmss');
  const runId = 'RUN_' + appId + '_' + stamp;
  const queens = writeQueens_(pipelineSs, appId, query, candidates, now);
  const seed = writeSeed_(pipelineSs, appId, query, queens, req, now);
  const t1 = writeT1_(pipelineSs, appId, query, seed, req, now);
  const t2 = writeT2_(pipelineSs, appId, t1, req, now);
  pipelineSs.getSheetByName('Pipeline_Log').appendRow([
    runId, appId, query, queens.length, seed ? 1 : 0, t1 ? 1 : 0, t2 ? 1 : 0,
    candidates.length ? 'PASS' : 'PASS_NO_MATCH', '', now, taskId, PIPELINE_VERSION
  ]);
  return { runId:runId, queens:queens.length, seed:!!seed, t1:!!t1, t2:!!t2 };
}

function searchVideoIndexBounded_(sheet, query, limit) {
  const lastRow = sheet.getLastRow();
  const chunk = 5000;
  const maxScan = Math.min(lastRow, 100000); // quota-safe bounded scan
  const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  const out = [];
  for (let start=2; start<=maxScan && out.length<limit; start+=chunk) {
    const count = Math.min(chunk, maxScan-start+1);
    const values = sheet.getRange(start,1,count,10).getDisplayValues();
    for (let i=0;i<values.length && out.length<limit;i++) {
      const r = values[i];
      const hay = (r[1]+' '+r[2]+' '+r[3]+' '+r[4]+' '+r[5]+' '+r[6]).toLowerCase();
      if (!terms.every(t => hay.indexOf(t) !== -1)) continue;
      out.push({
        videoId:r[0], title:r[1], channel:r[2], primaryCode:r[3], subKey:r[4], nodeTag:r[5],
        country:r[6], viewCount:r[7], publishedAt:r[8], lastSync:r[9],
        url:'https://www.youtube.com/watch?v='+r[0]
      });
    }
  }
  return out;
}

function writeQueens_(ss, appId, query, candidates, now) {
  const sh = ss.getSheetByName('Queens_Work');
  const rows = candidates.map((c,i) => [
    'Q_'+Utilities.formatDate(now,'Asia/Seoul','yyyyMMddHHmmss')+'_'+(i+1), appId, query,
    'CENTRAL_YOUTUBE_STORED', c.videoId, c.title, c.channel, c.primaryCode, c.subKey, c.nodeTag,
    c.publishedAt, c.url, c.primaryCode === 'TRVL' ? 'HIGH' : 'MEDIUM', 'QUEENS_READY', now
  ]);
  if (rows.length) sh.getRange(sh.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
  return rows;
}

function writeSeed_(ss, appId, query, queens, req, now) {
  if (!queens.length) return null;
  const seedId = 'SEED_'+appId+'_'+Utilities.formatDate(now,'Asia/Seoul','yyyyMMddHHmmss');
  const sourceIds = queens.map(r=>r[0]).join('|');
  const titles = queens.map(r=>r[5]);
  const demand = titles.slice(0,10).join(' / ');
  const rules = 'stored video is secondary demand signal; verify live price/transit/availability with approved project Queens before factual T1';
  const gaps = appId === 'APP_TRAVEL' ? 'live fare, timetable, hotel, restaurant hours, booking availability, official map links' : 'app-specific live facts';
  ss.getSheetByName('Seed_Work').appendRow([seedId,appId,query,sourceIds,'SECONDARY_DEMAND_SIGNAL','stored-data-only',demand,rules,gaps,'SEED_READY_REVIEW_REQUIRED',now,PIPELINE_VERSION]);
  return seedId;
}

function writeT1_(ss, appId, query, seedId, req, now) {
  if (!seedId) return null;
  const id = 'T1_'+appId+'_'+Utilities.formatDate(now,'Asia/Seoul','yyyyMMddHHmmss');
  ss.getSheetByName('Template_T1').appendRow([
    id, appId, seedId, query, req.t1Mode, req.queensNeed,
    'PROJECT_QUEENS=PRIMARY_FACT; CENTRAL_YOUTUBE=SECONDARY_DEMAND_SIGNAL', req.media,
    'T1_READY_FOR_CENTRAL_REVIEW', now, PIPELINE_VERSION
  ]);
  return id;
}

function writeT2_(ss, appId, t1Id, req, now) {
  if (!t1Id) return null;
  const id = 'T2_'+appId+'_'+Utilities.formatDate(now,'Asia/Seoul','yyyyMMddHHmmss');
  ss.getSheetByName('Template_T2').appendRow([
    id, appId, t1Id, req.t2Mode,
    'persona only as lens; never replace fact evidence', req.media,
    'reuse stored assets first; create only missing assets',
    'locale pack + app-specific UI package', req.verifyGate,
    'T2_READY_FOR_FRONT_PACKAGE', now, PIPELINE_VERSION
  ]);
  return id;
}

function getAppRequirement_(ss, appId) {
  const sh = ss.getSheetByName('App_Requirement');
  const data = sh.getDataRange().getDisplayValues();
  for (let i=1;i<data.length;i++) {
    if (String(data[i][0]) === appId) return {
      queensNeed:data[i][1], t1Mode:data[i][2], t2Mode:data[i][3], media:data[i][4], verifyGate:data[i][5]
    };
  }
  return { queensNeed:'verified sources', t1Mode:'structured first template', t2Mode:'front package', media:'as required', verifyGate:'readback x2' };
}

function enqueueContentOsQuery(appId, query, limit) {
  const ss = SpreadsheetApp.openById(CONTENTOS_PIPELINE_SHEET_ID);
  const sh = ss.getSheetByName('Query_Queue');
  const taskId = 'TASK_'+appId+'_'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMddHHmmss');
  sh.appendRow([taskId,appId,query,limit||20,'QUEUED',new Date(),'','','','']);
  return { ok:true, taskId:taskId };
}

function installContentOsPipelineTrigger() {
  const handler = 'contentOsPipelineTick';
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === handler).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(handler).timeBased().everyMinutes(15).create();
  return { ok:true, handler:handler, cadence:'15m', version:PIPELINE_VERSION };
}

function testContentOsPipeline() {
  const ss = SpreadsheetApp.openById(CONTENTOS_PIPELINE_SHEET_ID);
  const before = ss.getSheetByName('Pipeline_Log').getLastRow();
  const task = enqueueContentOsQuery('APP_TRAVEL','일본 여행',20);
  const result1 = contentOsPipelineTick();
  const result2 = contentOsPipelineTick();
  const after = ss.getSheetByName('Pipeline_Log').getLastRow();
  return { ok:after>before, task:task, first:result1, second:result2, logDelta:after-before, version:PIPELINE_VERSION };
}
