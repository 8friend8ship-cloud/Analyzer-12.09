const BACKEND_URL = process.env.CONTENT_OS_BACKEND_URL || process.env.CENTRAL_INTELLIGENCE_BACKEND_URL || '';
const CANONICAL_COLLECTOR_URL = 'https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec';
const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3';
const CONTENT_SEARCH_VERSION = '2026.8.31.1';

function cors(res:any){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store');
}

const stringParam=(v:any,d='')=>String(v??d);
const numberParam=(v:any,d:number)=>{ const n=Number(v); return Number.isFinite(n)?n:d; };

function normalizeQuery(q:string){
  const raw=String(q||'').trim();
  const typoMap:Record<string,string>={
    '두바이쫀쿠티':'두바이 쫀득 쿠키',
    '두바이쫀쿠':'두바이 쫀득 쿠키',
    '성경묵상 잠원':'성경묵상 잠언',
    '잠원':'잠언',
  };
  return typoMap[raw] || raw;
}

function pendingBody(q:string, normalized:string, message:string, extra:any={}){
  return {
    ok:true,
    status:'COLLECTING',
    sourceMode:'PENDING',
    contentSearchVersion:CONTENT_SEARCH_VERSION,
    query:q,
    normalizedQuery:normalized,
    seedId:null,
    t1Id:null,
    t2Id:null,
    videos:[],
    channels:[],
    lineage:['QUERY','QUEENS_REFRESH_REQUIRED'],
    message,
    ...extra,
  };
}

async function callUpstream(query:URLSearchParams){
  if(!BACKEND_URL) return null;
  const url=`${BACKEND_URL}${BACKEND_URL.includes('?')?'&':'?'}${query.toString()}`;
  const r=await fetch(url,{redirect:'follow',headers:{Accept:'application/json'}});
  const text=await r.text();
  let body:any=null; try{ body=JSON.parse(text); }catch{}
  if(!r.ok || !body) return null;
  return body;
}

async function callStoredBackdata(query:string, limit:number){
  const headers:Record<string,string> = { 'Content-Type':'application/json', Accept:'application/json' };
  const token = process.env.CONTENT_OS_BACKEND_TOKEN;
  if(token) headers['X-Content-OS-Token'] = token;
  const r = await fetch(CANONICAL_COLLECTOR_URL, {
    method:'POST',
    headers,
    redirect:'follow',
    body:JSON.stringify({ action:'search', asset_type:'VIDEO', query, limit:Math.max(4, Math.min(limit, 50)) }),
  });
  const text=await r.text();
  let body:any=null; try{ body=JSON.parse(text); }catch{}
  if(!r.ok || !body || body.ok === false) return null;
  return body;
}

