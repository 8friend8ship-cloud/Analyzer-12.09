import { assertBridgeSecret, resolvePinterestUrl } from "./_core.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }
  try {
    assertBridgeSecret(req.headers || {});
    const sourceUrl = String(
      req.query?.url ||
      req.query?.sourceUrl ||
      req.body?.url ||
      req.body?.sourceUrl ||
      ""
    ).trim();
    const resolution = await resolvePinterestUrl(sourceUrl);
    return res.status(200).json({ ok: true, resolution });
  } catch (error: any) {
    const message = error?.message || "PINTEREST_RESOLVE_FAILED";
    const status = message === "UNAUTHORIZED"
      ? 401
      : message.startsWith("PINTEREST_SHORTLINK_RESOLVE_")
        ? 502
        : 400;
    return res.status(status).json({ ok: false, error: message });
  }
}
