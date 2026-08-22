import type { VideoData, FilterState } from '../types';
import { getActiveGeminiApiKey } from './localApiKeyService';

export interface GeminiLearningResult {
  model: string;
  summary: string;
  titlePatterns: string[];
  performanceSignals: string[];
  keywordFamilies: string[];
  scriptFeatures: Array<{ slot: number; angle: string; hook: string; structure: string; evidence: string }>;
  seedCandidate: {
    topic: string;
    rules: string[];
    cautions: string[];
  };
  raw?: unknown;
}

const MODEL_CANDIDATES = [
  'gemini-3.1-pro-preview',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
];

const extractText = (body: any) => body?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') || '';

const safeParseJson = (text: string) => {
  const cleaned = String(text || '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
};

export async function runGeminiLearningAnalysis(
  query: string,
  videos: VideoData[],
  filters: FilterState,
): Promise<GeminiLearningResult | null> {
  const apiKey = String(getActiveGeminiApiKey() || '').trim();
  if (!apiKey || videos.length === 0) return null;

  const sample = videos.slice(0, Math.min(videos.length, 30)).map((video, index) => ({
    rank: index + 1,
    id: video.id,
    title: video.title,
    channel: video.channelTitle,
    publishedAt: video.publishedAt,
    views: video.viewCount,
    likes: video.likeCount,
    comments: video.commentCount,
    subscribers: video.subscribers,
    engagementRate: Number(video.engagementRate || 0),
    durationMinutes: Number(video.durationMinutes || 0),
  }));

  const prompt = `You are the learning analyzer inside Content OS. Analyze ONLY the supplied YouTube Data API metadata. Do not claim that you watched the videos.\n\nSearch query: ${query}\nFilters: ${JSON.stringify(filters)}\nVideo sample: ${JSON.stringify(sample)}\n\nReturn JSON only with this exact structure:\n{\n  "summary":"...",\n  "titlePatterns":["..."],\n  "performanceSignals":["..."],\n  "keywordFamilies":["..."],\n  "scriptFeatures":[\n    {"slot":1,"angle":"...","hook":"...","structure":"...","evidence":"..."},\n    {"slot":2,"angle":"...","hook":"...","structure":"...","evidence":"..."},\n    {"slot":3,"angle":"...","hook":"...","structure":"...","evidence":"..."},\n    {"slot":4,"angle":"...","hook":"...","structure":"...","evidence":"..."}\n  ],\n  "seedCandidate":{"topic":"...","rules":["..."],"cautions":["..."]}\n}\n\nPrioritize patterns supported by multiple rows or by strong performance differences. Distinguish observation from hypothesis.`;

  let lastError: unknown = null;
  for (const model of MODEL_CANDIDATES) {
    try {
      const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
      url.searchParams.set('key', apiKey);
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastError = new Error(body?.error?.message || `Gemini HTTP ${response.status}`);
        if (response.status === 404 || response.status === 400) continue;
        throw lastError;
      }
      const text = extractText(body);
      if (!text) throw new Error('Gemini returned an empty learning result.');
      const parsed = safeParseJson(text);
      return {
        model,
        summary: String(parsed.summary || ''),
        titlePatterns: Array.isArray(parsed.titlePatterns) ? parsed.titlePatterns : [],
        performanceSignals: Array.isArray(parsed.performanceSignals) ? parsed.performanceSignals : [],
        keywordFamilies: Array.isArray(parsed.keywordFamilies) ? parsed.keywordFamilies : [],
        scriptFeatures: Array.isArray(parsed.scriptFeatures) ? parsed.scriptFeatures.slice(0, 4) : [],
        seedCandidate: parsed.seedCandidate || { topic: query, rules: [], cautions: [] },
        raw: parsed,
      };
    } catch (error) {
      lastError = error;
    }
  }

  console.warn('[GeminiLearning] all model candidates failed:', lastError);
  return null;
}
