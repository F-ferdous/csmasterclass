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
import { db } from "./firebase";
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
  invalid: "auth/invalid-credential",
} as const;

/**
 * Sign in with a mobile number or email. Students are checked on the server (which sets their
 * session cookie); an email that isn't a student login is then tried as an admin (Firebase Auth).
 */
export async function signIn(identifier: string, password: string): Promise<"student" | "admin"> {
  const id = identifier.trim();
  const result = await signInStudent(id, password);
  if (result.status === "ok") return "student";
  if (result.status !== "try-admin") throw appError(studentErrors[result.status], result.status === "rejected" ? result.note : "");
  await signInWithEmailAndPassword(auth(), id, password);
  return "admin";
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth(), email.trim(), { url: `${window.location.origin}/login` });
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
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email/phone and password don't match. Try again or reset your password.";
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
      return "Too many wrong passwords. Please wait 10 minutes and try again, or ask your teacher to reset it.";
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
