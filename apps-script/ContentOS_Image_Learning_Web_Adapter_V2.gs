var CONTENTOS_IMAGE_WEB_ADAPTER_V2_VERSION = 'CONTENTOS_IMAGE_WEB_ADAPTER_V2_20260831';

/**
 * Narrow web adapter for bound-runtime verification of the image Queens→Seed loop.
 * It owns only contentos.image.*.v2 actions and returns null for every other request,
 * so the existing WEBAPP_TEMPLATE_05 doPost chain remains authoritative.
 */
function contentOsImageLearningHandleWebPostV2(e) {
  var body = {};
  try {
    body = JSON.parse(String(e && e.postData && e.postData.contents || '{}'));
  } catch (err) {
    return null;
  }
  var action = String(body.action || '');
  if (action.indexOf('contentos.image.') !== 0 || !/\.v2$/.test(action)) return null;

  var result;
  try {
    if (action === 'contentos.image.audit.v2') {
      result = typeof auditContentOsTriggerContract === 'function'
        ? auditContentOsTriggerContract()
        : {ok:false,error:'UNIFIED_SCHEDULER_NOT_SYNCED'};
    } else if (action === 'contentos.image.health.v2') {
      result = typeof imageLearningHealthV2 === 'function'
        ? imageLearningHealthV2()
        : {ok:false,error:'IMAGE_LEARNING_MODULE_NOT_SYNCED'};
    } else if (action === 'contentos.image.static.v2') {
      result = typeof testImageLearningStaticContractV2 === 'function'
        ? testImageLearningStaticContractV2()
        : {ok:false,error:'IMAGE_LEARNING_STATIC_TEST_NOT_SYNCED'};
    } else if (action === 'contentos.image.tick.v2') {
      result = typeof runImageLearning10mTickV2 === 'function'
        ? runImageLearning10mTickV2()
        : {ok:false,error:'IMAGE_LEARNING_TICK_NOT_SYNCED'};
    } else {
      result = {ok:false,error:'UNKNOWN_IMAGE_V2_ACTION',action:action};
    }
  } catch (err2) {
    result = {ok:false,error:String(err2 && err2.message || err2),action:action};
  }
  result = result || {ok:false,error:'EMPTY_IMAGE_V2_RESULT',action:action};
  result.webAdapterVersion = CONTENTOS_IMAGE_WEB_ADAPTER_V2_VERSION;
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
