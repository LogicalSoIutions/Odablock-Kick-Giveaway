import crypto from "crypto";

const KICK_OAUTH_BASE = "https://id.kick.com";
const KICK_API_BASE = "https://api.kick.com";

function env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing environment variable: ${key}`);
  return val;
}

// --- PKCE helpers ---

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return hash.toString("base64url");
}

export function generateState(): string {
  return crypto.randomBytes(16).toString("base64url");
}

// --- OAuth URLs ---

export function getAuthorizeUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env("KICK_CLIENT_ID"),
    redirect_uri: `${env("BASE_URL")}/api/auth/callback`,
    scope: "user:read channel:read events:subscribe chat:write",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });
  return `${KICK_OAUTH_BASE}/oauth/authorize?${params.toString()}`;
}

// --- Token exchange ---

export async function exchangeCode(
  code: string,
  codeVerifier: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: env("KICK_CLIENT_ID"),
    client_secret: env("KICK_CLIENT_SECRET"),
    redirect_uri: `${env("BASE_URL")}/api/auth/callback`,
    code_verifier: codeVerifier,
    code,
  });

  const res = await fetch(`${KICK_OAUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: env("KICK_CLIENT_ID"),
    client_secret: env("KICK_CLIENT_SECRET"),
    refresh_token: refreshToken,
  });

  const res = await fetch(`${KICK_OAUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }

  return res.json();
}

// --- App Access Token (client credentials) ---

let cachedAppToken: { token: string; expiresAt: number } | null = null;

export async function getAppAccessToken(): Promise<string> {
  if (cachedAppToken && Date.now() < cachedAppToken.expiresAt) {
    return cachedAppToken.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env("KICK_CLIENT_ID"),
    client_secret: env("KICK_CLIENT_SECRET"),
  });

  const res = await fetch(`${KICK_OAUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`App token request failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  cachedAppToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  };

  return json.access_token;
}

// --- Kick API helpers ---

export interface KickChannel {
  broadcaster_user_id: number;
  slug: string;
  stream_title: string;
  category: { id: number; name: string; thumbnail: string } | null;
}

export interface KickUser {
  user_id: number;
  name: string;
  email: string;
  profile_picture: string;
}

export async function getUser(accessToken: string): Promise<KickUser> {
  const res = await fetch(`${KICK_API_BASE}/public/v1/users`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Get user failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json.data?.[0] ?? json.data;
}

export async function getChannel(
  accessToken: string,
  slug?: string
): Promise<KickChannel> {
  const url = new URL(`${KICK_API_BASE}/public/v1/channels`);
  if (slug) {
    url.searchParams.set("slug", slug);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Get channel failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const data = json.data;
  return Array.isArray(data) ? data[0] : data;
}

export async function subscribeToEvent(
  accessToken: string,
  broadcasterUserId?: number
): Promise<void> {
  const payload: Record<string, unknown> = {
    events: [{ name: "chat.message.sent", version: 1 }],
    method: "webhook",
  };

  if (broadcasterUserId) {
    payload.broadcaster_user_id = broadcasterUserId;
  }

  const res = await fetch(
    `${KICK_API_BASE}/public/v1/events/subscriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`Event subscription failed (${res.status}): ${text}`);
    throw new Error(`Event subscription failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  console.log("Event subscription response:", JSON.stringify(json, null, 2));
}

// --- Webhook signature verification ---

let cachedPublicKey: string | null = null;

async function getKickPublicKey(): Promise<string> {
  if (cachedPublicKey) return cachedPublicKey;

  const res = await fetch(`${KICK_API_BASE}/public/v1/public-key`);
  if (!res.ok) {
    throw new Error(`Failed to fetch Kick public key: ${res.status}`);
  }

  const json = await res.json();
  cachedPublicKey = json.data.public_key;
  return cachedPublicKey!;
}

export async function verifyWebhookSignature(
  messageId: string,
  timestamp: string,
  rawBody: string,
  signatureHeader: string
): Promise<boolean> {
  try {
    const publicKeyPem = await getKickPublicKey();
    const signaturePayload = `${messageId}.${timestamp}.${rawBody}`;
    const signatureBuffer = Buffer.from(signatureHeader, "base64");

    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(signaturePayload);
    verifier.end();

    return verifier.verify(publicKeyPem, signatureBuffer);
  } catch (err) {
    console.error("Webhook signature verification error:", err);
    return false;
  }
}
