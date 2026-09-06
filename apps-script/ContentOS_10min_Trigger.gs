const CONTENTOS_TRIGGER_MINUTES = 10;

/**
 * Explicit operator-requested schedule for Content OS backdata pipeline.
 * Keeps exactly one physical trigger for contentOsPipelineTick().
 * Safe to re-run: deletes only triggers whose handler is contentOsPipelineTick.
 */
function installContentOs10MinuteTrigger() {
  const handler = 'contentOsPipelineTick';
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === handler) {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });

  const trigger = ScriptApp.newTrigger(handler)
    .timeBased()
    .everyMinutes(CONTENTOS_TRIGGER_MINUTES)
    .create();

  return {
    ok: true,
    installed: true,
    handler: handler,
    everyMinutes: CONTENTOS_TRIGGER_MINUTES,
    removedExistingSameHandler: removed,
    triggerId: trigger.getUniqueId(),
    installedAt: new Date().toISOString()
  };
}

/** Verifies that one and only one pipeline trigger is installed. */
function verifyContentOs10MinuteTrigger() {
  const handler = 'contentOsPipelineTick';
  const matched = ScriptApp.getProjectTriggers().filter(function(t) {
    return t.getHandlerFunction() === handler;
  });
  return {
    ok: matched.length === 1,
    handler: handler,
    expectedEveryMinutes: CONTENTOS_TRIGGER_MINUTES,
    triggerCount: matched.length,
    triggerIds: matched.map(function(t) { return t.getUniqueId(); }),
    note: 'Apps Script API does not expose the trigger cadence from Trigger objects; cadence is guaranteed by installer source and single-handler enforcement.'
  };
}

/**
 * One-shot execution/readback test. Installs the 10-minute trigger only after
 * the pipeline test has successfully written a new Pipeline_Log row.
 */
function testAndInstallContentOs10MinuteTrigger() {
  const test = testContentOsPipeline();
  if (!test || test.ok !== true) {
    throw new Error('CONTENT_OS_PIPELINE_TEST_FAILED');
  }
  const install = installContentOs10MinuteTrigger();
  const verify = verifyContentOs10MinuteTrigger();
  return {
    ok: !!(test.ok && install.ok && verify.ok),
    pipelineTest: test,
    triggerInstall: install,
    triggerVerify: verify
  };
}
