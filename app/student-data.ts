"use server";

import { FieldValue } from "firebase-admin/firestore";
import { isExpired, normalizeAnnouncement, reaches, sortAnnouncements } from "@/lib/announcements";
import { normalizeMyAttendance } from "@/lib/attendance";
import { byNewest as enrollmentsByNewest, normalizeEnrollment } from "@/lib/enrollments";
import { normalizeHomework, normalizeSubmission } from "@/lib/homework";
import { itemsSubtotal, newOrderRef, type OrderItem } from "@/lib/orders";
import { normalizePastPapers, parsePaperCode } from "@/lib/past-papers";
import { normalizePayment } from "@/lib/payments";
import { phoneKey } from "@/lib/phone";
import { endpointKey } from "@/lib/push";
import { byNewest, isAllowedType, isWebUrl, normalizeResource, studentAudienceKeys } from "@/lib/resources";
import { normalizeSyllabusProgress, syllabusFor } from "@/lib/syllabus";
import { normalizeMyResults } from "@/lib/tests";
import type { ClassLevel, PriceKind } from "@/lib/types";
import { adminBucket, adminDb } from "@/lib/server/firebase-admin";
import { requireStudent, studentDoc } from "@/lib/server/students";

// Everything a signed-in student reads or changes. Students have no Firebase login, so the browser
// can't read these collections itself (firestore.rules) — each function here finds the student from
// their session cookie and only ever touches that student's own data.

export type Saved = { ok: true } | { ok: false; error: string };

const signedOut: Saved = { ok: false, error: "Please sign in again." };
const failed: Saved = { ok: false, error: "Couldn't save — please try again." };

async function attempt(run: () => Promise<Saved | void>): Promise<Saved> {
  try {
    return (await run()) ?? { ok: true };
  } catch (err) {
    if ((err as Error).message === "signed-out") return signedOut;
    console.error("[student-data]", err);
    return failed;
  }
}

// ── Reads ───────────────────────────────────────────────────────────

export async function getMyAnnouncements() {
  const me = await requireStudent();
  const snap = await adminDb().collection("announcements").where("status", "==", "published").get();
  return sortAnnouncements(snap.docs.map((d) => normalizeAnnouncement(d.id, d.data())).filter((a) => !isExpired(a) && reaches(a, me)));
}

export async function getMyResources() {
  const me = await requireStudent();
  const keys = studentAudienceKeys(me);
  if (!keys.length) return [];
  const snap = await adminDb().collection("resources").where("audienceKeys", "array-contains-any", keys).get();
  return snap.docs.map((d) => normalizeResource(d.id, d.data())).sort(byNewest);
}

export async function getMyHomework() {
  const me = await requireStudent();
  const keys = studentAudienceKeys(me);
  if (!keys.length) return [];
  const db = adminDb();
  const snap = await db.collection("homework").where("audienceKeys", "array-contains-any", keys).get();
  const homework = snap.docs.map((d) => normalizeHomework(d.id, d.data()));
  const subs = homework.length ? await db.getAll(...homework.map((h) => db.doc(`homework/${h.id}/submissions/${me.uid}`))) : [];
  return homework.map((h, i) => ({ homework: h, submission: subs[i]?.exists ? normalizeSubmission(me.uid, subs[i].data()!) : null }));
}

export async function getMyEnrollment() {
  const me = await requireStudent();
  const snap = await adminDb().collection("enrollments").where("uid", "==", me.uid).get();
  return snap.docs.map((d) => normalizeEnrollment(d.id, d.data())).sort(enrollmentsByNewest)[0] ?? null;
}

const ownDoc = async (collection: string) => {
  const me = await requireStudent();
  return (await adminDb().doc(`${collection}/${me.uid}`).get()).data();
};

export async function getMyAttendance() {
  return normalizeMyAttendance(await ownDoc("studentAttendance"));
}
export async function getMyResults() {
  return normalizeMyResults(await ownDoc("studentResults"));
}
export async function getMySyllabus() {
  return normalizeSyllabusProgress(await ownDoc("syllabusProgress"));
}
export async function getMyPastPapers() {
  return normalizePastPapers(await ownDoc("pastPapers"));
}

export async function getMyPayments() {
  const me = await requireStudent();
  const snap = await adminDb().collection("payments").where("uid", "==", me.uid).get();
  return snap.docs.map((d) => normalizePayment(d.id, d.data())).sort((a, b) => b.receivedOn.localeCompare(a.receivedOn));
}

