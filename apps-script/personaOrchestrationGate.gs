/*
 * PERSONA_ORCHESTRATION_GATE_V1_1_20260828
 * API-free central contract for all front-app DryWriter persona flows.
 *
 * This module intentionally does NOT call Gemini or a paid model API.
 * It validates/organizes evidence written by approved review providers and
 * routes persona/storyboard/VTuber/bot-pack requirements through Sheets.
 * Existing app processTaskQueue/factory triggers should call the daily helper;
 * do not install duplicate per-app clocks when an existing 5-minute wake exists.
 */

var PERSONA_ORCH_V1 = Object.freeze({
  requiredTabs: [
    'GEMINI_REVIEW',
    'ASSET_QA_REQUIREMENTS',
    'ASSET_QA_QUEUE',
    'WORKFLOW_CROSSCHECK',
    'PERSONA_MATCH_QUEUE',
    'STORYBOARD_PERSONA',
    'BOT_PERSONA_KNOWLEDGE',
    'GEMINI_PROJECT_CROSSCHECK'
  ],
  dailyRefreshHours: 24,
  pass: 'PASS'
});

function personaNormalize_(v) {
  return String(v == null ? '' : v).trim();
}

function personaUpper_(v) {
  return personaNormalize_(v).toUpperCase();
}

function personaReviewPass_(v) {
  return ['PASS', 'VERIFIED', 'APPROVED'].indexOf(personaUpper_(v)) !== -1;
}

function personaPackReady_(v) {
  return ['ACTIVE', 'PASS', 'READY', 'VERIFIED', 'APPROVED'].indexOf(personaUpper_(v)) !== -1;
}

function personaPassOrNotRequired_(v) {
  return ['PASS', 'VERIFIED', 'APPROVED', 'NOT_REQUIRED', 'N/A'].indexOf(personaUpper_(v)) !== -1;
}

function personaRows_(sheet) {
  var values = sheet.getDataRange().getDisplayValues();
  if (!values || values.length < 2) return [];
  var headers = values[0].map(personaNormalize_);
  return values.slice(1).map(function(row, i) {
    var out = { __row: i + 2 };
    headers.forEach(function(h, c) { if (h) out[h] = personaNormalize_(row[c]); });
    return out;
  });
}

function personaAppendByHeader_(sheet, obj) {
  var width = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0];
  sheet.appendRow(headers.map(function(h) {
    var k = personaNormalize_(h);
    return k && Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : '';
  }));
}

function ensurePersonaOrchestrationTabs_(ss) {
  if (!ss || typeof ss.getSheetByName !== 'function') throw new Error('SPREADSHEET_REQUIRED');
  var missing = PERSONA_ORCH_V1.requiredTabs.filter(function(n) { return !ss.getSheetByName(n); });
  if (missing.length) throw new Error('PERSONA_ORCH_TABS_MISSING:' + missing.join(','));
  return { ok: true, tabs: PERSONA_ORCH_V1.requiredTabs.slice() };
}

function detectPersonaRequired_(request) {
  request = request || {};
  if (request.personaRequired === true) return true;
  var text = [request.storyRole, request.narrator, request.character, request.expertRole,
    request.voiceRequired, request.visiblePersona, request.vtubeRequired].join(' ').toLowerCase();
  return /(narrator|character|persona|expert|voice|required|vtube|화자|등장|인물|전문가|음성|캐릭터)/.test(text);
}

function resolvePersonaMatch_(ss, request) {
  ensurePersonaOrchestrationTabs_(ss);
  request = request || {};
  var contentId = personaNormalize_(request.contentId || request.CONTENT_ID);
  var appId = personaNormalize_(request.appId || request.APP_ID || request.SOURCE_APP_ID);
  if (!contentId || !appId) throw new Error('APP_ID_AND_CONTENT_ID_REQUIRED');
  var required = detectPersonaRequired_(request);
  var rows = personaRows_(ss.getSheetByName('PERSONA_MATCH_QUEUE')).filter(function(r) {
    return personaNormalize_(r.CONTENT_ID) === contentId &&
      (personaNormalize_(r.APP_ID || r.SOURCE_APP_ID) === appId || !personaNormalize_(r.APP_ID || r.SOURCE_APP_ID));
  });
  if (!required) return { ok: true, decision: 'NOT_REQUIRED', contentId: contentId };
  if (!rows.length) return { ok: false, decision: 'MISSING_PERSONA_MATCH', contentId: contentId };
  var latest = rows[rows.length - 1];
  var decision = personaUpper_(latest.FINAL_DECISION);
  var snapshot = personaNormalize_(latest.PERSONA_SNAPSHOT_ID);
  var geminiQa = personaUpper_(latest.GEMINI_QA);
  return {
    ok: decision === PERSONA_ORCH_V1.pass && !!snapshot && personaReviewPass_(geminiQa),
    decision: decision || 'PENDING',
    geminiQa: geminiQa || 'MISSING',
    personaId: latest.PERSONA_ID || '',
    personaSnapshotId: snapshot,
    languagePackId: latest.LANGUAGE_PACK_ID || '',
    voicePackId: latest.VOICE_PACK_ID || '',
    vtubeAssetId: latest.VTUBE_ASSET_ID || '',
    evidence: latest
  };
}

