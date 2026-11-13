import test from 'node:test';
import assert from 'node:assert/strict';
import handler from './youtube-seeds.ts';

const VID='MXB4qnvyhyg';
const fakeVideo={id:VID,snippet:{title:'Sample',channelTitle:'Example',
  publishedAt:'2026-11-01T00:00:00Z',description:'',thumbnails:{high:{url:'https://i.ytimg.com/sample.jpg'}}},
  contentDetails:{duration:'PT5M'},statistics:{viewCount:'123'}};
const makeRes=()=>({statusCode:0,headers:{},body:null,
  status(x){this.statusCode=x;return this;},
  setHeader(k,v){this.headers[k]=v;return this;},
  json(b){this.body=b;return this;}});
async function simulate(query, cacheResults=[]) {
  const oldFetch=globalThis.fetch;
  const oldKey=process.env.CONTENT_OS_YOUTUBE_API_KEY;
  const oldLog=console.info;
  const urls=[];
  const records=[];
  try {
    process.env.CONTENT_OS_YOUTUBE_API_KEY='synthetic-server-test-key';
    console.info=(...args)=>records.push(args.map(String).join(' '));
    globalThis.fetch=async(input,options)=>{
      const url=new URL(typeof input==='string'?input:input.toString());
      urls.push(url.pathname);
      if(url.hostname==='script.google.com')return {ok:true,status:200,
        text:async()=>JSON.stringify({results:cacheResults})};
      if(url.pathname==='/youtube/v3/search')return {ok:true,status:200,
        json:async()=>({items:[{id:{videoId:VID}}]})};
      if(url.pathname==='/youtube/v3/videos')return {ok:true,status:200,
        json:async()=>({items:[fakeVideo]})};
      throw Error('UNEXPECTED_TEST_URL '+url.pathname);
    };
    const res=makeRes();
    await handler({method:'GET',query},res);
    return {res,urls,records};
  }finally{
    globalThis.fetch=oldFetch;
    console.info=oldLog;
    if(oldKey===undefined)delete process.env.CONTENT_OS_YOUTUBE_API_KEY;
    else process.env.CONTENT_OS_YOUTUBE_API_KEY=oldKey;
  }
}
test('search query costs one separate search bucket call plus one core unit',async()=>{
  const {res,urls}=await simulate({query:'test query',limit:'1',verifyOnly:'1'});
  assert.equal(res.statusCode,200,JSON.stringify(res.body));
  assert.deepEqual(urls,['/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec','/youtube/v3/search','/youtube/v3/videos']);
  assert.equal(res.body.quotaUnits,2);
  assert.equal(res.body.usage.searchQuotaCalls,1);
  assert.equal(res.body.usage.coreQuotaUnits,1);
  assert.equal(res.headers['X-Content-OS-Search-Quota-Calls'],'1');
  assert.equal(res.body.writeback.attempted,0);
});
test('direct video IDs use core bucket only',async()=>{
  const {res,urls}=await simulate({videoIds:VID,verifyOnly:'1'});
  assert.equal(res.statusCode,200);
  assert.deepEqual(urls,['/youtube/v3/videos']);
  assert.equal(res.body.usage.searchQuotaCalls,0);
  assert.equal(res.body.usage.coreQuotaUnits,1);
  assert.equal(res.body.quotaUnits,1);
});
test('existing cache hit spends zero provider quota',async()=>{
  const {res,urls}=await simulate({query:'cached',limit:'1',verifyOnly:'1'},
    [{VIDEO_ID:VID,TITLE:'Cached title',CHANNEL_TITLE:'Sample'}]);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.source,'SHEET_CACHE');
  assert.equal(res.body.quotaUnits,0);
  assert.equal(urls.length,1);
});
