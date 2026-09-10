var PINTEREST_UPLOAD_GOVERNOR_V1 = {
  version:'PINTEREST_UPLOAD_BATCH_GOVERNOR_V1_20260910',
  trialOrgWriteDailyLimit:300,
  reserveWrites:20,
  imageBatchSmall:20,
  imageBatchMedium:10,
  imageBatchLarge:5,
  videoBatchNormal:3,
  videoBatchLarge:1,
  smallBytes:5*1024*1024,
  mediumBytes:20*1024*1024,
  largeVideoBytes:100*1024*1024
};

function pinterestUploadBatchGovernorPlanV1(items, state) {
  items = Array.isArray(items) ? items : [];
  state = state || {};
  var remaining = Math.max(0, Number(state.orgWriteRemaining || PINTEREST_UPLOAD_GOVERNOR_V1.trialOrgWriteDailyLimit));
  var usable = Math.max(0, remaining - PINTEREST_UPLOAD_GOVERNOR_V1.reserveWrites);
  var seen = {};
  var eligible = [], skipped = [];
  items.forEach(function(x){
    x = x || {};
    var key = String(x.pinId || x.contentHash || x.driveFileId || x.sourceUrl || '');
    if (!key) { skipped.push({item:x,reason:'NO_DEDUPE_KEY'}); return; }
    if (seen[key]) { skipped.push({item:x,reason:'DUPLICATE_IN_BATCH'}); return; }
    seen[key] = true;
    if (x.publishStatus === 'SUCCESS' || x.pinId) { skipped.push({item:x,reason:'ALREADY_PUBLISHED'}); return; }
    if (x.retryOnly === true && String(x.lastStatus || '').toUpperCase() !== 'FAILED') { skipped.push({item:x,reason:'RETRY_ONLY_NOT_FAILED'}); return; }
    var mime = String(x.mimeType || '').toLowerCase();
    var size = Math.max(0, Number(x.sizeBytes || 0));
    var kind = mime.indexOf('video/') === 0 ? 'VIDEO' : (mime.indexOf('image/') === 0 ? 'IMAGE' : 'UNSUPPORTED');
    if (kind === 'UNSUPPORTED') { skipped.push({item:x,reason:'UNSUPPORTED_MIME'}); return; }
    var cost = 1;
    eligible.push({item:x,key:key,kind:kind,sizeBytes:size,writeCost:cost});
  });

  var batches = [];
  var cursor = 0;
  while (cursor < eligible.length && usable > 0) {
    var head = eligible[cursor];
    var cap = pinterestUploadBatchCapV1_(head.kind, head.sizeBytes);
    var batch = [];
    while (cursor < eligible.length && batch.length < cap && usable > 0) {
      var row = eligible[cursor];
      if (row.kind !== head.kind || pinterestUploadBatchCapV1_(row.kind,row.sizeBytes) !== cap) break;
      batch.push(row); cursor++; usable -= row.writeCost;
    }
    batches.push({kind:head.kind,batchCap:cap,count:batch.length,items:batch});
  }
  return {ok:true,version:PINTEREST_UPLOAD_GOVERNOR_V1.version,remainingInput:remaining,reserved:PINTEREST_UPLOAD_GOVERNOR_V1.reserveWrites,usableAfterPlan:usable,batches:batches,skipped:skipped,unplanned:eligible.slice(cursor),publishMode:String(state.publishMode||'TRIAL_SANDBOX'),dryRun:state.dryRun!==false};
}

function pinterestUploadBatchCapV1_(kind,size) {
  if (kind === 'VIDEO') return size >= PINTEREST_UPLOAD_GOVERNOR_V1.largeVideoBytes ? PINTEREST_UPLOAD_GOVERNOR_V1.videoBatchLarge : PINTEREST_UPLOAD_GOVERNOR_V1.videoBatchNormal;
  if (size < PINTEREST_UPLOAD_GOVERNOR_V1.smallBytes) return PINTEREST_UPLOAD_GOVERNOR_V1.imageBatchSmall;
  if (size < PINTEREST_UPLOAD_GOVERNOR_V1.mediumBytes) return PINTEREST_UPLOAD_GOVERNOR_V1.imageBatchMedium;
  return PINTEREST_UPLOAD_GOVERNOR_V1.imageBatchLarge;
}

function testPinterestUploadBatchGovernorX2V1() {
  var fixture = [
    {driveFileId:'IMG1',mimeType:'image/jpeg',sizeBytes:1000000,contentHash:'H1'},
    {driveFileId:'IMG2',mimeType:'image/png',sizeBytes:9000000,contentHash:'H2'},
    {driveFileId:'VID1',mimeType:'video/mp4',sizeBytes:50000000,contentHash:'H3'},
    {driveFileId:'VID2',mimeType:'video/mp4',sizeBytes:120000000,contentHash:'H4'},
    {driveFileId:'IMG1',mimeType:'image/jpeg',sizeBytes:1000000,contentHash:'H1'}
  ];
  var state = {orgWriteRemaining:300,publishMode:'TRIAL_SANDBOX',dryRun:true};
  var a = pinterestUploadBatchGovernorPlanV1(fixture,state);
  var b = pinterestUploadBatchGovernorPlanV1(fixture,state);
  var sig = function(x){return JSON.stringify(x.batches.map(function(z){return [z.kind,z.batchCap,z.count];}));};
  return {ok:a.ok&&b.ok&&sig(a)===sig(b)&&a.skipped.length===1&&b.skipped.length===1,x2:sig(a)===sig(b)?'PASS':'FAIL',run1:a,run2:b,version:PINTEREST_UPLOAD_GOVERNOR_V1.version};
}
