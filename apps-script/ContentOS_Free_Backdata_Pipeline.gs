const CONTENTOS_SOURCE_SHEET_ID = '1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ';
const CONTENTOS_PIPELINE_SHEET_ID = '1vEPZ67A5TgxRZP_SiWOSgqvJ8zXBoWvtT2bZrs8RYLE';
const PIPELINE_VERSION = 'CONTENT_OS_FREE_PIPELINE_V3_20260821';

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
  const expandedQueries = expandContentOsQueries_(query);
  const candidates = searchExpandedQueries_(source, expandedQueries, limit);
  const refresh = candidates.length ? null : queueExpandedKeywordRefresh_(sourceSs, appId, query, expandedQueries);
  const now = new Date();
  const stamp = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMdd_HHmmss');
  const runId = 'RUN_' + appId + '_' + stamp;
  const queens = writeQueens_(pipelineSs, appId, query, candidates, now);
  const seed = writeSeed_(pipelineSs, appId, query, queens, req, now);
  const t1 = writeT1_(pipelineSs, appId, query, seed, req, now);
  const t2 = writeT2_(pipelineSs, appId, t1, req, now);
  pipelineSs.getSheetByName('Pipeline_Log').appendRow([
    runId, appId, query, queens.length, seed ? 1 : 0, t1 ? 1 : 0, t2 ? 1 : 0,
    candidates.length ? 'PASS_EXPANDED_KEYWORD' : 'QUEENS_EXPANDED_REFRESH_QUEUED',
    expandedQueries.join('|'), now, taskId, PIPELINE_VERSION
  ]);
  return { runId:runId, queens:queens.length, seed:!!seed, t1:!!t1, t2:!!t2, refresh:refresh, expandedQueries:expandedQueries };
}

function normalizeContentOsQuery_(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '').replace(/[^0-9a-z가-힣]/g, '');
}

function correctCommonQueryTypos_(query) {
  let q = String(query || '').trim();
  const rules = [
    [/잠원/g, '잠언'],
    [/불닭복음/g, '불닭볶음'],
    [/불닭볶음면면/g, '불닭볶음면']
  ];
  rules.forEach(r => q = q.replace(r[0], r[1]));
  return q;
}

function expandContentOsQueries_(query) {
  const raw = String(query || '').trim();
  const corrected = correctCommonQueryTypos_(raw);
  const out = [];
  const add = v => {
    v = String(v || '').trim().replace(/\s+/g, ' ');
    if (v && out.indexOf(v) === -1) out.push(v);
  };
  add(raw);
  add(corrected);
  corrected.split(/\s+/).forEach(add);

  const n = normalizeContentOsQuery_(corrected);
  if (n.indexOf('잠언') !== -1 || (n.indexOf('성경') !== -1 && n.indexOf('묵상') !== -1)) {
    ['잠언','잠언 묵상','성경 묵상 잠언','잠언 말씀','잠언 지혜','잠언 오늘의 말씀','잠언 쇼츠'].forEach(add);
  }
  if ((n.indexOf('ai') !== -1 || n.indexOf('인공지능') !== -1) && (n.indexOf('주식') !== -1 || n.indexOf('투자') !== -1)) {
    ['AI주식','인공지능 주식','AI 투자','AI 반도체 주식','AI 데이터센터 주식','AI 기업 투자'].forEach(add);
  }
  if (n.indexOf('여행') !== -1) {
    const place = corrected.replace(/여행/g,'').trim();
    if (place) [place+' 여행',place+' 맛집',place+' 가볼만한곳',place+' 일정',place+' 브이로그'].forEach(add);
  }
  if (n.indexOf('먹방') !== -1) {
    [corrected.replace(/먹방/g,'').trim(), corrected, corrected+' 쇼츠', corrected+' 리뷰'].forEach(add);
  }
  return out.slice(0, 12);
}

