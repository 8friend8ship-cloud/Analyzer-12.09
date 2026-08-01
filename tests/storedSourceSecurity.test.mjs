import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboard = readFileSync(new URL('../components/Dashboard.tsx', import.meta.url), 'utf8');
const youtube = readFileSync(new URL('../services/youtubeService.ts', import.meta.url), 'utf8');
const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

test('primary search uses the verified stored-source adapter', () => {
  assert.match(dashboard, /fetchStoredSource/);
  assert.match(dashboard, /filterStoredVideos/);
  assert.doesNotMatch(dashboard, /fetchYouTubeData|fetchChannelSearchData/);
});

test('browser YouTube transport cannot append or send an API key', () => {
  assert.match(youtube, /BROWSER_YOUTUBE_DISABLED/);
  assert.doesNotMatch(youtube, /googleapis\.com\/youtube|searchParams\.append\(['"]key/);
  assert.doesNotMatch(youtube, /fetch\(url\.toString\(\)\)/);
});

test('Vite does not inject Gemini credentials into the browser bundle', () => {
  assert.doesNotMatch(vite, /GEMINI_API_KEY|process\.env\.API_KEY|loadEnv/);
});

test('customer-facing copy does not claim live provider or AI connectivity', () => {
  assert.doesNotMatch(dashboard, /Live API Connected|official YouTube Data API|real-time data from YouTube|Gemini AI provides/);
  assert.match(dashboard, /Verified Stored Source/);
});
