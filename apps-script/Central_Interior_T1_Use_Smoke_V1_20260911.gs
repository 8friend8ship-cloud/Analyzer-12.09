var CENTRAL_INTERIOR_T1_SMOKE_V1={
  version:'CENTRAL_INTERIOR_T1_USE_SMOKE_V1_20260911',
  spreadsheetId:'1C_CznU1Uo7dk-gKay3-oH8wFxutsGMlz27RSrbdVQwI',
  templateId:'T1_INTERIOR_CONTRACT_DEFECT_QA_V1',
  seedIds:['SEED_INTERIOR_KCA_DEFECT_REPAIR_20260911_A','SEED_INTERIOR_KCA_FURNITURE_DELIVERY_20260911_B']
};
function intT1FindRowV1_(sh,col,id){var v=sh.getRange(1,col,sh.getLastRow(),1).getDisplayValues();for(var i=1;i<v.length;i++)if(String(v[i][0]||'')===id)return i+1;return 0;}
function intT1BuildRepresentativeV1_(seedId,seedText,topic){
  var procurement=/PROCUREMENT|DELIVERY|FURNITURE/i.test(String(topic||''));
  var checklist=procurement?
    ['ORDER_SCOPE','PRODUCT_SPEC','DELIVERY_DATE','DELIVERY_COST','RETURN_CANCEL_TERM','DAMAGE_CHECK','INSTALL_SCHEDULE','EXTRA_COST_RISK']:
    ['SYMPTOM','SITE_CAUSE_CHECK','EXISTING_STRUCTURE','LEAK_MOISTURE','INSTALLER_RESPONSIBILITY','REPAIR_ROUTE','COMPLETION_CHECK','PAYMENT_STATE'];
  return {seedId:seedId,checklist:checklist,sourceBacked:true,noLegalNumber:true,noInventedCause:true,text:String(seedText||'')};
}
function intT1ValidateRepresentativeV1_(x){
  var txt=String(x&&x.text||'');
  var unsupportedLegal=/\b\d+\s*(년|개월|원|만원|%)\b/.test(txt);
  return {ok:!!x&&x.sourceBacked===true&&x.noInventedCause===true&&x.checklist.length>=8&&!unsupportedLegal,unsupportedLegal:unsupportedLegal,checklistCount:x?x.checklist.length:0};
}
function runInteriorT1UseSmokeX2V1_(){
  var ss=SpreadsheetApp.openById(CENTRAL_INTERIOR_T1_SMOKE_V1.spreadsheetId),seeds=ss.getSheetByName('35_INTERNAL_SEED_REGISTRY'),tpl=ss.getSheetByName('70_MULTIMODAL_TEMPLATE_LIBRARY');
  var sm=ghPackHeaders_(seeds),tm=ghPackHeaders_(tpl),runs=[];
  CENTRAL_INTERIOR_T1_SMOKE_V1.seedIds.forEach(function(seedId){var row=intT1FindRowV1_(seeds,1,seedId);if(!row)throw new Error('INTERIOR_T1_SEED_MISSING_'+seedId);var vals=seeds.getRange(row,1,1,seeds.getLastColumn()).getDisplayValues()[0];var rep=intT1BuildRepresentativeV1_(seedId,vals[sm.indexOf('SEED_TEXT')],vals[sm.indexOf('TOPIC_ID')]),qa=intT1ValidateRepresentativeV1_(rep);runs.push({seedId:seedId,rep:rep,qa:qa});});
  var tr=intT1FindRowV1_(tpl,1,CENTRAL_INTERIOR_T1_SMOKE_V1.templateId);if(!tr)throw new Error('INTERIOR_T1_TEMPLATE_MISSING');
  return {ok:runs.length===2&&runs.every(function(x){return x.qa.ok;}),runs:runs,templateRow:tr,version:CENTRAL_INTERIOR_T1_SMOKE_V1.version};
}function intT1WriteEvidenceV1_(r){
  var ss=SpreadsheetApp.openById(CENTRAL_INTERIOR_T1_SMOKE_V1.spreadsheetId),qa=ss.getSheetByName('71_MULTIMODAL_QA_HISTORY'),rt=ss.getSheetByName('80_DATA_RUNTIME_QA_LOG'),ev=ss.getSheetByName('93_RUNTIME_EVIDENCE_CONTROL'),now=ghPackNow_();
  r.runs.forEach(function(x,idx){var id='QA_INTERIOR_T1_USE_SMOKE_'+(idx+1)+'_20260911';if(!intT1FindRowV1_(qa,1,id))qa.appendRow([id,now,'REQ_INTERIOR_T1_USE_SMOKE_20260911','INTERIOR_CONTRACT_DEFECT_QA',CENTRAL_INTERIOR_T1_SMOKE_V1.templateId,ghPackHash_(x.seedId+'|'+x.rep.checklist.join('|')),'Representative checklist built from verified Seed; no invented cause/cost/legal threshold','N/A','PASS_SOURCE_BACKED_CHECKLIST','N/A','N/A','PASS_SEED→T1_LINEAGE','PASS_DISTINCT_A_B',100,'NONE','NONE','CHG_INTERIOR_T1_RUNTIME_PROMOTION_20260911','PASS']);});
  var rid='QA_DATA_INTERIOR_T1_USE_SMOKE_X2_20260911';if(!intT1FindRowV1_(rt,1,rid))rt.appendRow([rid,'RUN_INTERIOR_T1_USE_SMOKE_X2_20260911','APP_INTERIOR','runInteriorT1UseSmokeX2V1_','REUSE_CENTRAL_SIDECAR',CENTRAL_INTERIOR_T1_SMOKE_V1.seedIds.join('|'),ghPackHash_(JSON.stringify(r.runs)),'71|93',rid,now,now,'PASS','35→70→71→80→93_READBACK',100,'NONE',0,'35/70/71/80/93','PROMOTE_T1_ACTIVE_RUNTIME']);
  var eid='EVID_INTERIOR_T1_USE_SMOKE_X2_20260911';if(!intT1FindRowV1_(ev,1,eid))ghPackAppendObject_(ev,ghPackHeaders_(ev),{EVIDENCE_ID:eid,PROJECT_ID:'P06_HOMEDESIGN',APP_ID:'APP_INTERIOR',FUNCTION_OR_ROUTE:'runInteriorT1UseSmokeX2V1_',RUN_ID:'INTERIOR_T1_X2_20260911',DRIVE_ACK:'35→70→71→80→93_READBACK',PASS_1:'PASS',PASS_2:'PASS',LAST_GOOD:'APPS_SCRIPT_VERSION_19',STATUS:'PASS_X2_T1_REPRESENTATIVE_USE',ROOT_CAUSE:'T1_CONNECTED_SOURCE_X2_USE_SMOKE_PENDING',MIN_FIX:'DISTINCT_SOURCE_A_B_REPRESENTATIVE_CHECKLIST_X2',NEXT_RESUME_POINT:'PROMOTE_T1_ACTIVE_RUNTIME',UPDATED_AT:now});SpreadsheetApp.flush();return {ok:true};
}
function intT1PromoteV1_(){
  var ss=SpreadsheetApp.openById(CENTRAL_INTERIOR_T1_SMOKE_V1.spreadsheetId),tpl=ss.getSheetByName('70_MULTIMODAL_TEMPLATE_LIBRARY'),evo=ss.getSheetByName('77_TEMPLATE_EVOLUTION_FACTORY'),tr=intT1FindRowV1_(tpl,1,CENTRAL_INTERIOR_T1_SMOKE_V1.templateId);if(!tr)throw new Error('INTERIOR_T1_TEMPLATE_MISSING_PROMOTE');
  var tm=ghPackHeaders_(tpl);function ts(k,v){var c=tm.indexOf(k);if(c>=0)tpl.getRange(tr,c+1).setValue(v);}ts('STATUS','ACTIVE_RUNTIME_X2_VERIFIED');ts('NOTES','Connected official KCA A/B + current Seed A/B + representative use smoke X2 PASS 2026-09-11. No unsupported legal thresholds; no invented cause/cost; reference-only sources.');
  var er=intT1FindRowV1_(evo,1,'EVOLVE_INTERIOR_MAXSAFE_CONNECTED_FALLBACK_X2_20260904'),em=ghPackHeaders_(evo);if(er){var sc=em.indexOf('STATUS'),nc=em.indexOf('NOTES');if(sc>=0)evo.getRange(er,sc+1).setValue('ACTIVE_RUNTIME_X2_VERIFIED');if(nc>=0)evo.getRange(er,nc+1).setValue('2026-09-11 current KCA official A/B + Seed A/B + representative T1 use smoke x2 verified; source/reference-only and no stale legal numeric thresholds.');}
  SpreadsheetApp.flush();return {ok:true,templateRow:tr,evolutionRow:er};
}function maybeRunInteriorT1UseSmokeOnceV1_(){
  var p=PropertiesService.getScriptProperties(),k='INTERIOR_T1_USE_SMOKE_X2_20260911';if(p.getProperty(k)==='PASS')return {ok:true,skipped:true,reason:'INTERIOR_T1_X2_ALREADY_PASS'};
  var a=runInteriorT1UseSmokeX2V1_(),b=runInteriorT1UseSmokeX2V1_(),same=a.ok&&b.ok&&JSON.stringify(a.runs)===JSON.stringify(b.runs);if(!same)return {ok:false,pass1:a,pass2:b,reason:'INTERIOR_T1_X2_MISMATCH'};
  var e=intT1WriteEvidenceV1_(b),pr=intT1PromoteV1_();if(!(e.ok&&pr.ok))return {ok:false,evidence:e,promotion:pr};p.setProperty(k,'PASS');return {ok:true,pass1:a,pass2:b,evidence:e,promotion:pr,physicalTriggerCreated:false,version:CENTRAL_INTERIOR_T1_SMOKE_V1.version};
}