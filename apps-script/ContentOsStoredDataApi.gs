const CONTENT_OS_SPREADSHEET_ID = '1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ';
const CONTENT_OS_VIDEO_SHEET = 'Video_Index';
const CONTENT_OS_API_VERSION = '2026-07-24-mvp1';

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || 'health');

  try {
    if (action === 'health') {
      return json_({
        success: true,
        service: 'CONTENT_OS_STORED_DATA',
        version: CONTENT_OS_API_VERSION,
        spreadsheetId: CONTENT_OS_SPREADSHEET_ID,
        sheetName: CONTENT_OS_VIDEO_SHEET,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'searchVideos') {
      return json_(searchVideos_(params));
    }

    if (action === 'searchChannels') {
      return json_(searchChannels_(params));
    }

    return json_({ success: false, error: 'UNSUPPORTED_ACTION', action: action });
  } catch (error) {
    return json_({
      success: false,
      error: 'STORED_DATA_API_FAILED',
      message: error && error.message ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}

function searchVideos_(params) {
  const rows = readVideoRows_();
  const query = normalize_(params.query || '');
  const country = String(params.country || 'WW').toUpperCase();
  const sortBy = String(params.sortBy || 'viewCount');
  const period = String(params.period || 'any');
  const limit = clamp_(Number(params.limit || params.resultsLimit || 50), 1, 100);
  const minViews = Math.max(0, Number(params.minViews || 0));

  const cutoff = period === 'any' ? null : new Date(Date.now() - Number(period) * 86400000);

  const filtered = rows.filter(function (row) {
    const haystack = normalize_([
      row.title,
      row.channelTitle,
      row.primaryCode,
      row.subKey,
      row.nodeTag
    ].join(' '));

    if (query && haystack.indexOf(query) === -1) return false;
    if (country !== 'WW' && row.country !== country) return false;
    if (row.viewCount < minViews) return false;
    if (cutoff && (!row.publishedAt || new Date(row.publishedAt) < cutoff)) return false;
    return true;
  });

  filtered.sort(function (a, b) {
    if (sortBy === 'publishedAt') {
      return dateValue_(b.publishedAt) - dateValue_(a.publishedAt);
    }
    return b.viewCount - a.viewCount;
  });

  return {
    success: true,
    source: {
      spreadsheetId: CONTENT_OS_SPREADSHEET_ID,
      sheetName: CONTENT_OS_VIDEO_SHEET,
      version: CONTENT_OS_API_VERSION,
      lastReadAt: new Date().toISOString()
    },
    query: String(params.query || ''),
    count: Math.min(filtered.length, limit),
    totalMatched: filtered.length,
    items: filtered.slice(0, limit)
  };
}

function searchChannels_(params) {
  const videoResult = searchVideos_(params);
  const limit = clamp_(Number(params.limit || params.resultsLimit || 50), 1, 100);
  const grouped = {};

  videoResult.items.forEach(function (video) {
    const key = video.channelTitle || 'UNKNOWN_CHANNEL';
    if (!grouped[key]) {
      grouped[key] = {
        id: 'stored:' + Utilities.base64EncodeWebSafe(key).replace(/=+$/, '').slice(0, 40),
        name: key,
        channelHandle: '',
        thumbnailUrl: video.thumbnailUrl,
        subscriberCount: 0,
        newSubscribersInPeriod: 0,
        newViewsInPeriod: 0,
        videoCount: 0,
        viewCount: 0,
        rank: 0,
        rankChange: 0,
        channelCountry: video.channelCountry,
        description: 'Stored Content OS channel aggregate'
      };
    }
    grouped[key].videoCount += 1;
    grouped[key].viewCount += video.viewCount;
  });

  const items = Object.keys(grouped).map(function (key) { return grouped[key]; });
  items.sort(function (a, b) { return b.viewCount - a.viewCount; });
  items.slice(0, limit).forEach(function (item, index) { item.rank = index + 1; });

  return {
    success: true,
    source: videoResult.source,
    query: videoResult.query,
    count: Math.min(items.length, limit),
    totalMatched: items.length,
    items: items.slice(0, limit)
  };
}

function readVideoRows_() {
  const spreadsheet = SpreadsheetApp.openById(CONTENT_OS_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(CONTENT_OS_VIDEO_SHEET);
  if (!sheet) throw new Error('SHEET_NOT_FOUND: ' + CONTENT_OS_VIDEO_SHEET);

  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  const headers = values[0].map(function (value) { return String(value).trim(); });
  const index = {};
  headers.forEach(function (header, i) { index[header] = i; });

  const required = ['Video_ID', 'Title', 'Channel_Title', 'Country', 'View_Count', 'Published_At', 'Last_Sync'];
  required.forEach(function (header) {
    if (index[header] === undefined) throw new Error('MISSING_COLUMN: ' + header);
  });

  return values.slice(1).filter(function (row) {
    return String(row[index.Video_ID] || '').trim() !== '';
  }).map(function (row) {
    const videoId = String(row[index.Video_ID] || '').trim();
    const title = decodeHtml_(row[index.Title]);
    const channelTitle = decodeHtml_(row[index.Channel_Title]);
    return {
      id: videoId,
      channelId: '',
      title: title,
      thumbnailUrl: 'https://i.ytimg.com/vi/' + encodeURIComponent(videoId) + '/hqdefault.jpg',
      channelTitle: channelTitle,
      publishedAt: String(row[index.Published_At] || ''),
      subscribers: 0,
      viewCount: number_(row[index.View_Count]),
      likeCount: 0,
      commentCount: 0,
      durationMinutes: 0,
      engagementRate: 0,
      channelCountry: String(row[index.Country] || '').toUpperCase(),
      primaryCode: valueByHeader_(row, index, 'Primary_Code'),
      subKey: valueByHeader_(row, index, 'Sub_Key'),
      nodeTag: valueByHeader_(row, index, 'Node_Tag'),
      lastSync: String(row[index.Last_Sync] || '')
    };
  });
}

function valueByHeader_(row, index, header) {
  return index[header] === undefined ? '' : String(row[index[header]] || '');
}

function normalize_(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function number_(value) {
  const parsed = Number(String(value || '0').replace(/,/g, ''));
  return isFinite(parsed) ? parsed : 0;
}

function dateValue_(value) {
  const timestamp = new Date(value || 0).getTime();
  return isFinite(timestamp) ? timestamp : 0;
}

function clamp_(value, min, max) {
  if (!isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function decodeHtml_(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
