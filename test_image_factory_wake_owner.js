import fs from 'fs';
import assert from 'assert';
const src=fs.readFileSync('./apps-script/Central_Image_Queens_Seed_AutoLearn_V2.gs','utf8');
function extract(name,next){const re=new RegExp('function '+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\([^)]*\\)\\{[\\s\\S]*?(?=\\r?\\n+function '+next.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')');const m=src.match(re);assert(m,name+' not found');return eval('('+m[0]+')');}
globalThis.IMAGE_LEARNING_V2_VERSION='TEST';
let handlers=[]; let createCalls=0;
globalThis.ScriptApp={getProjectTriggers(){return handlers.map(h=>({getHandlerFunction(){return h;}}));},newTrigger(){createCalls++;throw new Error('SHOULD_NOT_CREATE');}};
const state=extract('imgFactoryWakeStateV3_','ensureImageLearningFactoryWakeV3_');
globalThis.imgFactoryWakeStateV3_=state;
const ensure=extract('ensureImageLearningFactoryWakeV3_','imgSyncTriggerRegistryV3_');
handlers=['processAllTaskQueues']; let a=ensure(); assert.equal(a.ok,true); assert.equal(a.factoryWakeCount,1); assert.equal(a.action,'KEEP_EXISTING');
handlers=['processTaskQueue']; let b=ensure(); assert.equal(b.ok,true); assert.equal(b.factoryWakeCount,1);
handlers=[]; let c=ensure(); assert.equal(c.ok,false); assert.equal(c.action,'MISSING_FAIL_CLOSED_NO_NEW_TRIGGER'); assert.equal(createCalls,0);
handlers=['processAllTaskQueues','processTaskQueue']; let d=ensure(); assert.equal(d.ok,false); assert.equal(d.error,'DUPLICATE_FACTORY_WAKE_TRIGGER'); assert.equal(createCalls,0);
console.log('IMAGE_FACTORY_WAKE_OWNER_X2_PASS',JSON.stringify({canonical:a,legacy:b,missing:c,duplicate:d,createCalls}));