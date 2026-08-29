/*
 * PERSONA_FACTORY_V1_20260829
 * Companion factory for personaOrchestrationGate.gs.
 *
 * Responsibilities here:
 * - deterministic reuse-first candidate matching
 * - persona workflow tab repair
 * - storyboard row construction after canonical persona gate PASS
 * - verified-evidence bot knowledge pack creation
 * - recurring-error aggregation
 * - 24h maintenance due check from the EXISTING factory wake
 *
 * Promotion/fail-closed truth stays in personaOrchestrationGate.gs.
 * No Gemini/provider API is called here. No new clock trigger is installed here.
 */
var PERSONA_FACTORY_V1 = Object.freeze({
  version: '1.1.0',
  canonicalGate: 'apps-script/personaOrchestrationGate.gs',
  tabs: {
    match: ['MATCH_ID','APP_ID','FRONT_REQUEST_ID','CONTENT_ID','STORY_ROLE','REQUIRED_YN','MATCH_MODE','PERSONA_ID','PERSONA_SNAPSHOT_ID','DOMAIN_EXPERTISE','TONE','LANGUAGE_PACK_ID','VOICE_PACK_ID','VTUBE_ASSET_ID','GEMINI_QA','FINAL_DECISION'],
    storyboard: ['BOARD_ID','APP_ID','CONTENT_ID','SCENE_ID','SCENE_ORDER','STORY_BEAT','TEXT_CLAIM','PERSONA_ID','PERSONA_SNAPSHOT_ID','EXPRESSION','MOTION','LIPSYNC_REQUIRED','IMAGE_ASSET_ID','VOICE_PACK_ID','LANGUAGE_PACK_ID','SUBTITLE_STYLE','VTUBE_STATUS','QA_DECISION'],
    bot: ['PACK_ID','APP_ID','PERSONA_ID','PERSONA_SNAPSHOT_ID','DOMAIN','ROLE','EXPERTISE_SOURCES','KNOWLEDGE_SUMMARY','KEYWORDS','TAGS','LANGUAGE_PACK_ID','VOICE_PACK_ID','CHAT_POLICY','QUEENS_SOURCE','SEED_ID','TEMPLATE_ID','UPDATED_AT','STATUS'],
    x2: ['CHECK_ID','APP_ID','CONTENT_ID','FRONT_REQUEST_ID','SHEET_GEMINI_REVIEW_ID','DRIVE_PROJECT_ID','DRIVE_GEMINI_CHAT_REF','DOC_EXPORT_ID','DOC_CROSSCHECK','PERSONA_QA','STORYBOARD_QA','ASSET_QA','LANGUAGE_VOICE_QA','FACT_QA','REQUIREMENT_MATCH','ERROR_SUMMARY','FIX_APPLIED','FINAL_DECISION','CHECKED_AT','NOTES']
  },
  runtime: {
    maxSeconds: 240,
    batchSize: 20,
    maxNewRowsPerDay: 200,
    maintenanceEveryHours: 24,
    schedulerMode: 'EXISTING_5M_FACTORY_WAKE'
  }
});

function pfNorm_(v) { return String(v == null ? '' : v).trim(); }
function pfUpper_(v) { return pfNorm_(v).toUpperCase(); }
function pfIsPolicyRow_(v) { return /^POLICY_/i.test(pfNorm_(v)); }
function pfTokens_(v) {
  return pfNorm_(v).toLowerCase().split(/[\s,|;/]+/).map(function(s) { return s.trim(); }).filter(Boolean);
}
function pfOverlapScore_(a, b) {
  var aa = pfTokens_(a);
  var bb = pfTokens_(b);
  if (!aa.length || !bb.length) return 0;
  var map = {};
  bb.forEach(function(x) { map[x] = true; });
  var n = 0;
  aa.forEach(function(x) { if (map[x]) n += 1; });
  return n;
}
function pfRows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  var values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
  var headers = values[0].map(String);
  return values.slice(1).filter(function(r) {
    return r.some(function(v) { return pfNorm_(v) !== ''; });
  }).map(function(r, i) {
    var o = { __row: i + 2 };
    headers.forEach(function(h, j) { o[h] = r[j]; });
    return o;
  });
}
function pfAppend_(sheet, obj) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  sheet.appendRow(headers.map(function(h) {
    return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : '';
  }));
  return sheet.getLastRow();
}
function pfRequireCanonicalGate_() {
  if (typeof ensurePersonaOrchestrationTabs_ !== 'function' ||
      typeof resolvePersonaMatch_ !== 'function' ||
      typeof runGeminiProjectCrosscheckGate_ !== 'function' ||
      typeof assertPersonaPackagePromotionAllowed_ !== 'function') {
    throw new Error('CANONICAL_PERSONA_GATE_SOURCE_REQUIRED');
  }
  return true;
}

