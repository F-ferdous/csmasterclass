import webpush from "web-push";
import { FieldValue } from "firebase-admin/firestore";
import { endpointKey } from "@/lib/push";
import { adminDb } from "./firebase-admin";

// Web push, server side: shared by student notifications (app/push-actions.ts) and admin notifications
// (notifyAdmins below). Uses the VAPID keys in the environment.

export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } };
export type PushPayload = { title: string; body: string; url: string; tag?: string };

// Browser push services. Endpoints come from people's devices, so anything else is refused —
// otherwise a tampered subscription could make this server send requests to arbitrary sites.
const pushHosts = [/\.googleapis\.com$/, /\.push\.apple\.com$/, /\.mozilla\.com$/, /\.mozaws\.net$/, /\.notify\.windows\.com$/];
export function allowedEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && pushHosts.some((h) => h.test(u.hostname));
  } catch {
    return false;
  }
}

/** A subscription as sent by the browser, checked and trimmed — or null if it isn't one we'd send to. */
export function cleanSubscription(sub: unknown): PushSub | null {
  const s = sub as Partial<PushSub> | null;
  if (typeof s?.endpoint !== "string" || !allowedEndpoint(s.endpoint) || typeof s.keys?.p256dh !== "string" || typeof s.keys?.auth !== "string") return null;
  return { endpoint: s.endpoint.slice(0, 1000), keys: { p256dh: s.keys.p256dh.slice(0, 200), auth: s.keys.auth.slice(0, 100) } };
}

/** Sends one notification to each subscription. Returns counts and the endpoints that no longer exist. */
export async function sendToSubscriptions(subs: PushSub[], payload: PushPayload, fallbackUrl: string) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("not-configured");
  webpush.setVapidDetails("mailto:admin@cs-masterclass.com", publicKey, privateKey);

  const body = JSON.stringify({
    title: String(payload.title).slice(0, 120),
    body: String(payload.body).slice(0, 240),
    url: String(payload.url).startsWith("/") ? payload.url : fallbackUrl,
    tag: payload.tag,
  });
  const valid = (Array.isArray(subs) ? subs : []).map(cleanSubscription).filter((s): s is PushSub => Boolean(s)).slice(0, 2000);
  // One retry for network blips (connection reset, no response) and push-service busy/server errors.
  const send = async (s: PushSub) => {
    try {
      return await webpush.sendNotification(s, body, { TTL: 60 * 60 * 24 });
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode ?? 0;
      if (code && code !== 429 && code < 500) throw err;
      await new Promise((r) => setTimeout(r, 1500));
      return webpush.sendNotification(s, body, { TTL: 60 * 60 * 24 });
    }
  };
  const results = await Promise.allSettled(valid.map(send));
  const status = (r: PromiseSettledResult<unknown>) => (r.status === "rejected" ? ((r.reason as { statusCode?: number })?.statusCode ?? 0) : 0);
  const gone = results.flatMap((r, i) => ([404, 410].includes(status(r)) ? [valid[i].endpoint] : []));
  // Push-service error codes (e.g. 403 wrong key, 429 too many) — for the server log, no personal data.
  const errors = results.filter((r) => r.status === "rejected").map((r) => status(r) || String((r as PromiseRejectedResult).reason?.message ?? "error").slice(0, 60));
  return { sent: results.filter((r) => r.status === "fulfilled").length, failed: errors.length, gone, errors };
}

// ── Admin notifications ─────────────────────────────────────────────
// adminPush/{admin uid} = { subs: { [endpointKey]: { endpoint, keys, device, at } } } — server only
// (no rule allows browsers to read or write it; admins save their device through app/push-actions.ts).

export const adminPushDoc = (uid: string) => adminDb().doc(`adminPush/${uid}`);

/**
 * Notifies every admin device that turned notifications on. Never throws — a failed notification must not
 * break the registration or order that triggered it. Call it inside `after()` so the visitor isn't kept waiting.
 */
export async function notifyAdmins(payload: PushPayload) {
  try {
    const snap = await adminDb().collection("adminPush").get();
    const owners = new Map<string, string>(); // endpoint → admin uid
    const subs: PushSub[] = [];
    for (const doc of snap.docs) {
      for (const s of Object.values((doc.get("subs") ?? {}) as Record<string, PushSub>)) {
        if (s?.endpoint) {
          owners.set(s.endpoint, doc.id);
          subs.push(s);
        }
      }
    }
    if (!subs.length) return;
    const { sent, failed, gone, errors } = await sendToSubscriptions(subs, payload, "/admin");
    // Devices that were uninstalled or turned notifications off: forget them.
    await Promise.all(
      gone.map((endpoint) => adminPushDoc(owners.get(endpoint)!).set({ subs: { [endpointKey(endpoint)]: FieldValue.delete() } }, { merge: true })),
    );
    console.info(`[admin-push] "${payload.tag ?? payload.title}": sent ${sent}, failed ${failed}, removed ${gone.length}${errors.length ? ` (${errors.join(", ")})` : ""}`);
  } catch (err) {
    console.error("[admin-push]", (err as Error).message);
  }
}
