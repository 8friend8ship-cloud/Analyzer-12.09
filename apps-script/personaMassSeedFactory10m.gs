/* PERSONA_MASS_SEED_FACTORY_10M_V1_20260901
 * Free-tier, deterministic, fictional-only persona + seed materializer.
 * Reuses the existing 5-minute factory wake; no new trigger and no paid model/API.
 * Target: >=2,000 reusable personas and >=100,000 reusable seeds over repeated cycles.
 */
var PERSONA_MASS_SEED_FACTORY_10M_V1 = Object.freeze({
  version: '1.0.0',
  intervalMinutes: 10,
  personaTarget: 2000,
  seedTarget: 100000,
  personaBatch: 50,
  seedBatch: 250,
  maxSeconds: 210,
  schedulerMode: 'EXISTING_5M_FACTORY_WAKE_WITH_10M_DUE_GUARD',
  sheets: {
    persona: 'PERSONA_MASTER_V2',
    seed: 'SEED_MASTER_V2',
    cycle: 'SEED_PERSONA_FACTORY_CYCLE',
    taxonomy: 'PERSONA_TAXONOMY_V2'
  },
  useTargets: 'WRITER_STORYBOARD|VTUBE|IMAGE_PACK|BOT_PERSONA|MULTIMODAL_TEMPLATE'
});

function pmsfNorm_(v){ return String(v == null ? '' : v).trim(); }
function pmsfEnsureSheet_(ss, name, headers, minRows){
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name, ss.getNumSheets(), { rows: Math.max(1000, minRows || 1000), columns: headers.length });
  if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
  if (sh.getMaxRows() < (minRows || 1000)) sh.insertRowsAfter(sh.getMaxRows(), (minRows || 1000) - sh.getMaxRows());
  var cur = sh.getRange(1,1,1,headers.length).getDisplayValues()[0];
  if (cur.join('\u0001') !== headers.join('\u0001')) sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  return sh;
}
function pmsfAppendBatch_(sh, rows){
  if (!rows || !rows.length) return 0;
  var start = Math.max(2, sh.getLastRow() + 1);
  var need = start + rows.length - 1;
  if (sh.getMaxRows() < need) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows());
  sh.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
  return rows.length;
}
function pmsfAt_(arr, n){ return arr[n % arr.length]; }
function pmsfMix_(n, div, arr){ return pmsfAt_(arr, Math.floor(n / div)); }
function pmsfNow_(){ return new Date().toISOString(); }

function pmsfTaxonomy_(){
  return {
    countries: [
      ['KR','South Korea','ko-KR','East Asia'],['JP','Japan','ja-JP','East Asia'],['CN','China','zh-CN','East Asia'],['TW','Taiwan','zh-TW','East Asia'],
      ['VN','Vietnam','vi-VN','Southeast Asia'],['TH','Thailand','th-TH','Southeast Asia'],['PH','Philippines','en-PH','Southeast Asia'],['ID','Indonesia','id-ID','Southeast Asia'],
      ['IN','India','hi-IN','South Asia'],['PK','Pakistan','ur-PK','South Asia'],['AE','United Arab Emirates','ar-AE','West Asia/MENA'],['TR','Türkiye','tr-TR','West Asia/MENA'],
      ['US','United States','en-US','North America'],['CA','Canada','en-CA','North America'],['MX','Mexico','es-MX','Latin America'],['BR','Brazil','pt-BR','Latin America'],
      ['AR','Argentina','es-AR','Latin America'],['GB','United Kingdom','en-GB','Europe'],['FR','France','fr-FR','Europe'],['DE','Germany','de-DE','Europe'],
      ['IT','Italy','it-IT','Europe'],['ES','Spain','es-ES','Europe'],['PL','Poland','pl-PL','Europe'],['SE','Sweden','sv-SE','Europe'],
      ['NG','Nigeria','en-NG','Sub-Saharan Africa'],['ZA','South Africa','en-ZA','Sub-Saharan Africa'],['KE','Kenya','en-KE','Sub-Saharan Africa'],['EG','Egypt','ar-EG','North Africa/MENA'],
      ['AU','Australia','en-AU','Oceania'],['NZ','New Zealand','en-NZ','Oceania']
    ],
    genders: ['female','male','nonbinary'],
    ages: ['child_8_12','teen_13_17','young_18_24','adult_25_34','adult_35_44','midlife_45_59','senior_60_74','senior_75_plus'],
    occupations: ['student','office_worker','designer','interior_designer','architect','engineer','developer','teacher','nurse','doctor','chef','shop_owner','sales','marketer','creator','writer','photographer','driver','public_worker','lawyer','accountant','researcher','caregiver','retired','freelancer'],
    personalities: ['calm','energetic','analytical','empathetic','practical','curious','cautious','adventurous','reserved','social','perfectionist','easygoing'],
    appearance: ['light_skin_representation','medium_light_skin_representation','medium_skin_representation','medium_deep_skin_representation','deep_skin_representation','mixed_heritage_representation','regional_default_representation','unspecified_representation'],
    contexts: ['home','work','travel','shopping','cooking','learning','family','fitness','social','creative'],
    roles: ['lead','support','expert','customer','narrator','host','guest','mentor'],
    visualStyles: ['photoreal','editorial','documentary','cinematic','clean_commercial','casual_mobile','studio','illustrative']
  };
}