function ensurePersonaWorkflowTabs_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var defs = [
    ['PERSONA_MATCH_QUEUE', PERSONA_FACTORY_V1.tabs.match, 3000],
    ['STORYBOARD_PERSONA', PERSONA_FACTORY_V1.tabs.storyboard, 5000],
    ['BOT_PERSONA_KNOWLEDGE', PERSONA_FACTORY_V1.tabs.bot, 3000],
    ['GEMINI_PROJECT_CROSSCHECK', PERSONA_FACTORY_V1.tabs.x2, 3000]
  ];
  var out = {};
  defs.forEach(function(def) {
    var name = def[0], headers = def[1], rows = def[2];
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name, ss.getNumSheets(), { rows: rows, columns: headers.length });
    if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
    if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
    var current = sh.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
    if (current.join('\u0001') !== headers.join('\u0001')) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    out[name] = sh.getSheetId();
  });
  if (typeof ensurePersonaOrchestrationTabs_ === 'function') ensurePersonaOrchestrationTabs_(ss);
  return { ok: true, version: PERSONA_FACTORY_V1.version, sheets: out, canonicalGateRequired: true };
}

function matchPersonaForContent_(ss, payload) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  payload = payload || {};
  ensurePersonaWorkflowTabs_(ss);
  var sh = ss.getSheetByName('BOT_PERSONA_KNOWLEDGE');
  var candidates = pfRows_(sh).filter(function(r) {
    var status = pfUpper_(r.STATUS);
    return !pfIsPolicyRow_(r.PACK_ID) && !!pfNorm_(r.PERSONA_ID) && !!pfNorm_(r.PERSONA_SNAPSHOT_ID) &&
      (status === 'ACTIVE' || status === 'READY' || status === 'VERIFIED' || status.indexOf('ACTIVE_VERIFIED') === 0);
  });
  var domain = pfNorm_(payload.domain || payload.DOMAIN_EXPERTISE || payload.topic);
  var role = pfNorm_(payload.storyRole || payload.STORY_ROLE || payload.role);
  var language = pfNorm_(payload.languagePackId || payload.LANGUAGE_PACK_ID);
  var voice = pfNorm_(payload.voicePackId || payload.VOICE_PACK_ID);
  var best = null;
  candidates.forEach(function(c) {
    var score = 0;
    score += pfOverlapScore_(domain, c.DOMAIN) * 4;
    score += pfOverlapScore_(role, c.ROLE) * 3;
    if (language && pfNorm_(c.LANGUAGE_PACK_ID) === language) score += 2;
    if (voice && pfNorm_(c.VOICE_PACK_ID) === voice) score += 1;
    if (!best || score > best.score) best = { score: score, row: c };
  });
  if (best && best.score > 0) {
    return {
      ok: true,
      decision: 'REUSE_EXISTING',
      score: best.score,
      personaId: pfNorm_(best.row.PERSONA_ID),
      personaSnapshotId: pfNorm_(best.row.PERSONA_SNAPSHOT_ID),
      languagePackId: pfNorm_(best.row.LANGUAGE_PACK_ID),
      voicePackId: pfNorm_(best.row.VOICE_PACK_ID),
      packId: pfNorm_(best.row.PACK_ID)
    };
  }
  return {
    ok: true,
    decision: 'CREATE_REQUIRED_AFTER_SEARCH_NONE',
    score: 0,
    personaId: '',
    personaSnapshotId: '',
    evidenceGap: ['PERSONA_SNAPSHOT','DOMAIN_EXPERTISE','LANGUAGE_VOICE_IF_REQUIRED']
  };
}

