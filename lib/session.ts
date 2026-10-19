// Signed cookies: "<base64url(json payload)>.<base64url(HMAC-SHA256)>".
// "session" tokens are the login session; "pending" tokens only prove the password step.
// Uses Web Crypto so it runs in both the Edge middleware and Node route handlers.

export const SESSION_COOKIE = "auth-user";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 1 week, in seconds

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: string;
};

type SessionPayload = SessionUser & { typ: "session"; exp: number };

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: SESSION_MAX_AGE,
  path: "/",
};

// Short-lived cookie set after a correct password, before 2FA
export const PENDING_COOKIE = "auth-pending";
export const PENDING_MAX_AGE = 60 * 10; // 10 minutes, matches 2FA code lifetime

export const pendingCookieOptions = {
  ...sessionCookieOptions,
  maxAge: PENDING_MAX_AGE,
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters");
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signToken(payload: object): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await getKey(), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

// Returns the payload of a correctly signed, unexpired token, otherwise null
async function readToken(token: string | undefined): Promise<Record<string, any> | null> {
  if (!token) return null;

  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getKey(),
      fromBase64Url(signature),
      encoder.encode(body)
    );
    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(fromBase64Url(body)));
    if (!payload?.exp || payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const payload: SessionPayload = {
    typ: "session",
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };
  return signToken(payload);
}

// Returns the session user, or null if the token is missing, tampered with or expired
export async function verifySessionToken(
  token: string | undefined
): Promise<SessionUser | null> {
  const payload = await readToken(token);

  // Tokens issued before typ was added have none; anything else must be a session
  if (!payload || (payload.typ !== undefined && payload.typ !== "session")) return null;
  if (!payload.id || !payload.email) return null;

  return { id: payload.id, email: payload.email, name: payload.name, role: payload.role };
}

// Proves the password step passed for this email; required to send and verify 2FA codes
export async function createPendingToken(email: string): Promise<string> {
  return signToken({
    typ: "pending",
    email: normalizeEmail(email),
    exp: Date.now() + PENDING_MAX_AGE * 1000,
  });
}

// Returns the email the password step was completed for, or null
export async function verifyPendingToken(token: string | undefined): Promise<string | null> {
  const payload = await readToken(token);
  if (!payload || payload.typ !== "pending" || !payload.email) return null;
  return payload.email;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
