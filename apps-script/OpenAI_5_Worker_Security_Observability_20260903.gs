const OPENAI5_SECURITY_VERSION = 'OPENAI5_SECURITY_OBSERVABILITY_V1_20260903';
const OPENAI5_CANONICAL_FACTORY_SCRIPT_ID = '14OHCqUDMAgpqB6JvPw_XQfFH8NlIUlVUK163RrFH1Drz3HxIc53B4IL2';
const OPENAI5_CONTROL_SHEET_ID = '1skzvmX6Za5W5Qw9V8_Nr9QDB_cyajwabQjfHvexGDjY';

/**
 * Fail-closed security/observability gate for the W1-W5 logical runtime.
 * This function never creates/deletes triggers, changes OAuth scopes,
 * reads secret property values, deploys anything, or mutates permissions.
 */
function runOpenAi5SecurityObservabilityGate() {
  const started = new Date();
  const correlationId = 'SEC_OPENAI5_' + Utilities.formatDate(started, 'Asia/Seoul', 'yyyyMMdd_HHmmss_SSS');
  let scriptId = '';
  let triggerRows = [];
  let status = 'SECURITY_HOLD';
  let errorClass = '';
  let ok = false;

  try {
    scriptId = ScriptApp.getScriptId();
    const triggers = ScriptApp.getProjectTriggers();
    triggerRows = triggers.map(function(t) {
      return {
        handler: String(t.getHandlerFunction() || ''),
        source: String(t.getTriggerSource() || ''),
        eventType: String(t.getEventType() || ''),
        uid: safeTriggerUid_(t)
      };
    });

    const processTaskQueueCount = triggerRows.filter(function(r) {
      return r.handler === 'processTaskQueue';
    }).length;
    const dedicatedW1W5Count = triggerRows.filter(function(r) {
      return /^runOpenAi(5|Worker)/.test(r.handler) ||
        r.handler === 'runCentralDaily800W1W5AuditFromFactory_' ||
        r.handler === 'runCentralDaily800W1W5AuditNow';
    }).length;
    const identityOk = scriptId === OPENAI5_CANONICAL_FACTORY_SCRIPT_ID;
    const triggerPolicyOk = processTaskQueueCount >= 1 && dedicatedW1W5Count === 0;
    const handlersOk = typeof runOpenAi5WorkerControlCycleFromFactory === 'function' &&
      typeof runOpenAiWorker1QaLogical === 'function' &&
      typeof runOpenAiWorker2FixLogical === 'function' &&
      typeof runOpenAiWorker3SupportEvent === 'function' &&
      typeof runOpenAiWorker4IntegrationQaLogical === 'function' &&
      typeof runOpenAiWorker5FinalGovernance === 'function';

    ok = identityOk && triggerPolicyOk && handlersOk;
    if (!identityOk) errorClass = 'AUTH_OR_OWNERSHIP_MISMATCH';
    else if (!triggerPolicyOk) errorClass = 'EXPECTED_TRIGGER_SET_MISMATCH';
    else if (!handlersOk) errorClass = 'OPENAI5_HANDLER_SET_INCOMPLETE';
    status = ok ? 'SECURITY_GATE_PASS' : 'SECURITY_HOLD';

    appendOpenAi5SecurityAudit_({
      correlationId: correlationId,
      started: started,
      scriptId: scriptId,
      processTaskQueueCount: processTaskQueueCount,
      dedicatedW1W5Count: dedicatedW1W5Count,
      handlersOk: handlersOk,
      status: status,
      errorClass: errorClass
    });

    return {
      ok: ok,
      hold: !ok,
      status: status,
      errorClass: errorClass,
      correlationId: correlationId,
      scriptIdFingerprint: fingerprintOpenAi5_(scriptId),
      processTaskQueueCount: processTaskQueueCount,
      dedicatedW1W5PhysicalTriggerCount: dedicatedW1W5Count,
      handlersOk: handlersOk,
      version: OPENAI5_SECURITY_VERSION
    };
  } catch (err) {
    errorClass = 'SECURITY_GATE_EXCEPTION';
    appendOpenAi5SecurityAudit_({
      correlationId: correlationId,
      started: started,
      scriptId: scriptId,
      processTaskQueueCount: -1,
      dedicatedW1W5Count: -1,
      handlersOk: false,
      status: 'SECURITY_HOLD',
      errorClass: errorClass + ':' + hashOpenAi5_(String(err && err.message || err))
    });
    return {
      ok: false,
      hold: true,
      status: 'SECURITY_HOLD',
      errorClass: errorClass,
      correlationId: correlationId,
      version: OPENAI5_SECURITY_VERSION
    };
  }
}

