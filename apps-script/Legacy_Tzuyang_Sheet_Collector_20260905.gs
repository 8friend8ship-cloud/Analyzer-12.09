var LEGACY_TZUYANG_COLLECTOR_VERSION = 'LEGACY_TZUYANG_SHEET_COLLECTOR_V1_20260905';
var LEGACY_TZUYANG_TARGET_SPREADSHEET_ID = '1DAM8OeQVLJQrThfX-grQKg7h2FY9LF6mZteu4-JyXMQ';
var LEGACY_TZUYANG_TARGET_SHEET_NAME = 'tzuyang쯔양 - Videos';
var LEGACY_TZUYANG_SOURCE_SPREADSHEET_ID = '1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ';
var LEGACY_TZUYANG_SOURCE_SHEET_NAME = 'Video_Index';
var LEGACY_TZUYANG_CHANNEL_TITLE = 'tzuyang쯔양';
var LEGACY_TZUYANG_DEFAULT_YOUTUBE_SEEDS_URL = 'https://content-7o0dbpooa-taedis-projects-5d092fa4.vercel.app/api/youtube-seeds';

/**
 * Restores the legacy tzuyang Google Sheet collector without creating a trigger,
 * project, deployment, OAuth grant, or API key.
 *
 * Source discovery: existing central Video_Index (Drive/cache first).
 * Metadata enrichment: existing ContentOS /api/youtube-seeds direct VIDEO_ID path.
 * Target: original 9-column tzuyang sheet contract.
 * Dedupe key: VIDEO_ID only.
 *
 * opts.videoIds may be supplied for a deterministic manual test.
 * opts.maxCreate defaults to 2 and is capped at 10.
 */
function refreshLegacyTzuyangSheetV1(opts) {
  opts = opts || {};
  var maxCreate = Math.max(1, Math.min(Number(opts.maxCreate || 2), 10));
  var target = SpreadsheetApp.openById(LEGACY_TZUYANG_TARGET_SPREADSHEET_ID).getSheetByName(LEGACY_TZUYANG_TARGET_SHEET_NAME);
  if (!target) return {ok:false, reason:'TARGET_SHEET_MISSING', version:LEGACY_TZUYANG_COLLECTOR_VERSION};

  var existing = legacyTzuyangExistingIdSet_(target);
  var requestedIds = Array.isArray(opts.videoIds) ? opts.videoIds : legacyTzuyangDiscoverCandidateIds_(Math.max(20, maxCreate * 10));
  var candidateIds = [];
  var seen = {};
  requestedIds.forEach(function(v) {
    var id = String(v || '').trim();
    if (!/^[A-Za-z0-9_-]{11}$/.test(id) || seen[id] || existing[id]) return;
    seen[id] = true;
    candidateIds.push(id);
  });

  if (!candidateIds.length) {
    return {ok:true, inserted:0, skippedExisting:requestedIds.length, reason:'NO_NEW_VIDEO_ID', version:LEGACY_TZUYANG_COLLECTOR_VERSION};
  }

  var cards = legacyTzuyangFetchMetadata_(candidateIds.slice(0, 50));
  cards = cards.filter(function(card) {
    return card && card.channelTitle === LEGACY_TZUYANG_CHANNEL_TITLE && !existing[card.videoId];
  }).sort(function(a,b) {
    return String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''));
  }).slice(0, maxCreate);

  if (!cards.length) {
    return {ok:true, inserted:0, reason:'NO_ELIGIBLE_TZUYANG_CARD', requested:candidateIds.length, version:LEGACY_TZUYANG_COLLECTOR_VERSION};
  }

  // Keep the original legacy sheet intact: insert below the two frozen header rows,
  // clone the previous first data row's full 9-column shape, then overwrite values.
  target.insertRowsBefore(3, cards.length);
  var templateRow = 3 + cards.length;
  var templateRange = target.getRange(templateRow, 1, 1, 9);
  var templateHeight = target.getRowHeight(templateRow);

  cards.forEach(function(card, i) {
    var row = 3 + i;
    templateRange.copyTo(target.getRange(row, 1, 1, 9), SpreadsheetApp.CopyPasteType.PASTE_NORMAL, false);
    target.setRowHeight(row, templateHeight);

    target.getRange(row, 1).setFormula('=HYPERLINK("https://www.youtube.com/watch?v=' + card.videoId + '","' + card.videoId + '")');
    target.getRange(row, 2).setValue(card.title || '');
    target.getRange(row, 3).setFormula('=IMAGE("https://i.ytimg.com/vi/' + card.videoId + '/mqdefault.jpg", 4, 73, 130)');
    target.getRange(row, 4).setValue(new Date(card.publishedAt));
    target.getRange(row, 5).setValue(legacyTzuyangDurationDisplay_(card.durationIso8601));
    target.getRange(row, 6).setValue(card.viewCount == null ? '' : Number(card.viewCount));
    target.getRange(row, 7).setValue(card.likeCount == null ? '' : Number(card.likeCount));
    target.getRange(row, 8).setValue('N/A');
    target.getRange(row, 9).setValue(card.commentCount == null ? '' : Number(card.commentCount));
    existing[card.videoId] = true;
  });

  var values = target.getRange(3, 1, cards.length, 9).getDisplayValues();
  var formulas = target.getRange(3, 1, cards.length, 9).getFormulas();
  var insertedIds = cards.map(function(card) { return card.videoId; });
  var readbackOk = values.length === cards.length && cards.every(function(card, i) {
    return values[i][0] === card.videoId &&
      formulas[i][0].indexOf(card.videoId) >= 0 &&
      formulas[i][2].indexOf(card.videoId) >= 0 &&
      values[i][7] === 'N/A';
  });

  return {
    ok: readbackOk,
    inserted: cards.length,
    insertedIds: insertedIds,
    readbackOk: readbackOk,
    topRows: values,
    physicalTriggerCreated: false,
    version: LEGACY_TZUYANG_COLLECTOR_VERSION,
    at: new Date().toISOString()
  };
}