function buildPersonaStoryboard_(ss, payload) {
  ensurePersonaOrchestrationTabs_(ss);
  payload = payload || {};
  var contentId = personaNormalize_(payload.contentId || payload.CONTENT_ID);
  var appId = personaNormalize_(payload.appId || payload.APP_ID || payload.SOURCE_APP_ID);
  var scenes = payload.scenes || [];
  var persona = resolvePersonaMatch_(ss, payload);
  if (!persona.ok && persona.decision !== 'NOT_REQUIRED') throw new Error('PERSONA_MATCH_BLOCKED:' + persona.decision + ':' + (persona.geminiQa || ''));
  if (!Array.isArray(scenes) || !scenes.length) throw new Error('STORYBOARD_SCENES_REQUIRED');
  var sheet = ss.getSheetByName('STORYBOARD_PERSONA');
  scenes.forEach(function(scene, i) {
    personaAppendByHeader_(sheet, {
      BOARD_ID: 'BOARD_' + Utilities.getUuid(),
      APP_ID: appId,
      SOURCE_APP_ID: appId,
      CONTENT_ID: contentId,
      SCENE_ID: personaNormalize_(scene.sceneId) || ('SCENE_' + (i + 1)),
      SCENE_ORDER: i + 1,
      STORY_BEAT: personaNormalize_(scene.storyBeat),
      TEXT_CLAIM: personaNormalize_(scene.textClaim),
      PERSONA_ID: persona.personaId || '',
      PERSONA_SNAPSHOT_ID: persona.personaSnapshotId || '',
      EXPRESSION: personaNormalize_(scene.expression),
      MOTION: personaNormalize_(scene.motion),
      LIPSYNC_REQUIRED: scene.lipsyncRequired ? 'YES' : 'NO',
      IMAGE_ASSET_ID: personaNormalize_(scene.imageAssetId),
      VOICE_PACK_ID: persona.voicePackId || '',
      LANGUAGE_PACK_ID: persona.languagePackId || '',
      SUBTITLE_STYLE: personaNormalize_(scene.subtitleStyle),
      VTUBE_STATUS: scene.vtubeRequired ? 'QUEUED_VTUBE_ASSET' : 'NOT_REQUIRED',
      QA_DECISION: 'BLOCK_UNTIL_ASSET_QA'
    });
  });
  return { ok: true, contentId: contentId, sceneCount: scenes.length };
}

function queueVTubePersonaAssetRequirement_(ss, payload) {
  ensurePersonaOrchestrationTabs_(ss);
  payload = payload || {};
  var persona = resolvePersonaMatch_(ss, payload);
  if (!persona.ok) throw new Error('PERSONA_MATCH_REQUIRED_FOR_VTUBE');
  var qa = ss.getSheetByName('ASSET_QA_QUEUE');
  personaAppendByHeader_(qa, {
    QA_ID: 'VTUBE_QA_' + Utilities.getUuid(),
    APP_ID: payload.appId || payload.APP_ID || '',
    FRONT_REQUEST_ID: payload.frontRequestId || payload.FRONT_REQUEST_ID || '',
    CONTENT_ID: payload.contentId || payload.CONTENT_ID || '',
    ASSET_ID: payload.assetId || ('VTUBE_PERSONA_' + Utilities.getUuid()),
    ASSET_TYPE: 'MOTION_LIPSYNC_FACE',
    SOURCE_TEXT_ID: payload.contentId || payload.CONTENT_ID || '',
    REQUIREMENT_MATCH: 'PENDING',
    TECH_QA: 'PENDING',
    SYNC_QA: 'PENDING',
    RIGHTS_QA: 'PENDING',
    READBACK_X2: 'REQUIRED',
    FINAL_DECISION: 'BLOCK_UNTIL_PASS',
    EVIDENCE: 'persona_snapshot=' + persona.personaSnapshotId
  });
  return { ok: true, personaSnapshotId: persona.personaSnapshotId };
}

function botKnowledgePackState_(ss, appId, personaSnapshotId) {
  ensurePersonaOrchestrationTabs_(ss);
  var rows = personaRows_(ss.getSheetByName('BOT_PERSONA_KNOWLEDGE')).filter(function(r) {
    var rowApp = personaNormalize_(r.APP_ID || r.SOURCE_APP_ID);
    return (!appId || rowApp === appId || rowApp === 'ALL_FRONT_APPS') &&
      (!personaSnapshotId || personaNormalize_(r.PERSONA_SNAPSHOT_ID) === personaSnapshotId);
  });
  if (!rows.length) return { ok: false, state: 'MISSING_BOT_KNOWLEDGE_PACK' };
  var latest = rows[rows.length - 1];
  return {
    ok: personaPackReady_(latest.STATUS),
    state: latest.STATUS || 'PENDING',
    pack: latest
  };
}

