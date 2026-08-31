/* PERSONA_COMBINED_WAKE_ADAPTER_V1_20260831
 * Intended to be called from the EXISTING processTaskQueue/factory 5-minute wake.
 * It installs no trigger. It only delegates to due-guarded 10m learning + 60m MVP governor.
 */
var PERSONA_COMBINED_WAKE_ADAPTER_V1 = Object.freeze({
  version: '1.0.0',
  physicalWakeMinutes: 5,
  installNewTrigger: false,
  handlers: ['runPersonaLearningCycle10mIfDue_','runPersonaMvpHourlyGovernorIfDue_']
});

function runPersonaCombinedLearningWake_(ss, context) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  context = context || {};
  var out = { ok: true, source: 'EXISTING_5M_FACTORY_WAKE', installNewTrigger: false, learning10m: null, hourlyMvp: null, errors: [] };
  try {
    if (typeof runPersonaLearningCycle10mIfDue_ === 'function') out.learning10m = runPersonaLearningCycle10mIfDue_(ss, context);
    else out.errors.push('PERSONA_10M_HANDLER_MISSING');
  } catch (e1) {
    out.ok = false;
    out.errors.push('PERSONA_10M:' + String(e1 && e1.message || e1));
  }
  try {
    if (typeof runPersonaMvpHourlyGovernorIfDue_ === 'function') out.hourlyMvp = runPersonaMvpHourlyGovernorIfDue_(ss, context);
    else out.errors.push('PERSONA_HOURLY_HANDLER_MISSING');
  } catch (e2) {
    out.ok = false;
    out.errors.push('PERSONA_HOURLY:' + String(e2 && e2.message || e2));
  }
  if (out.errors.length && out.ok) out.ok = false;
  out.resumePoint = out.ok ? 'NEXT_EXISTING_5M_WAKE' : 'PRESERVE_LAST_GOOD→REPAIR_FAILED_HANDLER_ONLY→RETEST';
  return out;
}

function ensurePersonaCombinedWakeTrigger_() {
  return {
    ok: true,
    installNewTrigger: false,
    physicalWake: 'existing processTaskQueue/factory 5m trigger',
    handler: 'runPersonaCombinedLearningWake_',
    delegates: PERSONA_COMBINED_WAKE_ADAPTER_V1.handlers,
    policy: 'Never create a second clock trigger. Existing wake only.'
  };
}
