var CENTRAL_INTELLIGENCE_VERSION = 'CENTRAL_INTELLIGENCE_BUS_V2_20260821';
var CENTRAL_MASTER_REGISTRY_ID = '1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI';
var CI_SHEETS = {
  BUS: '59_DATA_INTELLIGENCE_BUS',
  SUB: '60_APP_DATA_SUBSCRIPTION',
  CONTRACT: '61_BACKEND_FUNCTION_CONTRACT',
  TREND: '62_TREND_RESEARCH_WAREHOUSE',
  CHANGE: '63_EVOLUTION_CHANGELOG'
};

function centralIntelligenceHealth() {
  var ss = SpreadsheetApp.openById(CENTRAL_MASTER_REGISTRY_ID);
  var missing = [];
  Object.keys(CI_SHEETS).forEach(function(k) {
    if (!ss.getSheetByName(CI_SHEETS[k])) missing.push(CI_SHEETS[k]);
  });
  return {
    ok: missing.length === 0,
    service: 'CENTRAL_INTELLIGENCE_BUS',
    version: CENTRAL_INTELLIGENCE_VERSION,
    missing_sheets: missing,
    at: new Date().toISOString()
  };
}

function centralPublishDataEvent(payload) {
  payload = payload || {};
  var sheet = SpreadsheetApp.openById(CENTRAL_MASTER_REGISTRY_ID).getSheetByName(CI_SHEETS.BUS);
  if (!sheet) throw new Error('BUS_SHEET_NOT_FOUND');
  var eventId = payload.event_id || ('EVT_' + Utilities.getUuid());
  var now = new Date().toISOString();
  sheet.appendRow([
    eventId, now, payload.producer_app_id || 'UNKNOWN', payload.data_stage || 'QUEENS',
    payload.entity_type || 'CONTENT', payload.entity_id || '', payload.keyword || '', payload.locale || 'ko',
    payload.summary || '', stringifyCompact_(payload.keywords), stringifyCompact_(payload.tags),
    stringifyCompact_(payload.metrics), payload.source_url || '', payload.call_url || '', payload.platform_url || '',
    stringifyCompact_(payload.lineage_ids), payload.confidence == null ? '' : payload.confidence,
    payload.status || 'READY', payload.version || '1', stringifyCompact_(payload.consumer_scope || ['ALL_APPS']),
    payload.change_type || 'UPSERT', payload.readback_status || 'PENDING', payload.last_checked_at || now, payload.memo || ''
  ]);
  return { ok: true, event_id: eventId, published_at: now };
}

