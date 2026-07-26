import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const app = read('App.tsx');
const dashboard = read('components/MvpStoredDataDashboard.tsx');
const service = read('services/contentOsDataService.ts');
const gas = read('apps-script/ContentOsStoredDataApi.gs');

assert.match(app, /MvpStoredDataDashboard/);
assert.match(app, /homedesigntaedi@gmail\.com/);
assert.match(app, /8friend8ship@hanmail\.net/);
assert.match(app, /CANONICAL_LOGIN_ALIASES/);
assert.match(app, /normalizeEmail/);
assert.doesNotMatch(app, /VITE_YOUTUBE_API_KEY|VITE_GEMINI_API_KEY|setSystemGeminiApiKey/);

for (const [name, source] of Object.entries({ app, dashboard, service })) {
  assert.doesNotMatch(
    source,
    /www\.googleapis\.com\/youtube\/v3|generativelanguage\.googleapis\.com|new\s+GoogleGenAI|initializeApp\s*\(/,
    `${name} must not call paid/direct browser APIs`
  );
}

assert.match(service, /VITE_CONTENT_OS_DATA_URL/);
assert.match(service, /action', 'health'/);
assert.match(service, /searchVideos/);
assert.match(service, /searchChannels/);

assert.match(gas, /CONTENT_OS_SPREADSHEET_ID/);
assert.match(gas, /1o6Me_qcdrSEVNvufjD_EQWVGvxvGKR_9ZYWSSYMclgQ/);
assert.match(gas, /Video_Index/);
assert.match(gas, /searchVideos_/);
assert.match(gas, /searchChannels_/);
assert.doesNotMatch(gas, /UrlFetchApp|YouTube\.Videos|GenerativeLanguage|Gemini/);

console.log('MVP contract checks passed.');