function assertPersonaMatchAllowed_(ss, payload) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  payload = payload || {};
  pfRequireCanonicalGate_();
  var state = resolvePersonaMatch_(ss, payload);
  if (!state.ok && state.decision !== 'NOT_REQUIRED') {
    throw new Error('PERSONA_MATCH_BLOCKED:' + state.decision + ':' + (state.geminiQa || ''));
  }
  return state;
}

function buildStoryboardPersonaRows_(ss, payload) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  payload = payload || {};
  var match = assertPersonaMatchAllowed_(ss, payload);
  var scenes = Array.isArray(payload.scenes) ? payload.scenes : [];
  if (!scenes.length) throw new Error('STORYBOARD_SCENES_REQUIRED');
  var sh = ss.getSheetByName('STORYBOARD_PERSONA');
  var now = new Date();
  var written = [];
  scenes.slice(0, PERSONA_FACTORY_V1.runtime.batchSize).forEach(function(scene, idx) {
    var boardId = pfNorm_(scene.boardId) || ['BOARD', pfNorm_(payload.contentId || payload.CONTENT_ID), String(idx + 1), Utilities.getUuid().slice(0, 8)].join('_');
    var obj = {
      BOARD_ID: boardId,
      APP_ID: pfNorm_(payload.appId || payload.APP_ID || payload.SOURCE_APP_ID),
      SOURCE_APP_ID: pfNorm_(payload.appId || payload.APP_ID || payload.SOURCE_APP_ID),
      CONTENT_ID: pfNorm_(payload.contentId || payload.CONTENT_ID),
      SCENE_ID: pfNorm_(scene.sceneId) || String(idx + 1),
      SCENE_ORDER: Number(scene.sceneOrder || idx + 1),
      STORY_BEAT: pfNorm_(scene.storyBeat),
      TEXT_CLAIM: pfNorm_(scene.textClaim),
      PERSONA_ID: match.personaId || '',
      PERSONA_SNAPSHOT_ID: match.personaSnapshotId || '',
      EXPRESSION: pfNorm_(scene.expression),
      MOTION: pfNorm_(scene.motion),
      LIPSYNC_REQUIRED: scene.lipsyncRequired ? 'YES' : 'NO',
      IMAGE_ASSET_ID: pfNorm_(scene.imageAssetId),
      VOICE_PACK_ID: pfNorm_(scene.voicePackId || match.voicePackId),
      LANGUAGE_PACK_ID: pfNorm_(scene.languagePackId || match.languagePackId),
      SUBTITLE_STYLE: pfNorm_(scene.subtitleStyle),
      VTUBE_STATUS: scene.vtubeRequired ? 'QUEUED_VTUBE_ASSET' : 'NOT_REQUIRED',
      QA_DECISION: 'BLOCK_UNTIL_ASSET_QA'
    };
    written.push({ row: pfAppend_(sh, obj), boardId: boardId, at: now.toISOString() });
  });
  return { ok: true, written: written, truncated: scenes.length > PERSONA_FACTORY_V1.runtime.batchSize };
}