/**
 * Safe x2 runtime test: pick one central tzuyang VIDEO_ID that is not yet in the
 * legacy sheet. Run 1 must insert exactly one row; run 2 must insert zero rows.
 */
function testLegacyTzuyangSheetV1X2() {
  var target = SpreadsheetApp.openById(LEGACY_TZUYANG_TARGET_SPREADSHEET_ID).getSheetByName(LEGACY_TZUYANG_TARGET_SHEET_NAME);
  if (!target) return {ok:false, reason:'TARGET_SHEET_MISSING', version:LEGACY_TZUYANG_COLLECTOR_VERSION};
  var existing = legacyTzuyangExistingIdSet_(target);
  var candidates = legacyTzuyangDiscoverCandidateIds_(50).filter(function(id) { return !existing[id]; });
  if (!candidates.length) return {ok:false, hold:true, reason:'NO_FRESH_TEST_FIXTURE', version:LEGACY_TZUYANG_COLLECTOR_VERSION};
  var fixture = candidates[0];
  var first = refreshLegacyTzuyangSheetV1({videoIds:[fixture], maxCreate:1});
  var second = refreshLegacyTzuyangSheetV1({videoIds:[fixture], maxCreate:1});
  var after = legacyTzuyangExistingIdSet_(target);
  var count = legacyTzuyangCountId_(target, fixture);
  return {
    ok: first && first.ok === true && first.inserted === 1 && second && second.ok === true && second.inserted === 0 && count === 1 && after[fixture] === true,
    fixture: fixture,
    first: first,
    second: second,
    finalOccurrenceCount: count,
    expectedPhysicalTriggerCount: 0,
    version: LEGACY_TZUYANG_COLLECTOR_VERSION,
    at: new Date().toISOString()
  };
}

function legacyTzuyangDiscoverCandidateIds_(limit) {
  var source = SpreadsheetApp.openById(LEGACY_TZUYANG_SOURCE_SPREADSHEET_ID).getSheetByName(LEGACY_TZUYANG_SOURCE_SHEET_NAME);
  if (!source || source.getLastRow() < 2) return [];
  var finder = source.getRange(2, 3, source.getLastRow() - 1, 1)
    .createTextFinder(LEGACY_TZUYANG_CHANNEL_TITLE)
    .matchEntireCell(true)
    .matchCase(true);
  var matches = finder.findAll();
  var rows = [];
  matches.forEach(function(cell) {
    var r = source.getRange(cell.getRow(), 1, 1, 10).getDisplayValues()[0];
    var id = String(r[0] || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(id)) rows.push({id:id, publishedAt:String(r[8] || ''), lastSync:String(r[9] || '')});
  });
  rows.sort(function(a,b) {
    var byPublished = b.publishedAt.localeCompare(a.publishedAt);
    if (byPublished) return byPublished;
    return b.lastSync.localeCompare(a.lastSync);
  });
  var out = [], seen = {};
  rows.some(function(x) {
    if (!seen[x.id]) { seen[x.id] = true; out.push(x.id); }
    return out.length >= Number(limit || 20);
  });
  return out;
}

function legacyTzuyangFetchMetadata_(videoIds) {
  if (!videoIds.length) return [];
  var props = PropertiesService.getScriptProperties();
  var base = String(props.getProperty('LEGACY_TZUYANG_YOUTUBE_SEEDS_URL') || LEGACY_TZUYANG_DEFAULT_YOUTUBE_SEEDS_URL).trim();
  var url = base + '?videoIds=' + encodeURIComponent(videoIds.join(',')) + '&verifyOnly=true';
  var response = UrlFetchApp.fetch(url, {method:'get', muteHttpExceptions:true, followRedirects:true, headers:{'User-Agent':'CentralAgent-LegacyTzuyang/1.0'}});
  var code = response.getResponseCode();
  var text = response.getContentText();
  if (code !== 200) throw new Error('LEGACY_TZUYANG_METADATA_HTTP_' + code + ':' + text.slice(0,300));
  var data = JSON.parse(text || '{}');
  if (!Array.isArray(data.items)) throw new Error('LEGACY_TZUYANG_METADATA_ITEMS_MISSING');
  return data.items;
}

function legacyTzuyangExistingIdSet_(sheet) {
  var out = {};
  var last = sheet.getLastRow();
  if (last < 3) return out;
  sheet.getRange(3, 1, last - 2, 1).getDisplayValues().forEach(function(r) {
    var id = String(r[0] || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(id)) out[id] = true;
  });
  return out;
}

function legacyTzuyangCountId_(sheet, videoId) {
  var last = sheet.getLastRow();
  if (last < 3) return 0;
  var count = 0;
  sheet.getRange(3, 1, last - 2, 1).getDisplayValues().forEach(function(r) {
    if (String(r[0] || '').trim() === videoId) count++;
  });
  return count;
}

function legacyTzuyangDurationDisplay_(iso) {
  var m = String(iso || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return '';
  var h = Number(m[1] || 0), min = Number(m[2] || 0), sec = Number(m[3] || 0);
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  if (h > 0) return h + ' : ' + pad(min) + ' : ' + pad(sec);
  return pad(min) + ' : ' + pad(sec);
}
