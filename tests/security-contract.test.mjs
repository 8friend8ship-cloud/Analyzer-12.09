import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('production administrator cannot be asserted by local form aliases', async () => {
  const [app, policy] = await Promise.all([read('App.tsx'), read('services/authPolicy.ts')]);
  assert.doesNotMatch(app, /email\s*===\s*['"]admin['"]/);
  assert.doesNotMatch(app, /email\s*===\s*['"]master['"]/);
  assert.doesNotMatch(app, /8friend8ship@hanmail\.net/);
  assert.match(app, /const isAdmin = false;/);
  assert.match(policy, /homedesigntaedi@gmail\.com/);
  assert.match(policy, /normalizeEmail/);
});

test('stored source contract is bounded and missing metrics are explicit', async () => {
  const [contract, types, table] = await Promise.all([
    read('services/dataContractService.ts'), read('types.ts'), read('components/ResultsTable.tsx')
  ]);
  assert.match(contract, /MAX_STORED_SOURCE_ROWS = 200/);
  assert.match(contract, /Math\.min\(Math\.trunc\(limit\), MAX_STORED_SOURCE_ROWS\)/);
  assert.doesNotMatch(contract, /getDataRange/);
  assert.doesNotMatch(contract, /['\"]View_Count['\"]/);
  assert.match(types, /viewCountStatus\?: 'verified' \| 'unavailable'/);
  assert.match(table, /데이터 없음/);
});

test('browser AI secret exposure remains blocked by this gate until centralized', async () => {
  const app = await read('App.tsx');
  assert.doesNotMatch(app, /ADMIN_EMAIL\s*=\s*['"]8friend8ship@hanmail\.net/);
});


test('browser AI secrets and fabricated analytics are fail-closed', async () => {
  const [app, keyService, youtubeService] = await Promise.all([
    read('App.tsx'), read('services/apiKeyService.ts'), read('services/youtubeService.ts')
  ]);
  assert.doesNotMatch(app, /VITE_(GEMINI|YOUTUBE)/);
  assert.doesNotMatch(keyService, /VITE_GEMINI_API_KEY/);
  assert.doesNotMatch(youtubeService, /VITE_YOUTUBE_API_KEY/);
  assert.match(keyService, /BROWSER_AI_DISABLED/);
  const analyticsBlock = youtubeService.slice(
    youtubeService.indexOf('export const fetchMyChannelAnalytics ='),
    youtubeService.indexOf('export const fetchBenchmarkComparison =')
  );
  assert.doesNotMatch(analyticsBlock, /Math\\.random/);
  assert.match(analyticsBlock, /VERIFIED_ANALYTICS_UNAVAILABLE/);
  assert.match(analyticsBlock, /OAuth-backed YouTube Analytics data is required/);
});


test('provider SDK and all synthetic customer metrics are absent from browser code', async () => {
  const [pkg, geminiService, youtubeService, chatbot] = await Promise.all([
    read('package.json'), read('services/geminiService.ts'), read('services/youtubeService.ts'), read('components/Chatbot.tsx')
  ]);
  for (const source of [pkg, geminiService, youtubeService, chatbot]) {
    assert.doesNotMatch(source, /@google\/genai|GoogleGenAI/);
  }
  assert.doesNotMatch(youtubeService, /Math\.random/);
  assert.match(youtubeService, /VERIFIED_SIMILARITY_UNAVAILABLE/);
  assert.match(youtubeService, /VERIFIED_BENCHMARK_UNAVAILABLE/);
  assert.match(geminiService, /BrowserAiDisabledError/);
});

test('stored-source network adapter is bounded, fresh, credential-free, and fail-closed', async () => {
  const contract = await read('services/dataContractService.ts');
  assert.match(contract, /MAX_STORED_SOURCE_BYTES = 512 \* 1024/);
  assert.match(contract, /MAX_STORED_SOURCE_AGE_MS = 48/);
  assert.match(contract, /STORED_SOURCE_TIMEOUT_MS = 8_000/);
  assert.match(contract, /credentials: 'omit'/);
  assert.match(contract, /cache: 'no-store'/);
  assert.match(contract, /application\/json/);
  assert.match(contract, /sourceId/);
  assert.match(contract, /sourceUpdatedAt/);
});
