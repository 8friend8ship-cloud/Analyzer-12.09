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

function rateHeaders(response: Response) {
  return {
    limit: response.headers.get("x-ratelimit-limit"),
    remaining: response.headers.get("x-ratelimit-remaining"),
    reset: response.headers.get("x-ratelimit-reset")
  };
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
  if (!response.ok) return res.status(response.status).json({ ok: false, error: "PINTEREST_API_ERROR", detail: payload, rate: rateHeaders(response) });

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
    rate: rateHeaders(response),
    items: normalized
  });
}

async function createPin(req: any, res: any, token?: string) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "CREATE_MODE_POST_ONLY" });

  const body = req.body || {};
  const dryRun = body.dry_run !== false;
  const boardId = String(body.board_id || "").trim();
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const link = String(body.link || "").trim();
  const sourceType = String(body?.media_source?.source_type || "").trim();

  if (!boardId) return res.status(400).json({ ok: false, error: "BOARD_ID_REQUIRED" });
  if (!["image_url", "video_id"].includes(sourceType)) return res.status(400).json({ ok: false, error: "UNSUPPORTED_MEDIA_SOURCE" });

  const pinPayload: any = { board_id: boardId, title, description, media_source: body.media_source };
  if (link) pinPayload.link = link;

  if (sourceType === "image_url") {
    const url = String(body?.media_source?.url || "").trim();
    if (!/^https:\/\//i.test(url)) return res.status(400).json({ ok: false, error: "PUBLIC_HTTPS_IMAGE_URL_REQUIRED" });
    pinPayload.media_source = { source_type: "image_url", url, is_standard: body?.media_source?.is_standard !== false };
  }

  if (sourceType === "video_id") {
    const mediaId = String(body?.media_source?.media_id || "").trim();
    const cover = String(body?.media_source?.cover_image_url || "").trim();
    if (!mediaId || !/^https:\/\//i.test(cover)) return res.status(400).json({ ok: false, error: "VIDEO_MEDIA_ID_AND_PUBLIC_COVER_REQUIRED" });
    pinPayload.media_source = { source_type: "video_id", media_id: mediaId, cover_image_url: cover };
  }

  if (dryRun) {
    return res.status(200).json({ ok: true, dryRun: true, mode: "CREATE_PIN", payload: pinPayload, writesPinterest: false });
  }

  if (!token) {
    return res.status(503).json({ ok: false, hold: true, error: "PINTEREST_ACCESS_TOKEN_NOT_CONFIGURED", mode: "CREATE_PIN" });
  }

  const response = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(pinPayload)
  });
  const payload = await response.json();
  const rate = rateHeaders(response);
  if (!response.ok) return res.status(response.status).json({ ok: false, error: "PINTEREST_CREATE_PIN_ERROR", detail: payload, rate });
  return res.status(201).json({ ok: true, mode: "CREATE_PIN", pinId: String(payload?.id || ""), payload, rate });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  try {
    assertBridgeSecret(req.headers || {});
    const mode = String(req.query?.mode || req.body?.mode || "").trim().toLowerCase();
    const token = process.env.PINTEREST_ACCESS_TOKEN;

    if (mode === "create" || mode === "publish") {
      return createPin(req, res, token);
    }

    if (!token) {
      return res.status(503).json({
        ok: false,
        hold: true,
        error: "PINTEREST_ACCESS_TOKEN_NOT_CONFIGURED",
        mode: "METADATA_ONLY",
        next: "BIND_EXISTING_VERIFIED_PINTEREST_TOKEN_OR_COMPLETE_OAUTH_READBACK"
      });
    }

    if (mode === "list") {
      if (req.method !== "GET") return res.status(405).json({ ok: false, error: "LIST_MODE_GET_ONLY" });
      return listPins(req, res, token);
    }

    const pinId = String(req.query?.pinId || req.body?.pinId || "").trim();
    if (!/^\d+$/.test(pinId)) return res.status(400).json({ ok: false, error: "VALID_PIN_ID_OR_LIST_OR_CREATE_MODE_REQUIRED" });

    const response = await fetch(`https://api.pinterest.com/v5/pins/${encodeURIComponent(pinId)}`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" }
    });
    const payload = await response.json();
    if (!response.ok) return res.status(response.status).json({ ok: false, error: "PINTEREST_API_ERROR", detail: payload, rate: rateHeaders(response) });

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
      rate: rateHeaders(response),
      forward
    });
  } catch (error: any) {
    const message = error?.message || "PIN_FETCH_FAILED";
    const status = message === "UNAUTHORIZED"
      ? 401
      : message === "PINTEREST_BRIDGE_SECRET_NOT_CONFIGURED"
        ? 503
        : message.startsWith("CENTRAL_HUB_")
          ? 502
          : 500;
    const hold = status === 503;
    return res.status(status).json({
      ok: false,
      hold,
      error: message,
      next: message === "PINTEREST_BRIDGE_SECRET_NOT_CONFIGURED"
        ? "CONFIGURE_PINTEREST_BRIDGE_SECRET_BEFORE_PROTECTED_PIN_CALLS"
        : undefined
    });
  }
}
