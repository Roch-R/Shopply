import type { NextResponse } from "next/server";

export const SHOPPLY_SESSION_COOKIE = "shopply_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getSecret(): string {
  return process.env.JWT_SECRET || "shopply_secret_key_123456789";
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(input: string): Uint8Array | null {
  try {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
    if (typeof atob === "function") {
      const binary = atob(padded);
      const out = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        out[i] = binary.charCodeAt(i);
      }
      return out;
    }
    return new Uint8Array(Buffer.from(padded, "base64"));
  } catch {
    return null;
  }
}

async function hmacSign(message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return new Uint8Array(sig);
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export interface SessionCookiePayload {
  uid: string;
  verified: boolean;
  iat: number;
  exp: number;
}

export async function signSessionCookie(userId: number | string): Promise<string> {
  const enc = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const header = bytesToBase64Url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payloadObj: SessionCookiePayload = {
    uid: String(userId),
    verified: true,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const payload = bytesToBase64Url(enc.encode(JSON.stringify(payloadObj)));
  const sigBytes = await hmacSign(`${header}.${payload}`);
  const sig = bytesToBase64Url(sigBytes);
  return `${header}.${payload}.${sig}`;
}

export async function verifySessionCookie(cookieValue?: string | null): Promise<SessionCookiePayload | null> {
  if (!cookieValue || typeof cookieValue !== "string") return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  if (!header || !payload || !sig) return null;

  const actualSig = base64UrlToBytes(sig);
  if (!actualSig) return null;

  const expectedSig = await hmacSign(`${header}.${payload}`);
  if (!timingSafeEqualBytes(actualSig, expectedSig)) return null;

  const payloadBytes = base64UrlToBytes(payload);
  if (!payloadBytes) return null;

  try {
    const decodedText = new TextDecoder().decode(payloadBytes);
    const parsed = JSON.parse(decodedText) as SessionCookiePayload;
    const now = Math.floor(Date.now() / 1000);
    if (!parsed || !parsed.uid || parsed.verified !== true) return null;
    if (typeof parsed.exp !== "number" || parsed.exp <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function applySessionCookie(res: NextResponse, signedValue: string): NextResponse {
  res.cookies.set(SHOPPLY_SESSION_COOKIE, signedValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SHOPPLY_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
