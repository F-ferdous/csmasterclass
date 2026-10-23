"use client";

import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { signInStudent, signOutStudent } from "@/app/student-actions";
import { clearStudentCache } from "@/components/dashboard/use-student-data";
import { db, firebaseApp } from "./firebase";
import { auth } from "./firebase-client";
import type { ClassLevel } from "./types";

/** Class, centre and batch chosen on the Join form. */
export type Enrollment = { classLevel: ClassLevel | ""; locationId: string; batchId: string };

/**
 * Gives an admin account made in the Firebase console a users/{uid} profile on first sign-in.
 * (Student profiles are created on the server when their registration is confirmed.)
 */
export async function ensureProfile(user: User) {
  const ref = doc(db(), "users", user.uid);
  if ((await getDoc(ref)).exists()) return false;
  await setDoc(ref, {
    name: user.displayName || "",
    email: user.email ?? "",
    phone: "",
    parentPhone: "",
    classLevel: "",
    locationId: "",
    batchId: "",
    photoURL: user.photoURL ?? "",
    role: "admin",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return true;
}

/** An error the sign-in form can explain (see authErrorMessage); `detail` is shown with it. */
const appError = (code: string, detail = "") => Object.assign(new Error(code), { code, detail });

const studentErrors = {
  pending: "app/registration-pending",
  waitlisted: "app/registration-waitlisted",
  rejected: "app/registration-rejected",
  unavailable: "app/server-unavailable",
  locked: "auth/too-many-requests",
  invalid: "app/student-invalid",
  admin: "app/admin-account",
} as const;

/**
 * Student sign-in (/login): email + mobile number, checked on the server against the students
 * collection — no Firebase Auth. The server sets the session cookie.
 */
export async function signInStudentAccount(email: string, phone: string) {
  const result = await signInStudent(email.trim(), phone.trim());
  if (result.status !== "ok") throw appError(studentErrors[result.status], result.status === "rejected" ? result.note : "");
}

/** Admin sign-in (/admin-login): Firebase Authentication email + password. */
export async function signInAdmin(email: string, password: string) {
  try {
    await signInWithEmailAndPassword(auth(), email.trim(), password);
  } catch (err) {
    if ((err as { code?: string })?.code !== "auth/network-request-failed") throw err;
    // One quiet retry: a dropped mobile connection often works on the second go.
    await signInWithEmailAndPassword(auth(), email.trim(), password);
  }
}

/**
 * Technical details for a failed admin sign-in, shown under the error so the owner can send a screenshot:
 * the browser's own error, whether it thinks it's online, and whether Google's sign-in server answers at all.
 */
export async function networkErrorDetails(err: unknown) {
  const raw = (err as { customData?: { message?: string } })?.customData?.message || "timeout / no detail";
  let probe: string;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApp().options.apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(10000) },
    );
    probe = `reachable (${res.status})`;
  } catch (e) {
    probe = `unreachable (${String(e)})`;
  }
  return `Details: ${raw} · online: ${navigator.onLine ? "yes" : "no"} · Google sign-in server: ${probe}`;
}

/** Admin password reset email (students' password is their mobile number). */
export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth(), email.trim(), { url: `${window.location.origin}/admin-login` });
}

/** Signs out of both kinds of account (student session cookie and admin Firebase login). */
export async function signOut() {
  await Promise.all([signOutStudent(), fbSignOut(auth())]);
  clearStudentCache();
}

/** Only allow same-site relative redirects after sign-in ("/\evil.com" counts as another site in browsers). */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}

/** Friendly messages for the Firebase Auth errors people actually hit. */
export function authErrorMessage(err: unknown) {
  const code = (err as { code?: string })?.code ?? "";
  const detail = (err as { detail?: string })?.detail ?? "";
  switch (code) {
    case "app/student-invalid":
      return "That email and mobile number don't match. Use the email and mobile number you registered with.";
    case "app/admin-account":
      return "This is an admin account — please sign in on the admin sign-in page.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password don't match. Try again or reset your password.";
    case "app/registration-pending":
      return "Your registration is waiting for your teacher to confirm your seat. You can sign in once it's confirmed.";
    case "app/registration-waitlisted":
      return "You're on the waiting list for this batch. You can sign in once your seat is confirmed.";
    case "app/registration-rejected":
      return `Your registration wasn't accepted${detail ? ` — “${detail}”` : ""}. Please contact your teacher, or register again for another batch.`;
    case "app/server-unavailable":
      return "Sign-in isn't available right now. Please try again later, or contact your teacher.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Choose a stronger password — at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many wrong tries. Please wait 10 minutes and try again, or contact your teacher.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled yet in Firebase Authentication.";
    case "auth/network-request-failed":
      return "Network error — check your connection and try again.";
    case "auth/unauthorized-domain":
      return "This website's domain isn't authorised for sign-in yet (Firebase → Authentication → Settings).";
    default:
      return "Something went wrong. Please try again.";
  }
}
