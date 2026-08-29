const PERSONA_ORCH_V1 = Object.freeze({
  version: '1.0.0',
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
    dailyHandler: 'personaDailyScheduler_'
  }
});

function ensurePersonaWorkflowTabs_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  const defs = [
    ['PERSONA_MATCH_QUEUE', PERSONA_ORCH_V1.tabs.match, 3000],
    ['STORYBOARD_PERSONA', PERSONA_ORCH_V1.tabs.storyboard, 5000],
    ['BOT_PERSONA_KNOWLEDGE', PERSONA_ORCH_V1.tabs.bot, 3000],
    ['GEMINI_PROJECT_CROSSCHECK', PERSONA_ORCH_V1.tabs.x2, 3000]
  ];
  const out = {};
  defs.forEach(([name, headers, rows]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name, ss.getNumSheets(), { rows: rows, columns: headers.length });
    if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
    if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
    const current = sh.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
    if (current.join('\u0001') !== headers.join('\u0001')) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    out[name] = sh.getSheetId();
  });
  return { ok: true, version: PERSONA_ORCH_V1.version, sheets: out };
}

function personaRowsAsObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.some(v => String(v).trim() !== '')).map((r, i) => {
    const o = { __row: i + 2 };
    headers.forEach((h, j) => { o[h] = r[j]; });
    return o;
  });
}

