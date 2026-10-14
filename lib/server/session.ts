import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Student sign-in sessions (students have no Firebase Auth account).
// The cookie holds "payload.signature": payload = { s: student id, v: session version, e: expiry ms },
// signed with HMAC-SHA256 using SESSION_SECRET. Bumping students/{id}.sessionVersion (password reset,
// password change) makes every older cookie invalid.

export const SESSION_COOKIE = "cs_session";
/** Readable flag so the browser knows there may be a session worth asking about. Holds no secret. */
export const FLAG_COOKIE = "cs_student";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET is missing or too short");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function makeToken(id: string, version: number, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ s: id, v: version, e: now + MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readToken(token: string | undefined): { id: string; version: number } | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(mac);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof p.s !== "string" || !p.s || typeof p.v !== "number" || typeof p.e !== "number" || p.e < Date.now()) return null;
    return { id: p.s, version: p.v };
  } catch {
    return null;
  }
}

const cookieOptions = (httpOnly: boolean) => ({
  httpOnly,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
});

/** Only from a Server Function or Route Handler. */
export async function setSession(id: string, version: number) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, makeToken(id, version), cookieOptions(true));
  jar.set(FLAG_COOKIE, "1", cookieOptions(false));
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(FLAG_COOKIE);
}

export async function sessionFromCookies() {
  return readToken((await cookies()).get(SESSION_COOKIE)?.value);
}
