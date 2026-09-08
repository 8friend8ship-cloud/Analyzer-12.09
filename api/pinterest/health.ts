import {
  canonicalizePinterestUrl,
  normalizePinterestRecord,
  resolvePinterestUrl
} from "./_core.js";

export default async function handler(req: any, res: any) {
  try {
    const canonical = canonicalizePinterestUrl("https://www.pinterest.com/pin/123/?utm_source=test#x");
    const regional = canonicalizePinterestUrl("https://kr.pinterest.com/pin/456/?utm_source=test");
    const sample = normalizePinterestRecord({
      sourceUrl: "https://pin.it/TestABC",
      canonicalUrl: "https://www.pinterest.com/pin/987654321/",
      title: "Pinterest bridge self test",
      keywords: ["interior", "design"],
      rights: "REFERENCE_ONLY"
    });
    const mockFetch = async () => ({
      status: 302,
      headers: {
        get: (name: string) => name.toLowerCase() === "location"
          ? "https://www.pinterest.co.kr/pin/987654321/sent/?invite_code=test"
          : null
      }
    }) as any;
    const short = await resolvePinterestUrl("https://pin.it/TestABC", mockFetch as any);

    const checks = {
      canonicalization: canonical === "https://www.pinterest.com/pin/123",
      regionalCanonicalization: regional === "https://www.pinterest.com/pin/456",
      shortlinkResolution: short.canonicalUrl === "https://www.pinterest.com/pin/987654321",
      shortlinkPinId: short.pinId === "987654321",
      dedupe: sample.dedupeKey === "PINTEREST:987654321",
      rightsGuard: sample.rights === "REFERENCE_ONLY",
      pipeline: ["RAW", "SEED_CANDIDATE", "QUEENS_CANDIDATE"].includes(sample.pipelineStage)
    };
    const ok = Object.values(checks).every(Boolean);
    const resolveUrl = String(req.query?.resolveUrl || "").trim();
    const liveResolution = resolveUrl ? await resolvePinterestUrl(resolveUrl) : null;
    const apiReady = Boolean(process.env.PINTEREST_ACCESS_TOKEN);
    const hubReady = Boolean(process.env.CONTENT_OS_PINTEREST_INGEST_URL);

    res.status(ok ? 200 : 500).json({
      ok,
      bridge: "PINTEREST_CONTENT_HUB",
      version: "1.2.1",
      mode: apiReady ? "API_READY" : "METADATA_ONLY",
      centralHub: hubReady ? "CONFIGURED" : "NOT_CONFIGURED",
      accountWideSupplier: {
        endpoint: "/api/pinterest/pin?mode=list",
        ready: apiReady,
        pageSizeMax: 250,
        pagination: "BOOKMARK",
        rightsDefault: "REFERENCE_ONLY",
        hobbySafe: "REUSES_EXISTING_PIN_FUNCTION",
        activation: apiReady ? "READY" : "WAIT_EXISTING_PINTEREST_API_APPROVAL_OR_TOKEN_BIND"
      },
      shortlinkResolver: "PIN_IT_TO_API_REDIRECT_TO_CANONICAL_PIN",
      liveResolution,
      checks
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message || "HEALTH_CHECK_FAILED" });
  }
}
