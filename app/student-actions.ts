"use server";

import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { isAdminEmail } from "@/lib/admins";
import { phoneKey } from "@/lib/phone";
import { adminAuth, adminDb, isCredentialError } from "@/lib/server/firebase-admin";
import { hashPassword, verifyPassword, type StoredPassword } from "@/lib/server/passwords";
import type { ClassLevel } from "@/lib/types";

// Student accounts are created only when an admin confirms a registration:
//  1. registerStudent → enrollments/{id} (pending, uid "") + enrollmentSecrets/{id} (scrypt hash; no client access).
//     The hash is also kept after a decline, so that student is told why they can't sign in;
//     it's removed when they register again.
//  2. decideRegistration("confirmed") → Firebase Auth user (uid = id, random password) + users/{uid} profile
//  3. first sign-in → lookupLogin checks the chosen password against the hash, makes it the real
//     Firebase password, and deletes the hash. From then on Firebase Auth checks it directly.
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

export type LoginLookup =
  | { status: "ok"; email: string }
  | { status: "rejected"; note: string }
  | { status: "pending" | "waitlisted" | "invalid" | "unavailable" };

const classLevels = ["9", "10", "11", "12"];
const validEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
/** Sign-in email for students who registered with a phone only (never receives mail). */
const phoneEmail = (key: string) => `${key}@phone.cs-masterclass.invalid`;

const setupError = "The website's server isn't connected to Firebase yet. (Admin: add service-account.json — see setup notes.)";

