"use server";

import { FieldValue } from "firebase-admin/firestore";
import { after } from "next/server";
import { endpointKey } from "@/lib/push";
import { adminDb, isCredentialError } from "@/lib/server/firebase-admin";
import { requireAdmin } from "@/lib/server/require-admin";
import { orderPayload } from "@/lib/server/admin-alerts";
import { adminPushDoc, cleanSubscription, notifyAdmins, sendToSubscriptions, type PushPayload, type PushSub } from "@/lib/server/webpush";

export type { PushPayload, PushSub };
export type PushResult = { ok: true; sent: number; failed: number; gone: string[] } | { ok: false; error: string };
export type AdminPushResult = { ok: true } | { ok: false; error: string };

/** Admin only: sends one notification to each (student) subscription. Returns endpoints that no longer exist. */
export async function sendPush(idToken: string, subs: PushSub[], payload: PushPayload): Promise<PushResult> {
  try {
    await requireAdmin(idToken);
  } catch (err) {
    return { ok: false, error: isCredentialError(err) ? "server-not-connected" : "not-admin" };
  }
  try {
    const { sent, failed, gone } = await sendToSubscriptions(subs, payload, "/dashboard");
    return { ok: true, sent, failed, gone };
  } catch (err) {
    return { ok: false, error: (err as Error).message === "not-configured" ? "not-configured" : "failed" };
  }
}

// ── Admin notifications: this device on / off ───────────────────────

async function adminUid(idToken: string) {
  try {
    return (await requireAdmin(idToken)).uid;
  } catch {
    return null;
  }
}

/** Saves this browser's push subscription for the signed-in admin (new registrations, orders, batch changes). */
export async function saveAdminPush(idToken: string, sub: unknown, device: string): Promise<AdminPushResult> {
  const uid = await adminUid(idToken);
  if (!uid) return { ok: false, error: "Only admins can do this — please sign in again." };
  const clean = cleanSubscription(sub);
  if (!clean) return { ok: false, error: "This browser's notification service isn't supported." };
  await adminPushDoc(uid).set(
    { subs: { [endpointKey(clean.endpoint)]: { ...clean, device: String(device).slice(0, 120), at: FieldValue.serverTimestamp() } }, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return { ok: true };
}

export async function removeAdminPush(idToken: string, endpoint: string): Promise<AdminPushResult> {
  const uid = await adminUid(idToken);
  if (!uid) return { ok: false, error: "Only admins can do this — please sign in again." };
  await adminPushDoc(uid).set({ subs: { [endpointKey(String(endpoint))]: FieldValue.delete() }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true };
}

/**
 * Called by the public order form right after it saves an order (the browser writes orders directly).
 * Only notifies for a real, brand-new website order, and only once — so it can't be used to send messages.
 */
export async function notifyNewWebOrder(orderId: string): Promise<void> {
  const id = String(orderId ?? "");
  if (!/^[A-Za-z0-9]{10,40}$/.test(id)) return;
  try {
    const ref = adminDb().doc(`orders/${id}`);
    const order = await adminDb().runTransaction(async (t) => {
      const snap = await t.get(ref);
      const created = snap.get("createdAt")?.toMillis?.() ?? 0;
      if (!snap.exists || snap.get("status") !== "new" || snap.get("adminNotifiedAt") || Date.now() - created > 10 * 60 * 1000) return null;
      t.update(ref, { adminNotifiedAt: FieldValue.serverTimestamp() });
      return snap.data()!;
    });
    if (order) after(() => notifyAdmins(orderPayload(order)));
  } catch (err) {
    if (!isCredentialError(err)) console.error("[push-actions] notifyNewWebOrder", (err as Error).message);
  }
}
