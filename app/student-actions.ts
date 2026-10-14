"use server";

import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { isAdminEmail } from "@/lib/admins";
import { phoneKey } from "@/lib/phone";
import { requireAdmin } from "@/lib/server/require-admin";
import { adminDb, isCredentialError } from "@/lib/server/firebase-admin";
import { hashPassword, verifyPassword, type StoredPassword } from "@/lib/server/passwords";
import { clearSession, setSession } from "@/lib/server/session";
import { currentStudent, passwordDoc, requireStudent, studentDoc } from "@/lib/server/students";
import type { ClassLevel } from "@/lib/types";

// Student accounts — no Firebase Authentication; everything lives in Firestore:
//  1. registerStudent → enrollments/{id} (pending, uid "") + enrollmentSecrets/{id} (scrypt hash; no client access).
//     The hash is kept after a decline so that student is told why they can't sign in; it's removed
//     when they register again.
//  2. decideRegistration("confirmed") → students/{id} (profile) + students/{id}/private/auth (the hash).
//  3. signInStudent checks the password against that hash and sets a signed session cookie
//     (lib/server/session.ts). Admins still sign in with Firebase Auth.
// Every function here re-checks its caller — Server Functions are reachable by direct POST.

export type ActionResult = { ok: true } | { ok: false; error: string };

export type RegistrationInput = {
  name: string;
  email: string;
  phone: string;
  parentPhone: string;
  password: string;
  classLevel: ClassLevel | "";
  locationId: string;
  batchId: string;
};

export type SignInResult =
  | { status: "ok" }
  /** Not a student login — the browser then tries the admin (Firebase) sign-in for this email. */
  | { status: "try-admin" }
  | { status: "rejected"; note: string }
  | { status: "pending" | "waitlisted" | "invalid" | "locked" | "unavailable" };

const classLevels = ["9", "10", "11", "12"];
const validEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const validPassword = (p: string) => p.length >= 6 && p.length <= 128;

const setupError = "The website's server isn't connected to Firebase yet. (Admin: add service-account.json — see setup notes.)";

