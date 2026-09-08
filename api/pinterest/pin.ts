import { assertBridgeSecret, forwardToCentralHub, normalizePinterestRecord } from "./_core.js";

function clampPageSize(value: unknown): number {
  const n = Number(value || 250);
  if (!Number.isFinite(n)) return 250;
  return Math.max(1, Math.min(250, Math.floor(n)));
}

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

async function listPins(req: any, res: any, token: string) {
  const pageSize = clampPageSize(req.query?.page_size);
  const bookmark = String(req.query?.bookmark || "").trim();
  const pinMetrics = String(req.query?.pin_metrics || "false").toLowerCase() === "true";
  const params = new URLSearchParams({ page_size: String(pageSize) });
  if (bookmark) params.set("bookmark", bookmark);
  if (pinMetrics) params.set("pin_metrics", "true");

  const response = await fetch(`https://api.pinterest.com/v5/pins?${params.toString()}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" }
  });
  const payload = await response.json();
  if (!response.ok) return res.status(response.status).json({ ok: false, error: "PINTEREST_API_ERROR", detail: payload });

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const normalized = items.map((item: any) => {
    const pinId = String(item?.id || "").trim();
    const sourceUrl = pinId ? `https://www.pinterest.com/pin/${pinId}` : "";
    const record = normalizePinterestRecord({
      ...item,
      pinId,
      sourceUrl,
      canonicalUrl: sourceUrl,
      mediaUrl: pickMediaUrl(item),
      boardId: item?.board_id || "",
      boardName: "",
      rights: "REFERENCE_ONLY",
      publishStatus: "REFERENCE"
    });
    return {
      record,
      sourceDate: String(item?.created_at || ""),
      creativeType: String(item?.creative_type || ""),
      boardId: String(item?.board_id || ""),
      boardOwnerUsername: String(item?.board_owner?.username || ""),
      parentPinId: String(item?.parent_pin_id || ""),
      isOwner: Boolean(item?.is_owner),
      pinMetrics: item?.pin_metrics || null
    };
  });

  return res.status(200).json({
    ok: true,
    mode: "ACCOUNT_WIDE_PIN_SUPPLIER",
    pageSize,
    itemCount: normalized.length,
    bookmarkUsed: bookmark || null,
    nextBookmark: payload?.bookmark || null,
    done: !payload?.bookmark,
    rightsDefault: "REFERENCE_ONLY",
    items: normalized
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  try {
    assertBridgeSecret(req.headers || {});
    const token = process.env.PINTEREST_ACCESS_TOKEN;
    const mode = String(req.query?.mode || req.body?.mode || "").trim().toLowerCase();
    if (!token) {
      return res.status(503).json({
        ok: false,
        hold: true,
        error: "PINTEREST_ACCESS_TOKEN_NOT_CONFIGURED",
        mode: "METADATA_ONLY",
        next: "WAIT_EXISTING_PINTEREST_API_APPROVAL_OR_TOKEN_BIND"
      });
    }

    if (mode === "list") {
      if (req.method !== "GET") return res.status(405).json({ ok: false, error: "LIST_MODE_GET_ONLY" });
      return listPins(req, res, token);
    }

    const pinId = String(req.query?.pinId || req.body?.pinId || "").trim();
    if (!/^\d+$/.test(pinId)) return res.status(400).json({ ok: false, error: "VALID_PIN_ID_OR_LIST_MODE_REQUIRED" });

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