function searchExpandedQueries_(sheet, queries, limit) {
  const out = [];
  const seen = {};
  for (let qi=0; qi<queries.length && out.length<limit; qi++) {
    const found = searchVideoIndexBounded_(sheet, queries[qi], limit - out.length);
    found.forEach(v => {
      if (!v.videoId || seen[v.videoId]) return;
      seen[v.videoId] = true;
      v.matchedQuery = queries[qi];
      out.push(v);
    });
  }
  return out;
}

function searchKeywordVideoMap_(sheet, query, limit) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const target = normalizeContentOsQuery_(query);
  const last = sheet.getLastRow();
  const start = Math.max(2, last - 19999);
  const values = sheet.getRange(start, 1, last - start + 1, 18).getDisplayValues();
  const out = [];
  const seen = {};
  for (let i = values.length - 1; i >= 0 && out.length < limit; i--) {
    const r = values[i];
    const key = normalizeContentOsQuery_(r[0]);
    const hay = normalizeContentOsQuery_([r[0], r[3], r[4], r[14], r[15]].join(' '));
    if (key !== target && hay.indexOf(target) === -1) continue;
    const videoId = String(r[1] || '');
    if (!videoId || seen[videoId]) continue;
    seen[videoId] = true;
    out.push({
      videoId:videoId, title:r[3], channel:r[4], primaryCode:'YT', subKey:r[0] || query,
      nodeTag:r[14] || '', country:(String(r[14] || '').indexOf('|KR') !== -1 ? 'KR' : 'GLOBAL'),
      viewCount:r[6], publishedAt:r[5], lastSync:r[16], url:r[2] || ('https://www.youtube.com/watch?v=' + videoId)
    });
  }
  return out;
}

function searchVideoIndexBounded_(sheet, query, limit) {
  const mapped = searchKeywordVideoMap_(sheet.getParent().getSheetByName('Keyword_Video_Map'), query, limit);
  if (mapped.length) return mapped;
  const lastRow = sheet.getLastRow();
  const chunk = 5000;
  const firstRow = Math.max(2, lastRow - 99999);
  const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  const out = [];
  for (let end=lastRow; end>=firstRow && out.length<limit; end-=chunk) {
    const start = Math.max(firstRow, end-chunk+1);
    const count = end-start+1;
    const values = sheet.getRange(start,1,count,10).getDisplayValues();
    for (let i=values.length-1;i>=0 && out.length<limit;i--) {
      const r = values[i];
      const hay = (r[1]+' '+r[2]+' '+r[3]+' '+r[4]+' '+r[5]+' '+r[6]).toLowerCase();
      if (!terms.every(t => hay.indexOf(t) !== -1)) continue;
      out.push({
        videoId:r[0], title:r[1], channel:r[2], primaryCode:r[3], subKey:r[4], nodeTag:r[5],
        country:r[6], viewCount:r[7], publishedAt:r[8], lastSync:r[9], url:'https://www.youtube.com/watch?v='+r[0]
      });
    }
  }
  return out;
}

