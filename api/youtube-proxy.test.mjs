import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { preflightYoutubeProxy } from './youtube-proxy.ts';

const now = new Date('2026-11-13T05:10:00.000Z');
const UC = 'UC' + 'a'.repeat(22);
const UU = 'UU' + 'a'.repeat(22);
const secret = 'synthetic-test-only-32chars-secret-1234';
const key = 'synthetic-test-YOUTUBE-key-do-not-use';
const env = () => ({
  CONTENT_OS_BACKEND_TOKEN: secret,
  CONTENT_OS_YOUTUBE_API_KEY: key,
  CONTENT_OS_YOUTUBE_PROVIDER_GATE: 'APPROVED_SINGLE_PAGE_CANARY',
  CONTENT_OS_YOUTUBE_CORE_DAILY_CAP: '10000',
  CONTENT_OS_YOUTUBE_CORE_USED: '3',
  CONTENT_OS_YOUTUBE_CORE_PT_DAY: '2026-11-12',
  CONTENT_OS_YOUTUBE_CORE_READBACK_AT: '2026-11-13T05:09:00.000Z'
});
const channel = () => ({method:'GET',headers:{'x-content-os-token': secret},
  query:{endpoint:'channels',part:'contentDetails',id:UC}});
const playlist = () => ({method:'GET',headers:{'x-content-os-token':secret},
  query:{endpoint:'playlistItems',part:'snippet,contentDetails',playlistId:UU,maxResults:'50'}});
const check = (req=channel(), e=env()) => preflightYoutubeProxy(req,e,now);
const fail = (name, req, code, update={}) =>
  test(name, () => assert.equal(check(req,{...env(),...update}).status,code));

fail('denies POST before any provider call', {...channel(),method:'POST'},405);
fail('rejects search/list despite previous public behavior',
  {...channel(),query:{endpoint:'search'}},400);
fail('rejects missing server auth configuration',channel(),503,{CONTENT_OS_BACKEND_TOKEN:''});
fail('rejects missing caller token', {...channel(),headers:{}},401);
fail('rejects wrong caller token',{...channel(),headers:{'x-content-os-token':'wrong'}},401);
fail('rejects absent existing provider key',channel(),503,{CONTENT_OS_YOUTUBE_API_KEY:''});
fail('does not enable provider absent approved manual gate',channel(),503,
  {CONTENT_OS_YOUTUBE_PROVIDER_GATE:''});
fail('rejects user provided upstream key',{...channel(),query:{...channel().query,key:'leak'}},400);
fail('rejects unexpected endpoint param',{...playlist(),query:{...playlist().query,quota:'bypass'}},400);
fail('rejects playlist page larger than 50',{...playlist(),query:{...playlist().query,maxResults:'51'}},400);
fail('rejects unknown playlist ID',{...playlist(),query:{...playlist().query,playlistId:'PLinvalid'}},400);
fail('rejects malformed page token',{...playlist(),query:{...playlist().query,pageToken:'abc def'}},400);
fail('rejects videos batch above 50',{...channel(),query:{endpoint:'videos',
  part:'snippet,statistics,contentDetails',
  id:Array.from({length:51},(_,i)=>'x'.repeat(10)+(i%10)).join(',')}},400);
fail('rejects duplicated video IDs',{...channel(),query:{endpoint:'videos',
  part:'snippet,statistics,contentDetails',id:'MXB4qnvyhyg,MXB4qnvyhyg'}},400);
