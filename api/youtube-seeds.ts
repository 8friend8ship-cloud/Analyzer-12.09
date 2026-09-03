const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3';
const BACKEND_URL = process.env.CONTENT_OS_BACKEND_URL || 'https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec';
const APP_ID = 'APP_CONTENT_OS';
const CONTRACT_VERSION = 'YOUTUBE_SEED_BRIDGE_V1';
const PUBLIC_ORIGIN = process.env.CONTENT_OS_PUBLIC_ORIGIN || 'https://contents-os.com';

const one = (v:any) => Array.isArray(v) ? v[0] : v;
const text = (v:any) => String(v ?? '').trim();
const numberOrNull = (v:any) => {
  const raw = text(v);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};
const pick = (row:any, ...keys:string[]) => {
  for (const k of keys) if (row && row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  return '';
};
const brief = (s:string, max=600) => text(s).replace(/\s+/g,' ').slice(0,max);
const boolQuery = (v:any) => ['1','true','yes','y'].includes(text(one(v)).toLowerCase());

function parseChapters(description:string) {
  const out:Array<{start:string,title:string}> = [];
  String(description || '').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+?)\s*$/);
    if (m && out.length < 30) out.push({start:m[1], title:m[2].slice(0,160)});
  });
  return out;
}

function cardFromStored(row:any) {
  const videoId = text(pick(row,'VIDEO_ID','Video_ID','videoId','SOURCE_ID')).replace(/^.*(?:v=|youtu\.be\/)/,'').slice(0,11);
  if (!videoId) return null;
  const description = text(pick(row,'DESCRIPTION','description','DESCRIPTION_BRIEF','descriptionBrief'));
  const chapters = parseChapters(description);
  return {
    appId: APP_ID,
    videoId,
    videoUrl: text(pick(row,'VIDEO_URL','SOURCE_URL','url')) || `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: text(pick(row,'THUMBNAIL_URL','thumbnailUrl')) || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    title: text(pick(row,'TITLE','Title','title')),
    channelTitle: text(pick(row,'CHANNEL_TITLE','Channel_Title','channelTitle')),
    publishedAt: text(pick(row,'PUBLISHED_AT','Published_At','publishedAt')),
    viewCount: numberOrNull(pick(row,'PUBLIC_VIEWS','VIEW_COUNT','View_Count','viewCount')),
    likeCount: numberOrNull(pick(row,'LIKE_COUNT','likeCount')),
    commentCount: numberOrNull(pick(row,'COMMENT_COUNT','commentCount')),
    durationIso8601: text(pick(row,'DURATION_ISO8601','durationIso8601')) || null,
    descriptionBrief: brief(description),
    videoBrief: brief(text(pick(row,'VIDEO_BRIEF','SUMMARY','summary')) || `${text(pick(row,'TITLE','Title','title'))} / ${text(pick(row,'CHANNEL_TITLE','Channel_Title','channelTitle'))}`),
    keyPoints: [],
    chapters,
    scriptSource: chapters.length ? 'timestamps' : (description ? 'description' : 'none'),
    evidenceStatus: description ? 'PARTIAL_SCRIPT' : 'VERIFIED_METADATA',
    lastSync: text(pick(row,'LAST_SYNC','Last_Sync','lastSync')) || new Date().toISOString(),
  };
}

function cardFromYoutube(item:any) {
  const id = text(item?.id);
  const snippet = item?.snippet || {};
  const stats = item?.statistics || {};
  const details = item?.contentDetails || {};
  const description = text(snippet.description);
  const chapters = parseChapters(description);
  return {
    appId: APP_ID,
    videoId: id,
    videoUrl: `https://www.youtube.com/watch?v=${id}`,
    thumbnailUrl: text(snippet?.thumbnails?.high?.url || snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url) || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    title: text(snippet.title),
    channelTitle: text(snippet.channelTitle),
    publishedAt: text(snippet.publishedAt),
    viewCount: numberOrNull(stats.viewCount),
    likeCount: numberOrNull(stats.likeCount),
    commentCount: numberOrNull(stats.commentCount),
    durationIso8601: text(details.duration) || null,
    descriptionBrief: brief(description),
    videoBrief: brief(`${text(snippet.title)} / ${text(snippet.channelTitle)} / ${description}`),
    keyPoints: [],
    chapters,
    scriptSource: chapters.length ? 'timestamps' : (description ? 'description' : 'none'),
    evidenceStatus: description ? 'PARTIAL_SCRIPT' : 'VERIFIED_METADATA',
    lastSync: new Date().toISOString(),
  };
}

