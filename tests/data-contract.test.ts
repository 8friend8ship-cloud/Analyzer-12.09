import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchStoredSource,
  MAX_STORED_SOURCE_ROWS,
  normalizeStoredSourceRows,
  validateStoredSourceEnvelope,
} from '../services/dataContractService.ts';

const now = Date.parse('2026-08-01T09:00:00.000Z');
const row = { videoId: 'v1', title: 'Verified result', viewCount: 0, channelTitle: 'Channel' };
const envelope = { sourceId: 'SRC_ANALYZER_TEST', sourceUpdatedAt: '2026-08-01T08:00:00.000Z', rows: [row] };

test('normalizes verified zero separately from unavailable metrics', () => {
  const [verified] = normalizeStoredSourceRows([row]);
  const [missing] = normalizeStoredSourceRows([{ videoId: 'v2', title: 'Missing views' }]);
  assert.equal(verified.viewCountStatus, 'verified');
  assert.equal(verified.viewCount, 0);
  assert.equal(missing.viewCountStatus, 'unavailable');
});

test('rejects invalid rows and duplicate identifiers', () => {
  const rows = normalizeStoredSourceRows([row, row, { videoId: '', title: 'bad' }, { videoId: 'v3' }]);
  assert.deepEqual(rows.map(item => item.id), ['v1']);
});

test('enforces the 200 row contract', () => {
  const rows = Array.from({ length: MAX_STORED_SOURCE_ROWS + 1 }, (_, index) => ({ videoId: `v${index}`, title: 'x' }));
  assert.throws(() => validateStoredSourceEnvelope({ ...envelope, rows }, now), /at most 200 rows/);
});

test('rejects stale and future source timestamps', () => {
  assert.throws(() => validateStoredSourceEnvelope({ ...envelope, sourceUpdatedAt: '2026-07-29T08:00:00.000Z' }, now), /older than 48 hours/);
  assert.throws(() => validateStoredSourceEnvelope({ ...envelope, sourceUpdatedAt: '2026-08-01T10:00:00.000Z' }, now), /in the future/);
});

test('requires a source identifier and rows array', () => {
  assert.throws(() => validateStoredSourceEnvelope({ ...envelope, sourceId: '' }, now), /sourceId is required/);
  assert.throws(() => validateStoredSourceEnvelope({ ...envelope, rows: null }, now), /rows must be an array/);
});

test('fetches JSON with credentials omitted and preserves evidence metadata', async () => {
  let requestInit: RequestInit | undefined;
  const result = await fetchStoredSource({
    url: 'https://example.test/stored-source',
    nowMs: now,
    fetchImpl: async (_input, init) => {
      requestInit = init;
      return new Response(JSON.stringify(envelope), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  assert.equal(requestInit?.credentials, 'omit');
  assert.equal(requestInit?.cache, 'no-store');
  assert.equal(result.sourceId, envelope.sourceId);
  assert.equal(result.rows[0].id, 'v1');
});

test('rejects non-HTTPS and credential-bearing URLs', async () => {
  await assert.rejects(fetchStoredSource({ url: 'http://example.test/data' }), /credential-free HTTPS/);
  await assert.rejects(fetchStoredSource({ url: 'https://user:pass@example.test/data' }), /credential-free HTTPS/);
});

test('rejects non-JSON and malformed JSON responses', async () => {
  await assert.rejects(fetchStoredSource({ url: 'https://example.test/data', fetchImpl: async () => new Response('{}', { headers: { 'content-type': 'text/plain' } }) }), /application\/json/);
  await assert.rejects(fetchStoredSource({ url: 'https://example.test/data', fetchImpl: async () => new Response('{', { headers: { 'content-type': 'application/json' } }) }), /not valid JSON/);
});

test('rejects oversized responses before parsing', async () => {
  await assert.rejects(fetchStoredSource({
    url: 'https://example.test/data',
    fetchImpl: async () => new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': '600000' } }),
  }), /exceeds 512 KiB/);
});

test('rejects HTTP failures without treating them as empty data', async () => {
  await assert.rejects(fetchStoredSource({
    url: 'https://example.test/data',
    fetchImpl: async () => new Response('down', { status: 503, headers: { 'content-type': 'application/json' } }),
  }), /503/);
});
