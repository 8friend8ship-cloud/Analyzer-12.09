// Public-read adapter for the existing ContentOS Threads research page.
// Does not persist data and never returns the server-side Meta token.
const VERSION = 'CONTENTOS_THREADS_QUEENS_SEED_V1';
const FIELDS = 'id,text,media_type,permalink,timestamp,username,has_replies,is_quote_post,is_reply';
const txt = (v:any) => String(Array.isArray(v) ? v[0] : (v ?? '')).trim();

export default async function handler(req:any,res:any) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-ContentOS-Contract',VERSION);
  if(req.method !== 'GET') return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  const q=txt(req.query?.q);
  if(!q || q.length>100) return res.status(400).json({ok:false,error:'KEYWORD_REQUIRED_1_TO_100'});
  const token = process.env.THREADS_ACCESS_TOKEN || '';
  if(!token) return res.status(503).json({ok:false,error:'THREADS_ACCESS_TOKEN_NOT_CONFIGURED',posts:[],contractVersion:VERSION});
  const n=Number(txt(req.query?.limit)||25);
  const limit=Number.isFinite(n)?Math.max(1,Math.min(Math.floor(n),50)):25;
  const url = new URL('https://graph.threads.net/v1.0/keyword_search');
  url.searchParams.set('q',q);
  url.searchParams.set('search_type',txt(req.query?.sort)==='RECENT'?'RECENT':'TOP');
  url.searchParams.set('search_mode','KEYWORD');
  url.searchParams.set('fields',FIELDS);
  url.searchParams.set('limit',String(limit));
  try{
    const controller = new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    let response:Response;
    try {response=await fetch(url,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:controller.signal});}
    finally{clearTimeout(timeout);}
    const data=await response.json().catch(()=>null);
    if(!response.ok) {
      console.error('[threads-radar] Meta status',response.status,data?.error?.code);
      return res.status(response.status===429?429:502).json({ok:false,
        error:response.status===429?'META_RATE_LIMITED':'META_PERMISSION_OR_SEARCH_FAILED',
        posts:[],providerStatus:response.status,contractVersion:VERSION});
    }
    const posts=Array.isArray(data?.data)?data.data.filter((x:any)=>x?.id&&x?.username).map((x:any)=>({
      id:String(x.id),username:String(x.username),text:String(x.text||''),
      permalink:String(x.permalink||''),timestamp:String(x.timestamp||''),
      mediaType:String(x.media_type||''),provenance:'META_OFFICIAL_KEYWORD_SEARCH',
      evidence:String(x.permalink||''),views:null,likes:null,replies:null,reposts:null,quotes:null
    })):[];
    return res.status(200).json({ok:true,contractVersion:VERSION,query:q,
      provider:'META_OFFICIAL_KEYWORD_SEARCH',metricsAvailable:false,count:posts.length,posts,
      next:'Engagement metrics and baseline require separately verified historical data.'});
  } catch(e:any){
    console.error('[threads-radar] request failed',String(e?.name||'Error'));
    return res.status(502).json({ok:false,error:'META_REQUEST_FAILED',posts:[],contractVersion:VERSION});
  }
}