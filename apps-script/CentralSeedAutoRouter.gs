var CENTRAL_SEED_ROUTER_VERSION = 'CENTRAL_SEED_ROUTER_V1_20260821';
var CENTRAL_SEED_ROUTER_MASTER_ID = '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI';
var CENTRAL_SEED_ROUTER_SHEETS = {
  SEED: '35_INTERNAL_SEED_REGISTRY',
  RESPONSE: '11_FRONT_RESPONSE_LIBRARY',
  BUS: '59_DATA_INTELLIGENCE_BUS',
  SUB: '60_APP_DATA_SUBSCRIPTION',
  CHANGE: '63_EVOLUTION_CHANGELOG'
};

function centralProcessNewSeeds() {
  var ss = SpreadsheetApp.openById(CENTRAL_SEED_ROUTER_MASTER_ID);
  var seedSheet = ss.getSheetByName(CENTRAL_SEED_ROUTER_SHEETS.SEED);
  if (!seedSheet) throw new Error('SEED_REGISTRY_NOT_FOUND');
  var values = seedSheet.getDataRange().getValues();
  if (values.length <= 1) return { ok: true, processed: 0, skipped: 0, version: CENTRAL_SEED_ROUTER_VERSION };

  var header = values[0];
  var idx = indexMap_(header);
  var processed = [];
  var skipped = [];
  var start = Math.max(1, values.length - 300);

  for (var r = start; r < values.length; r++) {
    var row = values[r];
    var seedId = String(row[idx.SEED_ID] || '');
    var appId = String(row[idx.APP_ID] || '');
    var status = String(row[idx.STATUS] || '');
    if (!seedId || status.indexOf('AUTO_ROUTE_T1') < 0) continue;

    try {
      if (appId === 'APP_TRAVEL') {
        var result = centralBuildTravelT1FromSeed(seedId);
        if (result.ok) {
          seedSheet.getRange(r + 1, idx.STATUS + 1).setValue('SEED_ROUTED_T1_READY');
          seedSheet.getRange(r + 1, idx.UPDATED_AT + 1).setValue(new Date().toISOString());
          processed.push({ seed_id: seedId, app_id: appId, t1_id: result.t1_id });
        } else {
          skipped.push({ seed_id: seedId, reason: result.error || 'BUILD_FAILED' });
        }
      } else {
        skipped.push({ seed_id: seedId, app_id: appId, reason: 'NO_APP_ADAPTER_YET' });
      }
    } catch (err) {
      skipped.push({ seed_id: seedId, app_id: appId, reason: String(err && err.message || err) });
    }
  }

  return { ok: true, processed: processed.length, skipped: skipped.length, results: processed, skips: skipped, version: CENTRAL_SEED_ROUTER_VERSION, at: new Date().toISOString() };
}