function appendPersonaObjectByHeader_(sheet, obj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const row = headers.map(h => Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : '');
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function personaNorm_(v) { return String(v == null ? '' : v).trim(); }
function personaUpper_(v) { return personaNorm_(v).toUpperCase(); }
function personaPass_(v) { return ['PASS','APPROVED','VERIFIED','DONE','OK'].indexOf(personaUpper_(v)) >= 0; }
function personaTokens_(v) {
  return personaNorm_(v).toLowerCase().split(/[\s,|;/]+/).map(s => s.trim()).filter(Boolean);
}
function personaOverlapScore_(a, b) {
  const aa = new Set(personaTokens_(a));
  const bb = new Set(personaTokens_(b));
  if (!aa.size || !bb.size) return 0;
  let n = 0; aa.forEach(x => { if (bb.has(x)) n += 1; });
  return n;
}

function matchPersonaForContent_(ss, payload) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  payload = payload || {};
  ensurePersonaWorkflowTabs_(ss);
  const sh = ss.getSheetByName('BOT_PERSONA_KNOWLEDGE');
  const candidates = personaRowsAsObjects_(sh).filter(r => !/^POLICY_/i.test(personaNorm_(r.PACK_ID)) && personaUpper_(r.STATUS).indexOf('ACTIVE') >= 0);
  const domain = personaNorm_(payload.domain || payload.DOMAIN_EXPERTISE || payload.topic);
  const role = personaNorm_(payload.storyRole || payload.STORY_ROLE || payload.role);
  const language = personaNorm_(payload.languagePackId || payload.LANGUAGE_PACK_ID);
  const voice = personaNorm_(payload.voicePackId || payload.VOICE_PACK_ID);
  let best = null;
  candidates.forEach(c => {
    let score = 0;
    score += personaOverlapScore_(domain, c.DOMAIN) * 4;
    score += personaOverlapScore_(role, c.ROLE) * 3;
    if (language && personaNorm_(c.LANGUAGE_PACK_ID) === language) score += 2;
    if (voice && personaNorm_(c.VOICE_PACK_ID) === voice) score += 1;
    if (!best || score > best.score) best = { score: score, row: c };
  });
  if (best && best.score > 0) {
    return {
      ok: true,
      decision: 'REUSE_EXISTING',
      score: best.score,
      personaId: personaNorm_(best.row.PERSONA_ID),
      personaSnapshotId: personaNorm_(best.row.PERSONA_SNAPSHOT_ID),
      languagePackId: personaNorm_(best.row.LANGUAGE_PACK_ID),
      voicePackId: personaNorm_(best.row.VOICE_PACK_ID),
      packId: personaNorm_(best.row.PACK_ID)
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

function personaMatchState_(ss, contentId, requestId) {
  const rows = personaRowsAsObjects_(ss.getSheetByName('PERSONA_MATCH_QUEUE'));
  const id = personaNorm_(contentId);
  const req = personaNorm_(requestId);
  const rows2 = rows.filter(r => !/^POLICY_/i.test(personaNorm_(r.MATCH_ID))).filter(r => (!id || personaNorm_(r.CONTENT_ID) === id) && (!req || personaNorm_(r.FRONT_REQUEST_ID) === req || personaNorm_(r.REQUEST_ID) === req));
  if (!rows2.length) return { ok: false, reason: 'PERSONA_MATCH_MISSING' };
  const row = rows2[rows2.length - 1];
  if (!personaPass_(row.GEMINI_QA)) return { ok: false, reason: 'PERSONA_GEMINI_QA_NOT_PASS', row: row };
  if (!personaPass_(row.FINAL_DECISION)) return { ok: false, reason: 'PERSONA_FINAL_NOT_PASS', row: row };
  if (!personaNorm_(row.PERSONA_ID) || !personaNorm_(row.PERSONA_SNAPSHOT_ID)) return { ok: false, reason: 'PERSONA_SNAPSHOT_ID_MISSING', row: row };
  return { ok: true, row: row };
}

function assertPersonaMatchAllowed_(ss, contentId, requestId) {
  const state = personaMatchState_(ss || SpreadsheetApp.getActiveSpreadsheet(), contentId, requestId);
  if (!state.ok) throw new Error(state.reason);
  return state;
}

function buildStoryboardPersonaRows_(ss, payload) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  payload = payload || {};
  const match = assertPersonaMatchAllowed_(ss, payload.contentId, payload.frontRequestId);
  const scenes = Array.isArray(payload.scenes) ? payload.scenes : [];
  if (!scenes.length) throw new Error('STORYBOARD_SCENES_REQUIRED');
  const sh = ss.getSheetByName('STORYBOARD_PERSONA');
  const now = new Date();
  const written = [];
  scenes.slice(0, PERSONA_ORCH_V1.runtime.batchSize).forEach((scene, idx) => {
    const boardId = personaNorm_(scene.boardId) || ['BOARD', personaNorm_(payload.contentId), String(idx + 1), Utilities.getUuid().slice(0, 8)].join('_');
    const obj = {
      BOARD_ID: boardId,
      APP_ID: personaNorm_(payload.appId),
      SOURCE_APP_ID: personaNorm_(payload.appId),
      CONTENT_ID: personaNorm_(payload.contentId),
      SCENE_ID: personaNorm_(scene.sceneId) || String(idx + 1),
      SCENE_ORDER: Number(scene.sceneOrder || idx + 1),
      STORY_BEAT: personaNorm_(scene.storyBeat),
      TEXT_CLAIM: personaNorm_(scene.textClaim),
      PERSONA_ID: personaNorm_(match.row.PERSONA_ID),
      PERSONA_SNAPSHOT_ID: personaNorm_(match.row.PERSONA_SNAPSHOT_ID),
      EXPRESSION: personaNorm_(scene.expression),
      MOTION: personaNorm_(scene.motion),
      LIPSYNC_REQUIRED: scene.lipsyncRequired ? 'YES' : 'NO',
      IMAGE_ASSET_ID: personaNorm_(scene.imageAssetId),
      VOICE_PACK_ID: personaNorm_(scene.voicePackId || match.row.VOICE_PACK_ID),
      LANGUAGE_PACK_ID: personaNorm_(scene.languagePackId || match.row.LANGUAGE_PACK_ID),
      SUBTITLE_STYLE: personaNorm_(scene.subtitleStyle),
      VTUBE_STATUS: 'PENDING_ASSET_QA',
      QA_DECISION: 'BLOCK_UNTIL_PERSONA_ASSET_QA'
    };
    written.push({ row: appendPersonaObjectByHeader_(sh, obj), boardId: boardId, at: now.toISOString() });
  });
  return { ok: true, written: written, truncated: scenes.length > PERSONA_ORCH_V1.runtime.batchSize };
}

function buildBotPersonaKnowledgePack_(ss, payload) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  payload = payload || {};
  if (!payload.verifiedEvidence || !Array.isArray(payload.verifiedEvidence) || !payload.verifiedEvidence.length) throw new Error('VERIFIED_EVIDENCE_REQUIRED');
  if (!personaNorm_(payload.personaId) || !personaNorm_(payload.personaSnapshotId)) throw new Error('PERSONA_SNAPSHOT_REQUIRED');
  const sh = ss.getSheetByName('BOT_PERSONA_KNOWLEDGE');
  const packId = personaNorm_(payload.packId) || ['BOTPACK', personaNorm_(payload.appId || payload.sourceAppId), personaNorm_(payload.personaId), Utilities.getUuid().slice(0, 8)].join('_');
  const obj = {
    PACK_ID: packId,
    APP_ID: personaNorm_(payload.appId),
    SOURCE_APP_ID: personaNorm_(payload.sourceAppId || payload.appId),
    PERSONA_ID: personaNorm_(payload.personaId),
    PERSONA_SNAPSHOT_ID: personaNorm_(payload.personaSnapshotId),
    DOMAIN: personaNorm_(payload.domain),
    ROLE: personaNorm_(payload.role),
    EXPERTISE_SOURCES: payload.verifiedEvidence.join('|'),
    KNOWLEDGE_SUMMARY: personaNorm_(payload.knowledgeSummary),
    KEYWORDS: Array.isArray(payload.keywords) ? payload.keywords.join('|') : personaNorm_(payload.keywords),
    TAGS: Array.isArray(payload.tags) ? payload.tags.join('|') : personaNorm_(payload.tags),
    LANGUAGE_PACK_ID: personaNorm_(payload.languagePackId),
    VOICE_PACK_ID: personaNorm_(payload.voicePackId),
    CHAT_POLICY: personaNorm_(payload.chatPolicy || 'stay inside verified expertise; unknown→evidence gap queue'),
    QUEENS_SOURCE: personaNorm_(payload.queensSource),
    SEED_ID: personaNorm_(payload.seedId),
    TEMPLATE_ID: personaNorm_(payload.templateId),
    UPDATED_AT: new Date().toISOString(),
    STATUS: 'ACTIVE_VERIFIED_EVIDENCE'
  };
  const row = appendPersonaObjectByHeader_(sh, obj);
  return { ok: true, row: row, packId: packId };
}

function assertTwoStageGeminiCrosscheck_(ss, contentId, requestId) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  const rows = personaRowsAsObjects_(ss.getSheetByName('GEMINI_PROJECT_CROSSCHECK'))
    .filter(r => !/^POLICY_/i.test(personaNorm_(r.CHECK_ID)))
    .filter(r => (!contentId || personaNorm_(r.CONTENT_ID) === personaNorm_(contentId)) && (!requestId || personaNorm_(r.FRONT_REQUEST_ID) === personaNorm_(requestId) || personaNorm_(r.REQUEST_ID) === personaNorm_(requestId)));
  if (!rows.length) throw new Error('GEMINI_X2_ROW_MISSING');
  const r = rows[rows.length - 1];
  const requiredRefs = ['SHEET_GEMINI_REVIEW_ID','DRIVE_PROJECT_ID','DRIVE_GEMINI_CHAT_REF','DOC_EXPORT_ID'];
  requiredRefs.forEach(k => { if (!personaNorm_(r[k])) throw new Error('GEMINI_X2_REF_MISSING_' + k); });
  ['DOC_CROSSCHECK','PERSONA_QA','FACT_QA','REQUIREMENT_MATCH'].forEach(k => { if (!personaPass_(r[k])) throw new Error('GEMINI_X2_QA_NOT_PASS_' + k); });
  ['STORYBOARD_QA','ASSET_QA','LANGUAGE_VOICE_QA'].forEach(k => {
    const v = personaUpper_(r[k]);
    if (v && v !== 'NOT_REQUIRED' && !personaPass_(v)) throw new Error('GEMINI_X2_QA_NOT_PASS_' + k);
  });
  if (!personaPass_(r.FINAL_DECISION)) throw new Error('GEMINI_X2_FINAL_NOT_PASS');
  return { ok: true, row: r };
}

