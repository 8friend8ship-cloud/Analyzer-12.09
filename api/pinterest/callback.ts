import crypto from "node:crypto";

const CANONICAL_REDIRECT = "https://contents-os.com/api/pinterest/callback";
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

type StatePayload = { v: number; iat: number; nonce: string };

function requiredEnv(name: string): string {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name}_NOT_CONFIGURED`);
  return value;
}

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function verifyState(raw: string, secret: string): StatePayload {
  const [body, sig] = raw.split(".");
  if (!body || !sig) throw new Error("PINTEREST_OAUTH_STATE_INVALID");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (!safeEqual(sig, expected)) throw new Error("PINTEREST_OAUTH_STATE_INVALID");
  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new Error("PINTEREST_OAUTH_STATE_INVALID");
  }
  if (payload.v !== 1 || !payload.iat || !payload.nonce) throw new Error("PINTEREST_OAUTH_STATE_INVALID");
  const age = Date.now() - Number(payload.iat);
  if (age < 0 || age > STATE_MAX_AGE_MS) throw new Error("PINTEREST_OAUTH_STATE_EXPIRED");
  return payload;
}

function accountMatches(account: any, expectedId: string, expectedUsername: string): boolean {
  const id = String(account?.id || "").trim();
  const username = String(account?.username || "").trim().replace(/^@/, "");
  return id === expectedId && username.toLowerCase() === expectedUsername.replace(/^@/, "").toLowerCase();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");

  try {
    const code = String(req.query?.code || "").trim();
    const state = String(req.query?.state || "").trim();
    if (!code) return res.status(400).json({ ok: false, error: "PINTEREST_OAUTH_CODE_REQUIRED" });
    if (!state) return res.status(400).json({ ok: false, error: "PINTEREST_OAUTH_STATE_REQUIRED" });

    const appId = requiredEnv("PINTEREST_APP_ID");
    const appSecret = requiredEnv("PINTEREST_APP_SECRET");
    const stateSecret = requiredEnv("PINTEREST_OAUTH_STATE_SECRET");
    const redirectUri = requiredEnv("PINTEREST_OAUTH_REDIRECT_URI");
    const expectedId = requiredEnv("PINTEREST_EXPECTED_USER_ID");
    const expectedUsername = requiredEnv("PINTEREST_EXPECTED_USERNAME");
    if (redirectUri !== CANONICAL_REDIRECT) throw new Error("PINTEREST_OAUTH_REDIRECT_URI_MISMATCH");

    verifyState(state, stateSecret);

    const tokenResponse = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      })
    });
    const tokenBody = await tokenResponse.json().catch(() => ({} as any));
    const accessToken = String((tokenBody as any)?.access_token || "").trim();
    if (!tokenResponse.ok || !accessToken) {
      throw new Error(`PINTEREST_OAUTH_TOKEN_EXCHANGE_${tokenResponse.status}`);
    }

    const accountResponse = await fetch("https://api.pinterest.com/v5/user_account", {
      headers: { authorization: `Bearer ${accessToken}` }
    });
    const account = await accountResponse.json().catch(() => ({} as any));
    if (!accountResponse.ok) throw new Error(`PINTEREST_USER_ACCOUNT_${accountResponse.status}`);
    if (!accountMatches(account, expectedId, expectedUsername)) {
      throw new Error("PINTEREST_ACCOUNT_MISMATCH_HOLD");
    }

    // Verify-only by design: no token is returned, logged, written to Drive, or persisted here.
    return res.status(200).json({
      ok: true,
      accountVerified: true,
      account: {
        id: String((account as any)?.id || ""),
        username: String((account as any)?.username || "")
      },
      tokenReceived: true,
      tokenPersisted: false,
      next: "BIND_TOKEN_TO_APPROVED_SERVER_ONLY_STORE_THEN_RUN_READ_X2"
    });
  } catch (error: any) {
    return res.status(400).json({
      ok: false,
      error: error?.message || "PINTEREST_OAUTH_CALLBACK_FAILED"
    });
  }
}