function fail(err: unknown): { ok: false; error: string } {
  if (isCredentialError(err)) return { ok: false, error: setupError };
  console.error("[student-actions]", err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/** The caller must be a signed-in admin (verified from their Firebase ID token). */
async function requireAdmin(idToken: string) {
  const decoded = await adminAuth().verifyIdToken(idToken);
  if (isAdminEmail(decoded.email)) return decoded;
  const profile = await adminDb().doc(`users/${decoded.uid}`).get();
  if (profile.get("role") === "admin") return decoded;
  throw new Error("not-admin");
}

/** Checks an email/password against Firebase Auth without signing in (Identity Toolkit REST). */
async function passwordMatches(email: string, password: string) {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const base = emulator ? `http://${emulator}/identitytoolkit.googleapis.com` : "https://identitytoolkit.googleapis.com";
  const res = await fetch(`${base}/v1/accounts:signInWithPassword?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: false }),
    cache: "no-store",
  });
  return res.ok;
}

/**
 * First sign-in after confirmation: if the password matches the one chosen at registration,
 * it becomes the account's Firebase password. Returns the sign-in email, or "" if it doesn't match.
 */
async function activate(uid: string, password: string) {
  const db = adminDb();
  const secret = await db.doc(`enrollmentSecrets/${uid}`).get();
  if (!secret.exists || !(await verifyPassword(password, secret.data() as StoredPassword))) return "";
  const user = await adminAuth().updateUser(uid, { password });
  await secret.ref.delete();
  return user.email ?? "";
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
  if (parentPhone && !phoneKey(parentPhone)) return { ok: false, error: "Enter your parent's mobile number, e.g. 01712345678." };
  if (password.length < 6 || password.length > 128) return { ok: false, error: "Choose a password with at least 6 characters." };
  if (!classLevels.includes(input.classLevel)) return { ok: false, error: "Choose your class." };

  try {
    const db = adminDb();
    const batch = await db.doc(`batches/${String(input.batchId)}`).get();
    if (!batch.exists || batch.get("classLevel") !== input.classLevel || batch.get("locationId") !== input.locationId) {
      return { ok: false, error: "Choose a batch for your class and centre." };
    }
    if (batch.get("status") === "full" || batch.get("status") === "closed") return { ok: false, error: "That batch isn't taking students — please choose another." };

    // Already a student, or already waiting?
    const [byPhone, byEmail, openByPhone] = await Promise.all([
      db.collection("users").where("phoneKey", "==", key).limit(1).get(),
      email ? db.collection("users").where("email", "==", email).limit(1).get() : null,
      db.collection("enrollments").where("phoneKey", "==", key).get(),
    ]);
    if (!byPhone.empty || (byEmail && !byEmail.empty)) return { ok: false, error: "You already have an account — please sign in." };
    if (email) {
      const existing = await adminAuth().getUserByEmail(email).catch(() => null);
      if (existing) return { ok: false, error: "This email already has an account — please sign in." };
    }
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

// ── Public: sign-in help ────────────────────────────────────────────

/**
 * For the sign-in form, when Firebase can't sign someone in directly. Phone numbers → the account's
 * sign-in email; first sign-ins after confirmation are activated; registrations still waiting for a
 * decision are reported. Everything needs the right password, so this can't be used to look people up.
 */
export async function lookupLogin(identifier: string, password: string): Promise<LoginLookup> {
  const id = String(identifier ?? "").trim().toLowerCase();
  const pw = String(password ?? "");
  if (!id || !pw) return { status: "invalid" };
  const isEmail = id.includes("@");
  const key = isEmail ? "" : phoneKey(id);
  if (!isEmail && !key) return { status: "invalid" };

  try {
    const db = adminDb();
    const users = await db.collection("users").where(isEmail ? "email" : "phoneKey", "==", isEmail ? id : key).limit(5).get();
    for (const u of users.docs) {
      const email = (u.get("authEmail") as string) || (u.get("email") as string);
      if (!isEmail && email && (await passwordMatches(email, pw))) return { status: "ok", email };
      const activated = await activate(u.id, pw);
      if (activated) return { status: "ok", email: activated };
    }

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
    return { status: "invalid" };
  } catch (err) {
    if (isCredentialError(err)) return { status: "unavailable" };
    console.error("[student-actions] lookupLogin", err);
    return { status: "invalid" };
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

    // Confirm: create the login with the password they chose, then the profile.
    if (!["pending", "waitlisted"].includes(reg.status)) return { ok: false, error: "Only pending or waitlisted registrations can be confirmed." };
    if (!(await secretRef.get()).exists) return { ok: false, error: "This registration's password is missing — ask the student to register again." };
    const taken = await db.collection("users").where("phoneKey", "==", reg.phoneKey).limit(1).get();
    if (!taken.empty) return { ok: false, error: `${reg.phone} already belongs to a student account.` };

    // uid = registration id, so a retry after a failure below finds the login already made.
    // The random password is replaced by the student's own on their first sign-in (see activate).
    const uid = enrollmentId;
    const authEmail = reg.email || phoneEmail(reg.phoneKey);
    const auth = adminAuth();
    const exists = await auth.getUser(uid).then(() => true, () => false);
    if (!exists) {
      try {
        await auth.createUser({
          uid,
          email: authEmail,
          // Phone-only sign-in emails can't be verified, so don't nag those students about it.
          emailVerified: !reg.email,
          displayName: reg.name,
          password: randomBytes(24).toString("base64url"),
        });
      } catch (err) {
        if ((err as { code?: string }).code === "auth/email-already-exists") return { ok: false, error: `${reg.email} already has an account.` };
        throw err;
      }
    }

    const wb = db.batch();
    wb.set(db.doc(`users/${uid}`), {
      name: reg.name,
      email: reg.email,
      phone: reg.phone,
      phoneKey: reg.phoneKey,
      parentPhone: reg.parentPhone ?? "",
      classLevel,
      locationId,
      batchId,
      photoURL: "",
      role: "student",
      authEmail,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    wb.update(ref, { ...decided, uid, status: "confirmed" });
    await wb.commit(); // the hash stays until their first sign-in

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
  if (String(password ?? "").length < 6) return { ok: false, error: "Use at least 6 characters." };
  try {
    await adminAuth().updateUser(String(uid), { password: String(password) });
    // The password chosen at registration no longer works.
    await adminDb().doc(`enrollmentSecrets/${String(uid)}`).delete();
    return { ok: true };
  } catch (err) {
    if ((err as { code?: string }).code === "auth/user-not-found") return { ok: false, error: "This student has no login." };
    return fail(err);
  }
}
