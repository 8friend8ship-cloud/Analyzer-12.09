import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTRACT,median,normalizePost,rankPosts,summarize,toQueensSeed} from '../public/threads/radar-core.mjs';
const mk=(id,user,likes,extra={})=>({
 id,username:user,text:'수납 개선 사례 '+id,
 likeCount:likes,replyCount:0,repostCount:0,quoteCount:0,
 timestamp:'2026-10-26T00:00:00Z',...extra
});
test('median ignores invalid and resists one giant outlier',()=>{
 assert.equal(median([10,11,12,1000]),11.5);
 assert.equal(median([1,2,3]),2);
 assert.equal(median([]),null);
});
test('returns no invented multiplier with fewer than 3 historical samples',()=>{
 const ranked=rankPosts([mk('a','x',10),mk('b','x',100)]);
 assert.equal(ranked[0].score,null);
 assert.equal(ranked[0].verification,'INSUFFICIENT_HISTORY_OR_METRICS');
});
test('detects outlier using per-account median only',()=>{
 const data=[mk('a','x',10),mk('b','x',11),mk('c','x',9),mk('d','x',200),
 mk('e','y',5000)];
 const ranked=rankPosts(data);
 const d=ranked.find(x=>x.id==='d');
 assert.equal(d.baseline,10);
 assert.equal(d.score,20);
 assert.equal(ranked.find(x=>x.id==='e').score,null);
 assert.equal(summarize(ranked).qualified,1);
 const seed=toQueensSeed(d,'인테리어');
 assert.equal(seed.contractVersion,CONTRACT);
 assert.equal(seed.flow[1],'04_QUEENS');
 assert.equal(seed.flow[2],'05_SEED');
 assert.equal(seed.status,'PREPARED_NOT_CENTRAL_WRITTEN');
 assert.equal(seed.seed.shotPlan.length,4);
});
test('deduplicates records by URL and refuses fake complete engagement',()=>{
 const dup=[mk('a','x',10,{permalink:'https://www.threads.com/@x/post/1'}),
 mk('b','x',20,{permalink:'https://www.threads.com/@x/post/1'})];
 assert.equal(rankPosts(dup).length,1);
 assert.equal(normalizePost({id:'t',username:'x',likes:40}).engagement,null);
});
test('view and engagement metrics must not be mixed',()=>{
 const items=[mk('a','x',1,{views:10}),mk('b','x',1,{views:11}),
 mk('c','x',1,{views:9}),mk('d','x',1,{views:200})];
 const engagement=rankPosts(items,{mode:'engagement'});
 const views=rankPosts(items,{mode:'views'});
 assert.equal(engagement.find(x=>x.id==='d').score,1);
 assert.equal(views.find(x=>x.id==='d').score,20);
});