// ── Revision trackers ───────────────────────────────────────────────

export async function saveTopicConfidence(topicId: string, confidence: number): Promise<Saved> {
  return attempt(async () => {
    const me = await requireStudent();
    const id = String(topicId);
    if (!syllabusFor(me.classLevel)?.topics.some((t) => t.id === id)) return { ok: false, error: "That topic isn't in your syllabus." };
    const value = [1, 2, 3].includes(confidence) ? { confidence, updatedAt: FieldValue.serverTimestamp() } : FieldValue.delete();
    await adminDb().doc(`syllabusProgress/${me.uid}`).set({ topics: { [id]: value }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}

export async function savePastPaper(code: string, attempt_: { score: number | null; max: number } | null): Promise<Saved> {
  return attempt(async () => {
    const me = await requireStudent();
    const c = String(code);
    if (!parsePaperCode(c)) return { ok: false, error: "Unknown paper." };
    let value: unknown = FieldValue.delete();
    if (attempt_) {
      const max = Number(attempt_.max);
      const score = attempt_.score === null ? null : Number(attempt_.score);
      if (!Number.isFinite(max) || max <= 0 || max > 500) return { ok: false, error: "Enter the paper's total marks." };
      if (score !== null && (!Number.isFinite(score) || score < 0 || score > max)) return { ok: false, error: `Your score should be between 0 and ${max}.` };
      value = { score, max, at: FieldValue.serverTimestamp() };
    }
    await adminDb().doc(`pastPapers/${me.uid}`).set({ papers: { [c]: value }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}

// ── Profile ─────────────────────────────────────────────────────────

/** Students may change only their name and parent's phone; class, centre and batch go through a request. */
export async function updateMyProfile(input: { name: string; parentPhone: string }): Promise<Saved> {
  return attempt(async () => {
    const me = await requireStudent();
    const name = String(input.name ?? "").trim();
    const parentPhone = String(input.parentPhone ?? "").trim();
    if (name.length < 2 || name.length > 100) return { ok: false, error: "Enter your full name." };
    if (parentPhone && !phoneKey(parentPhone)) return { ok: false, error: "Enter your parent's mobile number, e.g. 01712345678." };
    await studentDoc(me.uid).update({ name, parentPhone, updatedAt: FieldValue.serverTimestamp() });
  });
}

/** Ask to move to another batch. The student stays in their current batch until an admin confirms. */
export async function requestBatchChange(input: { classLevel: ClassLevel | ""; locationId: string; batchId: string }): Promise<Saved> {
  return attempt(async () => {
    const me = await requireStudent();
    const db = adminDb();
    const batch = await db.doc(`batches/${String(input.batchId)}`).get();
    if (!batch.exists || batch.get("classLevel") !== input.classLevel || batch.get("locationId") !== input.locationId || batch.get("status") === "closed") {
      return { ok: false, error: "Choose a batch for your class and centre." };
    }
    if (input.batchId === me.batchId) return;
    const open = await db.collection("enrollments").where("uid", "==", me.uid).get();
    const wb = db.batch();
    for (const d of open.docs) if (["pending", "waitlisted"].includes(d.get("status"))) wb.update(d.ref, { status: "cancelled", updatedAt: FieldValue.serverTimestamp() });
    wb.set(db.collection("enrollments").doc(), {
      uid: me.uid,
      name: me.name,
      email: me.email,
      phone: me.phone,
      classLevel: input.classLevel,
      locationId: input.locationId,
      batchId: input.batchId,
      status: "pending",
      source: "profile",
      note: "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await wb.commit();
  });
}

// ── Homework ────────────────────────────────────────────────────────

const MAX_UPLOAD = 25 * 1024 * 1024;

/** FormData: homeworkId, link, note, and optionally file. Allowed until the answer has been marked. */
export async function submitHomework(form: FormData): Promise<Saved> {
  return attempt(async () => {
    const me = await requireStudent();
    const db = adminDb();
    const id = String(form.get("homeworkId") ?? "");
    const link = String(form.get("link") ?? "").trim().slice(0, 1000);
    const note = String(form.get("note") ?? "").trim().slice(0, 2000);
    const upload = form.get("file");
    const file = upload instanceof File && upload.size > 0 ? upload : null;

    const hw = await db.doc(`homework/${id}`).get();
    if (!id || !hw.exists || !(hw.get("audienceKeys") ?? []).some((k: string) => studentAudienceKeys(me).includes(k))) {
      return { ok: false, error: "This homework isn't set for your batch." };
    }
    const subRef = db.doc(`homework/${id}/submissions/${me.uid}`);
    const existing = await subRef.get();
    if (existing.exists && existing.get("markedAt")) return { ok: false, error: "This homework has already been marked." };
    if (link && !isWebUrl(link)) return { ok: false, error: "Paste the full link, starting with https://" };
    if (!link && !file && !existing.get("file")) return { ok: false, error: "Add a link to your work (or attach a file)." };

    let stored = existing.exists ? (existing.get("file") ?? null) : null;
    if (file) {
      if (!isAllowedType(file.type)) return { ok: false, error: "Choose a PDF, Word document, image or text file." };
      if (file.size > MAX_UPLOAD) return { ok: false, error: "That file is over 25 MB — share a Google Drive link instead." };
      const path = `homework/${id}/${me.uid}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "-").slice(-80)}`;
      await adminBucket().file(path).save(Buffer.from(await file.arrayBuffer()), { contentType: file.type, resumable: false });
      stored = { path, name: file.name.slice(0, 200), size: file.size, contentType: file.type };
    }
    await subRef.set(
      { uid: me.uid, name: me.name, link, note, file: stored, submittedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  });
}

// ── Notifications ───────────────────────────────────────────────────

type PushSubJson = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function savePushSubscription(sub: PushSubJson, device: string): Promise<Saved> {
  return attempt(async () => {
    const me = await requireStudent();
    if (typeof sub?.endpoint !== "string" || !sub.endpoint.startsWith("https://") || typeof sub.keys?.p256dh !== "string" || typeof sub.keys?.auth !== "string") {
      return { ok: false, error: "Invalid subscription." };
    }
    await adminDb()
      .doc(`pushSubscriptions/${me.uid}`)
      .set(
        {
          subs: { [endpointKey(sub.endpoint)]: { endpoint: sub.endpoint.slice(0, 1000), keys: { p256dh: sub.keys.p256dh.slice(0, 200), auth: sub.keys.auth.slice(0, 100) }, device: String(device).slice(0, 120), at: FieldValue.serverTimestamp() } },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  });
}

export async function removePushSubscription(endpoint: string): Promise<Saved> {
  return attempt(async () => {
    const me = await requireStudent();
    await adminDb().doc(`pushSubscriptions/${me.uid}`).set({ subs: { [endpointKey(String(endpoint))]: FieldValue.delete() }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}

// ── Orders ──────────────────────────────────────────────────────────

const kinds: PriceKind[] = ["soft", "hard", "chapter", "combined"];

/** A signed-in student's book order — like the public order form, but linked to their account. */
export async function placeMyOrder(input: { items: OrderItem[]; address: string; note: string; email: string }): Promise<{ ok: true; ref: string } | { ok: false; error: string }> {
  try {
    const me = await requireStudent();
    const items = (Array.isArray(input.items) ? input.items : []).slice(0, 20).map((i) => ({
      slug: String(i.slug).slice(0, 100),
      title: String(i.title).slice(0, 200),
      kind: kinds.includes(i.kind) ? i.kind : "soft",
      price: Math.max(0, Math.min(100000, Number(i.price) || 0)),
      qty: Math.max(1, Math.min(99, Math.round(Number(i.qty) || 1))),
    }));
    if (!items.length) return { ok: false, error: "Choose at least one book." };
    const ref = newOrderRef();
    await adminDb().collection("orders").add({
      ref,
      uid: me.uid,
      name: me.name,
      phone: me.phone,
      email: String(input.email ?? me.email).trim().slice(0, 200),
      address: String(input.address ?? "").trim().slice(0, 500),
      note: String(input.note ?? "").trim().slice(0, 1000),
      items,
      subtotal: itemsSubtotal(items),
      deliveryFee: 0,
      discount: 0,
      status: "new",
      source: "website",
      paymentStatus: "unpaid",
      createdAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, ref };
  } catch (err) {
    if ((err as Error).message === "signed-out") return { ok: false, error: "Please sign in again." };
    console.error("[student-data] placeMyOrder", err);
    return { ok: false, error: "Something went wrong placing your order. Please try again." };
  }
}