function ensurePersonaMassSeedFactoryTabs_(ss){
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var personaHeaders = ['PERSONA_ID','FICTIONAL_ONLY','COUNTRY_CODE','COUNTRY','REGION','LANGUAGE_PACK_ID','GENDER_PRESENTATION','AGE_BAND','OCCUPATION','PERSONALITY','APPEARANCE_REPRESENTATION','LIFE_CONTEXT','STORY_ROLE','VOICE_PROFILE_HINT','IMAGE_PROFILE_HINT','WRITER_PROFILE_HINT','VTUBE_PROFILE_HINT','USE_TARGETS','STATUS','CREATED_AT'];
  var seedHeaders = ['SEED_ID','PERSONA_ID','SEED_CLASS','COUNTRY_CODE','LANGUAGE_PACK_ID','AGE_BAND','GENDER_PRESENTATION','OCCUPATION','PERSONALITY','APPEARANCE_REPRESENTATION','LIFE_CONTEXT','STORY_ROLE','VISUAL_STYLE','QUEENS_REQUIRED','SOURCE_MODE','PROVENANCE','WRITER_STORYBOARD_USE','VTUBE_USE','IMAGE_PACK_USE','TEMPLATE_KEY','STATUS','CREATED_AT'];
  var cycleHeaders = ['CYCLE_ID','STARTED_AT','FINISHED_AT','PERSONA_CURSOR_BEFORE','PERSONA_CURSOR_AFTER','PERSONA_WRITTEN','SEED_CURSOR_BEFORE','SEED_CURSOR_AFTER','SEED_WRITTEN','PERSONA_TARGET','SEED_TARGET','VIRTUAL_SEED_SPACE','STATUS','FREE_TIER_MODE','NEXT_RESUME_POINT'];
  var taxonomyHeaders = ['DIMENSION','VALUE','META','STATUS'];
  var out = {};
  out.persona = pmsfEnsureSheet_(ss, PERSONA_MASS_SEED_FACTORY_10M_V1.sheets.persona, personaHeaders, 3000).getSheetId();
  out.seed = pmsfEnsureSheet_(ss, PERSONA_MASS_SEED_FACTORY_10M_V1.sheets.seed, seedHeaders, 5000).getSheetId();
  out.cycle = pmsfEnsureSheet_(ss, PERSONA_MASS_SEED_FACTORY_10M_V1.sheets.cycle, cycleHeaders, 3000).getSheetId();
  out.taxonomy = pmsfEnsureSheet_(ss, PERSONA_MASS_SEED_FACTORY_10M_V1.sheets.taxonomy, taxonomyHeaders, 1000).getSheetId();
  return { ok:true, sheets:out };
}

