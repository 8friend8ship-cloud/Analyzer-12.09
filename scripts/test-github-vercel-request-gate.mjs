import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const sourcePath = new URL('../apps-script/Central_GitHub_Vercel_Request_Consistency_Gate_20260906.gs', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8');
const context = { console };
vm.createContext(context);
vm.runInContext(source, context, { filename: 'Central_GitHub_Vercel_Request_Consistency_Gate_20260906.gs' });
const gate = context.evaluateGitHubVercelRequestGateV1;
assert.equal(typeof gate, 'function');

const base = {
  requestPresent:true, provider:'VERCEL', action:'STATUS_CHECK', runtimeRequired:false,
  live:{projectId:'prj_live',deploymentState:'READY',duplicateProjectCount:1,servingRepo:'Analyzer-12.09'},
  central:{deploymentMapId:'DEPLOY_ANALYZER',canonicalRepo:'contents-os-git',sourceX2:true,runtimeX2:true,readbackX2:true,stale:false},
  approval:{existingScope:true}
};
const clone = x => JSON.parse(JSON.stringify(x));
let x = clone(base); x.requestPresent=false;
assert.equal(gate(x).decision,'NO_REQUEST');

x=clone(base); x.action='DEPLOY_PREVIEW'; x.runtimeRequired=true; x.central.runtimeX2=false; x.central.readbackX2=false;
assert.equal(gate(x).decision,'HOLD_EVIDENCE_GAP');
assert.ok(gate(x).missingEvidence.includes('RUNTIME_X2'));

x=clone(base); x.provider='GITHUB'; x.action='MERGE'; x.live={repo:'8friend8ship-cloud/Analyzer-12.09',duplicateProjectCount:1}; x.central.runtimeX2=false; x.central.readbackX2=false;
assert.equal(gate(x).decision,'HOLD_EVIDENCE_GAP');

x=clone(base); x.action='STATUS_CHECK';
assert.equal(gate(x).decision,'PASS_SAFE_EXISTING_SCOPE');
assert.ok(gate(x).reasons.includes('CANONICAL_SERVING_DIVERGENCE_TRACKED_NOT_OUTAGE'));
x=clone(base); x.action='PUBLIC_PRODUCTION_PROMOTE'; x.approval.explicitHighRiskApproved=false;
assert.equal(gate(x).decision,'HUMAN_CONFIRM_REQUIRED');

x=clone(base); x.live.duplicateProjectCount=2;
assert.equal(gate(x).decision,'HOLD_EVIDENCE_GAP');
assert.ok(gate(x).missingEvidence.includes('DUPLICATE_PROJECT_AMBIGUITY'));

x=clone(base); x.central.stale=true;
assert.equal(gate(x).decision,'HOLD_EVIDENCE_GAP');
assert.ok(gate(x).missingEvidence.includes('FRESH_CENTRAL_READBACK'));

x=clone(base); x.action='STATUS_CHECK'; x.live.deploymentState='READY'; x.central.runtimeX2=false; x.central.readbackX2=false; x.runtimeRequired=false;
assert.equal(gate(x).decision,'PASS_SAFE_EXISTING_SCOPE');

console.log(JSON.stringify({ok:true,cases:8,version:gate(base).version}));
