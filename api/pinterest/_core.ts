const PINTEREST_HOSTS = new Set(["pinterest.com", "www.pinterest.com", "pin.it"]);

export type PinterestRecord = {
  platform: "PINTEREST";
  pinId: string;
  sourceUrl: string;
  canonicalUrl: string;
  mediaUrl: string;
  title: string;
  description: string;
  boardId: string;
  boardName: string;
  keywords: string[];
  rights: "OWNED" | "REFERENCE_ONLY";
  usageProjects: string[];
  publishStatus: "REFERENCE" | "DRAFT" | "PUBLISHED";
  pipelineStage: "RAW" | "SEED_CANDIDATE" | "QUEENS_CANDIDATE";
  dedupeKey: string;
  collectedAt: string;
};

export function canonicalizePinterestUrl(input: string): string {
  const url = new URL(input);
  const host = url.hostname.toLowerCase();
  if (!PINTEREST_HOSTS.has(host)) throw new Error("UNSUPPORTED_PINTEREST_HOST");
  url.protocol = "https:";
  url.hash = "";
  url.search = "";
  url.hostname = host === "pin.it" ? "pin.it" : "www.pinterest.com";
  url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  return url.toString();
}

export function scorePipeline(record: Pick<PinterestRecord, "title" | "description" | "keywords" | "rights">) {
  const text = [record.title, record.description, ...record.keywords].join(" ").toLowerCase();
  let score = record.rights === "OWNED" ? 3 : 0;
  if (record.description.length >= 120) score += 1;
  if (record.keywords.length >= 8) score += 1;
  ["trend", "analysis", "research", "guide", "case", "benchmark", "트렌드", "분석", "가이드", "사례"]
    .forEach(word => { if (text.includes(word)) score += 1; });
  return score >= 5 ? "QUEENS_CANDIDATE" : score >= 3 ? "SEED_CANDIDATE" : "RAW";
}

export function normalizePinterestRecord(body: any): PinterestRecord {
  const sourceUrl = String(body.sourceUrl || body.link || "").trim();
  if (!sourceUrl) throw new Error("SOURCE_URL_REQUIRED");
  const canonicalUrl = canonicalizePinterestUrl(sourceUrl);
  const pinId = String(body.pinId || body.id || canonicalUrl.match(/\/pin\/(\d+)/)?.[1] || "").trim();
  const keywords = Array.from(new Set(
    (Array.isArray(body.keywords) ? body.keywords : String(body.keywords || "").split(","))
      .map((x: unknown) => String(x).trim().toLowerCase()).filter(Boolean)
  )).slice(0, 30);
  const rights = body.rights === "OWNED" ? "OWNED" : "REFERENCE_ONLY";
  const base = {
    platform: "PINTEREST" as const,
    pinId,
    sourceUrl,
    canonicalUrl,
    mediaUrl: String(body.mediaUrl || body.media?.images?.originals?.url || ""),
    title: String(body.title || "").trim().slice(0, 500),
    description: String(body.description || "").trim().slice(0, 5000),
    boardId: String(body.boardId || body.board_id || ""),
    boardName: String(body.boardName || ""),
    keywords,
    rights,
    usageProjects: (Array.isArray(body.usageProjects) ? body.usageProjects : ["COMMON"]).map(String),
    publishStatus: (body.publishStatus === "PUBLISHED" || body.publishStatus === "DRAFT") ? body.publishStatus : "REFERENCE" as const,
    dedupeKey: `PINTEREST:${pinId || canonicalUrl}`,
    collectedAt: new Date().toISOString()
  };
  return { ...base, pipelineStage: scorePipeline(base) };
}

export function assertBridgeSecret(headers: Record<string, any>) {
  const configured = process.env.PINTEREST_BRIDGE_SECRET;
  if (!configured) return;
  const supplied = String(headers["x-pinterest-bridge-secret"] || "");
  if (supplied !== configured) throw new Error("UNAUTHORIZED");
}

export async function forwardToCentralHub(record: PinterestRecord) {
  const endpoint = process.env.CONTENT_OS_PINTEREST_INGEST_URL;
  if (!endpoint) return { forwarded: false, reason: "CENTRAL_HUB_URL_NOT_CONFIGURED" };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "x-bridge-source": "PINTEREST" },
    body: JSON.stringify(record)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`CENTRAL_HUB_${response.status}:${text.slice(0, 300)}`);
  return { forwarded: true, status: response.status };
}
