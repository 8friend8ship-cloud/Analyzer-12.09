const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync('apps-script/YouTubeSeedFactory_20260903.gs','utf8');
const a=src.indexOf('function ytSeedIngestUrlInboxV4_'); const b=src.indexOf('function ytSeedHeaderIndex_',a); const m=(a>=0&&b>a)?[src.slice(a,b).trim()]:null;
assert(m,'helper not found');
const Utilities={formatDate:(d,tz,fmt)=>fmt.includes('yyyyMMdd')?'20260908':'2026-09-08T13:20:00+09:00'};
function ytSeedHeaderIndex_(h){const o={};h.forEach((x,i)=>o[String(x||'').trim().toUpperCase()]=i);return o;}
function ytSeedCell_(r,i,n){const x=i[String(n).toUpperCase()];return x===undefined?'':String(r[x]||'').trim();}
function ytSeedNumberOrBlank_(v){const s=String(v||'').replace(/,/g,'').trim();if(!s)return '';const n=Number(s);return Number.isFinite(n)?n:'';}
function ytSeedBrief_(s,max){return String(s||'').replace(/\s+/g,' ').trim().slice(0,max||700);}
const YT_SEED_APP_ID='APP_CONTENT_OS';
const helper=eval('('+m[0]+')');
class Sheet{constructor(headers,rows=[]){this.headers=headers;this.rows=rows;this.appended=[];}getLastRow(){return 1+this.rows.length;}getRange(r,c,n,m){return {getDisplayValues:()=>r===1?[this.headers]:this.rows.slice(r-2,r-2+n)};}appendRow(row){this.appended.push(row);}}
const H=['STATUS','ASSET_TYPE','URL','SOURCE_PAGE_URL','PLATFORM','TITLE','PRIMARY_CODE','SUB_KEY','NODE_TAG','KEYWORDS','TARGET_APPS','USE_CASE','COUNTRY','LANGUAGE','OFFICIAL_SOURCE','RIGHTS_USAGE','CREATED_AT','PROCESSED_AT','NOTES','COLLECTION_METHOD','VIDEO_ID','CHANNEL_ID','API_REFRESH_DUE','METRIC_SCHEMA','DEDUP_KEY','POLICY_CLASS'];
const rows=[
['DONE','TEXT','https://www.youtube.com/watch?v=Wt6IzAS71e0','','YOUTUBE','old','','q','','k','','u','','ko','','REFERENCE_ONLY','2026-09-03','','{}','','Wt6IzAS71e0'],
['ANALYZED','VIDEO_REFERENCE','https://www.youtube.com/watch?v=itObCxPovPY','','YOUTUBE','foreign reform','VIDEO_QUEENS_USER_LINK','AI_FOREIGN_VIDEO_REFORM_WORKFLOW','','a,b','','QUEENS_REVERSE_ENGINEER_STYLE','','ko','','REFERENCE_ONLY_NO_FULL_COPY','2026-09-08','','auto transcript analyzed','','itObCxPovPY'],
['ANALYZED','VIDEO_REFERENCE','https://www.youtube.com/watch?v=1eBPSEp3mJc','','YOUTUBE','travel compare','VIDEO_QUEENS_USER_LINK','FOREIGNER_KOREA_EXPERIENCE_COMPARE_REVEAL','','c,d','','TRAVEL_VIDEO_STYLE_SEED','','ko','','REFERENCE_ONLY_FACTCHECK','2026-09-08','','fact check','','1eBPSEp3mJc']];
const inbox=new Sheet(H,rows), video=new Sheet([]), script=new Sheet([]), vt=new Sheet([]), sb=new Sheet([]);
const existing={Wt6IzAS71e0:true}, vtExisting={Wt6IzAS71e0:true};
const out=helper(inbox,video,script,vt,sb,existing,vtExisting,new Date('2026-09-08T04:20:00Z'),50);
assert.equal(out.created,2);assert.equal(out.scriptCreated,2);assert.equal(out.vtubeCreated,2);assert.equal(out.duplicates,1);assert.equal(out.noTranscriptImport,true);
assert.deepEqual(video.appended.map(r=>r.length),[26,26]);
assert.deepEqual(script.appended.map(r=>r.length),[26,26]);
assert.deepEqual(vt.appended.map(r=>r.length),[19,19]);
assert.deepEqual(sb.appended.map(r=>r.length),[22,22]);
assert(script.appended.every(r=>String(r[7]).includes('Transcript is not imported')));
console.log('YOUTUBE_URL_INBOX_V4_X2_FIXTURE_PASS',JSON.stringify(out));
