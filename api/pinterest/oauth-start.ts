import crypto from "node:crypto";

const CANONICAL_REDIRECT = "https://contents-os.com/api/pinterest/callback";
const MIN_READ_SCOPES = ["user_accounts:read", "boards:read", "pins:read"];

function requiredEnv(name: string): string {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name}_NOT_CONFIGURED`);
  return value;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function signedState(secret: string): string {
  const payload = JSON.stringify({
    v: 1,
    iat: Date.now(),
    nonce: crypto.randomBytes(18).toString("base64url")
  });
  const body = base64url(payload);
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const appId = requiredEnv("PINTEREST_APP_ID");
    const stateSecret = requiredEnv("PINTEREST_OAUTH_STATE_SECRET");
    const redirectUri = requiredEnv("PINTEREST_OAUTH_REDIRECT_URI");
    if (redirectUri !== CANONICAL_REDIRECT) {
      throw new Error("PINTEREST_OAUTH_REDIRECT_URI_MISMATCH");
    }

    const state = signedState(stateSecret);
    const url = new URL("https://www.pinterest.com/oauth/");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", MIN_READ_SCOPES.join(","));
    url.searchParams.set("state", state);

    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, url.toString());
  } catch (error: any) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({
      ok: false,
      error: error?.message || "PINTEREST_OAUTH_START_FAILED"
    });
  }
}
