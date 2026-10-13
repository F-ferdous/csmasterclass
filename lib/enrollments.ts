"use client";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ClassLevel } from "./types";

export type EnrollmentStatus = "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled";
export type EnrollmentSource = "signup" | "profile" | "admin" | "sync";

/** enrollments/{id} — one request for a seat in a batch. */
export type EnrollmentRecord = {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  classLevel: ClassLevel | "";
  locationId: string;
  batchId: string;
  status: EnrollmentStatus;
  source: EnrollmentSource;
  note: string;
  createdAt: Date | null;
  decidedAt: Date | null;
};

/** Statuses that still hold (or wait for) a seat. */
export const activeStatuses: EnrollmentStatus[] = ["pending", "confirmed", "waitlisted"];

export const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  waitlisted: "Waitlisted",
  rejected: "Not accepted",
  cancelled: "Cancelled",
};

export const enrollmentStatusStyles: Record<EnrollmentStatus, string> = {
  pending: "bg-gold/20 text-gold",
  confirmed: "bg-forest/15 text-forest",
  waitlisted: "bg-ink/10 text-ink",
  rejected: "bg-ember/15 text-ember",
  cancelled: "bg-paper-2 text-ink-soft",
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const date = (v: unknown) => ((v as Timestamp | undefined)?.toDate ? (v as Timestamp).toDate() : null);

export function normalizeEnrollment(id: string, raw: Record<string, unknown>): EnrollmentRecord {
  const statuses: EnrollmentStatus[] = ["pending", "confirmed", "waitlisted", "rejected", "cancelled"];
  const sources: EnrollmentSource[] = ["signup", "profile", "admin", "sync"];
  return {
    id,
    uid: str(raw.uid),
    name: str(raw.name),
    email: str(raw.email),
    phone: str(raw.phone),
    classLevel: ["9", "10", "11", "12"].includes(raw.classLevel as string) ? (raw.classLevel as ClassLevel) : "",
    locationId: str(raw.locationId),
    batchId: str(raw.batchId),
    status: statuses.includes(raw.status as EnrollmentStatus) ? (raw.status as EnrollmentStatus) : "pending",
    source: sources.includes(raw.source as EnrollmentSource) ? (raw.source as EnrollmentSource) : "signup",
    note: str(raw.note),
    createdAt: date(raw.createdAt),
    decidedAt: date(raw.decidedAt),
  };
}

/** Newest first. */
export const byNewest = (a: EnrollmentRecord, b: EnrollmentRecord) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);

export type Applicant = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  classLevel: ClassLevel | "";
  locationId: string;
  batchId: string;
};

/** Cancels this student's open requests/seats (used before a new request or an admin move). */
async function cancelActive(uid: string) {
  const snap = await getDocs(query(collection(db(), "enrollments"), where("uid", "==", uid)));
  const open = snap.docs.filter((d) => activeStatuses.includes(d.data().status));
  if (!open.length) return;
  const wb = writeBatch(db());
  for (const d of open) wb.update(d.ref, { status: "cancelled", updatedAt: serverTimestamp() });
  await wb.commit();
}

/** Student side: ask for a seat in a batch (replaces any earlier open request). */
export async function requestSeat(applicant: Applicant, source: "signup" | "profile") {
  if (!applicant.batchId) return;
  await cancelActive(applicant.uid);
  await addDoc(collection(db(), "enrollments"), {
    ...applicant,
    status: "pending",
    source,
    note: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Admin side: place a student in a batch directly (recorded as confirmed). */
export async function placeStudent(applicant: Applicant, source: "admin" | "sync" = "admin") {
  if (source === "admin") await cancelActive(applicant.uid);
  await addDoc(collection(db(), "enrollments"), {
    ...applicant,
    status: "confirmed",
    source,
    note: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    decidedAt: serverTimestamp(),
  });
}

/**
 * Admin decision on a request. Confirming (optionally into a different batch) also puts
 * the batch on the student's profile; rejecting clears it so they can choose again.
 */
export async function decideEnrollment(
  record: EnrollmentRecord,
  status: Extract<EnrollmentStatus, "confirmed" | "waitlisted" | "rejected">,
  options: { note?: string; batchId?: string; locationId?: string; classLevel?: ClassLevel | "" } = {},
) {
  const batchId = options.batchId ?? record.batchId;
  const locationId = options.locationId ?? record.locationId;
  const classLevel = options.classLevel ?? record.classLevel;
  const wb = writeBatch(db());
  wb.update(doc(db(), "enrollments", record.id), {
    status,
    batchId,
    locationId,
    classLevel,
    note: options.note ?? record.note,
    updatedAt: serverTimestamp(),
    decidedAt: serverTimestamp(),
  });
  const profile = doc(db(), "users", record.uid);
  if (status === "confirmed") wb.update(profile, { batchId, locationId, classLevel, updatedAt: serverTimestamp() });
  if (status === "rejected") wb.update(profile, { batchId: "", updatedAt: serverTimestamp() });
  await wb.commit();
}

export function markBatchFull(batchId: string) {
  return updateDoc(doc(db(), "batches", batchId), { status: "full", updatedAt: serverTimestamp() });
}
