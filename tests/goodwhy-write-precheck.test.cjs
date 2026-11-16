'use strict';
/* Offline tests only: fixture attestations do NOT establish factual/ethical truth. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const code = [
  'apps-script/personaOrchestrationGate.gs',
  'apps-script/personaOrchestrator.gs',
  'apps-script/personaLearning10m.gs'
].map(p => fs.readFileSync(p, 'utf8')).join('\n');

const appended = [];
const headers = ['BOARD_ID','APP_ID','FRONT_REQUEST_ID','CONTENT_ID','SCENE_ID','SCENE_ORDER',
  'STORY_BEAT','TEXT_CLAIM','PERSONA_ID','PERSONA_SNAPSHOT_ID','EXPRESSION','MOTION',
  'LIPSYNC_REQUIRED','IMAGE_ASSET_ID','VOICE_PACK_ID','LANGUAGE_PACK_ID','SUBTITLE_STYLE',
  'VTUBE_STATUS','QA_DECISION'];
const sheet = {
  getDataRange() { return {getDisplayValues: () => [headers]}; },
  getLastColumn() { return headers.length; },
  getRange() { return {getDisplayValues: () => [headers]}; },
  getLastRow() { return appended.length + 1; },
  appendRow(values) { appended.push(values); }
};
const ss = { getSheetByName() { return sheet; } };
const sandbox = {
  Object, Array, String, Date, JSON, RegExp, Math, Set,
  Utilities: { getUuid: () => 'mock-uuid-123456789' }
};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const c = sandbox.GOODWHY_WRITE_PRECHECK_V1;
assert.equal(c.principles.length, 5);
assert.equal(c.bonEight.length, 8);
assert.equal(c.harmonyBeats.length, 6);

function fixture(domain) {
  const contentId = 'GOODWHY_' + domain;
  const appId = 'APP_' + domain;
  const bonEight = {};
  const principles = {};
  const harmonyCircle = {};
  c.bonEight.forEach(k => {bonEight[k] = {decision: 'PASS', evidence: domain + ' ' + k + ' attestation'};});
  c.principles.forEach(k => {principles[k] = {decision: 'PASS', evidence: domain + ' ' + k + ' attestation'};});
  c.harmonyBeats.forEach(k => {harmonyCircle[k] = domain + ' storyline ' + k;});
  return {
    appId, contentId, scenes: [{sceneId: '1', storyBeat: 'PROBLEM', textClaim: 'Example only'}],
    writePrecheck: {
      appId, contentId, purposeDirectiveId: c.purposeDirectiveId,
      charterReadback: {documentId: c.charterDocumentId, revisionId: 'mock-only-revision',
        readbackAtKst: '2026-11-16T10:30:00+09:00'},
      audienceQuestion: domain + ' audience needs reliable help',
      recipientBenefit: domain + ' useful non-coercive guidance',
      factOpinionBoundary: 'Claims are sourced; interpretation is labeled as opinion',
      sourceEvidence: [{sourceId: domain + '-SOURCE-001', sourceRef: 'mock://source/' + domain,
        checkedAtKst: '2026-11-16T10:30:00+09:00', rightsDecision: 'PASS',
        verificationDecision: 'PASS', factOpinionTag: 'MIXED'}],
      bonSeomgim: {gate0: {decision: 'PASS', evidence: 'Who benefits and why'},
        eightGates: bonEight},
      principles, harmonyCircle,
      review: {decision: 'PASS', reviewer: 'FIXTURE_REVIEWER_NOT_APPROVAL',
        receiptId: 'MOCK_RECEIPT_' + domain, reviewedAtKst: '2026-11-16T10:30:00+09:00',
        inputSha256: 'a'.repeat(64)}
    }
  };
}

// Five content domains — contract checks only, NOT model-written articles.
for (const domain of ['POLITICS', 'SOCIETY', 'ECONOMY', 'CULTURE', 'LIFE_PHILOSOPHY']) {
  const p = fixture(domain);
  const state = sandbox.personaWritePrecheckState_(p);
  assert.equal(state.ok, true, domain + ' ' + JSON.stringify(state.issues));
  assert.equal(state.decision, 'PASS');
  assert.equal(state.receiptId, 'MOCK_RECEIPT_' + domain);
}

const noPrecheck = fixture('FAIL_MISSING');
delete noPrecheck.writePrecheck;
assert.equal(sandbox.personaWritePrecheckState_(noPrecheck).decision, 'HOLD_PRECHECK_MISSING');
assert.throws(() => sandbox.assertWritePrecheckAllowed_(noPrecheck), /WRITE_PRECHECK_BLOCKED/);

const invalidCases = [
  ['principle', p => {delete p.writePrecheck.principles.DISCERN_KEEP_GOOD;}],
  ['bon', p => {delete p.writePrecheck.bonSeomgim.eightGates.SERVICE;}],
  ['harmony', p => {delete p.writePrecheck.harmonyCircle.RETURN;}],
  ['rights', p => {p.writePrecheck.sourceEvidence[0].rightsDecision = 'PENDING';}],
  ['source', p => {p.writePrecheck.sourceEvidence = [];}],
  ['charter', p => {p.writePrecheck.charterReadback.revisionId = '';}],
  ['sha', p => {p.writePrecheck.review.inputSha256 = 'invalid';}],
  ['content-id', p => {p.writePrecheck.contentId = 'ANOTHER_CONTENT';}],
  ['benefit', p => {p.writePrecheck.recipientBenefit = '';}],
  ['review', p => {p.writePrecheck.review.decision = 'PENDING';}]
];
invalidCases.forEach(([name, mutate]) => {
  const p = fixture('FAIL_' + name.toUpperCase());
  mutate(p);
  const result = sandbox.personaWritePrecheckState_(p);
  assert.equal(result.ok, false, name);
  assert.equal(result.decision, 'HOLD_PRECHECK_INVALID', name);
  assert.ok(result.issues.length, name);
});

// Both existing storyboard entrypoints must fail before any Sheet append.
assert.throws(() => sandbox.buildPersonaStoryboard_(ss, noPrecheck), /WRITE_PRECHECK_BLOCKED/);
assert.throws(() => sandbox.buildStoryboardPersonaRows_(ss, noPrecheck), /WRITE_PRECHECK_BLOCKED/);
assert.equal(appended.length, 0, 'blocked input must never append a scene');

const one = sandbox.buildPersonaStoryboard_(ss, fixture('STORYBOARD_CANONICAL'));
assert.equal(one.ok, true);
assert.equal(one.precheckReceiptId, 'MOCK_RECEIPT_STORYBOARD_CANONICAL');
const two = sandbox.buildStoryboardPersonaRows_(ss, fixture('STORYBOARD_FACTORY'));
assert.equal(two.ok, true);
assert.equal(two.precheckReceiptId, 'MOCK_RECEIPT_STORYBOARD_FACTORY');
assert.equal(appended.length, 2, 'only valid scene fixtures may append');
assert.equal(typeof sandbox.runPersonaLearningCycle10mIfDue_, 'function', 'existing learning source preserved');

console.log('GOODWHY WRITE_PRECHECK PASS: 5 domains, 10 invalid fixtures, 2 blocked write paths, 2 allowed mock storyboard paths; no providers, no triggers, no public publication');
