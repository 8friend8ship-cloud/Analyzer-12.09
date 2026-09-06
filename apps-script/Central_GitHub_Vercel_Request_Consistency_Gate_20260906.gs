/** GitHub/Vercel request reply consistency gate. Logical-only; no physical trigger. */
var GVR_GATE_V1 = Object.freeze({
  version:'GITHUB_VERCEL_REQUEST_GATE_V1_20260906',
  masterId:'1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI',
  qaTab:'80_DATA_RUNTIME_QA_LOG', evidenceTab:'93_RUNTIME_EVIDENCE_CONTROL',
  deploymentTab:'09_DEPLOYMENT_REGISTRY', triggerTab:'36_AUTOMATION_TRIGGER_REGISTRY',
  workflowTab:'75_ORCHESTRA_WORKFLOW_MAP', instructionTab:'18_AGENT_INSTRUCTION'
});

function gvrText_(v){return String(v===undefined||v===null?'':v).trim();}
function gvrBool_(v){return v===true||/^(Y|YES|TRUE|PASS|VERIFIED|READY)$/i.test(gvrText_(v));}
function gvrUpper_(v){return gvrText_(v).toUpperCase();}
function gvrHas_(text,re){return re.test(gvrUpper_(text));}

function gvrRiskClassV1_(input){
  var action=gvrUpper_(input.action), requested=gvrUpper_(input.riskClass);
  if(requested==='HIGH_RISK'||requested==='HUMAN_CONFIRM_REQUIRED')return 'HIGH_RISK';
  if(/DELETE|REMOVE_PROJECT|BILLING|PLAN_UPGRADE|PURCHASE|NEW_OAUTH|SCOPE_EXPANSION|SECRET_WRITE|DOMAIN_PURCHASE|PUBLIC_PRODUCTION|PRODUCTION_PROMOTE|RELINK/.test(action))return 'HIGH_RISK';
  if(/MERGE|DEPLOY_PRODUCTION|DOMAIN_ATTACH|ENV_WRITE|TRIGGER_REPLACE/.test(action))return 'RUNTIME_GATED';
  if(/COMMENT|REPLY|STATUS|READ|INSPECT|CHECK|AUDIT|PREVIEW|DRAFT/.test(action))return 'SAFE_EXISTING_SCOPE';
  return requested||'RUNTIME_GATED';
}

function gvrEvidenceV1_(input){
  var live=input.live||{}, central=input.central||{}, approval=input.approval||{};
  return {
    requestPresent:gvrBool_(input.requestPresent), provider:gvrUpper_(input.provider), action:gvrUpper_(input.action),
    liveIdentity:gvrBool_(live.identityVerified)||!!(gvrText_(live.projectId)||gvrText_(live.repo)),
    centralIdentity:gvrBool_(central.identityVerified)||!!(gvrText_(central.deploymentMapId)||gvrText_(central.appId)),
    ready:gvrUpper_(live.deploymentState)==='READY', runtimeX2:gvrBool_(central.runtimeX2), readbackX2:gvrBool_(central.readbackX2),
    sourceX2:gvrBool_(central.sourceX2), triggerFresh:gvrBool_(central.triggerFresh), existingScope:gvrBool_(approval.existingScope),
    explicitHighRiskApproved:gvrBool_(approval.explicitHighRiskApproved), duplicateCount:Number(live.duplicateProjectCount||central.duplicateProjectCount||0),
    runtimeRequired:input.runtimeRequired!==false, servingRepo:gvrText_(live.servingRepo||central.servingRepo), canonicalRepo:gvrText_(central.canonicalRepo),
    stale:gvrBool_(central.stale), providerRequestId:gvrText_(input.requestId||live.requestId)
  };
}
function evaluateGitHubVercelRequestGateV1(input){
  input=input||{};
  var e=gvrEvidenceV1_(input), risk=gvrRiskClassV1_(input), reasons=[], missing=[], decision='HOLD_EVIDENCE_GAP';
  if(!e.requestPresent){
    return gvrResultV1_('NO_REQUEST',risk,e,['NO_ACTUAL_EXTERNAL_REQUEST'],[],input);
  }
  if(e.provider!=='GITHUB'&&e.provider!=='VERCEL')missing.push('PROVIDER_IDENTITY');
  if(!e.liveIdentity)missing.push('LIVE_EXTERNAL_IDENTITY');
  if(!e.centralIdentity)missing.push('CENTRAL_MAPPING_IDENTITY');
  if(e.duplicateCount>1){missing.push('DUPLICATE_PROJECT_AMBIGUITY');reasons.push('DUPLICATE_PROJECT_HOLD_NO_AUTO_DELETE');}
  if(e.stale){missing.push('FRESH_CENTRAL_READBACK');reasons.push('STALE_STATE_NEVER_APPROVES_ACTION');}
  if(e.servingRepo&&e.canonicalRepo&&e.servingRepo!==e.canonicalRepo)reasons.push('CANONICAL_SERVING_DIVERGENCE_TRACKED_NOT_OUTAGE');
  if(risk==='HIGH_RISK'&&!e.explicitHighRiskApproved){
    reasons.push('NEW_OR_IRREVERSIBLE_SCOPE_REQUIRES_HUMAN');
    return gvrResultV1_('HUMAN_CONFIRM_REQUIRED',risk,e,reasons,missing,input);
  }
  if(!e.existingScope&&risk!=='HIGH_RISK')missing.push('EXISTING_APPROVAL_SCOPE');
  if(risk==='RUNTIME_GATED'||e.runtimeRequired){
    if(!e.sourceX2)missing.push('SOURCE_TEST_X2');
    if(!e.runtimeX2)missing.push('RUNTIME_X2');
    if(!e.readbackX2)missing.push('RESULT_ACK_READBACK_X2');
  }
  if(!missing.length){decision='PASS_SAFE_EXISTING_SCOPE';reasons.push('EVIDENCE_AND_SCOPE_PASS');}
  else reasons.push('DO_NOT_ANSWER_YES_FROM_READY_OR_OPEN_PR_ALONE');
  return gvrResultV1_(decision,risk,e,reasons,missing,input);
}
function gvrResultV1_(decision,risk,e,reasons,missing,input){
  var reply='';
  if(decision==='NO_REQUEST')reply='현재 확인된 외부 요구가 없습니다. 임의 승인/응답하지 않습니다.';
  else if(decision==='PASS_SAFE_EXISTING_SCOPE')reply='기존 승인 범위와 검증 증거가 일치합니다. 안전 범위의 요청만 진행 가능합니다.';
  else if(decision==='HUMAN_CONFIRM_REQUIRED')reply='새 권한·비용·공개 Production·삭제·relink 등 고위험 변경이므로 사용자 확인이 필요합니다.';
  else reply='증거가 부족하거나 일관성이 맞지 않아 승인하지 않습니다. 누락 증거를 먼저 복구·재검증합니다.';
  return {
    ok:decision==='PASS_SAFE_EXISTING_SCOPE'||decision==='NO_REQUEST', decision:decision, riskClass:risk,
    replyText:reply, reasons:reasons||[], missingEvidence:missing||[], evidence:e,
    provider:gvrUpper_(input.provider), action:gvrUpper_(input.action), requestId:e.providerRequestId,
    version:GVR_GATE_V1.version
  };
}

