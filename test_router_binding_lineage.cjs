const fs=require('fs'), crypto=require('crypto'), assert=require('assert');
const src=fs.readFileSync('C:/Users/User/Documents/QueensLightPatch20260907/apps-script/Central_Image_Queens_Seed_AutoLearn_V2.gs','utf8');
function extract(name,next){const re=new RegExp('function '+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\([^]*?(?=\\nfunction '+next.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')');const m=src.match(re);if(!m)throw Error('missing '+name);return m[0];}
const rows={RUNTIME_ROUTER:[['ROUTE_ID','VERSION','VERIFIED','GENERATION_ALLOWED','NEXT_STATUS','RUN_ID','RESULT_ID','ACK_ID','DEDUPE_KEY','PARENT_TEMPLATE_ID','FIX_SIGNATURE'],['R1','V1','N_PENDING','N','HOLD_BIND','','','','','',''],['R2','V1','Y_BOUND','Y','READY','','','','','','']],WORKFLOW_BINDINGS:[['BINDING_ID','VERSION','VERIFIED','GATE','ON_PASS','ON_FAIL','RUN_ID','RESULT_ID','ACK_ID','DEDUPE_KEY','PARENT_TEMPLATE_ID','FIX_SIGNATURE'],['B1','V1','Y_BOUND','G','PASS','FAIL','','','','','',''],['B2','V1','N_PENDING','G2','PASS2','FAIL2','','','','','','']]};
function sheet(name){return {getDataRange(){return{getValues(){return rows[name].map(r=>r.slice())}}},getRange(r,c,n,m){return{setValues(v){for(let j=0;j<m;j++)rows[name][r-1][c-1+j]=v[0][j]}}}}}
const IMAGE_LEARNING_TABS={RUNTIME_ROUTER:'RUNTIME_ROUTER',WORKFLOW_BINDINGS:'WORKFLOW_BINDINGS'}, IMAGE_LEARNING_V2_VERSION='TEST_V413';
function imgPackSheetV2_(n){return sheet(n)}
function imgIndexV2_(h){const o={};h.forEach((x,i)=>o[x]=i);return o}
function imgSha256V2_(s){return crypto.createHash('sha256').update(String(s)).digest('hex')}
function imgSetV2_(sh,row,i,obj){for(const [k,v] of Object.entries(obj))if(typeof i[k]==='number')sh.getRange(row,i[k]+1,1,1).setValues([[v]])}
const f1=eval('('+extract('normalizeImageRuntimeRouterLineageV1_','normalizeImageWorkflowBindingsLineageV1_')+')');
const f2=eval('('+extract('normalizeImageWorkflowBindingsLineageV1_','evaluateImageTemplateTestsAndPromotionV4_')+')');
const before=JSON.stringify(rows.map||{}), a1=f1(), b1=f2(), snap=JSON.stringify(rows), a2=f1(), b2=f2();
assert.equal(a1.ok,true); assert.equal(a1.failClosedRoutes,1); assert.equal(b1.verifiedYes,1); assert.equal(b1.verifiedNo,1); assert.equal(JSON.stringify(rows),snap);
assert.equal(rows.RUNTIME_ROUTER[1][2],'N_PENDING'); assert.equal(rows.RUNTIME_ROUTER[1][3],'N'); assert.equal(rows.WORKFLOW_BINDINGS[2][2],'N_PENDING');
console.log('ROUTER_BINDING_LINEAGE_X2_PASS',JSON.stringify({a1,b1,a2,b2,routeFix:rows.RUNTIME_ROUTER[1][10],bindFix:rows.WORKFLOW_BINDINGS[2][10]}));