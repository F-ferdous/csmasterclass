"use client";

import {
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { lookupLogin } from "@/app/student-actions";
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

const lookupError = (found: Exclude<Awaited<ReturnType<typeof lookupLogin>>, { status: "ok" }>) =>
  appError(lookupErrors[found.status], found.status === "rejected" ? found.note : "");

const lookupErrors = {
  pending: "app/registration-pending",
  waitlisted: "app/registration-waitlisted",
  rejected: "app/registration-rejected",
  unavailable: "app/server-unavailable",
  invalid: "auth/invalid-credential",
} as const;

/**
 * Sign in with an email address or a Bangladeshi mobile number. Emails go straight to Firebase;
 * otherwise the server finds the account (phone sign-in, a first sign-in after confirmation, or a
 * registration still waiting for a decision).
 */
export async function signIn(identifier: string, password: string) {
  const id = identifier.trim();
  if (id.includes("@")) {
    try {
      return (await signInWithEmailAndPassword(auth(), id, password)).user;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "auth/invalid-credential" && code !== "auth/user-not-found" && code !== "auth/wrong-password") throw err;
      const found = await lookupLogin(id, password).catch(() => null);
      if (!found || found.status === "unavailable") throw err;
      if (found.status !== "ok") throw lookupError(found);
      return (await signInWithEmailAndPassword(auth(), found.email, password)).user;
    }
  }
  const found = await lookupLogin(id, password);
  if (found.status !== "ok") throw lookupError(found);
  return (await signInWithEmailAndPassword(auth(), found.email, password)).user;
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth(), email.trim(), { url: `${window.location.origin}/login` });
}

export function resendVerification() {
  const user = auth().currentUser;
  return user ? sendEmailVerification(user) : Promise.resolve();
}

export function signOut() {
  return fbSignOut(auth());
}

/** Only allow same-site relative redirects after sign-in. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
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
      return "Phone sign-in isn't available right now. Try your email address, or contact your teacher.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Choose a stronger password — at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
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
