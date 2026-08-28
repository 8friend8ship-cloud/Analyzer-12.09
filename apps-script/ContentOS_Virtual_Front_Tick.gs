const CONTENTOS_VIRTUAL_FRONT_TICK_VERSION = 'CONTENTOS_VIRTUAL_FRONT_TICK_V1_20260822';

/**
 * Logical 10-minute gate. Reuses the existing factory scheduler and never
 * creates a physical Apps Script trigger.
 */
function contentOsVirtualFront10mTick() {
  const now = new Date();
  const bucket = Math.floor(now.getMinutes()/10);
  const tz = Session.getScriptTimeZone() || 'Asia/Seoul';
  const key = Utilities.formatDate(now,tz,'yyyyMMddHH') + '_' + bucket;
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('CONTENTOS_VIRTUAL_FRONT_BUCKET') === key) {
    return {ok:true,skipped:true,key:key,version:CONTENTOS_VIRTUAL_FRONT_TICK_VERSION};
  }
  props.setProperty('CONTENTOS_VIRTUAL_FRONT_BUCKET',key);
  if (typeof testContentOsVirtualFrontReadinessX2 !== 'function') {
    return {ok:true,skipped:true,reason:'VIRTUAL_FRONT_QA_NOT_SYNCED',key:key,version:CONTENTOS_VIRTUAL_FRONT_TICK_VERSION};
  }
  const qa = testContentOsVirtualFrontReadinessX2();
  return {ok:qa && qa.ok !== false,skipped:false,key:key,qa:qa,version:CONTENTOS_VIRTUAL_FRONT_TICK_VERSION};
}
