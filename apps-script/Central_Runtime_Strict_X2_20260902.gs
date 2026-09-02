/* CENTRAL_RUNTIME_STRICT_X2_20260902
 * Proof helper only. Does not create triggers, deployments, projects or credentials.
 * Reason: both central auditors currently use second-resolution RUN_IDs while the older
 * x2 helpers wait only 300 ms, so two real runs can collide inside the same second.
 * These strict proof helpers wait >1 second and fail closed unless RUN_ID/RESULT_ID are
 * present and distinct. Core runtime truth is still established only by Drive/Sheet readback.
 */

function testCentralWorkflowBridgeCrosscheckX2Strict() {
  var a = runCentralWorkflowBridgeCrosscheck10m();
  Utilities.sleep(1250);
  var b = runCentralWorkflowBridgeCrosscheck10m();
  var aRun = a && a.runId ? String(a.runId) : '';
  var bRun = b && b.runId ? String(b.runId) : '';
  var aResult = a && a.resultId ? String(a.resultId) : '';
  var bResult = b && b.resultId ? String(b.resultId) : '';
  var distinct = !!(aRun && bRun && aRun !== bRun && aResult && bResult && aResult !== bResult);
  return {
    ok: distinct,
    proofPolicy: 'DISTINCT_RUN_ID_AND_RESULT_ID_REQUIRED;SLEEP_GT_1S;SHEET_READBACK_REQUIRED',
    pass1: a,
    pass2: b,
    distinctRunIds: distinct,
    runIds: [aRun, bRun],
    resultIds: [aResult, bResult]
  };
}

function testCentralSheetRuntimeAuditAutofixX2Strict() {
  var a = runCentralSheetRuntimeAuditAutofix10m();
  Utilities.sleep(1250);
  var b = runCentralSheetRuntimeAuditAutofix10m();
  var aRun = centralStrictExtractId_(a, ['runId', 'run_id', 'RUN_ID']);
  var bRun = centralStrictExtractId_(b, ['runId', 'run_id', 'RUN_ID']);
  var distinct = !!(aRun && bRun && aRun !== bRun);
  return {
    ok: distinct,
    proofPolicy: 'DISTINCT_RUN_ID_REQUIRED;SLEEP_GT_1S;SHEET_READBACK_REQUIRED',
    pass1: a,
    pass2: b,
    distinctRunIds: distinct,
    runIds: [aRun, bRun]
  };
}

function centralStrictExtractId_(obj, keys) {
  if (!obj) return '';
  for (var i = 0; i < keys.length; i++) {
    if (obj[keys[i]] !== undefined && obj[keys[i]] !== null && String(obj[keys[i]])) {
      return String(obj[keys[i]]);
    }
  }
  return '';
}