async function backend(payload:any) {
  const headers:Record<string,string> = {'Content-Type':'application/json'};
  const token = process.env.CONTENT_OS_BACKEND_TOKEN;
  if (token) headers['X-Content-OS-Token'] = token;
  const r = await fetch(BACKEND_URL,{method:'POST',headers,body:JSON.stringify(payload),redirect:'follow'});
  const t = await r.text();
  let j:any = null;
  try { j = JSON.parse(t); } catch {}
  return {ok:r.ok,status:r.status,json:j,text:t.slice(0,500)};
}

async function storedSearch(query:string, limit:number) {
  if (!query) return [];
  const r = await backend({action:'search',asset_type:'VIDEO',query,limit});
  const rows = Array.isArray(r.json?.results) ? r.json.results : [];
  return rows.map(cardFromStored).filter(Boolean);
}

async function youtubeGet(path:string, params:Record<string,string>) {
  const apiKey = process.env.CONTENT_OS_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY || '';
  if (!apiKey) throw new Error('CENTRAL_YOUTUBE_KEY_NOT_CONFIGURED');
  const u = new URL(`${YOUTUBE_BASE}/${path}`);
  Object.entries(params).forEach(([k,v]) => u.searchParams.set(k,v));
  u.searchParams.set('key',apiKey);
  const r = await fetch(u,{headers:{'User-Agent':'ContentOS-Central-Collector/1.0'}});
  const j = await r.json();
  if (!r.ok) throw new Error(`YOUTUBE_${path.toUpperCase()}_${r.status}:${text(j?.error?.message)}`);
  return j;
}

function sameOriginBackendUrl(req:any) {
  const host = text(req?.headers?.['x-forwarded-host'] || req?.headers?.host);
  const proto = text(req?.headers?.['x-forwarded-proto']) || 'https';
  if (!host || host.endsWith('.vercel.app')) return `${PUBLIC_ORIGIN}/api/backend`;
  return `${proto}://${host}/api/backend`;
}

async function autoEnqueue(req:any,item:any,query:string) {
  const payload = {
    action:'enqueue', asset_type:'TEXT', url:item.videoUrl, source_page_url:item.videoUrl,
    platform:'YOUTUBE', title:item.title, primary_code:'YOUTUBE_API_GAP_FILL',
    keywords:[query,'youtube','seed'].filter(Boolean).join(','),
    target_apps:'APP_CONTENT_OS|APP_VTUBE_1011B', use_case:'YOUTUBE_SEED_AUTO_COLLECT',
    official_source:'YOUTUBE_PUBLIC_METADATA', rights_usage:'REFERENCE_ONLY',
    notes:JSON.stringify({contractVersion:CONTRACT_VERSION,sourceKind:'YOUTUBE_VIDEO_METADATA',videoId:item.videoId,thumbnailUrl:item.thumbnailUrl,viewCount:item.viewCount,likeCount:item.likeCount,commentCount:item.commentCount,durationIso8601:item.durationIso8601,descriptionBrief:item.descriptionBrief,lastSync:item.lastSync}).slice(0,3500),
  };
  try {
    const route = sameOriginBackendUrl(req);
    const r = await fetch(route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),redirect:'follow'});
    const t = await r.text();
    let j:any = null;
    try { j = JSON.parse(t); } catch {}
    const accepted = r.ok && j?.ok !== false;
    if (!accepted) console.error('[youtube-seeds writeback rejected]',item.videoId,r.status,t.slice(0,300));
    return {videoId:item.videoId,route:'CONTENT_OS_API_BACKEND',accepted,status:r.status,upstreamOk:j?.ok ?? null,reason:j?.reason || j?.error || ''};
  } catch (e:any) {
    console.error('[youtube-seeds enqueue]',item.videoId,e);
    return {videoId:item.videoId,route:'CONTENT_OS_API_BACKEND',accepted:false,status:0,upstreamOk:null,reason:text(e?.message || e)};
  }
}

