import { canonicalizePinterestUrl, normalizePinterestRecord } from "./_core.js";

export default async function handler(_req: any, res: any) {
  try {
    const canonical = canonicalizePinterestUrl("https://www.pinterest.com/pin/123/?utm_source=test#x");
    const sample = normalizePinterestRecord({
      sourceUrl: "https://www.pinterest.com/pin/123/",
      title: "Pinterest bridge self test",
      keywords: ["interior", "design"],
      rights: "REFERENCE_ONLY"
    });
    const checks = {
      canonicalization: canonical === "https://www.pinterest.com/pin/123",
      dedupe: sample.dedupeKey === "PINTEREST:123",
      rightsGuard: sample.rights === "REFERENCE_ONLY",
      pipeline: ["RAW", "SEED_CANDIDATE", "QUEENS_CANDIDATE"].includes(sample.pipelineStage)
    };
    const ok = Object.values(checks).every(Boolean);
    res.status(ok ? 200 : 500).json({
      ok,
      bridge: "PINTEREST_CONTENT_HUB",
      version: "1.0.1",
      mode: process.env.PINTEREST_ACCESS_TOKEN ? "API_READY" : "METADATA_ONLY",
      centralHub: process.env.CONTENT_OS_PINTEREST_INGEST_URL ? "CONFIGURED" : "NOT_CONFIGURED",
      checks
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message || "HEALTH_CHECK_FAILED" });
  }
}