fail('rejects stale PT-day quota',channel(),503,{CONTENT_OS_YOUTUBE_CORE_PT_DAY:'2026-11-13'});
fail('rejects stale timestamp',channel(),503,{CONTENT_OS_YOUTUBE_CORE_READBACK_AT:'2026-11-13T04:50:00.000Z'});
fail('rejects unknown actual quota consumption',channel(),503,{CONTENT_OS_YOUTUBE_CORE_USED:''});
fail('rejects usage above 95 percent',channel(),429,{CONTENT_OS_YOUTUBE_CORE_USED:'9500'});
test('normal channel request has explicitly bounded IDs',()=>{
  const r=check();
  assert.equal(r.status,200);
  assert.equal(r.endpoint,'channels');
  assert.equal(r.params.part,'contentDetails');
  assert.equal(r.params.id,UC);
});
test('playlist request accepts exactly 50 records and bounded token',()=>{
  const r=check({...playlist(),query:{...playlist().query,pageToken:'NEXT_PAGE=='}});
  assert.equal(r.status,200);
  assert.equal(r.params.maxResults,'50');
  assert.equal(r.params.pageToken,'NEXT_PAGE==');
});
test('valid 50-video batch is accepted without search scope',()=>{
  const id='abcdefghijk';
  const ids=Array.from({length:50},(_,i)=>('0000000000'+i.toString(36)).slice(-11));
  const r=check({...channel(),query:{endpoint:'videos',part:'snippet,statistics,contentDetails',id:ids.join(',')}});
  assert.equal(r.status,200);
  assert.equal(r.params.id.split(',').length,50);
});
function response(){
  return {statusCode:200,headers:{},jsonBody:null,
    status(n){this.statusCode=n;return this;},
    setHeader(k,v){this.headers[k]=v;return this;},
    json(v){this.jsonBody=v;return this;}};
}
test('actual handler never calls provider without existing auth token',async()=>{
  const keys=Object.keys(env());
  const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  const oldFetch=globalThis.fetch;let calls=0;
  try {
    Object.assign(process.env,env());
    const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const field = k => parts.find(p => p.type===k)?.value || '';
    process.env.CONTENT_OS_YOUTUBE_CORE_PT_DAY = [field('year'),field('month'),field('day')].join('-');
    process.env.CONTENT_OS_YOUTUBE_CORE_READBACK_AT = new Date().toISOString();globalThis.fetch=async()=>{calls++;throw Error('SHOULD_NOT_CALL');};
    const res=response();await handler({...channel(),headers:{}},res);
    assert.equal(res.statusCode,401);assert.equal(calls,0);
    assert.equal(res.headers['Cache-Control'],'private, no-store');
  } finally {
    globalThis.fetch=oldFetch;
    for(const k of keys){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}
  }
});
test('bounded handler fetch calls official host once with sanitized output',async()=>{
  const keys=Object.keys(env());const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  const oldFetch=globalThis.fetch;let calls=0;let target;
  try {
    Object.assign(process.env,env());
    const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const field = k => parts.find(p => p.type===k)?.value || '';
    process.env.CONTENT_OS_YOUTUBE_CORE_PT_DAY = [field('year'),field('month'),field('day')].join('-');
    process.env.CONTENT_OS_YOUTUBE_CORE_READBACK_AT = new Date().toISOString();
    globalThis.fetch=async(url, options)=>{
      calls++;target=new URL(url);
      assert.equal(options.redirect,'error');
      return {ok:true,status:200,json:async()=>({kind:'youtube#playlistItemListResponse',items:[]})};
    };
    const res=response();await handler(playlist(),res);
    assert.equal(calls,1);assert.equal(res.statusCode,200);
    assert.equal(target.host,'www.googleapis.com');
    assert.equal(target.pathname,'/youtube/v3/playlistItems');
    assert.equal(target.searchParams.get('maxResults'),'50');
    assert.equal(target.searchParams.get('key'),key);
    assert.equal(res.headers['Cache-Control'],'private, no-store');
    assert.equal(res.headers['X-Content-OS-Quota-Guard'],'SNAPSHOT_ONLY_NOT_ATOMIC');
    assert.equal(JSON.stringify(res.jsonBody).includes(key),false);
  } finally {
    globalThis.fetch=oldFetch;
    for(const k of keys){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}
  }
});
test('provider HTTP errors do not echo secret credentials',async()=>{
  const keys=Object.keys(env());const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  const oldFetch=globalThis.fetch;
  try {
    Object.assign(process.env,env());
    const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const field = k => parts.find(p => p.type===k)?.value || '';
    process.env.CONTENT_OS_YOUTUBE_CORE_PT_DAY = [field('year'),field('month'),field('day')].join('-');
    process.env.CONTENT_OS_YOUTUBE_CORE_READBACK_AT = new Date().toISOString();
    globalThis.fetch=async()=>({ok:false,status:403,text:async()=>key});
    const res=response();await handler(channel(),res);
    assert.equal(res.statusCode,403);
    assert.equal(JSON.stringify(res.jsonBody).includes(key),false);
    assert.equal(res.jsonBody.error,'YOUTUBE_PROVIDER_ERROR');
  } finally {
    globalThis.fetch=oldFetch;
    for(const k of keys){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}
  }
});