function pmsfVirtualSeedSpace_(){
  var t = pmsfTaxonomy_();
  return t.countries.length * t.genders.length * t.ages.length * t.occupations.length * t.personalities.length * t.appearance.length * t.contexts.length * t.roles.length * t.visualStyles.length;
}

function pmsfPersonaRow_(n){
  var t = pmsfTaxonomy_();
  var country = pmsfMix_(n,1,t.countries);
  var gender = pmsfMix_(n,t.countries.length,t.genders);
  var age = pmsfMix_(n,t.countries.length*t.genders.length,t.ages);
  var occ = pmsfMix_(n,7,t.occupations);
  var personality = pmsfMix_(n,11,t.personalities);
  var appearance = pmsfMix_(n,13,t.appearance);
  var context = pmsfMix_(n,17,t.contexts);
  var role = pmsfMix_(n,19,t.roles);
  var id = 'P2_' + Utilities.formatString('%04d', n + 1);
  return [
    id,'YES',country[0],country[1],country[3],country[2],gender,age,occ,personality,appearance,context,role,
    [country[2],gender,age,personality].join('|'),
    [appearance,age,gender,country[3]].join('|'),
    [country[1],occ,personality,context,role].join('|'),
    [country[2],gender,age,personality,role].join('|'),
    PERSONA_MASS_SEED_FACTORY_10M_V1.useTargets,'ACTIVE_SYNTHETIC_PERSONA',pmsfNow_()
  ];
}

function pmsfSeedRow_(n){
  var t = pmsfTaxonomy_();
  var country = pmsfMix_(n,1,t.countries);
  var gender = pmsfMix_(n,3,t.genders);
  var age = pmsfMix_(n,5,t.ages);
  var occ = pmsfMix_(n,7,t.occupations);
  var personality = pmsfMix_(n,11,t.personalities);
  var appearance = pmsfMix_(n,13,t.appearance);
  var context = pmsfMix_(n,17,t.contexts);
  var role = pmsfMix_(n,19,t.roles);
  var visual = pmsfMix_(n,23,t.visualStyles);
  var personaId = 'P2_' + Utilities.formatString('%04d', (n % PERSONA_MASS_SEED_FACTORY_10M_V1.personaTarget) + 1);
  var seedId = 'S2_' + Utilities.formatString('%06d', n + 1);
  var templateKey = [country[0],age,gender,occ,personality,appearance,context,role,visual].join('__');
  return [
    seedId,personaId,'COMBINATORIAL_TEMPLATE_SEED',country[0],country[2],age,gender,occ,personality,appearance,context,role,visual,
    'YES','FREE_INTERNAL_COMBINATION','NOT_EXTERNAL_EVIDENCE;QUEENS_REQUIRED_BEFORE_FACTUAL_OR_STYLE_PROMOTION',
    'YES','YES','YES',templateKey,'CANDIDATE_NEEDS_QUEENS_OR_INTERNAL_QA',pmsfNow_()
  ];
}