/** Secure wrapper used by the existing unified factory wake. */
function runOpenAi5WorkerControlCycleSecureFromFactory() {
  const security = runOpenAi5SecurityObservabilityGate();
  if (!security.ok) {
    return {
      ok: true,
      hold: true,
      status: 'SECURITY_HOLD',
      security: security,
      version: OPENAI5_SECURITY_VERSION
    };
  }
  const result = runOpenAi5WorkerControlCycleFromFactory();
  return {
    ok: result && result.ok === true,
    degraded: !!(result && result.degraded),
    hold: !!(result && result.hold),
    runId: result && result.runId || '',
    w1: result && result.w1 || null,
    w2: result && result.w2 || null,
    w3: result && result.w3 || null,
    w4: result && result.w4 || null,
    w5: result && result.w5 || null,
    learning: result && result.learning || null,
    x2: result && result.x2 || null,
    security: security,
    version: OPENAI5_SECURITY_VERSION
  };
}

function testOpenAi5SecurityObservabilityGateX2Strict() {
  const a = runOpenAi5SecurityObservabilityGate();
  Utilities.sleep(25);
  const b = runOpenAi5SecurityObservabilityGate();
  return {
    ok: a.ok === true && b.ok === true && a.correlationId !== b.correlationId,
    first: a,
    second: b,
    version: OPENAI5_SECURITY_VERSION
  };
}

function appendOpenAi5SecurityAudit_(e) {
  try {
    const ss = SpreadsheetApp.openById(OPENAI5_CONTROL_SHEET_ID);
    const sh = ss.getSheetByName('01_QA_AUDIT_LOG');
    if (!sh) return;
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
    const record = {
      AUDIT_ID: 'QA_' + e.correlationId,
      CREATED_AT: Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss KST'),
      TASK_ID: 'TASK_OPENAI_5_WORKER_CONTROL_BIND_20260902',
      PROJECT_ID: 'P00_AGENT_CORE;ALL_PROJECTS',
      TARGET: 'OPENAI5_RUNTIME_SECURITY_GATE',
      CHECK_TYPE: 'EXECUTION_IDENTITY+EXPECTED_TRIGGER_SET+HANDLER_SET+SECRET_REDACTION',
      EXPECTED: 'canonical factory Script ID; existing processTaskQueue>=1; dedicated W1-W5 physical trigger=0; handlers loaded; no secret values logged',
      ACTUAL: 'script=' + fingerprintOpenAi5_(e.scriptId) + ';processTaskQueue=' + e.processTaskQueueCount + ';dedicatedW1W5=' + e.dedicatedW1W5Count + ';handlers=' + e.handlersOk,
      SEVERITY: e.status === 'SECURITY_GATE_PASS' ? 'PASS' : 'P0',
      ISSUE_KEY: e.status === 'SECURITY_GATE_PASS' ? '' : e.errorClass,
      STATUS: e.status,
      EVIDENCE: 'ScriptApp.getScriptId fingerprint + ScriptApp.getProjectTriggers counts; secrets not read',
      NEXT_ROUTE: e.status === 'SECURITY_GATE_PASS' ? 'OPENAI5_CONTROL_CYCLE' : 'FAIL_CLOSED_PRESERVE_LAST_GOOD',
      LAST_UPDATED: Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss KST')
    };
    sh.appendRow(headers.map(function(h) { return sanitizeSheetValueOpenAi5_(record[h] == null ? '' : record[h]); }));
  } catch (ignore) {
    // Security logging must never disclose error payloads or secrets.
  }
}

function safeTriggerUid_(t) {
  try { return fingerprintOpenAi5_(String(t.getUniqueId() || '')); } catch (e) { return ''; }
}

function sanitizeSheetValueOpenAi5_(value) {
  const s = String(value == null ? '' : value);
  const redacted = s
    .replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]+/gi, '$1[REDACTED]')
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^;\s]+/gi, '$1=[REDACTED]');
  return /^[=+\-@]/.test(redacted) ? "'" + redacted : redacted;
}

function fingerprintOpenAi5_(value) {
  const s = String(value || '');
  if (!s) return '';
  return hashOpenAi5_(s).slice(0, 12);
}

function hashOpenAi5_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || ''), Utilities.Charset.UTF_8);
  return bytes.map(function(b) { const v = b < 0 ? b + 256 : b; return ('0' + v.toString(16)).slice(-2); }).join('');
}