function buildBotPersonaKnowledgePack_(ss, payload) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  payload = payload || {};
  ensurePersonaWorkflowTabs_(ss);
  if (!Array.isArray(payload.verifiedEvidence) || !payload.verifiedEvidence.length) throw new Error('VERIFIED_EVIDENCE_REQUIRED');
  if (!pfNorm_(payload.personaId) || !pfNorm_(payload.personaSnapshotId)) throw new Error('PERSONA_SNAPSHOT_REQUIRED');
  var sh = ss.getSheetByName('BOT_PERSONA_KNOWLEDGE');
  var packId = pfNorm_(payload.packId) || ['BOTPACK', pfNorm_(payload.appId || payload.sourceAppId), pfNorm_(payload.personaId), Utilities.getUuid().slice(0, 8)].join('_');
  var obj = {
    PACK_ID: packId,
    APP_ID: pfNorm_(payload.appId),
    SOURCE_APP_ID: pfNorm_(payload.sourceAppId || payload.appId),
    PERSONA_ID: pfNorm_(payload.personaId),
    PERSONA_SNAPSHOT_ID: pfNorm_(payload.personaSnapshotId),
    DOMAIN: pfNorm_(payload.domain),
    ROLE: pfNorm_(payload.role),
    EXPERTISE_SOURCES: payload.verifiedEvidence.join('|'),
    KNOWLEDGE_SUMMARY: pfNorm_(payload.knowledgeSummary),
    KEYWORDS: Array.isArray(payload.keywords) ? payload.keywords.join('|') : pfNorm_(payload.keywords),
    TAGS: Array.isArray(payload.tags) ? payload.tags.join('|') : pfNorm_(payload.tags),
    LANGUAGE_PACK_ID: pfNorm_(payload.languagePackId),
    VOICE_PACK_ID: pfNorm_(payload.voicePackId),
    CHAT_POLICY: pfNorm_(payload.chatPolicy || 'stay inside verified expertise; unknown→evidence gap queue'),
    QUEENS_SOURCE: pfNorm_(payload.queensSource),
    SEED_ID: pfNorm_(payload.seedId),
    TEMPLATE_ID: pfNorm_(payload.templateId),
    UPDATED_AT: new Date().toISOString(),
    STATUS: 'ACTIVE_VERIFIED_EVIDENCE'
  };
  var row = pfAppend_(sh, obj);
  pfIncrementNewRowsToday_(1);
  return { ok: true, row: row, packId: packId };
}

function assertTwoStageGeminiCrosscheck_(ss, payload) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  payload = payload || {};
  pfRequireCanonicalGate_();
  var state = runGeminiProjectCrosscheckGate_(ss, payload);
  if (!state.ok) throw new Error('GEMINI_X2_BLOCKED:' + state.decision);
  return state;
}

function assertPersonaPackageReady_(ss, payload) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  payload = payload || {};
  pfRequireCanonicalGate_();
  return assertPersonaPackagePromotionAllowed_(ss, payload);
}

function collectRecurringPersonaErrors_(ss, minCount) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  minCount = Number(minCount || 2);
  var sheets = ['PERSONA_MATCH_QUEUE','STORYBOARD_PERSONA','GEMINI_PROJECT_CROSSCHECK','ASSET_QA_QUEUE'];
  var counts = {};
  sheets.forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    pfRows_(sh).forEach(function(r) {
      [r.ERROR_CLASS, r.ERROR_SUMMARY].forEach(function(v) {
        var s = pfUpper_(v);
        if (!s || s.indexOf('POLICY') === 0) return;
        counts[s] = (counts[s] || 0) + 1;
      });
      var finalDecision = pfUpper_(r.FINAL_DECISION || r.QA_DECISION);
      if (finalDecision.indexOf('FAIL') === 0 || finalDecision.indexOf('BLOCK') === 0) {
        var key = finalDecision || 'UNCLASSIFIED_BLOCK';
        counts[key] = (counts[key] || 0) + 1;
      }
    });
  });
  return Object.keys(counts).filter(function(k) { return counts[k] >= minCount; })
    .sort(function(a, b) { return counts[b] - counts[a]; })
    .map(function(k) { return { errorClass: k, count: counts[k], action: 'PREVENTION_TEMPLATE_PATCH_CANDIDATE' }; });
}

