const CONTENTOS_BRIDGE_SOURCE_SHEET_ID = '1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ';
const CONTENTOS_BRIDGE_CENTRAL_MASTER_ID = '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI';
const CONTENTOS_BRIDGE_ANALYZER_FACTORY_ID = '1gBuyuDyRZkRDYwl2DGj6oUWQUS-KnD1alapyTBWZXN8';
const CONTENTOS_BRIDGE_VERSION = 'CONTENTOS_QUEENS_YOUTUBE_BRIDGE_V1_20260821';

function contentOsQueensBridgeTick() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return {ok:false, reason:'LOCK_BUSY', version:CONTENTOS_BRIDGE_VERSION};
  try {
    const sourceSs = SpreadsheetApp.openById(CONTENTOS_BRIDGE_SOURCE_SHEET_ID);
    const centralSs = SpreadsheetApp.openById(CONTENTOS_BRIDGE_CENTRAL_MASTER_ID);
    const log = sourceSs.getSheetByName('Keyword_Query_Log');
    if (!log) throw new Error('Keyword_Query_Log missing');

    const last = log.getLastRow();
    if (last < 2) return {ok:true, scanned:0, queued:0, promoted:0, version:CONTENTOS_BRIDGE_VERSION};
    const start = Math.max(2, last - 4999);
    const rows = log.getRange(start, 1, last - start + 1, 12).getDisplayValues();
    let scanned = 0, queued = 0, promoted = 0;
    const details = [];

    for (let i = rows.length - 1; i >= 0 && scanned < 25; i--) {
      const r = rows[i];
      const appId = String(r[2] || '');
      const needsRefresh = String(r[10] || '').toUpperCase();
      if (appId !== 'APP_CONTENT_OS' && appId !== 'APP_ANALYZER') continue;
      if (needsRefresh !== 'Y') continue;
      scanned++;

      const queryId = String(r[0] || '');
      const query = String(r[1] || '').trim();
      if (!query) continue;
      const expanded = typeof expandContentOsQueries_ === 'function' ? expandContentOsQueries_(query) : [query];
      const q = ensureCentralQueensTask_(centralSs, queryId, query, expanded);
      if (q.created || q.requeued) queued++;

      const verified = verifyContentOsQueensCollection_(sourceSs, queryId, query, expanded);
      let seed = null;
      if (verified.ok) {
        seed = promoteVerifiedQueensToCentralSeed_(centralSs, sourceSs, queryId, query, expanded, verified);
        if (seed && seed.ok) promoted++;
      }
      details.push({queryId:queryId, query:query, queue:q, verified:verified, seed:seed});
    }

    return {ok:true, scanned:scanned, queued:queued, promoted:promoted, details:details, version:CONTENTOS_BRIDGE_VERSION};
  } finally {
    lock.releaseLock();
  }
}