function assertPersonaPackageReady_(ss, payload) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  payload = payload || {};
  const match = assertPersonaMatchAllowed_(ss, payload.contentId, payload.frontRequestId);
  const x2 = assertTwoStageGeminiCrosscheck_(ss, payload.contentId, payload.frontRequestId);
  const storyboardRows = personaRowsAsObjects_(ss.getSheetByName('STORYBOARD_PERSONA')).filter(r => personaNorm_(r.CONTENT_ID) === personaNorm_(payload.contentId));
  storyboardRows.filter(r => !/^POLICY_/i.test(personaNorm_(r.BOARD_ID))).forEach(r => {
    if (!personaPass_(r.QA_DECISION)) throw new Error('STORYBOARD_PERSONA_QA_NOT_PASS');
  });
  return { ok: true, persona: match.row, x2: x2.row, storyboardCount: storyboardRows.length };
}

function collectRecurringPersonaErrors_(ss, minCount) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  minCount = Number(minCount || 2);
  const sheets = ['PERSONA_MATCH_QUEUE','STORYBOARD_PERSONA','GEMINI_PROJECT_CROSSCHECK','ASSET_QA_QUEUE'];
  const counts = {};
  sheets.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    personaRowsAsObjects_(sh).forEach(r => {
      const candidates = [r.ERROR_CLASS, r.ERROR_SUMMARY, r.FINAL_DECISION, r.QA_DECISION];
      candidates.forEach(v => {
        const s = personaUpper_(v);
        if (!s || personaPass_(s) || s.indexOf('NOT_REQUIRED') >= 0 || s.indexOf('POLICY') >= 0) return;
        counts[s] = (counts[s] || 0) + 1;
      });
    });
  });
  return Object.keys(counts).filter(k => counts[k] >= minCount).sort((a,b) => counts[b]-counts[a]).map(k => ({ errorClass: k, count: counts[k], action: 'PREVENTION_TEMPLATE_PATCH_CANDIDATE' }));
}