function pfRuntimeBudgetState_() {
  var props = PropertiesService.getScriptProperties();
  var tz = (typeof Session !== 'undefined' && Session.getScriptTimeZone) ? Session.getScriptTimeZone() : 'Asia/Seoul';
  var today = Utilities.formatDate(new Date(), tz || 'Asia/Seoul', 'yyyy-MM-dd');
  var key = 'PERSONA_NEW_ROWS_' + today;
  return { today: today, newRows: Number(props.getProperty(key) || 0), key: key };
}
function pfIncrementNewRowsToday_(delta) {
  var props = PropertiesService.getScriptProperties();
  var state = pfRuntimeBudgetState_();
  var next = state.newRows + Number(delta || 0);
  if (next > PERSONA_FACTORY_V1.runtime.maxNewRowsPerDay) throw new Error('PERSONA_DAILY_ROW_BUDGET_EXCEEDED');
  props.setProperty(state.key, String(next));
  return next;
}

function personaDailyScheduler_(ss, context) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  context = context || {};
  var started = Date.now();
  ensurePersonaWorkflowTabs_(ss);
  var budget = pfRuntimeBudgetState_();
  var bot = ss.getSheetByName('BOT_PERSONA_KNOWLEDGE');
  var rows = pfRows_(bot).filter(function(r) { return !pfIsPolicyRow_(r.PACK_ID); });
  var reviewed = 0;
  var stale = 0;
  rows.slice(0, PERSONA_FACTORY_V1.runtime.batchSize).forEach(function(r) {
    if ((Date.now() - started) / 1000 > PERSONA_FACTORY_V1.runtime.maxSeconds) return;
    reviewed += 1;
    var status = pfUpper_(r.STATUS);
    if (status.indexOf('VERIFIED') < 0 && status.indexOf('ACTIVE') < 0 && status !== 'READY') stale += 1;
  });
  var recurring = collectRecurringPersonaErrors_(ss, 2);
  var canonicalDue = (typeof runDailyPersonaMaintenanceFromFactory_ === 'function') ?
    runDailyPersonaMaintenanceFromFactory_(ss, context) : { ok: false, source: 'CANONICAL_GATE_NOT_LOADED' };
  return {
    ok: canonicalDue.ok !== false,
    source: 'EXISTING_FACTORY_WAKE',
    installNewTrigger: false,
    reviewed: reviewed,
    staleEvidencePacks: stale,
    recurringErrorCandidates: recurring,
    canonicalMaintenance: canonicalDue,
    runtimeMs: Date.now() - started,
    newRowsToday: budget.newRows,
    maxNewRowsPerDay: PERSONA_FACTORY_V1.runtime.maxNewRowsPerDay,
    note: 'No model/API call. Existing factory wake only; no duplicate clock trigger.'
  };
}

function runPersonaFactoryDailyIfDue_(ss, context) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  context = context || {};
  var props = PropertiesService.getScriptProperties();
  var key = 'PERSONA_FACTORY_LAST_MAINTENANCE_AT';
  var lastMs = Number(props.getProperty(key) || 0);
  var nowMs = Date.now();
  var intervalMs = PERSONA_FACTORY_V1.runtime.maintenanceEveryHours * 3600000;
  if (lastMs && nowMs - lastMs < intervalMs) {
    return { ok: true, ran: false, source: 'EXISTING_FACTORY_WAKE', nextDueMs: lastMs + intervalMs };
  }
  var result = personaDailyScheduler_(ss, context);
  if (!result.ok) return { ok: false, ran: true, result: result };
  props.setProperty(key, String(nowMs));
  return { ok: true, ran: true, source: 'EXISTING_FACTORY_WAKE', result: result, completedAt: new Date(nowMs).toISOString() };
}

function ensurePersonaDailyTrigger_() {
  return {
    ok: true,
    installNewTrigger: false,
    schedulerMode: PERSONA_FACTORY_V1.runtime.schedulerMode,
    handler: 'runPersonaFactoryDailyIfDue_',
    policy: 'Reuse existing processTaskQueue/factory wake; duplicate daily clock trigger forbidden.'
  };
}
