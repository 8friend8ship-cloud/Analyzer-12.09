// YouTube Seed Bridge v1 — generated 2026-09-03
// Cache-first contract shared by ContentOS / Analyzer / Interior.
// This client never exposes a YouTube API key in the browser.

export type YouTubeSeedCard = {
  appId: "APP_ANALYZER";
  videoId: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  durationIso8601: string | null;
  descriptionBrief: string;
  videoBrief: string;
  keyPoints: string[];
  chapters: Array<{ start: string; title: string }>;
  scriptSource: "description" | "timestamps" | "accessible_captions" | "none";
  evidenceStatus: "VERIFIED_METADATA" | "PARTIAL_SCRIPT" | "NO_SCRIPT";
  lastSync: string;
};

export type YouTubeSeedResponse = {
  contractVersion: "YOUTUBE_SEED_BRIDGE_V1";
  source: "SHEET_CACHE" | "SERVER_API_GAP_FILL";
  quotaUnits: number;
  items: YouTubeSeedCard[];
  nextPageToken?: string;
};

export async function fetchYouTubeSeeds(params: {
  query?: string;
  sheetAddress?: string;
  videoIds?: string[];
  limit?: 20 | 50 | 100;
  signal?: AbortSignal;
}): Promise<YouTubeSeedResponse> {
  const search = new URLSearchParams();
  search.set("appId", "APP_ANALYZER");
  if (params.query) search.set("query", params.query);
  if (params.sheetAddress) search.set("sheetAddress", params.sheetAddress);
  if (params.videoIds?.length) search.set("videoIds", params.videoIds.join(","));
  search.set("limit", String(params.limit ?? 20));

  const response = await fetch(`/api/youtube-seeds?${search.toString()}`, {
    signal: params.signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`YOUTUBE_SEED_BRIDGE_HTTP_${response.status}`);
  const payload = (await response.json()) as YouTubeSeedResponse;
  if (payload.contractVersion !== "YOUTUBE_SEED_BRIDGE_V1") {
    throw new Error("YOUTUBE_SEED_CONTRACT_MISMATCH");
  }
  return payload;
}

export function youtubeVideoHref(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export function youtubeThumbnailHref(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}
