const YT_SEED_CONFIG = {
  sourceSpreadsheetId: '1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ',
  sourceSheet: 'Video_Index',
  seedSpreadsheetId: '1vhcZfPBR9rpv9JGEozMVZXfDoL-oyvJsDwutcKQHboM',
  channelQueue: 'Channel_Queue',
  analyzerBridge: 'Channel_Analysis',
  videoSeed: 'Video_Seed',
  jobQueue: 'Job_Queue',
  runLog: 'Run_Log',
  batchSize: 250,
};

function syncYouTubeSeedQueue() {
  const started = new Date();
  const source = SpreadsheetApp.openById(YT_SEED_CONFIG.sourceSpreadsheetId).getSheetByName(YT_SEED_CONFIG.sourceSheet);
  const targetBook = SpreadsheetApp.openById(YT_SEED_CONFIG.seedSpreadsheetId);
  const videoSeed = targetBook.getSheetByName(YT_SEED_CONFIG.videoSeed);
  const props = PropertiesService.getScriptProperties();
  const cursor = Number(props.getProperty('YT_SEED_CURSOR') || 2);
  const lastRow = source.getLastRow();
  if (cursor > lastRow) {
    props.setProperty('YT_SEED_CURSOR', '2');
    logSeedRun_('syncYouTubeSeedQueue', started, new Date(), 0, 'COMPLETE_CYCLE', '');
    return;
  }

  const count = Math.min(YT_SEED_CONFIG.batchSize, lastRow - cursor + 1);
  const values = source.getRange(cursor, 1, count, 10).getValues();
  const existing = buildExistingVideoIdSet_(videoSeed);
  const rows = [];
  values.forEach(r => {
    const videoId = String(r[0] || '').trim();
    if (!videoId || existing.has(videoId)) return;
    const title = r[1] || '';
    const channelTitle = r[2] || '';
    const primary = r[3] || '';
    const sub = r[4] || '';
    const node = r[5] || '';
    const country = r[6] || '';
    const publishedAt = r[8] || '';
    const url = 'https://www.youtube.com/watch?v=' + videoId;
    const barcode = [primary, sub, node, title, channelTitle, country].filter(Boolean).join('|');
    rows.push([videoId,'',url,title,publishedAt,'QUEENS_CANDIDATE',primary,'','','','','','', '', '', '', '', barcode, false, '']);
  });
  if (rows.length) videoSeed.getRange(videoSeed.getLastRow()+1,1,rows.length,20).setValues(rows);
  props.setProperty('YT_SEED_CURSOR', String(cursor + count));
  logSeedRun_('syncYouTubeSeedQueue', started, new Date(), rows.length, 'OK', '');
}

function buildExistingVideoIdSet_(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return new Set();
  return new Set(sheet.getRange(2,1,last-1,1).getValues().flat().filter(Boolean).map(String));
}

function logSeedRun_(fn, started, ended, count, status, error) {
  const book = SpreadsheetApp.openById(YT_SEED_CONFIG.seedSpreadsheetId);
  const sheet = book.getSheetByName(YT_SEED_CONFIG.runLog);
  if (!sheet) return;
  sheet.appendRow([Utilities.getUuid(), fn, started, ended, count, status, error, new Date()]);
}

function installYouTubeSeedTriggers() {
  ScriptApp.getProjectTriggers().filter(t => ['syncYouTubeSeedQueue'].includes(t.getHandlerFunction())).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncYouTubeSeedQueue').timeBased().everyHours(1).create();
}