function youtubeIdFromUrl(value:any){
  const raw=String(value||'').trim();
  if(!raw) return '';
  try{
    const url=new URL(raw);
    if(url.hostname.includes('youtu.be')) return url.pathname.replace(/^\//,'').split('/')[0] || '';
    if(url.hostname.includes('youtube.com')) return url.searchParams.get('v') || '';
  }catch{}
  return '';
}

function normalizeVideo(v:any){
  const views=numberParam(v.viewCount ?? v.VIEW_COUNT,0);
  const likes=numberParam(v.likeCount ?? v.LIKE_COUNT,0);
  const comments=numberParam(v.commentCount ?? v.COMMENT_COUNT,0);
  const sourceUrl=stringParam(v.url ?? v.ARTICLE_URL ?? v.SOURCE_URL);
  return {
    id:stringParam(v.id ?? v.videoId ?? v.VIDEO_ID ?? youtubeIdFromUrl(sourceUrl)),
    channelId:stringParam(v.channelId ?? v.CHANNEL_ID),
    title:stringParam(v.title ?? v.TITLE ?? v.SUMMARY),
    thumbnailUrl:stringParam(v.thumbnailUrl ?? v.THUMBNAIL_URL),
    channelTitle:stringParam(v.channelTitle ?? v.CHANNEL_TITLE ?? v.AUTHOR_SOURCE),
    publishedAt:stringParam(v.publishedAt ?? v.PUBLISHED_AT),
    subscribers:numberParam(v.subscribers ?? v.SUBSCRIBERS,0),
    viewCount:views,
    likeCount:likes,
    commentCount:comments,
    durationMinutes:numberParam(v.durationMinutes ?? v.DURATION_MINUTES,0),
    engagementRate:numberParam(v.engagementRate ?? v.ENGAGEMENT_RATE, views>0?((likes+comments)/views)*100:0),
    channelCountry:stringParam(v.channelCountry ?? v.COUNTRY),
    sourceUrl,
  };
}

function durationMinutes(iso:any){
  const match=String(iso||'').match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if(!match) return 0;
  return numberParam(match[1],0)*1440 + numberParam(match[2],0)*60 + numberParam(match[3],0) + numberParam(match[4],0)/60;
}

async function hydrateYoutubeVideos(videos:any[]){
  const key=process.env.CONTENT_OS_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY || '';
  const ids=Array.from(new Set(videos.map(v=>String(v.id||'')).filter(Boolean))).slice(0,50);
  if(!key || !ids.length) return { videos, hydrated:false, apiCalls:0, reason:key?'NO_VIDEO_IDS':'YOUTUBE_KEY_NOT_CONFIGURED' };

  const target=new URL(`${YOUTUBE_BASE}/videos`);
  target.searchParams.set('part','snippet,statistics,contentDetails');
  target.searchParams.set('id',ids.join(','));
  target.searchParams.set('key',key);

  try{
    const r=await fetch(target,{headers:{'User-Agent':'ContentOS-Content-Search/2026.8.31.1'}});
    const text=await r.text();
    let body:any=null; try{body=JSON.parse(text)}catch{}
    if(!r.ok || !body || !Array.isArray(body.items)) {
      return {videos,hydrated:false,apiCalls:1,reason:`YOUTUBE_VIDEOS_${r.status}`};
    }

    const byId=new Map<string,any>();
    body.items.forEach((item:any)=>byId.set(String(item.id||''),item));
    const enriched=videos
      .filter(v=>byId.has(String(v.id||'')))
      .map(v=>{
        const item=byId.get(String(v.id||'')) || {};
        const stats=item.statistics || {};
        const snippet=item.snippet || {};
        const views=numberParam(stats.viewCount,0);
        const likes=numberParam(stats.likeCount,0);
        const comments=numberParam(stats.commentCount,0);
        return {
          ...v,
          channelId:stringParam(snippet.channelId,v.channelId),
          title:stringParam(snippet.title,v.title),
          thumbnailUrl:stringParam(snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,v.thumbnailUrl),
          channelTitle:stringParam(snippet.channelTitle,v.channelTitle),
          publishedAt:stringParam(snippet.publishedAt,v.publishedAt),
          viewCount:views,
          likeCount:likes,
          commentCount:comments,
          durationMinutes:durationMinutes(item.contentDetails?.duration),
          engagementRate:views>0?((likes+comments)/views)*100:0,
        };
      });
    return {videos:enriched,hydrated:true,apiCalls:1,reason:'OK'};
  }catch(error:any){
    return {videos,hydrated:false,apiCalls:1,reason:`YOUTUBE_VIDEOS_ERROR:${String(error?.message||error).slice(0,120)}`};
  }
}

function applyStoredFilters(videos:any[], req:any, metricsHydrated:boolean){
  const minViews=Math.max(0,numberParam(req.query?.minViews,0));
  const periodRaw=stringParam(req.query?.period,'any');
  const sortBy=stringParam(req.query?.sortBy,'viewCount');
  const now=Date.now();
  const periodDays=periodRaw==='any'?0:Math.max(0,numberParam(periodRaw,0));
  const floor=periodDays?now-periodDays*86400000:0;

  let out=videos.filter(v=>{
    if(metricsHydrated && minViews>0 && numberParam(v.viewCount,0)<minViews) return false;
    if(floor){
      const published=new Date(String(v.publishedAt||'')).getTime();
      if(!Number.isFinite(published) || published<floor) return false;
    }
    return true;
  });

  if(sortBy==='publishedAt') out.sort((a,b)=>new Date(String(b.publishedAt||0)).getTime()-new Date(String(a.publishedAt||0)).getTime());
  else if(sortBy==='engagementRate') out.sort((a,b)=>numberParam(b.engagementRate,0)-numberParam(a.engagementRate,0));
  else if(sortBy==='viewCount') out.sort((a,b)=>numberParam(b.viewCount,0)-numberParam(a.viewCount,0));

  return {
    videos:out,
    minViewsApplied:metricsHydrated,
    periodApplied:Boolean(periodDays),
    sortApplied:['publishedAt','engagementRate','viewCount'].includes(sortBy),
  };
}

export default async function handler(req:any,res:any){
  cors(res);
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='GET') return res.status(405).json({ok:false,status:'ERROR',contentSearchVersion:CONTENT_SEARCH_VERSION,videos:[],message:'METHOD_NOT_ALLOWED'});

  const q=stringParam(req.query?.q).trim();
  if(!q) return res.status(400).json({ok:false,status:'ERROR',contentSearchVersion:CONTENT_SEARCH_VERSION,videos:[],message:'QUERY_REQUIRED'});
  const normalized=normalizeQuery(q);
  const requestedLimit=Math.max(1,Math.min(numberParam(req.query?.resultsLimit,25),50));

  const params=new URLSearchParams({
    action:'content.search',
    app_id:'APP_CONTENT_OS',
    q,
    normalized_query:normalized,
    mode:stringParam(req.query?.mode,'video'),
    min_views:stringParam(req.query?.minViews,'100000'),
    video_length:stringParam(req.query?.videoLength,'any'),
    video_format:stringParam(req.query?.videoFormat,'any'),
    period:stringParam(req.query?.period,'30'),
    sort_by:stringParam(req.query?.sortBy,'viewCount'),
    results_limit:String(requestedLimit),
    country:stringParam(req.query?.country,'KR'),
    category:stringParam(req.query?.category,'all'),
  });

  try{
    const upstream=await callUpstream(params);
    if(upstream){
      const rawVideos=Array.isArray(upstream.videos)?upstream.videos:Array.isArray(upstream.results)?upstream.results:[];
      const videos=rawVideos.map(normalizeVideo).filter((v:any)=>v.id && v.title);
      const status=upstream.status || (videos.length?'READY':'COLLECTING');
      return res.status(status==='READY'?200:202).json({
        ok:true,
        status,
        contentSearchVersion:CONTENT_SEARCH_VERSION,
        sourceMode:'LIVE_QST_BACKEND',
        query:q,
        normalizedQuery:upstream.normalizedQuery || upstream.normalized_query || normalized,
        seedId:upstream.seedId || upstream.seed_id || null,
        t1Id:upstream.t1Id || upstream.t1_id || null,
        t2Id:upstream.t2Id || upstream.t2_id || null,
        videos,
        channels:Array.isArray(upstream.channels)?upstream.channels:[],
        lineage:upstream.lineage || [],
        apiCalls:0,
        message:upstream.message || (videos.length?'Central Q/S/T backdata ready':'Queens refresh/Seed build in progress'),
      });
    }

    const stored=await callStoredBackdata(normalized, requestedLimit);
    const rows=Array.isArray(stored?.results)?stored.results:[];
    const baseVideos=rows.map(normalizeVideo).filter((v:any)=>v.id && v.title).slice(0,50);

    if(baseVideos.length){
      const hydrated=await hydrateYoutubeVideos(baseVideos);
      const filtered=applyStoredFilters(hydrated.videos,req,hydrated.hydrated);
      const videos=filtered.videos.slice(0,requestedLimit);

      if(!videos.length && hydrated.hydrated){
        return res.status(202).json(pendingBody(
          q,
          normalized,
          'Stored candidates were refreshed from YouTube but none satisfy the requested freshness/view filters. Queens refresh required.',
          {
            sourceMode:'PENDING',
            metricsHydrated:true,
            apiCalls:hydrated.apiCalls,
            filterState:filtered,
            lineage:['QUERY','CENTRAL_STORED_BACKDATA','YOUTUBE_VIDEOS_METADATA_REFRESH','QUEENS_REFRESH_REQUIRED'],
          },
        ));
      }

      return res.status(200).json({
        ok:true,
        status:'READY',
        contentSearchVersion:CONTENT_SEARCH_VERSION,
        sourceMode:hydrated.hydrated?'STORED_BACKDATA_YOUTUBE_ENRICHED':'STORED_BACKDATA',
        query:q,
        normalizedQuery:normalized,
        seedId:null,
        t1Id:null,
        t2Id:null,
        videos,
        channels:[],
        lineage:hydrated.hydrated
          ? ['QUERY','CENTRAL_STORED_BACKDATA','YOUTUBE_VIDEOS_METADATA_REFRESH']
          : ['QUERY','CENTRAL_STORED_BACKDATA'],
        metricsHydrated:hydrated.hydrated,
        hydrationReason:hydrated.reason,
        apiCalls:hydrated.apiCalls,
        filterState:filtered,
        message:hydrated.hydrated
          ? 'Stored central backdata was validated and refreshed with one YouTube videos.list metadata call.'
          : 'Stored central backdata returned without live metric hydration; metric-dependent filtering was not applied.',
      });
    }

    return res.status(202).json(pendingBody(q,normalized,'Central Q/S/T backend unavailable and stored backdata has no usable video rows. Queens refresh required.'));
  }catch(error:any){
    return res.status(202).json(pendingBody(q,normalized,`Central backdata pending: ${String(error?.message||error)}`));
  }
}