function markBotPersonaRefreshDue_(ss, now) {
  ensurePersonaOrchestrationTabs_(ss);
  now = now || new Date();
  var sheet = ss.getSheetByName('BOT_PERSONA_KNOWLEDGE');
  var rows = personaRows_(sheet);
  var due = [];
  rows.forEach(function(r) {
    if (!r.PACK_ID || /^BOTPACK_.*DEFAULT$/.test(r.PACK_ID)) return;
    var at = Date.parse(r.UPDATED_AT || '');
    if (!at || (now.getTime() - at) >= PERSONA_ORCH_V1.dailyRefreshHours * 3600000) due.push(r.PACK_ID);
  });
  return { ok: true, duePackIds: due, dailyRefreshHours: PERSONA_ORCH_V1.dailyRefreshHours };
}

function runGeminiProjectCrosscheckGate_(ss, payload) {
  ensurePersonaOrchestrationTabs_(ss);
  payload = payload || {};
  var contentId = personaNormalize_(payload.contentId || payload.CONTENT_ID);
  if (!contentId) throw new Error('CONTENT_ID_REQUIRED');
  var rows = personaRows_(ss.getSheetByName('GEMINI_PROJECT_CROSSCHECK')).filter(function(r) {
    return personaNormalize_(r.CONTENT_ID) === contentId;
  });
  if (!rows.length) return { ok: false, decision: 'MISSING_PROJECT_CROSSCHECK' };
  var latest = rows[rows.length - 1];
  var sheetRef = personaNormalize_(latest.SHEET_GEMINI_REVIEW_ID);
  var driveChat = personaNormalize_(latest.DRIVE_GEMINI_CHAT_REF);
  var docExport = personaNormalize_(latest.DOC_EXPORT_ID);
  var decision = personaUpper_(latest.FINAL_DECISION);
  var docQa = personaReviewPass_(latest.DOC_CROSSCHECK);
  var factQa = personaReviewPass_(latest.FACT_QA);
  var requirementQa = personaReviewPass_(latest.REQUIREMENT_MATCH);
  var personaQa = personaPassOrNotRequired_(latest.PERSONA_QA);
  var storyboardQa = personaPassOrNotRequired_(latest.STORYBOARD_QA);
  var assetQa = personaPassOrNotRequired_(latest.ASSET_QA);
  var languageVoiceQa = personaPassOrNotRequired_(latest.LANGUAGE_VOICE_QA);
  return {
    ok: decision === PERSONA_ORCH_V1.pass && !!sheetRef && !!driveChat && !!docExport &&
      docQa && factQa && requirementQa && personaQa && storyboardQa && assetQa && languageVoiceQa,
    decision: decision || 'PENDING',
    hasSheetReview: !!sheetRef,
    hasDriveGeminiChatRef: !!driveChat,
    hasDocExport: !!docExport,
    qa: {
      doc: docQa,
      fact: factQa,
      requirement: requirementQa,
      persona: personaQa,
      storyboard: storyboardQa,
      asset: assetQa,
      languageVoice: languageVoiceQa
    },
    evidence: latest
  };
}

function assertPersonaPackagePromotionAllowed_(ss, payload) {
  var persona = resolvePersonaMatch_(ss, payload);
  var bot = persona.decision === 'NOT_REQUIRED' ? { ok: true, state: 'NOT_REQUIRED' } :
    botKnowledgePackState_(ss, payload.appId || payload.APP_ID || '', persona.personaSnapshotId || '');
  var cross = runGeminiProjectCrosscheckGate_(ss, payload);
  var ok = persona.ok && bot.ok && cross.ok;
  if (!ok) throw new Error('PERSONA_PACKAGE_PROMOTION_BLOCKED:' + JSON.stringify({
    persona: persona.decision,
    geminiQa: persona.geminiQa || '',
    bot: bot.state,
    crosscheck: cross.decision
  }));
  return { ok: true, persona: persona, bot: bot, crosscheck: cross };
}

function buildPersonaLearningRecord_(result, errorClass, fixApplied, evidence) {
  result = result || {};
  return {
    learning_id: 'LEARN_PERSONA_' + Utilities.getUuid(),
    outcome: result.ok ? 'SUCCESS_TEMPLATE_CANDIDATE' : 'FAIL_PREVENTION_CANDIDATE',
    error_class: errorClass || '',
    fix_applied: fixApplied || '',
    evidence: evidence || '',
    created_at: new Date().toISOString()
  };
}

function runDailyPersonaMaintenanceFromFactory_(ss, context) {
  ensurePersonaOrchestrationTabs_(ss);
  context = context || {};
  var refresh = markBotPersonaRefreshDue_(ss, new Date());
  return {
    ok: true,
    source: 'EXISTING_FACTORY_WAKE',
    installNewTrigger: false,
    personaRefreshHours: PERSONA_ORCH_V1.dailyRefreshHours,
    dueBotPacks: refresh.duePackIds,
    policy: 'Existing 5-minute factory wake decides due-time; no duplicate daily trigger.'
  };
}