function fail(err: unknown): { ok: false; error: string } {
  if (isCredentialError(err)) return { ok: false, error: setupError };
  console.error("[student-actions]", err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

// ── Brute-force protection ──────────────────────────────────────────
// loginAttempts/{sha256(identifier)} — server only. 5 wrong passwords lock that login for 10 minutes.
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
  const password = String(input.password ?? "");
  const key = phoneKey(phone);

  if (name.length < 2 || name.length > 100) return { ok: false, error: "Enter your full name." };
  if (!key) return { ok: false, error: "Enter your mobile number, e.g. 01712345678." };
  if (email && !validEmail(email)) return { ok: false, error: "That email address doesn't look right." };
  if (email && isAdminEmail(email)) return { ok: false, error: "This email can't be used for a student account." };
  if (parentPhone && !phoneKey(parentPhone)) return { ok: false, error: "Enter your parent's mobile number, e.g. 01712345678." };
  if (!validPassword(password)) return { ok: false, error: "Choose a password with at least 6 characters." };
  if (!classLevels.includes(input.classLevel)) return { ok: false, error: "Choose your class." };

  try {
    const db = adminDb();
    const batch = await db.doc(`batches/${String(input.batchId)}`).get();
    if (!batch.exists || batch.get("classLevel") !== input.classLevel || batch.get("locationId") !== input.locationId) {
      return { ok: false, error: "Choose a batch for your class and centre." };
    }
    if (batch.get("status") === "full" || batch.get("status") === "closed") return { ok: false, error: "That batch isn't taking students — please choose another." };

    // Already a student, an admin, or already waiting?
    const [byPhone, byEmail, adminByEmail, openByPhone] = await Promise.all([
      db.collection("students").where("phoneKey", "==", key).limit(1).get(),
      email ? db.collection("students").where("email", "==", email).limit(1).get() : null,
      email ? db.collection("users").where("email", "==", email).limit(1).get() : null,
      db.collection("enrollments").where("phoneKey", "==", key).get(),
    ]);
    if (!byPhone.empty || (byEmail && !byEmail.empty)) return { ok: false, error: "You already have an account — please sign in." };
    if (adminByEmail && !adminByEmail.empty) return { ok: false, error: "This email can't be used for a student account." };
    if (openByPhone.docs.some((d) => d.get("uid") === "" && ["pending", "waitlisted"].includes(d.get("status")))) {
      return { ok: false, error: "You've already registered with this number — your teacher will confirm your seat soon." };
    }

    const ref = db.collection("enrollments").doc();
    const secret = await hashPassword(password);
    const wb = db.batch();
    // An earlier declined registration's hash is no longer needed.
    openByPhone.docs.filter((d) => d.get("uid") === "").forEach((d) => wb.delete(db.doc(`enrollmentSecrets/${d.id}`)));
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
    wb.set(db.doc(`enrollmentSecrets/${ref.id}`), { ...secret, createdAt: FieldValue.serverTimestamp() });
    await wb.commit();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Public: sign in / out ───────────────────────────────────────────

/**
 * Student sign-in with a mobile number or email. On success the session cookie is set.
 * Emails that aren't a student login come back as "try-admin" (the same answer whether or not a
 * student has that email), so this can't be used to find out who has an account.
 */
export async function signInStudent(identifier: string, password: string): Promise<SignInResult> {
  const id = String(identifier ?? "").trim().toLowerCase();
  const pw = String(password ?? "");
  const isEmail = id.includes("@");
  const key = isEmail ? "" : phoneKey(id);
  if (!pw || (!isEmail && !key) || (isEmail && !validEmail(id))) return { status: "invalid" };
  const lockId = isEmail ? id : key;
  const wrong = (): SignInResult => (isEmail ? { status: "try-admin" } : { status: "invalid" });

  try {
    if (await isLocked(lockId)) return { status: "locked" };
    const db = adminDb();

    const students = await db.collection("students").where(isEmail ? "email" : "phoneKey", "==", isEmail ? id : key).limit(5).get();
    for (const s of students.docs) {
      const secret = await passwordDoc(s.id).get();
      if (!secret.exists || !(await verifyPassword(pw, secret.data() as StoredPassword))) continue;
      if (s.get("status") === "disabled") return { status: "invalid" };
      await setSession(s.id, s.get("sessionVersion") ?? 1);
      await attemptDoc(lockId).delete().catch(() => {});
      return { status: "ok" };
    }

    // A registration that hasn't been confirmed (yet): tell them where it stands.
    const regs = await db.collection("enrollments").where(isEmail ? "email" : "phoneKey", "==", isEmail ? id : key).get();
    const unconfirmed = regs.docs
      .filter((d) => d.get("source") === "signup" && d.get("uid") === "")
      .sort((a, b) => (b.get("createdAt")?.toMillis?.() ?? 0) - (a.get("createdAt")?.toMillis?.() ?? 0));
    for (const reg of unconfirmed) {
      const secret = await db.doc(`enrollmentSecrets/${reg.id}`).get();
      if (!secret.exists || !(await verifyPassword(pw, secret.data() as StoredPassword))) continue;
      const status = reg.get("status");
      if (status === "pending" || status === "waitlisted") return { status };
      return { status: "rejected", note: String(reg.get("note") ?? "") };
    }

    if (!students.empty || !isEmail) await recordFailure(lockId);
    return wrong();
  } catch (err) {
    if (isCredentialError(err)) return { status: "unavailable" };
    console.error("[student-actions] signInStudent", err);
    return isEmail ? { status: "try-admin" } : { status: "invalid" };
  }
}

export async function signOutStudent(): Promise<void> {
  await clearSession();
}

/** The signed-in student changes their own password (and other devices are signed out). */
export async function changeMyPassword(current: string, next: string): Promise<ActionResult> {
  try {
    const me = await requireStudent();
    if (!validPassword(String(next ?? ""))) return { ok: false, error: "Choose a new password with at least 6 characters." };
    const secret = await passwordDoc(me.uid).get();
    if (!secret.exists || !(await verifyPassword(String(current ?? ""), secret.data() as StoredPassword))) {
      return { ok: false, error: "Your current password isn't right." };
    }
    const version = await setPassword(me.uid, String(next));
    await setSession(me.uid, version);
    return { ok: true };
  } catch (err) {
    if ((err as Error).message === "signed-out") return { ok: false, error: "Please sign in again." };
    return fail(err);
  }
}

/** Stores a new password hash and bumps the session version (signing out older sessions). */
async function setPassword(id: string, password: string) {
  const db = adminDb();
  const secret = await hashPassword(password);
  const ref = studentDoc(id);
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw new Error("no-student");
    const version = (snap.get("sessionVersion") ?? 1) + 1;
    t.set(passwordDoc(id), { ...secret, updatedAt: FieldValue.serverTimestamp() });
    t.update(ref, { sessionVersion: version, updatedAt: FieldValue.serverTimestamp() });
    return version;
  });
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

type Placement = { batchId?: string; locationId?: string; classLevel?: ClassLevel | ""; note?: string };

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
    const decided = { batchId, locationId, classLevel, note, updatedAt: FieldValue.serverTimestamp(), decidedAt: FieldValue.serverTimestamp() };
    const secretRef = db.doc(`enrollmentSecrets/${enrollmentId}`);

    if (decision === "waitlisted") {
      await ref.update({ ...decided, status: "waitlisted" });
      return { ok: true };
    }
    if (decision === "rejected") {
      // The hash stays so the student sees "wasn't accepted" (and the reason) if they try to sign in.
      await ref.update({ ...decided, status: "rejected" });
      return { ok: true };
    }

    // Confirm: one students/{id} record, with the password they chose moved into its private part.
    if (!["pending", "waitlisted"].includes(reg.status)) return { ok: false, error: "Only pending or waitlisted registrations can be confirmed." };
    const secret = await secretRef.get();
    if (!secret.exists) return { ok: false, error: "This registration's password is missing — ask the student to register again." };
    const [taken, takenEmail] = await Promise.all([
      db.collection("students").where("phoneKey", "==", reg.phoneKey).limit(1).get(),
      reg.email ? db.collection("students").where("email", "==", reg.email).limit(1).get() : null,
    ]);
    if (!taken.empty) return { ok: false, error: `${reg.phone} already belongs to a student account.` };
    if (takenEmail && !takenEmail.empty) return { ok: false, error: `${reg.email} already belongs to a student account.` };

    const id = enrollmentId; // student id = registration id
    const { passwordHash, salt } = secret.data() as StoredPassword;
    const wb = db.batch();
    wb.set(studentDoc(id), {
      name: reg.name,
      email: reg.email ?? "",
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
    wb.set(passwordDoc(id), { passwordHash, salt, updatedAt: FieldValue.serverTimestamp() });
    wb.delete(secretRef);
    wb.update(ref, { ...decided, uid: id, status: "confirmed" });
    await wb.commit();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Admin: reset a student's password ───────────────────────────────

export async function setStudentPassword(idToken: string, uid: string, password: string): Promise<ActionResult> {
  try {
    await requireAdmin(idToken);
  } catch (err) {
    return isCredentialError(err) ? { ok: false, error: setupError } : { ok: false, error: "Only admins can do this." };
  }
  if (!validPassword(String(password ?? ""))) return { ok: false, error: "Use at least 6 characters." };
  try {
    await setPassword(String(uid), String(password));
    // A reset also lifts any sign-in lock.
    const student = await studentDoc(String(uid)).get();
    await Promise.all([student.get("phoneKey"), student.get("email")].filter(Boolean).map((k) => attemptDoc(k).delete())).catch(() => {});
    return { ok: true };
  } catch (err) {
    if ((err as Error).message === "no-student") return { ok: false, error: "This student account doesn't exist." };
    return fail(err);
  }
}
