import { createHash, timingSafeEqual } from 'node:crypto';

const API = 'https://www.googleapis.com/youtube/v3';
const ALLOWED = new Set(['channels', 'playlistItems', 'videos']);
const UC = /^UC[A-Za-z0-9_-]{22}$/;
const UU = /^UU[A-Za-z0-9_-]{22}$/;
const VIDEO = /^[A-Za-z0-9_-]{11}$/;
const PAGE = /^[A-Za-z0-9_.=-]{1,512}$/;
const str = (x: unknown) => typeof x === 'string' ? x : '';
const deny = (status: number, error: string) => ({status, error});
function safeEqual(a: string, b: string): boolean {
  const hash = (v: string) => createHash('sha256').update(v).digest();
  return timingSafeEqual(hash(a), hash(b));
}
function intOrNull(s: unknown): number | null {
  const x = str(s);
  return /^\d{1,8}$/.test(x) ? Number(x) : null;
}
function ptDay(date: Date): string {
  const fields = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(date);
  const get = (k: string) => fields.find(f => f.type===k)?.value || '';
  return [get('year'),get('month'),get('day')].join('-');
}

/** Manual, authenticated, bounded P1 canary. Not an unattended daily ledger. */
export function preflightYoutubeProxy(req: any, env: NodeJS.ProcessEnv, now = new Date()) {
  if (req.method !== 'GET') return deny(405,'METHOD_NOT_ALLOWED');
  const q = req.query || {};
  const endpoint = str(q.endpoint);
  if (!ALLOWED.has(endpoint)) return deny(400,'YOUTUBE_ENDPOINT_NOT_ALLOWED');
  const expected = str(env.CONTENT_OS_BACKEND_TOKEN);
  if (expected.length < 24) return deny(503,'HOLD_SERVER_AUTH_NOT_CONFIGURED');
  const supplied = str(req.headers?.['x-content-os-token']);
  if (!supplied || !safeEqual(supplied,expected)) return deny(401,'YOUTUBE_SERVER_AUTH_REQUIRED');
  const key = str(env.CONTENT_OS_YOUTUBE_API_KEY || env.YOUTUBE_API_KEY);
  if (!key) return deny(503,'CENTRAL_YOUTUBE_KEY_NOT_CONFIGURED');
  if (env.CONTENT_OS_YOUTUBE_PROVIDER_GATE !== 'APPROVED_SINGLE_PAGE_CANARY')
    return deny(503,'HOLD_PROVIDER_CANARY_GATE_CLOSED');

  const accepted = endpoint==='channels'
    ? new Set(['endpoint','part','id'])
    : endpoint==='playlistItems'
      ? new Set(['endpoint','part','playlistId','maxResults','pageToken'])
      : new Set(['endpoint','part','id']);
  for (const k of Object.keys(q)) {
    if (!accepted.has(k) || typeof q[k] !== 'string')
      return deny(400,'HOLD_QUERY_NOT_ALLOWLISTED');
  }
  let params: Record<string,string>;
  if (endpoint==='channels') {
    if (q.part!=='contentDetails' || !UC.test(str(q.id)))
      return deny(400,'HOLD_CHANNEL_QUERY');
    params={part:'contentDetails',id:q.id};
  } else if (endpoint==='playlistItems') {
    const max=intOrNull(q.maxResults);
    if (q.part!=='snippet,contentDetails' || !UU.test(str(q.playlistId)) ||
        max===null || max<1 || max>50 || (q.pageToken && !PAGE.test(q.pageToken)))
      return deny(400,'HOLD_PLAYLIST_QUERY');
    params={part:'snippet,contentDetails',playlistId:q.playlistId,maxResults:String(max)};
    if (q.pageToken) params.pageToken=q.pageToken;
  } else {
    const ids=str(q.id).split(',');
    if (q.part!=='snippet,statistics,contentDetails' || ids.length<1 || ids.length>50 ||
        ids.some((id: string)=>!VIDEO.test(id)) || new Set(ids).size!==ids.length)
      return deny(400,'HOLD_VIDEO_BATCH_QUERY');
    params={part:'snippet,statistics,contentDetails',id:ids.join(',')};
  }

  // PRE-FLIGHT ONLY: a fresh provider snapshot is NOT an atomic shared quota ledger.
  const cap=intOrNull(env.CONTENT_OS_YOUTUBE_CORE_DAILY_CAP);
  const used=intOrNull(env.CONTENT_OS_YOUTUBE_CORE_USED);
  const checked=Date.parse(str(env.CONTENT_OS_YOUTUBE_CORE_READBACK_AT));
  if (cap===null || used===null || cap<1 || cap>10000 ||
      str(env.CONTENT_OS_YOUTUBE_CORE_PT_DAY)!==ptDay(now) ||
      !Number.isFinite(checked) || checked>now.getTime() ||
      now.getTime()-checked>15*60*1000)
    return deny(503,'HOLD_CURRENT_PT_DAY_QUOTA_EVIDENCE');
  if (used+1>Math.floor(cap*0.95))
    return deny(429,'HOLD_QUOTA_95_PERCENT_GUARD');
  return {status:200,endpoint,params,apiKey:key,quotaMode:'SNAPSHOT_ONLY_NOT_ATOMIC'};
}
export default async function handler(req:any,res:any) {
  res.setHeader('Cache-Control','private, no-store');
  const gate=preflightYoutubeProxy(req,process.env);
  if (gate.status!==200 || !('params' in gate))
    return res.status(gate.status).json({ok:false,error:('error' in gate ? gate.error : 'HOLD_POLICY'),api_calls:0});
  const url=new URL(API+'/'+gate.endpoint);
  for (const [k,v] of Object.entries(gate.params)) url.searchParams.set(k,v);
  url.searchParams.set('key',gate.apiKey);
  try {
    const upstream=await fetch(url.toString(),{
      headers:{'User-Agent':'ContentOS-Central-Collector/2.0'},
      redirect:'error',signal:AbortSignal.timeout(9000)
    });
    if (!upstream.ok)
      return res.status(upstream.status).json({ok:false,error:'YOUTUBE_PROVIDER_ERROR',provider_status:upstream.status,api_calls:1});
    const payload=await upstream.json();
    const kind:Record<string,string>={
      channels:'youtube#channelListResponse',
      playlistItems:'youtube#playlistItemListResponse',
      videos:'youtube#videoListResponse'
    };
    if (!payload || payload.kind!==kind[gate.endpoint] || !Array.isArray(payload.items))
      return res.status(502).json({ok:false,error:'HOLD_PROVIDER_RESPONSE_SHAPE',api_calls:1});
    res.setHeader('X-Content-OS-API-Path','AUTHENTICATED_ONE_PAGE_YOUTUBE');
    res.setHeader('X-Content-OS-Quota-Guard','SNAPSHOT_ONLY_NOT_ATOMIC');
    return res.status(200).json(payload);
  } catch {
    return res.status(502).json({ok:false,error:'YOUTUBE_PROXY_UPSTREAM_FAILED',api_calls:1});
  }
}
