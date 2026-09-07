import fs from 'fs';
import assert from 'assert';
const src=fs.readFileSync('./apps-script/Central_Image_Queens_Seed_AutoLearn_V2.gs','utf8');
const m=src.match(/function extractImageQueensVisualSpatialFeaturesV2\(\)\{[\s\S]*?(?=\r?\n+function promoteVerifiedImageQueensToSeedV2)/);
assert(m,'extractImageQueensVisualSpatialFeaturesV2 not found');
const fn=eval('('+m[0]+')');
const qh=['REQUEST_ID','SOURCE_URL','ASSET_CLASS','SPATIAL_STATUS','FEATURE_STATUS'];
const fh=['SOURCE_URL','VERIFIED','HUMAN_SCALE','CLEARANCE','CIRCULATION','DEPTH'];
const q=[qh,['REQ_A','u:a','SPACE','PASS_DRIVE_VISUAL_SPATIAL_QA_20260902','OLD'],['REQ_B','u:b','SPACE','TECHNICAL_QA_PENDING','OLD'],['REQ_C','u:c','SPACE','PENDING','OLD'],['REQ_D','u:d','BACKGROUND','','OLD']];
const f=[fh,['u:a','Y','H','C','R','D'],['u:b','Y','H','C','R','D'],['u:c','Y','H','','R','D'],['u:d','Y','','','','']];
function sheet(data){return {getDataRange(){return {getValues(){return data;}}},getRange(r,c){return {setValue(v){data[r-1][c-1]=v;}}}};}
const sheets={PINTEREST_QUEENS_INTAKE:sheet(q),VISUAL_FEATURE_EXTRACTOR:sheet(f)};
globalThis.IMAGE_LEARNING_TABS={QUEENS:'PINTEREST_QUEENS_INTAKE',FEATURES:'VISUAL_FEATURE_EXTRACTOR'};
globalThis.imgPackSheetV2_=n=>sheets[n];
globalThis.imgIndexV2_=h=>Object.fromEntries(h.map((v,i)=>[String(v),i]));
globalThis.imgIsSpatialClassV2_=s=>/SPACE|FURNITURE|FIXTURE|OBJECT|HUMAN_SCALE|ACCESSIBILITY/i.test(String(s||''));
globalThis.imgSetV2_=(sh,row,idx,patch)=>Object.keys(patch).forEach(k=>{if(typeof idx[k]==='number')sh.getRange(row,idx[k]+1).setValue(patch[k]);});
for(let cycle=1;cycle<=2;cycle++){
  const out=fn(); assert.equal(out.ok,true);
  assert.equal(q[1][3],'PASS_DRIVE_VISUAL_SPATIAL_QA_20260902');
  assert.equal(q[1][4],'PASS_VERIFIED_FEATURE');
  assert.equal(q[2][3],'FEATURE_SPATIAL_EVIDENCE_READY_QA_PENDING');
  assert.equal(q[2][4],'PASS_VERIFIED_FEATURE');
  assert.equal(q[3][3],'WAITING_HUMAN_SCALE_CLEARANCE_CIRCULATION_DEPTH');
  assert.equal(q[3][4],'HOLD_SPATIAL_FEATURE_INCOMPLETE');
  assert.equal(q[4][3],'NOT_REQUIRED');
}
console.log('VISUAL_FEATURE_SPATIAL_PASS_PRESERVE_X2_PASS',JSON.stringify({A:q[1].slice(3),B:q[2].slice(3),C:q[3].slice(3),D:q[4].slice(3)}));