function logUsage(event:any) {
  console.info('[YOUTUBE_SEED_USAGE]', JSON.stringify({
    contractVersion: CONTRACT_VERSION,
    ...event,
    loggedAt: new Date().toISOString(),
  }));
}

export default async function handler(req:any,res:any) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-OS-Bridge',CONTRACT_VERSION);
  if (req.method !== 'GET') return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  try {
    const query = text(one(req.query?.query));
    const rawIds = text(one(req.query?.videoIds));
    const limit = Math.max(1,Math.min(Number(one(req.query?.limit) || 20),100));
    const verifyOnly = boolQuery(req.query?.verifyOnly);
    const ids = rawIds.split(',').map((x:string)=>x.trim()).filter((x:string)=>/^[\w-]{11}$/.test(x)).slice(0,100);

    if (!ids.length && query) {
      const cached:any[] = await storedSearch(query,limit);
      if (cached.length >= Math.min(limit,20)) {
        const usage = {source:'SHEET_CACHE',quotaUnits:0,itemCount:Math.min(cached.length,limit),writebackAttempted:0,writebackAccepted:0,verifyOnly};
        logUsage(usage);
        res.setHeader('X-Content-OS-Quota-Units','0');
        return res.status(200).json({contractVersion:CONTRACT_VERSION,source:'SHEET_CACHE',quotaUnits:0,usage,writeback:{attempted:0,accepted:0,results:[]},items:cached.slice(0,limit)});
      }
    }

    let quotaUnits = 0;
    let targetIds = ids;
    let nextPageToken:string|undefined;
    if (!targetIds.length) {
      if (!query) return res.status(400).json({error:'QUERY_OR_VIDEO_IDS_REQUIRED'});
      const s = await youtubeGet('search',{part:'snippet',type:'video',q:query,maxResults:String(Math.min(limit,50))});
      quotaUnits += 100;
      targetIds = (s.items || []).map((x:any)=>text(x.id?.videoId)).filter(Boolean);
      nextPageToken = text(s.nextPageToken) || undefined;
    }

    const items:any[] = [];
    for (let i=0;i<targetIds.length;i+=50) {
      const batch = targetIds.slice(i,i+50);
      if (!batch.length) continue;
      const v = await youtubeGet('videos',{part:'snippet,statistics,contentDetails,status',id:batch.join(',')});
      quotaUnits += 1;
      (v.items || []).forEach((x:any)=>items.push(cardFromYoutube(x)));
    }

    const writebackResults = verifyOnly ? [] : await Promise.all(items.map(x=>autoEnqueue(req,x,query)));
    const accepted = writebackResults.filter(x=>x.accepted).length;
    const usage = {
      source:'SERVER_API_GAP_FILL',
      quotaUnits,
      itemCount:items.length,
      requestedVideoIds:targetIds.length,
      writebackAttempted:writebackResults.length,
      writebackAccepted:accepted,
      verifyOnly,
    };
    logUsage(usage);
    res.setHeader('X-Content-OS-Quota-Units',String(quotaUnits));
    return res.status(200).json({contractVersion:CONTRACT_VERSION,source:'SERVER_API_GAP_FILL',quotaUnits,usage,writeback:{attempted:writebackResults.length,accepted,results:writebackResults},items:items.slice(0,limit),...(nextPageToken?{nextPageToken}:{})});
  } catch (error:any) {
    logUsage({source:'ERROR',quotaUnits:0,itemCount:0,writebackAttempted:0,writebackAccepted:0,error:text(error?.message || error)});
    return res.status(502).json({contractVersion:CONTRACT_VERSION,error:text(error?.message || error),quotaUnits:0,writeback:{attempted:0,accepted:0,results:[]},items:[]});
  }
}