function gvrAppendByHeader_(sheet,record){
  if(!sheet)return;
  var width=sheet.getLastColumn(), headers=sheet.getRange(1,1,1,width).getDisplayValues()[0];
  var row=headers.map(function(h){return Object.prototype.hasOwnProperty.call(record,h)?record[h]:'';});
  var next=sheet.getLastRow()+1;
  if(next>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),Math.max(50,next-sheet.getMaxRows()));
  sheet.getRange(next,1,1,row.length).setValues([row]);
}
function runGitHubVercelRequestConsistencyGateV1(snapshot){
  var result=evaluateGitHubVercelRequestGateV1(snapshot||{}), now=new Date().toISOString();
  var runId='RUN_GVR_GATE_'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmmss');
  var resultId='RESULT_GVR_GATE_'+Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase();
  var ss=SpreadsheetApp.openById(GVR_GATE_V1.masterId), summary=JSON.stringify(result).slice(0,9000);
  gvrAppendByHeader_(ss.getSheetByName(GVR_GATE_V1.qaTab),{
    QA_ID:'QA_'+runId,RUN_ID:runId,APP_ID:'P00_AGENT_CORE;GITHUB;VERCEL',FUNCTION_ID:'runGitHubVercelRequestConsistencyGateV1',
    INPUT_DATA_IDS:'09|18|36|75|LIVE_GITHUB|LIVE_VERCEL',OUTPUT_DATA_IDS:'80|93',RESULT_ID:resultId,
    STARTED_AT:now,FINISHED_AT:now,STATUS:result.decision,READBACK_STATE:summary,QUALITY_SCORE:result.decision==='PASS_SAFE_EXISTING_SCOPE'||result.decision==='NO_REQUEST'?100:80,
    ERROR_CLASS:(result.missingEvidence||[]).join('|'),RETRY_COUNT:0,EVIDENCE_POINTER:'09|36|75|LIVE_PROVIDER',NEXT_ACTION:result.replyText
  });
  gvrAppendByHeader_(ss.getSheetByName(GVR_GATE_V1.evidenceTab),{
    EVIDENCE_ID:'EVID_'+runId,PROJECT_ID:'P00_AGENT_CORE',APP_ID:'GITHUB;VERCEL',FUNCTION_OR_ROUTE:'LIVE_PROVIDER→09/18/36/75→REQUEST_GATE→80/93',
    RUN_ID:runId,RESULT_ID:resultId,DRIVE_ACK:'80/93_WRITEBACK',PASS_1:'DECISION='+result.decision,
    PASS_2:'MISSING='+(result.missingEvidence||[]).join(','),LAST_GOOD:GVR_GATE_V1.version,STATUS:result.decision,
    ROOT_CAUSE:(result.reasons||[]).join('|'),MIN_FIX:result.decision==='HOLD_EVIDENCE_GAP'?'RESTORE_MISSING_EVIDENCE':'NONE',
    NEXT_RESUME_POINT:result.replyText,UPDATED_AT:now
  });
  SpreadsheetApp.flush();
  result.runId=runId; result.resultId=resultId; return result;
}

function testGitHubVercelRequestGateV1(){
  return evaluateGitHubVercelRequestGateV1({requestPresent:true,provider:'VERCEL',action:'STATUS_CHECK',runtimeRequired:false,
    live:{projectId:'prj_test',deploymentState:'READY',duplicateProjectCount:1,servingRepo:'repo/live'},
    central:{deploymentMapId:'DEPLOY_TEST',canonicalRepo:'repo/canonical',sourceX2:true,runtimeX2:true,readbackX2:true,stale:false},
    approval:{existingScope:true}});
}
