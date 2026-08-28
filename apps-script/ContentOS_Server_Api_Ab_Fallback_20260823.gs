const CONTENTOS_API_AB_SERVER_PROXY_VERSION = 'CONTENTOS_API_AB_SERVER_PROXY_V1_20260823';
const CONTENTOS_API_AB_SERVER_PROXY_BASE = 'https://contents-os.com/api/youtube-proxy';

/**
 * Four-window API A/B controller using the already-approved ContentOS
 * server-only YouTube proxy when the bound Apps Script has no Advanced
 * YouTube service and no local Script Property key. No browser/API key is
 * read or written here.
 */
function runApiAbQaControlServerFallback() {
  const now = new Date();
  const hour = Number(Utilities.formatDate(now, 'Asia/Seoul', 'H'));
  if (CONTENTOS_API_AB_WINDOWS_KST.indexOf(hour) === -1) {
    return {ok:true, skipped:true, reason:'OUTSIDE_API_AB_WINDOW', hourKst:hour, version:CONTENTOS_API_AB_SERVER_PROXY_VERSION};
  }

  const dateKey = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMdd');
  const props = PropertiesService.getScriptProperties();
  const runKey = 'CONTENTOS_API_AB_DONE_' + dateKey + '_' + hour;
  if (props.getProperty(runKey) === 'Y') {
    return {ok:true, skipped:true, reason:'WINDOW_ALREADY_RUN', hourKst:hour, version:CONTENTOS_API_AB_SERVER_PROXY_VERSION};
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return {ok:false, reason:'LOCK_BUSY', hourKst:hour, version:CONTENTOS_API_AB_SERVER_PROXY_VERSION};

  try {
    const central = SpreadsheetApp.openById(CONTENTOS_FACTORY_CENTRAL_MASTER_ID);
    const source = SpreadsheetApp.openById(CONTENTOS_FACTORY_SOURCE_SHEET_ID);
    const query = chooseContentOsApiAbFixture_(source, hour);
    const stored = readStoredContentOsFixture_(source, query, 10);

    let live = runApprovedContentOsYoutubeSample_(props, dateKey, query, 10);
    if (!live.ok && live.error === 'API_EXECUTOR_NOT_CONFIGURED') {
      live = runApprovedContentOsYoutubeServerProxySample_(props, dateKey, query, 10);
    }

    const qualityA = scoreContentOsSample_(stored);
    const qualityB = live.ok ? scoreContentOsSample_(live) : null;
    const coverageA = Number(Math.min(1, stored.count / 10).toFixed(3));
    const coverageB = live.ok ? Number(Math.min(1, live.count / 10).toFixed(3)) : null;
    let decision = live.error || 'NO_API_RESULT';
    let patchId = '';
    let errorCode = live.error || '';

    if (live.ok) {
      const qualityGain = Number((qualityB - qualityA).toFixed(1));
      const coverageGain = Number((coverageB - coverageA).toFixed(3));
      const freshnessGainMs = contentOsNewestMs_(live) - contentOsNewestMs_(stored);
      const closesFreshnessGap = stored.count === 0 || freshnessGainMs > 7 * 24 * 60 * 60 * 1000;
      if (qualityGain >= 8 || coverageGain >= 0.15 || closesFreshnessGap) {
        decision = 'API_ON_LEARNING_PROMOTED';
        const learned = writeContentOsApiLearningBackdata_(central, query, stored, live, qualityGain, coverageGain, freshnessGainMs);
        patchId = learned.patchId || '';
      } else {
        decision = 'OWN_CACHE_SUFFICIENT';
      }
      errorCode = '';
    }

    const hourText = hour < 10 ? '0' + hour : String(hour);
    const runId = 'QA_CONTENTOS_' + dateKey + '_' + hourText + '00';
    appendContentOsApiAbLog_(central, {
      runId:runId,
      runAt:Utilities.formatDate(now,'Asia/Seoul','yyyy-MM-dd HH:mm:ss')+' KST',
      query:query,
      stored:stored,
      live:live,
      coverageA:coverageA,
      coverageB:coverageB,
      qualityA:qualityA,
      qualityB:qualityB,
      decision:decision,
      patchId:patchId,
      errorCode:errorCode
    });

    if (live.ok || errorCode === 'API_DAILY_CAP_REACHED') props.setProperty(runKey, 'Y');
    const nonBlockingGap = errorCode === 'API_DAILY_CAP_REACHED';
    return {
      ok:live.ok || nonBlockingGap,
      degraded:nonBlockingGap,
      runId:runId,
      query:query,
      modeA:{coverage:coverageA,quality:qualityA,count:stored.count},
      modeB:{coverage:coverageB,quality:qualityB,count:live.count||0,apiUnits:live.apiUnits||0,executor:live.executor||''},
      decision:decision,
      patchId:patchId,
      error:errorCode,
      version:CONTENTOS_API_AB_SERVER_PROXY_VERSION
    };
  } finally {
    lock.releaseLock();
  }
}

function runApprovedContentOsYoutubeServerProxySample_(props, dateKey, query, limit) {
  const units = CONTENTOS_API_AB_SEARCH_UNITS + CONTENTOS_API_AB_DETAIL_UNITS;
  const reserved = reserveContentOsApiAbUnits_(props, dateKey, units);
  if (!reserved.ok) return {ok:false,error:'API_DAILY_CAP_REACHED',count:0,apiUnits:0,executor:'SERVER_YOUTUBE_PROXY'};

  const maxResults = Number(limit || 10);
  const searchUrl = CONTENTOS_API_AB_SERVER_PROXY_BASE
    + '?endpoint=search&part=id%2Csnippet&type=video&order=relevance&maxResults=' + encodeURIComponent(String(maxResults))
    + '&q=' + encodeURIComponent(query);

  try {
    const searchResp = UrlFetchApp.fetch(searchUrl, {muteHttpExceptions:true, followRedirects:true});
    const searchCode = searchResp.getResponseCode();
    if (searchCode < 200 || searchCode >= 300) {
      releaseContentOsApiAbUnits_(props, dateKey, reserved.units);
      return {ok:false,error:'SERVER_PROXY_SEARCH_HTTP_'+searchCode,count:0,apiUnits:0,executor:'SERVER_YOUTUBE_PROXY'};
    }

    const searchJson = JSON.parse(searchResp.getContentText() || '{}');
    const ids = (searchJson.items || []).map(function(x){ return x && x.id && x.id.videoId; }).filter(String);
    if (!ids.length) {
      return {ok:true,count:0,items:[],newestPublishedAt:'',topViewCount:0,source:'SERVER_YOUTUBE_PROXY',apiUnits:units,executor:'SERVER_YOUTUBE_PROXY'};
    }

    const detailUrl = CONTENTOS_API_AB_SERVER_PROXY_BASE
      + '?endpoint=videos&part=id%2Csnippet%2Cstatistics&id=' + encodeURIComponent(ids.join(','));
    const detailResp = UrlFetchApp.fetch(detailUrl, {muteHttpExceptions:true, followRedirects:true});
    const detailCode = detailResp.getResponseCode();
    if (detailCode < 200 || detailCode >= 300) {
      return {ok:false,error:'SERVER_PROXY_VIDEOS_HTTP_'+detailCode,count:0,apiUnits:units,executor:'SERVER_YOUTUBE_PROXY'};
    }

    const detailJson = JSON.parse(detailResp.getContentText() || '{}');
    const byId = {};
    (detailJson.items || []).forEach(function(x){ if (x && x.id) byId[String(x.id)] = x; });
    const items = ids.map(function(id){
      const x = byId[String(id)] || {};
      return {
        videoId:String(id),
        title:String(x.snippet && x.snippet.title || ''),
        publishedAt:String(x.snippet && x.snippet.publishedAt || ''),
        viewCount:Number(x.statistics && x.statistics.viewCount || 0)
      };
    });
    const out = contentOsSampleSummary_(items, 'SERVER_YOUTUBE_PROXY');
    out.ok = true;
    out.apiUnits = units;
    out.executor = 'SERVER_YOUTUBE_PROXY';
    out.proxyBase = CONTENTOS_API_AB_SERVER_PROXY_BASE;
    return out;
  } catch (err) {
    return {ok:false,error:'SERVER_PROXY_EXCEPTION:'+String(err && err.message || err),count:0,apiUnits:units,executor:'SERVER_YOUTUBE_PROXY'};
  }
}

function testContentOsServerApiAbProxyStatic() {
  return {
    ok:typeof runApiAbQaControlServerFallback === 'function'
      && typeof runApprovedContentOsYoutubeServerProxySample_ === 'function'
      && /^https:\/\/contents-os\.com\/api\/youtube-proxy$/.test(CONTENTOS_API_AB_SERVER_PROXY_BASE),
    serverProxy:CONTENTOS_API_AB_SERVER_PROXY_BASE,
    browserKeyUsed:false,
    physicalTriggerCreated:false,
    version:CONTENTOS_API_AB_SERVER_PROXY_VERSION
  };
}