function pmsfMaterialize_(ss){
  ensurePersonaMassSeedFactoryTabs_(ss);
  var props = PropertiesService.getScriptProperties();
  var pKey = 'PMSF_PERSONA_CURSOR_V1', sKey = 'PMSF_SEED_CURSOR_V1';
  var p0 = Number(props.getProperty(pKey) || 0), s0 = Number(props.getProperty(sKey) || 0);
  var pEnd = Math.min(PERSONA_MASS_SEED_FACTORY_10M_V1.personaTarget, p0 + PERSONA_MASS_SEED_FACTORY_10M_V1.personaBatch);
  var sEnd = Math.min(PERSONA_MASS_SEED_FACTORY_10M_V1.seedTarget, s0 + PERSONA_MASS_SEED_FACTORY_10M_V1.seedBatch);
  var pRows = [], sRows = [], i;
  for (i=p0; i<pEnd; i++) pRows.push(pmsfPersonaRow_(i));
  for (i=s0; i<sEnd; i++) sRows.push(pmsfSeedRow_(i));
  var pSh = ss.getSheetByName(PERSONA_MASS_SEED_FACTORY_10M_V1.sheets.persona);
  var sSh = ss.getSheetByName(PERSONA_MASS_SEED_FACTORY_10M_V1.sheets.seed);
  var pw = pmsfAppendBatch_(pSh,pRows), sw = pmsfAppendBatch_(sSh,sRows);
  props.setProperty(pKey,String(pEnd)); props.setProperty(sKey,String(sEnd));
  return { personaCursorBefore:p0, personaCursorAfter:pEnd, personaWritten:pw, seedCursorBefore:s0, seedCursorAfter:sEnd, seedWritten:sw };
}

function runPersonaMassSeedFactory10m_(ss, context){
  ss = ss || SpreadsheetApp.getActiveSpreadsheet(); context = context || {};
  var started = Date.now(), startedAt = pmsfNow_();
  var mat = pmsfMaterialize_(ss);
  var cycleId = 'PMSF10M_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyyMMdd_HHmmss');
  var cycleSh = ss.getSheetByName(PERSONA_MASS_SEED_FACTORY_10M_V1.sheets.cycle);
  var virtualSpace = pmsfVirtualSeedSpace_();
  var status = ((Date.now()-started)/1000 <= PERSONA_MASS_SEED_FACTORY_10M_V1.maxSeconds) ? 'PASS_FREE_TIER_BATCH' : 'PARTIAL_RUNTIME_BUDGET';
  pmsfAppendBatch_(cycleSh, [[cycleId,startedAt,pmsfNow_(),mat.personaCursorBefore,mat.personaCursorAfter,mat.personaWritten,mat.seedCursorBefore,mat.seedCursorAfter,mat.seedWritten,PERSONA_MASS_SEED_FACTORY_10M_V1.personaTarget,PERSONA_MASS_SEED_FACTORY_10M_V1.seedTarget,virtualSpace,status,'NO_PAID_MODEL_API;NO_NEW_TRIGGER','NEXT_EXISTING_5M_WAKE→10M_DUE_GUARD→CONTINUE_UNTIL_TARGETS']]);
  return { ok:status==='PASS_FREE_TIER_BATCH', cycleId:cycleId, materialized:mat, personaTarget:PERSONA_MASS_SEED_FACTORY_10M_V1.personaTarget, seedTarget:PERSONA_MASS_SEED_FACTORY_10M_V1.seedTarget, virtualSeedSpace:virtualSpace, useTargets:PERSONA_MASS_SEED_FACTORY_10M_V1.useTargets, installNewTrigger:false };
}

function runPersonaMassSeedFactory10mIfDue_(ss, context){
  ss = ss || SpreadsheetApp.getActiveSpreadsheet(); context = context || {};
  var props = PropertiesService.getScriptProperties();
  var dueKey = 'PMSF_10M_LAST_RUN_AT_V1';
  var last = Number(props.getProperty(dueKey) || 0), now = Date.now();
  if (last && now-last < PERSONA_MASS_SEED_FACTORY_10M_V1.intervalMinutes*60000) return {ok:true,ran:false,nextDueMs:last+PERSONA_MASS_SEED_FACTORY_10M_V1.intervalMinutes*60000};
  var r = runPersonaMassSeedFactory10m_(ss,context);
  if (r.ok) props.setProperty(dueKey,String(now));
  return {ok:r.ok,ran:true,result:r};
}

function resetPersonaMassSeedFactoryForTest_(){
  return { ok:false, blocked:true, reason:'CURSOR_RESET_REQUIRES_EXPLICIT_MAINTENANCE_APPROVAL_TO_AVOID_DUPLICATE_SEEDS' };
}
