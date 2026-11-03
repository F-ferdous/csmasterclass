"use server";

import { FieldValue } from "firebase-admin/firestore";
import { endpointKey } from "@/lib/push";
import { isCredentialError } from "@/lib/server/firebase-admin";
import { requireAdmin } from "@/lib/server/require-admin";
import { adminPushDoc, cleanSubscription, sendToSubscriptions, type PushPayload, type PushSub } from "@/lib/server/webpush";

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

