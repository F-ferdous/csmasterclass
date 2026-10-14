"use server";

import webpush from "web-push";
import { isCredentialError } from "@/lib/server/firebase-admin";
import { requireAdmin } from "@/lib/server/require-admin";

export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } };
export type PushPayload = { title: string; body: string; url: string; tag?: string };
export type PushResult = { ok: true; sent: number; failed: number; gone: string[] } | { ok: false; error: string };

// Browser push services. Endpoints come from students' devices, so anything else is refused —
// otherwise a tampered subscription could make this server send requests to arbitrary sites.
const pushHosts = [/\.googleapis\.com$/, /\.push\.apple\.com$/, /\.mozilla\.com$/, /\.mozaws\.net$/, /\.notify\.windows\.com$/];
const allowed = (endpoint: string) => {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && pushHosts.some((h) => h.test(u.hostname));
  } catch {
    return false;
  }
};

/** Admin only: sends one notification to each subscription. Returns endpoints that no longer exist. */
export async function sendPush(idToken: string, subs: PushSub[], payload: PushPayload): Promise<PushResult> {
  try {
    await requireAdmin(idToken);
  } catch (err) {
    return { ok: false, error: isCredentialError(err) ? "server-not-connected" : "not-admin" };
  }
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return { ok: false, error: "not-configured" };
  webpush.setVapidDetails("mailto:admin@cs-masterclass.com", publicKey, privateKey);

  const body = JSON.stringify({
    title: String(payload.title).slice(0, 120),
    body: String(payload.body).slice(0, 240),
    url: String(payload.url).startsWith("/") ? payload.url : "/dashboard",
    tag: payload.tag,
  });
  const valid = (Array.isArray(subs) ? subs : []).filter((s) => s && typeof s.endpoint === "string" && allowed(s.endpoint) && s.keys?.p256dh && s.keys?.auth).slice(0, 2000);
  const results = await Promise.allSettled(valid.map((s) => webpush.sendNotification(s, body, { TTL: 60 * 60 * 24 })));
  const gone = results.flatMap((r, i) => (r.status === "rejected" && [404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0) ? [valid[i].endpoint] : []));
  return { ok: true, sent: results.filter((r) => r.status === "fulfilled").length, failed: results.filter((r) => r.status === "rejected").length, gone };
}