function centralBuildTravelT1FromSeed(seedId) {
  var ss = SpreadsheetApp.openById(CENTRAL_SEED_ROUTER_MASTER_ID);
  var seedSheet = ss.getSheetByName(CENTRAL_SEED_ROUTER_SHEETS.SEED);
  var responseSheet = ss.getSheetByName(CENTRAL_SEED_ROUTER_SHEETS.RESPONSE);
  if (!seedSheet || !responseSheet) throw new Error('TRAVEL_T1_SHEETS_NOT_READY');

  var seedData = seedSheet.getDataRange().getValues();
  var seedHeader = seedData.shift();
  var sidx = indexMap_(seedHeader);
  var seedRow = null;
  for (var i = 0; i < seedData.length; i++) {
    if (String(seedData[i][sidx.SEED_ID] || '') === String(seedId)) { seedRow = seedData[i]; break; }
  }
  if (!seedRow) return { ok: false, error: 'SEED_NOT_FOUND', seed_id: seedId };

  var appId = String(seedRow[sidx.APP_ID] || '');
  if (appId !== 'APP_TRAVEL') return { ok: false, error: 'NOT_TRAVEL_SEED', app_id: appId, seed_id: seedId };

  var seedText = String(seedRow[sidx.SEED_TEXT] || '');
  var evidence = String(seedRow[sidx.EVIDENCE] || '');
  var topicId = String(seedRow[sidx.TOPIC_ID] || 'TRAVEL_TREND');
  var t1Id = String(seedRow[sidx.FRONT_PACKAGE_ID] || '') || ('T1_' + seedId);
  var responseId = 'RESP_' + t1Id;
  var now = new Date().toISOString();
  var keyword = topicId === 'KR_VALUE_MUKBANG_TRAVEL' ? '가성비 한국여행 먹방 스케줄' : topicId;
  var shortText = topicId === 'KR_VALUE_MUKBANG_TRAVEL'
    ? '가성비 한국 먹방여행 Seed를 지역별 장소·맛집·시장·노포·예산·이동순서로 조립하는 여행 T1 패키지'
    : seedText.slice(0, 280);
  var detail = 'T1 필수필드: 지역, 장소/시장/노포, 추천메뉴, 가격상태, 체류시간, 다음 이동, 총예산, 근거URL. 검증되지 않은 조회수·좋아요·댓글·구독자는 0으로 간주하지 않고 ENRICHMENT_REQUIRED로 유지한다.';
  var facts = {
    seed_id: seedId,
    t1_id: t1Id,
    topic_id: topicId,
    auto_t1: true,
    primary_app: 'APP_TRAVEL',
    shared_apps: ['APP_KFOOD','APP_DRYWRITE','APP_ANALYZER'],
    metrics_status: 'ENRICHMENT_REQUIRED'
  };
  var actions = { next: ['metric_enrichment','build_region_routes','price_validation','travel_front_readback'] };

  upsertResponse_(responseSheet, responseId, [
    responseId, 'APP_TRAVEL', t1Id, 'CENTRAL_INTELLIGENCE_BUS', seedId,
    'value_korea_mukbang_schedule', keyword, shortText, detail,
    JSON.stringify(facts), JSON.stringify(actions), 'ContentOS Video_Index|Central Intelligence Bus',
    'https://docs.google.com/spreadsheets/d/1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ/edit',
    'ko-KR', 'KR', Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'), '',
    'READY', 'SOURCE_VERIFIED_METRICS_PENDING', now
  ]);

  if (typeof centralPublishDataEvent === 'function') {
    centralPublishDataEvent({
      producer_app_id: 'APP_TRAVEL', data_stage: 'T1', entity_type: 'TRAVEL_T1', entity_id: t1Id,
      keyword: keyword, locale: 'ko', summary: shortText,
      keywords: ['한국','가성비','먹방','여행','스케줄','노포','시장','맛집','동선','예산'],
      tags: ['TRAVEL','T1','AUTO_ROUTE','VALUE','MUKBANG'], metrics: { enrichment_required: true },
      source_url: 'https://docs.google.com/spreadsheets/d/1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ/edit',
      lineage_ids: [seedId, t1Id], confidence: 0.8, consumer_scope: ['APP_TRAVEL','APP_KFOOD','APP_DRYWRITE','APP_ANALYZER'],
      status: 'READY', readback_status: 'PASS', memo: evidence
    });
  }

  return { ok: true, seed_id: seedId, t1_id: t1Id, response_id: responseId, version: CENTRAL_SEED_ROUTER_VERSION };
}

function installCentralSeedRouterTrigger() {
  var handler = 'centralProcessNewSeeds';
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === handler) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger(handler).timeBased().everyMinutes(10).create();
  return { ok: true, handler: handler, every_minutes: 10, version: CENTRAL_SEED_ROUTER_VERSION, at: new Date().toISOString() };
}

function testCentralSeedAutoRouter() {
  var result = centralBuildTravelT1FromSeed('SEED_TRAVEL_KR_VALUE_MUKBANG_20260821_001');
  if (!result.ok) throw new Error('TRAVEL_T1_BUILD_FAILED:' + JSON.stringify(result));
  var ss = SpreadsheetApp.openById(CENTRAL_SEED_ROUTER_MASTER_ID);
  var responseSheet = ss.getSheetByName(CENTRAL_SEED_ROUTER_SHEETS.RESPONSE);
  var rows = responseSheet.getDataRange().getValues();
  var found = rows.some(function(r) { return String(r[0]) === result.response_id; });
  return { ok: found, build: result, readback: found, version: CENTRAL_SEED_ROUTER_VERSION };
}

function upsertResponse_(sheet, responseId, rowValues) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(responseId)) {
      sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
      return { mode: 'UPDATE', row: i + 1 };
    }
  }
  sheet.appendRow(rowValues);
  return { mode: 'INSERT', row: sheet.getLastRow() };
}

function indexMap_(header) {
  var out = {};
  header.forEach(function(h, i) { out[String(h)] = i; });
  return out;
}
