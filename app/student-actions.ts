"use server";

import { createHash } from "node:crypto";
import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { after } from "next/server";
import { isAdminEmail } from "@/lib/admins";
import { phoneKey } from "@/lib/phone";
import { requireAdmin } from "@/lib/server/require-admin";
import { adminDb, isCredentialError } from "@/lib/server/firebase-admin";
import { registrationPayload } from "@/lib/server/admin-alerts";
import { notifyAdmins } from "@/lib/server/webpush";
import { clearSession, setSession } from "@/lib/server/session";
import { currentStudent, studentDoc } from "@/lib/server/students";
import type { ClassLevel } from "@/lib/types";

// Student accounts — no Firebase Authentication; everything lives in the Firestore students collection:
//  1. registerStudent → enrollments/{id} (pending, uid ""). Email is required: it is the student's username.
//  2. decideRegistration("confirmed") → students/{id} (the student's profile; id = registration id).
//  3. signInStudent: username = email, password = the student's mobile number (compared as phoneKey, so
//     "01712345678", "+8801712345678" and "01712-345678" all work). On success a signed session cookie is
//     set (lib/server/session.ts). Admins sign in separately at /admin-login with Firebase Auth.
// Every function here re-checks its caller — Server Functions are reachable by direct POST.

export type ActionResult = { ok: true } | { ok: false; error: string };

export type RegistrationInput = {
  name: string;
  email: string;
  phone: string;
  parentPhone: string;
  classLevel: ClassLevel | "";
  locationId: string;
  batchId: string;
};

export type SignInResult =
  | { status: "ok" }
  | { status: "rejected"; note: string }
  /** "admin": this email belongs to an admin, who signs in at /admin-login instead. */
  | { status: "pending" | "waitlisted" | "invalid" | "locked" | "unavailable" | "admin" };

const classLevels = ["9", "10", "11", "12"];
const validEmail = (e: string) => e.length <= 200 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

const setupError = "The website's server isn't connected to Firebase yet. (Admin: add service-account.json — see setup notes.)";

