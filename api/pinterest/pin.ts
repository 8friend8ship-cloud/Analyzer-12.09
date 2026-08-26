import { assertBridgeSecret, forwardToCentralHub, normalizePinterestRecord } from "./_core.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  try {
    assertBridgeSecret(req.headers || {});
    const pinId = String(req.query?.pinId || req.body?.pinId || "").trim();
    if (!/^\d+$/.test(pinId)) return res.status(400).json({ ok: false, error: "VALID_PIN_ID_REQUIRED" });
    const token = process.env.PINTEREST_ACCESS_TOKEN;
    if (!token) return res.status(503).json({ ok: false, error: "PINTEREST_ACCESS_TOKEN_NOT_CONFIGURED" });

    const response = await fetch(`https://api.pinterest.com/v5/pins/${encodeURIComponent(pinId)}`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" }
    });
    const payload = await response.json();
    if (!response.ok) return res.status(response.status).json({ ok: false, error: "PINTEREST_API_ERROR", detail: payload });

    const record = normalizePinterestRecord({
      ...payload,
      pinId: payload.id || pinId,
      sourceUrl: payload.link || `https://www.pinterest.com/pin/${pinId}/`,
      mediaUrl: payload.media?.images?.["1200x"]?.url || payload.media?.images?.originals?.url || "",
      rights: "OWNED",
      publishStatus: "PUBLISHED"
    });
    const forward = await forwardToCentralHub(record);
    return res.status(200).json({ ok: true, record, forward });
  } catch (error: any) {
    const message = error?.message || "PIN_FETCH_FAILED";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return res.status(status).json({ ok: false, error: message });
  }
}
