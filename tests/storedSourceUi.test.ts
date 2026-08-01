import assert from 'node:assert/strict';
import test from 'node:test';
import { filterStoredVideos, fetchStoredSource, normalizeStoredSourceRows } from '../services/dataContractService';
import type { FilterState } from '../types';

const filters: FilterState = {
  minViews: 100,
  videoLength: 'any',
  videoFormat: 'any',
  period: '30',
  sortBy: 'viewCount',
  resultsLimit: 2,
  country: 'KR',
  category: 'all',
};

const rows = normalizeStoredSourceRows([
  { videoId: 'v1', title: '캠핑 입문', channelTitle: '야외생활', publishedAt: '2026-07-31T00:00:00Z', viewCount: 500, likeCount: 50, commentCount: 5, durationMinutes: 10, channelCountry: 'KR' },
  { videoId: 'v2', title: '캠핑 장비', channelTitle: '도구', publishedAt: '2026-07-30T00:00:00Z', viewCount: 300, durationMinutes: 0.5, channelCountry: 'KR' },
  { videoId: 'v3', title: 'Camping', channelTitle: 'Global', publishedAt: '2026-07-30T00:00:00Z', viewCount: 900, durationMinutes: 5, channelCountry: 'US' },
  { videoId: 'v4', title: '캠핑 미확인지표', channelTitle: '자료', publishedAt: '2026-07-30T00:00:00Z', durationMinutes: 5, channelCountry: 'KR' },
]);

test('filters verified stored rows by query, country, freshness and minimum views', () => {
  assert.deepEqual(
    filterStoredVideos(rows, '캠핑', filters, Date.parse('2026-08-01T00:00:00Z')).map((row) => row.id),
    ['v1', 'v2'],
  );
});

test('does not treat unavailable views as a verified zero', () => {
  const result = filterStoredVideos(rows, '미확인지표', filters, Date.parse('2026-08-01T00:00:00Z'));
  assert.equal(result.length, 0);
  assert.equal(rows.find((row) => row.id === 'v4')?.viewCountStatus, 'unavailable');
});

test('applies shorts and result-limit bounds', () => {
  const result = filterStoredVideos(rows, '캠핑', { ...filters, videoFormat: 'shorts', resultsLimit: 1 }, Date.parse('2026-08-01T00:00:00Z'));
  assert.deepEqual(result.map((row) => row.id), ['v2']);
});

test('rejects a missing stored-source configuration', async () => {
  await assert.rejects(() => fetchStoredSource({ url: '' }), /STORED_SOURCE_CONFIG_MISSING/);
});

test('fetches evidence-bearing JSON without browser credentials', async () => {
  let credentials: RequestCredentials | undefined;
  const result = await fetchStoredSource({
    url: 'https://example.test/research.json',
    nowMs: Date.parse('2026-08-01T00:00:00Z'),
    fetchImpl: async (_input, init) => {
      credentials = init?.credentials;
      return new Response(JSON.stringify({
        sourceId: 'SRC_TEST_001',
        sourceUpdatedAt: '2026-07-31T00:00:00Z',
        rows: [{ videoId: 'v1', title: '캠핑', viewCount: 1 }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  assert.equal(credentials, 'omit');
  assert.equal(result.sourceId, 'SRC_TEST_001');
  assert.equal(result.rows.length, 1);
});