function ensureCentralQueensTask_(centralSs, queryId, query, expandedQueries) {
  const sh = centralSs.getSheetByName('14_QUEENS_RESEARCH_QUEUE');
  if (!sh) return {ok:false, reason:'14_QUEENS_RESEARCH_QUEUE missing'};
  const target = normalizeBridgeKeyword_(query);
  const last = sh.getLastRow();
  const start = Math.max(2, last - 1999);
  if (last >= 2) {
    const rows = sh.getRange(start, 1, last - start + 1, 16).getDisplayValues();
    for (let i = rows.length - 1; i >= 0; i--) {
      if (normalizeBridgeKeyword_(rows[i][3]) !== target) continue;
      const row = start + i;
      const status = String(rows[i][10] || '').toUpperCase();
      if (status === 'COMPLETED' && Number(rows[i][13] || 0) > 0) {
        return {ok:true, created:false, requeued:false, taskId:rows[i][0], status:status};
      }
      sh.getRange(row, 1, 1, 16).setValues([[
        rows[i][0] || ('Q_CONTENTOS_' + queryId),
        'APP_CONTENT_OS',
        'NEW_KEYWORD_ON_DEMAND',
        query,
        rows[i][4] || 'KR',
        rows[i][5] || 'ko-KR',
        rows[i][6] || '7d',
        Number(rows[i][7]) || 50,
        'QUEENS_YOUTUBE',
        'P0',
        'READY',
        new Date(),
        rows[i][12] || '',
        Number(rows[i][13]) || 0,
        '',
        new Date()
      ]]);
      return {ok:true, created:false, requeued:true, taskId:rows[i][0], status:'READY'};
    }
  }
  const taskId = 'Q_CONTENTOS_' + (queryId || Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmmss'));
  sh.appendRow([
    taskId,'APP_CONTENT_OS','NEW_KEYWORD_ON_DEMAND',query,'KR','ko-KR','7d',50,
    'QUEENS_YOUTUBE','P0','READY',new Date(),' ',0,'',new Date()
  ]);
  return {ok:true, created:true, requeued:false, taskId:taskId, status:'READY', expandedQueries:expandedQueries};
}

function verifyContentOsQueensCollection_(sourceSs, queryId, query, expandedQueries) {
  const qlog = sourceSs.getSheetByName('Keyword_Query_Log');
  const map = sourceSs.getSheetByName('Keyword_Video_Map');
  const rank = sourceSs.getSheetByName('Keyword_Rank');
  if (!qlog || !map || !rank) return {ok:false, reason:'required Queens tabs missing'};

  const qrow = findQueryLogRow_(qlog, queryId, query);
  if (!qrow) return {ok:false, reason:'query log row missing'};
  const resultCount = Number(qrow.values[4] || 0);
  const needsRefresh = String(qrow.values[10] || '').toUpperCase();
  if (resultCount <= 0 || needsRefresh === 'Y') {
    return {ok:false, reason:'collection pending', resultCount:resultCount, needsRefresh:needsRefresh};
  }

  const mapHits = findKeywordMapHits_(map, expandedQueries, 20);
  if (!mapHits.length) return {ok:false, reason:'Keyword_Video_Map readback missing', resultCount:resultCount};
  const rankHit = findKeywordRankHit_(rank, expandedQueries);
  return {
    ok:true,
    resultCount:resultCount,
    topVideoId:String(qrow.values[5] || mapHits[0].videoId || ''),
    mapHits:mapHits,
    rankHit:rankHit,
    queryRow:qrow.row
  };
}

function findQueryLogRow_(sh, queryId, query) {
  const last = sh.getLastRow();
  if (last < 2) return null;
  const start = Math.max(2, last - 4999);
  const rows = sh.getRange(start, 1, last - start + 1, 12).getDisplayValues();
  const target = normalizeBridgeKeyword_(query);
  for (let i = rows.length - 1; i >= 0; i--) {
    if ((queryId && String(rows[i][0]) === queryId) || normalizeBridgeKeyword_(rows[i][1]) === target) {
      return {row:start + i, values:rows[i]};
    }
  }
  return null;
}

function findKeywordMapHits_(sh, queries, limit) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  const start = Math.max(2, last - 19999);
  const rows = sh.getRange(start, 1, last - start + 1, 18).getDisplayValues();
  const targets = {};
  (queries || []).forEach(q => targets[normalizeBridgeKeyword_(q)] = true);
  const out = [], seen = {};
  for (let i = rows.length - 1; i >= 0 && out.length < limit; i--) {
    const key = normalizeBridgeKeyword_(rows[i][0]);
    if (!targets[key]) continue;
    const videoId = String(rows[i][1] || '');
    if (!videoId || seen[videoId]) continue;
    seen[videoId] = true;
    out.push({
      row:start+i,
      keyword:rows[i][0],
      videoId:videoId,
      url:rows[i][2],
      title:rows[i][3],
      channel:rows[i][4],
      publishedAt:rows[i][5],
      views:rows[i][6],
      qtag:rows[i][14],
      summary:rows[i][15]
    });
  }
  return out;
}

