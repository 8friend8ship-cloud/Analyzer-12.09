const BACKEND_URL = process.env.CONTENT_OS_BACKEND_URL || process.env.CENTRAL_INTELLIGENCE_BACKEND_URL || '';

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

function pendingBody(q:string, normalized:string, message:string){
  return {
    ok:true,
    status:'COLLECTING',
    query:q,
    normalizedQuery:normalized,
    seedId:null,
    t1Id:null,
    t2Id:null,
    videos:[],
    channels:[],
    lineage:['QUERY','QUEENS_REFRESH_REQUIRED'],
    message,
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

function normalizeVideo(v:any){
  const views=numberParam(v.viewCount ?? v.VIEW_COUNT,0);
  const likes=numberParam(v.likeCount ?? v.LIKE_COUNT,0);
  const comments=numberParam(v.commentCount ?? v.COMMENT_COUNT,0);
  return {
    id:stringParam(v.id ?? v.videoId ?? v.VIDEO_ID),
    channelId:stringParam(v.channelId ?? v.CHANNEL_ID),
    title:stringParam(v.title ?? v.TITLE),
    thumbnailUrl:stringParam(v.thumbnailUrl ?? v.THUMBNAIL_URL),
    channelTitle:stringParam(v.channelTitle ?? v.CHANNEL_TITLE),
    publishedAt:stringParam(v.publishedAt ?? v.PUBLISHED_AT),
    subscribers:numberParam(v.subscribers ?? v.SUBSCRIBERS,0),
    viewCount:views,
    likeCount:likes,
    commentCount:comments,
    durationMinutes:numberParam(v.durationMinutes ?? v.DURATION_MINUTES,0),
    engagementRate:numberParam(v.engagementRate ?? v.ENGAGEMENT_RATE, views>0?((likes+comments)/views)*100:0),
    channelCountry:stringParam(v.channelCountry ?? v.COUNTRY),
  };
}

export default async function handler(req:any,res:any){
  cors(res);
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='GET') return res.status(405).json({ok:false,status:'ERROR',videos:[],message:'METHOD_NOT_ALLOWED'});

  const q=stringParam(req.query?.q).trim();
  if(!q) return res.status(400).json({ok:false,status:'ERROR',videos:[],message:'QUERY_REQUIRED'});
  const normalized=normalizeQuery(q);

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
    results_limit:stringParam(req.query?.resultsLimit,'25'),
    country:stringParam(req.query?.country,'KR'),
    category:stringParam(req.query?.category,'all'),
  });

  try{
    const upstream=await callUpstream(params);
    if(!upstream){
      return res.status(202).json(pendingBody(q,normalized,'Central Queens/Seed/T1/T2 backend is not available yet. Refresh has been requested; unrelated fallback is disabled.'));
    }

    const rawVideos=Array.isArray(upstream.videos)?upstream.videos:Array.isArray(upstream.results)?upstream.results:[];
    const videos=rawVideos.map(normalizeVideo).filter((v:any)=>v.id && v.title);
    const status=upstream.status || (videos.length?'READY':'COLLECTING');
    return res.status(status==='READY'?200:202).json({
      ok:true,
      status,
      query:q,
      normalizedQuery:upstream.normalizedQuery || upstream.normalized_query || normalized,
      seedId:upstream.seedId || upstream.seed_id || null,
      t1Id:upstream.t1Id || upstream.t1_id || null,
      t2Id:upstream.t2Id || upstream.t2_id || null,
      videos,
      channels:Array.isArray(upstream.channels)?upstream.channels:[],
      lineage:upstream.lineage || [],
      message:upstream.message || (videos.length?'Central backdata ready':'Queens refresh/Seed build in progress'),
    });
  }catch(error:any){
    return res.status(202).json(pendingBody(q,normalized,`Central backdata pending: ${String(error?.message||error)}`));
  }
}
