import {
  assertBridgeSecret,
  forwardToCentralHub,
  normalizePinterestRecord,
  resolvePinterestUrl
} from "./_core.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  try {
    assertBridgeSecret(req.headers || {});
    const body = req.body || {};
    const sourceUrl = String(body.sourceUrl || body.link || "").trim();
    const resolution = await resolvePinterestUrl(sourceUrl);
    const record = normalizePinterestRecord({
      ...body,
      canonicalUrl: resolution.canonicalUrl,
      pinId: body.pinId || body.id || resolution.pinId
    });
    const forward = await forwardToCentralHub(record);
    return res.status(200).json({
      ok: true,
      record,
      forward,
      resolution: {
        canonicalUrl: resolution.canonicalUrl,
        pinId: resolution.pinId,
        usedShortlinkResolver: resolution.usedShortlinkResolver,
        redirectStatus: resolution.redirectStatus
      }
    });
  } catch (error: any) {
    const message = error?.message || "INGEST_FAILED";
    const status = message === "UNAUTHORIZED"
      ? 401
      : message.startsWith("PINTEREST_SHORTLINK_RESOLVE_")
        ? 502
        : 400;
    return res.status(status).json({ ok: false, error: message });
  }
}
