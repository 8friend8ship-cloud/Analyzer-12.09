const fs=require('fs'),crypto=require('crypto'),assert=require('assert');
const src=fs.readFileSync('C:/Users/User/Documents/CentralAgentPhysicalOwnerProbe_1DzJw_20260907/Central_Image_Queens_Seed_AutoLearn_V2.js','utf8');
const m=src.match(/function normalizeImagePromotionGateLineageV1_\(\)\{.*?\n(?=function evaluateImageTemplateTestsAndPromotionV4_)/s); assert(m);
const header=['RECORD_TYPE','PACK_ID','TEST_COUNT','AVG_SCORE','PASS_RATE','CONSISTENCY_SCORE','FAILURE_SIGNATURE_COUNT','CRITICAL_FAIL_COUNT','SOURCE_GATE','RIGHTS_GATE','DRIVE_READBACK_GATE','MIN_TESTS_GATE','CURRENT_STATUS','PROMOTION_DECISION','NEXT_ACTION','LAST_TESTED_AT','VERSION','RULE_EXPRESSION','RUN_ID','RESULT_ID','ACK_ID','DEDUPE_KEY','PARENT_TEMPLATE_ID','FIX_SIGNATURE'];
const rows=[header,
 ['RULE','RULE_ACTIVE',2,85,.8,85,0,0,'PASS','PASS','PASS','PASS','ACTIVE_TEMPLATE','PROMOTE','NEXT','','V1','RULE'],
 ['RESULT','CAND_X',2,0,0,0,1,2,'PASS','PASS','PASS','PASS','DIAGNOSTIC_HOLD','REJECT_RUNTIME_ROUTE','FIX','2026-08-31 11:51 KST','V1','old'],
 ['RESULT','CAND_X',2,93,1,98,1,0,'PASS','PASS','PASS','PASS','ACTIVE_INTERNAL_TEMPLATE','PROMOTE_INTERNAL','KEEP','2026-08-31 12:12 KST','V1','new']];
const sheet={getDataRange:()=>({getValues:()=>rows.map(r=>r.slice())})};
global.IMAGE_LEARNING_TABS={PROMOTION:'PROMOTION_GATE'}; global.IMAGE_LEARNING_V2_VERSION='TEST_V410';
global.imgPackSheetV2_=()=>sheet; global.imgIndexV2_=h=>Object.fromEntries(h.map((v,i)=>[v,i]));
global.imgSha256V2_=s=>crypto.createHash('sha256').update(s).digest('hex');
global.imgSetV2_=(sh,row,idx,patch)=>Object.entries(patch).forEach(([k,v])=>rows[row-1][idx[k]]=v);
const fn=eval('('+m[0]+')'); const before=rows.map(r=>r.slice()); const a=fn(), keys1=rows.slice(1).map(r=>r[21]); const b=fn(), keys2=rows.slice(1).map(r=>r[21]);
assert(a.ok&&b.ok); assert.equal(a.scanned,3); assert.equal(a.results,2); assert.equal(a.rules,1); assert.equal(a.holdsOrRejectsPreserved,1);
assert.equal(new Set(keys1).size,3); assert.deepEqual(keys1,keys2); assert.equal(rows[2][3],before[2][3]); assert.equal(rows[2][13],before[2][13]); assert.equal(rows[3][3],before[3][3]); assert.equal(rows[3][13],before[3][13]);
assert(rows[2][23].includes('DIAGNOSTIC_HOLD')); assert.equal(rows[3][23],'NONE');
console.log('PROMOTION_LINEAGE_X2_PASS',JSON.stringify({a,b,keys:keys1,holdFix:rows[2][23],activeFix:rows[3][23]}));