function fail(err: unknown): { ok: false; error: string } {
  if (isCredentialError(err)) return { ok: false, error: setupError };
  console.error("[student-actions]", err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

// ── Brute-force protection ──────────────────────────────────────────
// loginAttempts/{sha256(student id or email)} — server only. 5 wrong tries lock that login for 10 minutes.
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;
const attemptDoc = (id: string) => adminDb().doc(`loginAttempts/${createHash("sha256").update(id).digest("hex")}`);

async function isLocked(id: string) {
  const snap = await attemptDoc(id).get();
  return snap.exists && (snap.get("until") ?? 0) > Date.now();
}

async function recordFailure(id: string) {
  const ref = attemptDoc(id);
  await adminDb().runTransaction(async (t) => {
    const snap = await t.get(ref);
    const now = Date.now();
    const until = snap.exists ? (snap.get("until") ?? 0) : 0;
    // Start counting again after a lock has run out, or after 10 quiet minutes.
    const restart = !snap.exists || (until > 0 && until <= now) || now - (snap.get("last") ?? 0) > LOCK_MS;
    const count = (restart ? 0 : (snap.get("count") ?? 0)) + 1;
    t.set(ref, { count, last: now, until: count >= MAX_FAILS ? now + LOCK_MS : 0 });
  });
}

// ── Public: registration ────────────────────────────────────────────

export async function registerStudent(input: RegistrationInput): Promise<ActionResult> {
  const name = String(input.name ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();
  const phone = String(input.phone ?? "").trim();
  const parentPhone = String(input.parentPhone ?? "").trim();
  const key = phoneKey(phone);

  if (name.length < 2 || name.length > 100) return { ok: false, error: "Enter your full name." };
  if (!key) return { ok: false, error: "Enter your mobile number, e.g. 01712345678." };
  if (!validEmail(email)) return { ok: false, error: "Enter your email address — you'll sign in with it." };
  if (isAdminEmail(email)) return { ok: false, error: "This email can't be used for a student account." };
  if (!phoneKey(parentPhone)) return { ok: false, error: "Enter your parent's or guardian's mobile number, e.g. 01712345678." };
  if (phoneKey(parentPhone) === key) return { ok: false, error: "Your parent's or guardian's mobile number must be different from yours." };
  if (!classLevels.includes(input.classLevel)) return { ok: false, error: "Choose your class." };

  try {
    const db = adminDb();
    const batch = await db.doc(`batches/${String(input.batchId)}`).get();
    if (!batch.exists || batch.get("classLevel") !== input.classLevel || batch.get("locationId") !== input.locationId) {
      return { ok: false, error: "Choose a batch for your class and centre." };
    }
    if (batch.get("status") === "full" || batch.get("status") === "closed") return { ok: false, error: "That batch isn't taking students — please choose another." };

    // Already a student, an admin, or already waiting?
    const [byPhone, byEmail, adminByEmail, openByPhone, openByEmail] = await Promise.all([
      db.collection("students").where("phoneKey", "==", key).limit(1).get(),
      db.collection("students").where("email", "==", email).limit(1).get(),
      db.collection("users").where("email", "==", email).limit(1).get(),
      db.collection("enrollments").where("phoneKey", "==", key).get(),
      db.collection("enrollments").where("email", "==", email).get(),
    ]);
    if (!byPhone.empty || !byEmail.empty) return { ok: false, error: "You already have an account — please sign in." };
    if (!adminByEmail.empty) return { ok: false, error: "This email can't be used for a student account." };
    const waiting = (d: QueryDocumentSnapshot) => d.get("uid") === "" && ["pending", "waitlisted"].includes(d.get("status"));
    if (openByPhone.docs.some(waiting)) {
      return { ok: false, error: "You've already registered with this number — your teacher will confirm your seat soon." };
    }
    if (openByEmail.docs.some(waiting)) {
      return { ok: false, error: "You've already registered with this email — your teacher will confirm your seat soon." };
    }

    const ref = db.collection("enrollments").doc();
    const wb = db.batch();
    wb.set(ref, {
      uid: "",
      name,
      email,
      phone,
      phoneKey: key,
      parentPhone,
      classLevel: input.classLevel,
      locationId: input.locationId,
      batchId: input.batchId,
      status: "pending",
      source: "signup",
      note: "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await wb.commit();
    // Tell the admins (after the response, so the student isn't kept waiting).
    after(async () => {
      const centre = await db.doc(`locations/${String(input.locationId)}`).get().catch(() => null);
      await notifyAdmins(registrationPayload({ name, classLevel: input.classLevel, batchName: batch.get("name"), centre: centre?.get("name") }));
    });
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Public: sign in / out ───────────────────────────────────────────

/**
 * Student sign-in: email as the username, the student's mobile number as the password.
 * On success the session cookie is set. Wrong details always get the same answer ("invalid"),
 * whether or not the email has an account.
 */
export async function signInStudent(emailInput: string, phoneInput: string): Promise<SignInResult> {
  const email = String(emailInput ?? "").trim().toLowerCase();
  const key = phoneKey(String(phoneInput ?? ""));
  if (!validEmail(email) || !key) return { status: "invalid" };

  try {
    const db = adminDb();
    if (isAdminEmail(email) || !(await db.collection("users").where("email", "==", email).limit(1).get()).empty) {
      return { status: "admin" };
    }
    const students = await db.collection("students").where("email", "==", email).limit(5).get();
    // The lock belongs to the account (or to the email when there's no account).
    const lockId = students.docs[0]?.id ?? email;
    if (await isLocked(lockId)) return { status: "locked" };

    const match = students.docs.find((s) => s.get("phoneKey") === key);
    if (match) {
      if (match.get("status") === "disabled") return { status: "invalid" };
      await setSession(match.id, match.get("sessionVersion") ?? 1);
      await attemptDoc(lockId).delete().catch(() => {});
      return { status: "ok" };
    }

    // A registration that hasn't been confirmed (yet): tell them where it stands.
    if (students.empty) {
      const regs = await db.collection("enrollments").where("email", "==", email).get();
      const reg = regs.docs
        .filter((d) => d.get("source") === "signup" && d.get("uid") === "" && d.get("phoneKey") === key)
        .sort((a, b) => (b.get("createdAt")?.toMillis?.() ?? 0) - (a.get("createdAt")?.toMillis?.() ?? 0))[0];
      if (reg) {
        const status = reg.get("status");
        if (status === "pending" || status === "waitlisted") return { status };
        if (status === "rejected") return { status: "rejected", note: String(reg.get("note") ?? "") };
      }
    }

    await recordFailure(lockId);
    return { status: "invalid" };
  } catch (err) {
    if (isCredentialError(err)) return { status: "unavailable" };
    console.error("[student-actions] signInStudent", err);
    return { status: "invalid" };
  }
}

export async function signOutStudent(): Promise<void> {
  await clearSession();
}

/** Who is signed in as a student on this browser (null if nobody). */
export async function getSignedInStudent() {
  try {
    return await currentStudent();
  } catch (err) {
    if (!isCredentialError(err)) console.error("[student-actions] getSignedInStudent", err);
    return null;
  }
}

// ── Admin: decide a registration ────────────────────────────────────

type Placement = { batchId?: string; locationId?: string; classLevel?: ClassLevel | ""; note?: string; email?: string };

export async function decideRegistration(
  idToken: string,
  enrollmentId: string,
  decision: "confirmed" | "waitlisted" | "rejected",
  placement: Placement = {},
): Promise<ActionResult> {
  try {
    await requireAdmin(idToken);
  } catch (err) {
    return isCredentialError(err) ? { ok: false, error: setupError } : { ok: false, error: "Only admins can do this." };
  }

  try {
    const db = adminDb();
    const ref = db.doc(`enrollments/${enrollmentId}`);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "This registration no longer exists." };
    const reg = snap.data()!;
    if (reg.source !== "signup" || reg.uid !== "") return { ok: false, error: "This request already belongs to an account." };

    const batchId = placement.batchId ?? reg.batchId;
    const locationId = placement.locationId ?? reg.locationId;
    const classLevel = placement.classLevel ?? reg.classLevel;
    const note = placement.note ?? reg.note ?? "";
    // The admin can add or correct the email (the student's username) while deciding.
    const email = String(placement.email ?? reg.email ?? "").trim().toLowerCase();
    if (email && !validEmail(email)) return { ok: false, error: "That email address doesn't look right." };
    const decided = { batchId, locationId, classLevel, note, email, updatedAt: FieldValue.serverTimestamp(), decidedAt: FieldValue.serverTimestamp() };

    if (decision === "waitlisted") {
      await ref.update({ ...decided, status: "waitlisted" });
      return { ok: true };
    }
    if (decision === "rejected") {
      // The hash stays so the student sees "wasn't accepted" (and the reason) if they try to sign in.
      await ref.update({ ...decided, status: "rejected" });
      return { ok: true };
    }

    // Confirm: one students/{id} record. They sign in with this email and their mobile number.
    if (!["pending", "waitlisted"].includes(reg.status)) return { ok: false, error: "Only pending or waitlisted registrations can be confirmed." };
    if (!email) return { ok: false, error: `${reg.name || reg.phone} has no email — open Review and add one first (it's their username).` };
    if (isAdminEmail(email)) return { ok: false, error: "That email belongs to an admin and can't be used for a student." };
    if (!reg.phoneKey) return { ok: false, error: "This registration has no valid mobile number — the student's password is their mobile number." };
    const [taken, takenEmail, adminEmail] = await Promise.all([
      db.collection("students").where("phoneKey", "==", reg.phoneKey).limit(1).get(),
      db.collection("students").where("email", "==", email).limit(1).get(),
      db.collection("users").where("email", "==", email).limit(1).get(),
    ]);
    if (!taken.empty) return { ok: false, error: `${reg.phone} already belongs to a student account.` };
    if (!takenEmail.empty) return { ok: false, error: `${email} already belongs to a student account.` };
    if (!adminEmail.empty) return { ok: false, error: "That email belongs to an admin and can't be used for a student." };

    const id = enrollmentId; // student id = registration id
    const wb = db.batch();
    wb.set(studentDoc(id), {
      name: reg.name,
      email,
      phone: reg.phone,
      phoneKey: reg.phoneKey,
      parentPhone: reg.parentPhone ?? "",
      classLevel,
      locationId,
      batchId,
      photoURL: "",
      booksOwned: [],
      status: "active",
      sessionVersion: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    // Left over from when students chose their own password — no longer used.
    wb.delete(db.doc(`enrollmentSecrets/${enrollmentId}`));
    wb.update(ref, { ...decided, uid: id, status: "confirmed" });
    await wb.commit();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
