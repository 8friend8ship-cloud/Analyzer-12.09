/* CENTRAL_API_CREDENTIAL_USAGE_AUDIT_V1_20260902
 * Logical hourly API/credential usage audit.
 * Reuses the existing processTaskQueue/factory wake. Creates no trigger.
 * Never reads/writes secret credential values.
 */
const CENTRAL_API_USAGE_CONTROL_V1 = {
  version: 'CENTRAL_API_CREDENTIAL_USAGE_AUDIT_V1_20260902',
  spreadsheetId: '1BBtBmt1Z0X5tPihtmVQ2pHD-xz50iKenWzG3nTXsUyQ',
  intervalMinutes: 60,
  tz: 'Asia/Seoul',
  dueProperty: 'CENTRAL_API_USAGE_AUDIT_LAST_HOUR_V1'
};

function runCentralApiCredentialUsageAuditHourly() {
  const now = new Date();
  const hourBucket = Utilities.formatDate(now, CENTRAL_API_USAGE_CONTROL_V1.tz, 'yyyy-MM-dd HH:00');
  const props = PropertiesService.getScriptProperties();
  const last = props.getProperty(CENTRAL_API_USAGE_CONTROL_V1.dueProperty);
  if (last === hourBucket) {
    return {ok:true, skipped:true, reason:'HOURLY_ALREADY_DONE', hourBucket:hourBucket, version:CENTRAL_API_USAGE_CONTROL_V1.version};
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return {ok:true, skipped:true, reason:'LOCK_BUSY', hourBucket:hourBucket, version:CENTRAL_API_USAGE_CONTROL_V1.version};
  }

  try {
    const ss = SpreadsheetApp.openById(CENTRAL_API_USAGE_CONTROL_V1.spreadsheetId);
    const mapSheet = ss.getSheetByName('APP_API_MAP');
    const usageSheet = ss.getSheetByName('API_USAGE_HOURLY');
    const errorSheet = ss.getSheetByName('ERROR_RESOLUTION_LOG');
    if (!mapSheet || !usageSheet || !errorSheet) throw new Error('103 control tabs missing');

    const rows = mapSheet.getLastRow() > 1
      ? mapSheet.getRange(2, 1, mapSheet.getLastRow() - 1, Math.min(20, mapSheet.getLastColumn())).getDisplayValues()
      : [];

    let audited = 0;
    let errorCount = 0;
    rows.forEach(function(r) {
      if (!r[0]) return;
      const actualEvidence = r[13] || '';
      const status = actualEvidence ? 'EVIDENCE_PRESENT_REVIEW_REQUIRED' : 'REGISTERED_ONLY_UNVERIFIED';
      usageSheet.appendRow([
        'AUDIT_' + hourBucket.replace(/[- :]/g,'') + '_' + (audited + 1),
        hourBucket,
        r[1] || '', r[2] || '', r[4] || '', r[7] || '', r[8] || '', '',
        '', actualEvidence, '', '', '', '', r[11] || '', '',
        r[15] ? 1 : 0,
        r[15] ? 'ROUTE_TO_ERROR_LOG' : 'NO_MUTATION',
        r[17] || '', status, actualEvidence, new Date().toISOString()
      ]);
      if (r[15]) {
        errorCount++;
        errorSheet.appendRow([
          'ERR_' + hourBucket.replace(/[- :]/g,'') + '_' + errorCount,
          new Date().toISOString(), r[1] || '', r[2] || '', r[4] || '', r[7] || '',
          'APP_API_MAP_ERROR_STATE', r[15], 'READBACK_REQUIRED', 'YES_IF_WITHIN_SAFE_BOUNDARY',
          'MINIMUM_FIX_REQUIRED', 'PENDING', 'OPEN', r[17] || '', '', 'NO_UNLESS_FINANCIAL_LIMIT_OR_DESTRUCTIVE_BOUNDARY',
          actualEvidence, new Date().toISOString()
        ]);
      }
      audited++;
    });

    // Heartbeat row is operational evidence only; it is NOT provider/API usage evidence.
    if (audited === 0) {
      usageSheet.appendRow([
        'AUDIT_' + hourBucket.replace(/[- :]/g,'') + '_HEARTBEAT', hourBucket,
        'CENTRAL_AGENT', 'ALL_APPS', 'runCentralApiCredentialUsageAuditHourly', 'CONTROL_PLANE', '', '',
        0, 'NO_APP_API_MAP_ROWS_YET', '', '', '', '', '', '', 0,
        'REGISTER_USAGE_MAPS_DURING_APP_AND_SEED_TESTS', '', 'CONTROL_HEARTBEAT_NOT_PROVIDER_USAGE',
        'No actual provider usage inferred', new Date().toISOString()
      ]);
    }

    props.setProperty(CENTRAL_API_USAGE_CONTROL_V1.dueProperty, hourBucket);
    return {ok:true, hourBucket:hourBucket, audited:audited, errors:errorCount, installNewTrigger:false, physicalWake:'existing processTaskQueue/factory wake', version:CENTRAL_API_USAGE_CONTROL_V1.version};
  } catch (err) {
    return {ok:false, error:String(err && err.message || err), installNewTrigger:false, version:CENTRAL_API_USAGE_CONTROL_V1.version};
  } finally {
    lock.releaseLock();
  }
}

function auditCentralApiCredentialUsageTriggerContract() {
  const triggers = ScriptApp.getProjectTriggers().map(function(t){ return t.getHandlerFunction(); });
  return {
    ok:true,
    installNewTrigger:false,
    physicalWakePolicy:'REUSE_EXISTING_PROCESS_TASK_QUEUE',
    processTaskQueueCount:triggers.filter(function(h){ return h === 'processTaskQueue'; }).length,
    forbiddenDedicatedAuditTriggerCount:triggers.filter(function(h){ return h === 'runCentralApiCredentialUsageAuditHourly'; }).length,
    version:CENTRAL_API_USAGE_CONTROL_V1.version
  };
}
