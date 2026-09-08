import { assertBridgeSecret, forwardToCentralHub, normalizePinterestRecord } from "./_core.js";

function pickMediaUrl(payload: any): string {
  const images = payload?.media?.images || {};
  return String(
    images?.["1200x"]?.url ||
    images?.["600x"]?.url ||
    images?.["400x300"]?.url ||
    images?.["150x150"]?.url ||
    ""
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  try {
    assertBridgeSecret(req.headers || {});
    const pinId = String(req.query?.pinId || req.body?.pinId || "").trim();
    if (!/^\d+$/.test(pinId)) return res.status(400).json({ ok: false, error: "VALID_PIN_ID_REQUIRED" });
    const token = process.env.PINTEREST_ACCESS_TOKEN;
    if (!token) return res.status(503).json({ ok: false, hold: true, error: "PINTEREST_ACCESS_TOKEN_NOT_CONFIGURED" });

    const response = await fetch(`https://api.pinterest.com/v5/pins/${encodeURIComponent(pinId)}`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" }
    });
    const payload = await response.json();
    if (!response.ok) return res.status(response.status).json({ ok: false, error: "PINTEREST_API_ERROR", detail: payload });

    const canonicalPinUrl = `https://www.pinterest.com/pin/${String(payload?.id || pinId)}`;
    const record = normalizePinterestRecord({
      ...payload,
      pinId: payload?.id || pinId,
      sourceUrl: canonicalPinUrl,
      canonicalUrl: canonicalPinUrl,
      mediaUrl: pickMediaUrl(payload),
      boardId: payload?.board_id || "",
      boardName: "",
      rights: "REFERENCE_ONLY",
      publishStatus: "REFERENCE"
    });
    const forward = await forwardToCentralHub(record);
    return res.status(200).json({
      ok: true,
      record,
      sourceDate: String(payload?.created_at || ""),
      creativeType: String(payload?.creative_type || ""),
      boardId: String(payload?.board_id || ""),
      destinationLink: String(payload?.link || ""),
      forward
    });
  } catch (error: any) {
    const message = error?.message || "PIN_FETCH_FAILED";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return res.status(status).json({ ok: false, error: message });
  }
}