function queueExpandedKeywordRefresh_(sourceSs, appId, originalQuery, expandedQueries) {
  const sh = sourceSs.getSheetByName('Keyword_Query_Log');
  if (!sh) return { queued:false, reason:'Keyword_Query_Log missing' };
  const now = new Date();
  const queued = [];
  expandedQueries.forEach((q, idx) => {
    const target = normalizeContentOsQuery_(q);
    const last = sh.getLastRow();
    let existingRow = 0;
    if (last >= 2) {
      const start = Math.max(2, last - 4999);
      const values = sh.getRange(start,1,last-start+1,12).getDisplayValues();
      for (let i=values.length-1;i>=0;i--) {
        if (normalizeContentOsQuery_(values[i][1]) === target) { existingRow = start+i; break; }
      }
    }
    const derived = expandedQueries.join('|');
    if (existingRow) {
      const old = sh.getRange(existingRow,1,1,12).getDisplayValues()[0];
      sh.getRange(existingRow,3,1,10).setValues([[
        appId || old[2] || 'APP_CONTENT_OS', idx===0 ? 'NEW_KEYWORD_DISCOVERY' : 'EXPANDED_KEYWORD_DISCOVERY',
        Number(old[4]) || 0, old[5] || '', derived, old[7] || '', now, 'N', 'Y',
        'AUTO_EXPAND_REQUEUED: '+originalQuery+' → '+q+'; collect before Queens research'
      ]]);
      queued.push(old[0]);
    } else {
      const queryId = 'QRY_' + Utilities.formatDate(now,'Asia/Seoul','yyyyMMdd_HHmmss') + '_' + (idx+1);
      sh.appendRow([queryId,q,appId || 'APP_CONTENT_OS',idx===0?'NEW_KEYWORD_DISCOVERY':'EXPANDED_KEYWORD_DISCOVERY',0,'',derived,'',now,'N','Y','AUTO_EXPANDED_FROM='+originalQuery]);
      queued.push(queryId);
    }
  });
  return { queued:true, queryIds:queued, expandedQueries:expandedQueries };
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
  const rules = 'stored video is secondary demand signal; verify live facts with approved project Queens before factual T1';
  const gaps = appId === 'APP_TRAVEL' ? 'live fare, timetable, hotel, restaurant hours, booking availability, official map links' : 'app-specific live facts';
  ss.getSheetByName('Seed_Work').appendRow([seedId,appId,query,sourceIds,'SECONDARY_DEMAND_SIGNAL','stored-data-only',demand,rules,gaps,'SEED_READY_REVIEW_REQUIRED',now,PIPELINE_VERSION]);
  return seedId;
}

function writeT1_(ss, appId, query, seedId, req, now) {
  if (!seedId) return null;
  const id = 'T1_'+appId+'_'+Utilities.formatDate(now,'Asia/Seoul','yyyyMMddHHmmss');
  ss.getSheetByName('Template_T1').appendRow([id,appId,seedId,query,req.t1Mode,req.queensNeed,'PROJECT_QUEENS=PRIMARY_FACT; CENTRAL_YOUTUBE=SECONDARY_DEMAND_SIGNAL',req.media,'T1_READY_FOR_CENTRAL_REVIEW',now,PIPELINE_VERSION]);
  return id;
}

function writeT2_(ss, appId, t1Id, req, now) {
  if (!t1Id) return null;
  const id = 'T2_'+appId+'_'+Utilities.formatDate(now,'Asia/Seoul','yyyyMMddHHmmss');
  ss.getSheetByName('Template_T2').appendRow([id,appId,t1Id,req.t2Mode,'persona only as lens; never replace fact evidence',req.media,'reuse stored assets first; create only missing assets','locale pack + app-specific UI package',req.verifyGate,'T2_READY_FOR_FRONT_PACKAGE',now,PIPELINE_VERSION]);
  return id;
}

function getAppRequirement_(ss, appId) {
  const sh = ss.getSheetByName('App_Requirement');
  const data = sh.getDataRange().getDisplayValues();
  for (let i=1;i<data.length;i++) {
    if (String(data[i][0]) === appId) return { queensNeed:data[i][1], t1Mode:data[i][2], t2Mode:data[i][3], media:data[i][4], verifyGate:data[i][5] };
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
  const existing = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'contentOsPipelineTick');
  return { ok:true, installed:false, duplicateTriggerCount:existing.length, handler:'contentOsPipelineTick', policy:'REUSE_EXISTING_CENTRAL_FACTORY_TRIGGER', version:PIPELINE_VERSION };
}

function testContentOsPipeline() {
  const ss = SpreadsheetApp.openById(CONTENTOS_PIPELINE_SHEET_ID);
  const before = ss.getSheetByName('Pipeline_Log').getLastRow();
  const task = enqueueContentOsQuery('APP_CONTENT_OS','성경묵상 잠원',20);
  const result1 = contentOsPipelineTick();
  const result2 = contentOsPipelineTick();
  const after = ss.getSheetByName('Pipeline_Log').getLastRow();
  return { ok:after>before, task:task, first:result1, second:result2, logDelta:after-before, version:PIPELINE_VERSION };
}
