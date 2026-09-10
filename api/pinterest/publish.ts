import { assertBridgeSecret } from "./_core.js";

function json(res: any, status: number, body: any) {
  return res.status(status).json(body);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { ok:false, error:"METHOD_NOT_ALLOWED" });
  try {
    assertBridgeSecret(req.headers || {});
    const token = process.env.PINTEREST_ACCESS_TOKEN;
    if (!token) return json(res, 503, { ok:false, hold:true, error:"PINTEREST_ACCESS_TOKEN_NOT_CONFIGURED" });

    const body = req.body || {};
    const dryRun = body.dry_run !== false;
    const boardId = String(body.board_id || "").trim();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const link = String(body.link || "").trim();
    const sourceType = String(body?.media_source?.source_type || "").trim();

    if (!boardId) return json(res, 400, { ok:false, error:"BOARD_ID_REQUIRED" });
    if (!["image_url","video_id"].includes(sourceType)) return json(res, 400, { ok:false, error:"UNSUPPORTED_MEDIA_SOURCE" });

    const pinPayload:any = { board_id: boardId, title, description, media_source: body.media_source };
    if (link) pinPayload.link = link;

    if (sourceType === "image_url") {
      const url = String(body?.media_source?.url || "").trim();
      if (!/^https:\/\//i.test(url)) return json(res, 400, { ok:false, error:"PUBLIC_HTTPS_IMAGE_URL_REQUIRED" });
      pinPayload.media_source = { source_type:"image_url", url, is_standard: body?.media_source?.is_standard !== false };
    }

    if (sourceType === "video_id") {
      const mediaId = String(body?.media_source?.media_id || "").trim();
      const cover = String(body?.media_source?.cover_image_url || "").trim();
      if (!mediaId || !/^https:\/\//i.test(cover)) return json(res, 400, { ok:false, error:"VIDEO_MEDIA_ID_AND_PUBLIC_COVER_REQUIRED" });
      pinPayload.media_source = { source_type:"video_id", media_id:mediaId, cover_image_url:cover };
    }

    if (dryRun) return json(res, 200, { ok:true, dryRun:true, action:"CREATE_PIN", payload:pinPayload, writesPinterest:false });

    const response = await fetch("https://api.pinterest.com/v5/pins", {
      method:"POST",
      headers:{ authorization:`Bearer ${token}`, accept:"application/json", "content-type":"application/json" },
      body:JSON.stringify(pinPayload)
    });
    const payload = await response.json();
    const rate = {
      limit: response.headers.get("x-ratelimit-limit"),
      remaining: response.headers.get("x-ratelimit-remaining"),
      reset: response.headers.get("x-ratelimit-reset")
    };
    if (!response.ok) return json(res, response.status, { ok:false, error:"PINTEREST_CREATE_PIN_ERROR", detail:payload, rate });
    return json(res, 201, { ok:true, pinId:String(payload?.id || ""), payload, rate });
  } catch (error:any) {
    const message = error?.message || "PINTEREST_PUBLISH_FAILED";
    return json(res, message === "UNAUTHORIZED" ? 401 : 500, { ok:false, error:message });
  }
}
