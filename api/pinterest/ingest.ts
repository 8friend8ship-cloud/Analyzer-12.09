import { assertBridgeSecret, forwardToCentralHub, normalizePinterestRecord } from "./_core.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  try {
    assertBridgeSecret(req.headers || {});
    const record = normalizePinterestRecord(req.body || {});
    const forward = await forwardToCentralHub(record);
    return res.status(200).json({ ok: true, record, forward });
  } catch (error: any) {
    const message = error?.message || "INGEST_FAILED";
    const status = message === "UNAUTHORIZED" ? 401 : 400;
    return res.status(status).json({ ok: false, error: message });
  }
}