function findKeywordRankHit_(sh, queries) {
  const last = sh.getLastRow();
  if (last < 2) return null;
  const start = Math.max(2, last - 4999);
  const rows = sh.getRange(start, 1, last - start + 1, 20).getDisplayValues();
  const targets = {};
  (queries || []).forEach(q => targets[normalizeBridgeKeyword_(q)] = true);
  for (let i = rows.length - 1; i >= 0; i--) {
    if (!targets[normalizeBridgeKeyword_(rows[i][0])]) continue;
    return {row:start+i, keyword:rows[i][0], rank:rows[i][1], score:rows[i][2], videoCount:rows[i][3], topVideoId:rows[i][12], trendStatus:rows[i][15]};
  }
  return null;
}

function promoteVerifiedQueensToCentralSeed_(centralSs, sourceSs, queryId, query, expandedQueries, verified) {
  const sh = centralSs.getSheetByName('35_INTERNAL_SEED_REGISTRY');
  if (!sh) return {ok:false, reason:'35_INTERNAL_SEED_REGISTRY missing'};
  const topicId = 'CONTENTOS_YT_' + normalizeBridgeKeyword_(query).toUpperCase();
  const hits = verified.mapHits || [];
  const sourceIds = hits.map(h => h.videoId).join('|');
  const seedText = buildDeterministicSeedText_(query, expandedQueries, hits, verified.rankHit);
  const evidence = 'QLOG=' + queryId + ';MAP_ROWS=' + hits.map(h => h.row).join(',') + ';RANK_ROW=' + (verified.rankHit ? verified.rankHit.row : 'NONE');
  const last = sh.getLastRow();
  if (last >= 2) {
    const start = Math.max(2, last - 4999);
    const rows = sh.getRange(start, 1, last - start + 1, 14).getDisplayValues();
    for (let i = rows.length - 1; i >= 0; i--) {
      if (String(rows[i][4]) !== topicId) continue;
      const row = start+i;
      sh.getRange(row, 1, 1, 14).setValues([[
        rows[i][0] || ('SEED_CONTENTOS_YT_' + Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmmss')),
        'APP_CONTENT_OS','CONTENT_OS_QUEENS_YOUTUBE_BRIDGE',sourceIds,topicId,seedText,
        CONTENTOS_BRIDGE_VERSION,'COLLECTION_VERIFIED','SEED_READY_AUTO_ROUTE_T1',
        rows[i][9] || new Date(),new Date(),'','',evidence
      ]]);
      return {ok:true, created:false, seedId:rows[i][0], row:row};
    }
  }
  const seedId = 'SEED_CONTENTOS_YT_' + Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmmss');
  sh.appendRow([
    seedId,'APP_CONTENT_OS','CONTENT_OS_QUEENS_YOUTUBE_BRIDGE',sourceIds,topicId,seedText,
    CONTENTOS_BRIDGE_VERSION,'COLLECTION_VERIFIED','SEED_READY_AUTO_ROUTE_T1',
    new Date(),new Date(),'','',evidence
  ]);
  return {ok:true, created:true, seedId:seedId, row:sh.getLastRow()};
}

function buildDeterministicSeedText_(query, expandedQueries, hits, rankHit) {
  const titles = (hits || []).slice(0,10).map(h => h.title).filter(Boolean);
  const tags = [];
  (hits || []).forEach(h => String(h.qtag || '').split('|').forEach(t => { if (t && tags.indexOf(t) === -1) tags.push(t); }));
  return [
    '검색어=' + query,
    '확장키워드=' + (expandedQueries || []).join('|'),
    '수집영상=' + hits.length,
    '상위제목=' + titles.join(' / '),
    '태그=' + tags.join('|'),
    '랭크=' + (rankHit ? (rankHit.rank + '/' + rankHit.score) : 'N/A'),
    '규칙=YouTube 데이터는 수요/트렌드 보조신호이며 프로젝트 사실근거를 대체하지 않음'
  ].join('; ');
}

function contentOsQueensBridgeHealth() {
  const sourceSs = SpreadsheetApp.openById(CONTENTOS_BRIDGE_SOURCE_SHEET_ID);
  const centralSs = SpreadsheetApp.openById(CONTENTOS_BRIDGE_CENTRAL_MASTER_ID);
  const factorySs = SpreadsheetApp.openById(CONTENTOS_BRIDGE_ANALYZER_FACTORY_ID);
  const sourceTabs = ['Keyword_Query_Log','Keyword_Rank','Keyword_Video_Map','Video_Index'];
  const centralTabs = ['14_QUEENS_RESEARCH_QUEUE','35_INTERNAL_SEED_REGISTRY','36_AUTOMATION_TRIGGER_REGISTRY'];
  const missing = [];
  sourceTabs.forEach(n => { if (!sourceSs.getSheetByName(n)) missing.push('SOURCE:'+n); });
  centralTabs.forEach(n => { if (!centralSs.getSheetByName(n)) missing.push('CENTRAL:'+n); });
  ['TASK_QUEUE','TRIGGER_LOG'].forEach(n => { if (!factorySs.getSheetByName(n)) missing.push('FACTORY:'+n); });
  const triggerState = readCentralTriggerState_(centralSs, 'TRG_FACTORY_ANALYZER_5M');
  const pipelineState = readCentralTriggerState_(centralSs, 'TRG_CONTENT_OS_PIPELINE_REUSE');
  return {ok:missing.length===0 && triggerState.runtimeVerified, missing:missing, analyzerTrigger:triggerState, contentOsPipeline:pipelineState, version:CONTENTOS_BRIDGE_VERSION};
}

function readCentralTriggerState_(centralSs, triggerId) {
  const sh = centralSs.getSheetByName('36_AUTOMATION_TRIGGER_REGISTRY');
  if (!sh) return {found:false, runtimeVerified:false};
  const last = sh.getLastRow();
  const rows = sh.getRange(2,1,Math.max(0,last-1),16).getDisplayValues();
  for (let i=rows.length-1;i>=0;i--) {
    if (String(rows[i][0]) !== triggerId) continue;
    return {
      found:true,
      triggerId:triggerId,
      handler:rows[i][3],
      intervalMin:rows[i][4],
      installState:rows[i][10],
      lastRunAt:rows[i][12],
      lastStatus:rows[i][13],
      version:rows[i][14],
      runtimeVerified:String(rows[i][10]).indexOf('RUNTIME_VERIFIED') !== -1 && String(rows[i][13]).indexOf('SUCCESS') !== -1
    };
  }
  return {found:false, runtimeVerified:false, triggerId:triggerId};
}

function enqueueContentOsBridgeHealthProbe() {
  const ss = SpreadsheetApp.openById(CONTENTOS_BRIDGE_ANALYZER_FACTORY_ID);
  const sh = ss.getSheetByName('TASK_QUEUE');
  if (!sh) throw new Error('TASK_QUEUE missing');
  const key = 'CONTENTOS_QUEENS_BRIDGE_HEALTH_' + Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmm');
  const last = sh.getLastRow();
  if (last >= 2) {
    const start = Math.max(2,last-199);
    const rows = sh.getRange(start,1,last-start+1,13).getDisplayValues();
    for (let i=rows.length-1;i>=0;i--) if (String(rows[i][12]) === key) return {ok:true, created:false, taskId:rows[i][0], status:rows[i][4], idempotencyKey:key};
  }
  const taskId = 'TASK_CONTENTOS_BRIDGE_' + Utilities.getUuid();
  sh.appendRow([taskId,'APP_ANALYZER','HEALTH',JSON.stringify({source:'content_os_queens_bridge',version:CONTENTOS_BRIDGE_VERSION}),'QUEUED',1,new Date(),'','','0','','',key]);
  return {ok:true, created:true, taskId:taskId, status:'QUEUED', idempotencyKey:key};
}

function normalizeBridgeKeyword_(value) {
  return String(value || '').toLowerCase().replace(/\s+/g,'').replace(/[^0-9a-z가-힣]/g,'');
}

function testContentOsQueensBridge() {
  return {
    health:contentOsQueensBridgeHealth(),
    probe:enqueueContentOsBridgeHealthProbe(),
    tick:contentOsQueensBridgeTick(),
    version:CONTENTOS_BRIDGE_VERSION
  };
}