function centralConsumeDataEvents(appId, sinceIso, limit) {
  var sheet = SpreadsheetApp.openById(CENTRAL_MASTER_REGISTRY_ID).getSheetByName(CI_SHEETS.BUS);
  if (!sheet) throw new Error('BUS_SHEET_NOT_FOUND');
  var values = sheet.getDataRange().getValues();
  var header = values.shift();
  var since = sinceIso ? new Date(sinceIso).getTime() : 0;
  var max = Math.max(1, Math.min(Number(limit || 100), 500));
  var rows = values.filter(function(row) {
    var at = new Date(row[1]).getTime();
    var scope = String(row[19] || 'ALL_APPS');
    return at >= since && (scope.indexOf('ALL_APPS') >= 0 || !appId || scope.indexOf(appId) >= 0);
  }).slice(-max).map(function(row) {
    var obj = {};
    header.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
  return { ok: true, app_id: appId || 'ALL_APPS', count: rows.length, events: rows, version: CENTRAL_INTELLIGENCE_VERSION };
}

function centralRecordTrendResearch(payload) {
  payload = payload || {};
  var sheet = SpreadsheetApp.openById(CENTRAL_MASTER_REGISTRY_ID).getSheetByName(CI_SHEETS.TREND);
  if (!sheet) throw new Error('TREND_SHEET_NOT_FOUND');
  var id = payload.research_id || ('RSH_' + Utilities.getUuid());
  var now = new Date().toISOString();
  sheet.appendRow([
    id, now, payload.platform || '', payload.domain || '', payload.keyword || '', payload.locale || 'ko',
    payload.rank || '', payload.title || '', payload.creator || '', payload.source_url || '', payload.published_at || '',
    knownOrBlank_(payload.view_count), knownOrBlank_(payload.like_count), knownOrBlank_(payload.comment_count),
    knownOrBlank_(payload.subscriber_count), knownOrBlank_(payload.age_hours), knownOrBlank_(payload.view_velocity),
    knownOrBlank_(payload.engagement_rate), stringifyCompact_(payload.comment_need_cluster),
    payload.transcript_status || 'UNKNOWN', payload.transcript_pointer || '', payload.summary || '',
    payload.trend_signal || '', knownOrBlank_(payload.trend_score), payload.opportunity_gap || '',
    stringifyCompact_(payload.app_impact), stringifyCompact_(payload.platform_impact),
    stringifyCompact_(payload.recommended_action), knownOrBlank_(payload.confidence), payload.status || 'RESEARCH_READY'
  ]);
  centralPublishDataEvent({
    producer_app_id: payload.producer_app_id || 'APP_ANALYZER', data_stage: 'TREND', entity_type: 'TREND_RESEARCH',
    entity_id: id, keyword: payload.keyword || '', locale: payload.locale || 'ko', summary: payload.summary || payload.trend_signal || '',
    keywords: payload.keywords || [payload.keyword], tags: payload.tags || ['TREND','RESEARCH'], metrics: {
      view_count: payload.view_count, like_count: payload.like_count, comment_count: payload.comment_count,
      subscriber_count: payload.subscriber_count, view_velocity: payload.view_velocity, engagement_rate: payload.engagement_rate,
      trend_score: payload.trend_score
    }, source_url: payload.source_url || '', confidence: payload.confidence, consumer_scope: payload.consumer_scope || ['ALL_APPS']
  });
  return { ok: true, research_id: id, recorded_at: now };
}

function centralProposeEvolutionChange(payload) {
  payload = payload || {};
  var sheet = SpreadsheetApp.openById(CENTRAL_MASTER_REGISTRY_ID).getSheetByName(CI_SHEETS.CHANGE);
  if (!sheet) throw new Error('CHANGE_SHEET_NOT_FOUND');
  var id = payload.change_id || ('CHG_' + Utilities.getUuid());
  sheet.appendRow([
    id, new Date().toISOString(), payload.source_research_id || '', payload.app_id || '', payload.change_level || 'SEED',
    payload.change_type || 'SEED_UPDATE', stringifyCompact_(payload.before), stringifyCompact_(payload.proposal),
    payload.why_now || '', stringifyCompact_(payload.evidence_ids), payload.expected_impact || '', payload.risk || '',
    payload.task_id || '', payload.github_repo || '', payload.branch || '', payload.pr_url || '', payload.vercel_preview || '',
    payload.backend_function || '', payload.test_case || '', payload.test_result || 'PENDING', payload.performance_readback || '',
    payload.decision || 'REVIEW', payload.status || 'PROPOSED', payload.rolled_back || false, payload.library_reingest_at || ''
  ]);
  return { ok: true, change_id: id };
}

function runCentralIntelligenceSync() {
  var ss = SpreadsheetApp.openById(CENTRAL_MASTER_REGISTRY_ID);
  var sub = ss.getSheetByName(CI_SHEETS.SUB);
  var trend = ss.getSheetByName(CI_SHEETS.TREND);
  var change = ss.getSheetByName(CI_SHEETS.CHANGE);
  if (!sub || !trend || !change) throw new Error('INTELLIGENCE_SHEETS_NOT_READY');
  var summary = {
    subscriptions: Math.max(0, sub.getLastRow() - 1),
    trend_records: Math.max(0, trend.getLastRow() - 1),
    pending_changes: countStatus_(change, 22, ['PROPOSED','PENDING','ACTIVE']),
    checked_at: new Date().toISOString()
  };
  centralPublishDataEvent({
    producer_app_id: 'APP_AGENT_CORE', data_stage: 'SYNC', entity_type: 'INTELLIGENCE_HEARTBEAT',
    entity_id: 'SYNC_' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd_HHmm'), keyword: 'CENTRAL_SYNC',
    summary: JSON.stringify(summary), tags: ['SYNC','ALL_APPS'], consumer_scope: ['ALL_APPS'], status: 'READY',
    readback_status: 'PASS'
  });
  return { ok: true, version: CENTRAL_INTELLIGENCE_VERSION, summary: summary };
}

function runDailyTrendIntelligence() {
  var ss = SpreadsheetApp.openById(CENTRAL_MASTER_REGISTRY_ID);
  var trend = ss.getSheetByName(CI_SHEETS.TREND);
  var sub = ss.getSheetByName(CI_SHEETS.SUB);
  if (!trend || !sub) throw new Error('INTELLIGENCE_SHEETS_NOT_READY');
  var report = {
    ok: true,
    version: CENTRAL_INTELLIGENCE_VERSION,
    trend_records: Math.max(0, trend.getLastRow() - 1),
    app_subscriptions: Math.max(0, sub.getLastRow() - 1),
    generated_at: new Date().toISOString(),
    next_actions: ['VALIDATE_METRICS','CLUSTER_AUDIENCE_NEEDS','SCORE_TRENDS','BUILD_APP_IMPACT','CREATE_EVOLUTION_TASKS']
  };
  centralPublishDataEvent({
    producer_app_id: 'APP_AGENT_CORE', data_stage: 'DAILY_REPORT', entity_type: 'TREND_INTELLIGENCE_REPORT',
    entity_id: 'DAILY_' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd'), keyword: 'DAILY_TREND',
    summary: JSON.stringify(report), tags: ['DAILY','TREND','ALL_APPS'], consumer_scope: ['ALL_APPS'], status: 'READY'
  });
  return report;
}

function installCentralIntelligenceTriggers() {
  var handlers = ['runCentralIntelligenceSync', 'runDailyTrendIntelligence'];
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (handlers.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runCentralIntelligenceSync').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('runDailyTrendIntelligence').timeBased().everyDays(1).atHour(9).create();
  return { ok: true, installed: handlers, version: CENTRAL_INTELLIGENCE_VERSION, at: new Date().toISOString() };
}

function testCentralIntelligenceBus() {
  var health = centralIntelligenceHealth();
  if (!health.ok) throw new Error('HEALTH_FAILED:' + JSON.stringify(health));
  var event = centralPublishDataEvent({
    producer_app_id: 'APP_AGENT_CORE', data_stage: 'TEST', entity_type: 'SELF_TEST', entity_id: 'SELFTEST_' + Date.now(),
    keyword: 'central-intelligence', summary: 'Central Intelligence Bus self test', consumer_scope: ['ALL_APPS'],
    status: 'TEST_READY', readback_status: 'PASS'
  });
  var readback = centralConsumeDataEvents('APP_AGENT_CORE', new Date(Date.now() - 60000).toISOString(), 20);
  return { ok: !!event.ok && readback.count > 0, health: health, event: event, readback_count: readback.count };
}

function centralIntelligenceHandleGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'health';
  if (action === 'health') return centralIntelligenceHealth();
  if (action === 'events') return centralConsumeDataEvents(p.app_id || '', p.since || '', p.limit || 100);
  if (action === 'daily') return runDailyTrendIntelligence();
  if (action === 'sync') return runCentralIntelligenceSync();
  return { ok: false, error: 'UNKNOWN_ACTION', action: action };
}

function centralIntelligenceHandlePost(body) {
  body = body || {};
  var action = body.action || '';
  if (action === 'event.publish') return centralPublishDataEvent(body.payload || body);
  if (action === 'trend.record') return centralRecordTrendResearch(body.payload || body);
  if (action === 'evolution.propose') return centralProposeEvolutionChange(body.payload || body);
  if (action === 'daily.run') return runDailyTrendIntelligence();
  if (action === 'sync.run') return runCentralIntelligenceSync();
  return { ok: false, error: 'UNKNOWN_ACTION', action: action };
}

function countStatus_(sheet, zeroBasedColumnIndex, statuses) {
  if (sheet.getLastRow() <= 1) return 0;
  var values = sheet.getRange(2, zeroBasedColumnIndex + 1, sheet.getLastRow() - 1, 1).getValues();
  return values.filter(function(r) { return statuses.indexOf(String(r[0])) >= 0; }).length;
}

function stringifyCompact_(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value).slice(0, 5000);
}

function knownOrBlank_(value) {
  return value == null || value === '' ? '' : value;
}