function personaRuntimeBudgetState_() {
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd');
  const key = 'PERSONA_NEW_ROWS_' + today;
  return { today: today, newRows: Number(props.getProperty(key) || 0), key: key };
}

function personaDailyScheduler_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  const started = Date.now();
  ensurePersonaWorkflowTabs_(ss);
  const budget = personaRuntimeBudgetState_();
  const bot = ss.getSheetByName('BOT_PERSONA_KNOWLEDGE');
  const rows = personaRowsAsObjects_(bot).filter(r => !/^POLICY_/i.test(personaNorm_(r.PACK_ID)));
  let reviewed = 0;
  let stale = 0;
  rows.slice(0, PERSONA_ORCH_V1.runtime.batchSize).forEach(r => {
    if ((Date.now() - started) / 1000 > PERSONA_ORCH_V1.runtime.maxSeconds) return;
    reviewed += 1;
    const status = personaUpper_(r.STATUS);
    if (status.indexOf('VERIFIED') < 0 && status.indexOf('ACTIVE') < 0) stale += 1;
  });
  const recurring = collectRecurringPersonaErrors_(ss, 2);
  return {
    ok: true,
    reviewed: reviewed,
    staleEvidencePacks: stale,
    recurringErrorCandidates: recurring,
    runtimeMs: Date.now() - started,
    newRowsToday: budget.newRows,
    maxNewRowsPerDay: PERSONA_ORCH_V1.runtime.maxNewRowsPerDay,
    note: 'No model/API call. Daily refresh only validates verified evidence and emits prevention candidates.'
  };
}

function ensurePersonaDailyTrigger_() {
  const handler = PERSONA_ORCH_V1.runtime.dailyHandler;
  const triggers = ScriptApp.getProjectTriggers();
  const same = triggers.filter(t => t.getHandlerFunction() === handler);
  if (same.length > 1) same.slice(1).forEach(t => ScriptApp.deleteTrigger(t));
  if (!same.length) ScriptApp.newTrigger(handler).timeBased().everyDays(1).atHour(4).create();
  return { ok: true, handler: handler, count: ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === handler).length };
}
