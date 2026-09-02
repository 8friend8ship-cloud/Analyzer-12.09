import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('apps-script/Central_Learning_Queens_Drive_Flywheel_20260902.gs','utf8');
const scheduler = fs.readFileSync('apps-script/ContentOS_Unified_Scheduler.gs','utf8');

const requiredFunctions = [
  'runCentralLearningFlywheelFromFactoryV1',
  'runCentralDriveLearningQaCycleV1',
  'analyzeNewAssetV1',
  'runCentralSeedPromotionCycleV1',
  'auditCentralLearningFlywheelV1',
  'ensureCentralLearningFlywheelTriggerV1',
  'testCentralLearningFlywheelX2V1'
];
for (const fn of requiredFunctions) {
  assert.match(source, new RegExp(`function\\s+${fn}\\s*\\(`), `missing ${fn}`);
}

assert.doesNotMatch(source, /ScriptApp\.newTrigger\s*\(/, 'learning lane must not create a physical trigger');
assert.match(source, /REUSE_EXISTING_PROCESS_TASK_QUEUE/);
assert.match(source, /81_ALL_FILE_CATALOG/);
assert.match(source, /37_QUEENS_RESEARCH_RESULTS/);
assert.match(source, /35_INTERNAL_SEED_REGISTRY/);
assert.match(source, /75_ORCHESTRA_WORKFLOW_MAP/);
assert.match(source, /VOICE_TEST_TEXT_QUEENS/);
assert.match(source, /SEED_DRAFT_QA_READY_RUNTIME_X2_PENDING/);
assert.match(source, /NO_FILENAME_ONLY_SEED_PROMOTION/);
assert.match(source, /binary|media/i);

assert.match(scheduler, /centralLearningFlywheel\s*=\s*runOptionalContentOsStage_\('runCentralLearningFlywheelFromFactoryV1'\)/);
assert.match(scheduler, /centralLearningPhysicalTriggerCount/);
assert.match(scheduler, /ZERO_DEDICATED_LEARNING_CLOCKS/);

console.log('CENTRAL_LEARNING_FLYWHEEL_CONTRACT_PASS');
