"use client";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { auth, googleProvider } from "./firebase-client";
import type { ClassLevel } from "./types";
import { requestSeat } from "./enrollments";

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  phone: string;
  classLevel: ClassLevel | "";
  locationId: string;
  batchId: string;
};

/** Class, centre and batch chosen on the Join form. */
export type Enrollment = Pick<SignUpInput, "classLevel" | "locationId" | "batchId">;

/**
 * Creates users/{uid} the first time someone signs in (every new account is a student).
 * Returns true when a new profile was created.
 */
export async function ensureProfile(user: User, extra: Partial<Omit<SignUpInput, "password" | "email">> = {}) {
  const ref = doc(db(), "users", user.uid);
  if ((await getDoc(ref)).exists()) return false;
  await setDoc(ref, {
    name: extra.name || user.displayName || "",
    email: user.email ?? "",
    phone: extra.phone ?? "",
    classLevel: extra.classLevel ?? "",
    locationId: extra.locationId ?? "",
    batchId: extra.batchId ?? "",
    photoURL: user.photoURL ?? "",
    role: "student",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return true;
}

export async function signUpWithEmail(input: SignUpInput) {
  const cred = await createUserWithEmailAndPassword(auth(), input.email.trim(), input.password);
  await updateProfile(cred.user, { displayName: input.name.trim() });
  await ensureProfile(cred.user, {
    name: input.name.trim(),
    phone: input.phone.trim(),
    classLevel: input.classLevel,
    locationId: input.locationId,
    batchId: input.batchId,
  });
  // Ask for a seat in the chosen batch — an admin confirms it in Enrollments.
  await requestSeat(
    {
      uid: cred.user.uid,
      name: input.name.trim(),
      email: cred.user.email ?? input.email.trim(),
      phone: input.phone.trim(),
      classLevel: input.classLevel,
      locationId: input.locationId,
      batchId: input.batchId,
    },
    "signup",
  ).catch(() => {});
  // Not critical — the account works without it, and it can be re-sent from /account.
  sendEmailVerification(cred.user).catch(() => {});
  return cred.user;
}

export async function signInWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth(), email.trim(), password);
  return cred.user;
}

/** Google sign-in. On the Join form, the chosen class/centre/batch are saved for new accounts. */
export async function signInWithGoogle(enrollment?: Enrollment) {
  const cred = await signInWithPopup(auth(), googleProvider());
  const created = await ensureProfile(cred.user, enrollment ?? {});
  if (created && enrollment?.batchId) {
    await requestSeat(
      {
        uid: cred.user.uid,
        name: cred.user.displayName ?? "",
        email: cred.user.email ?? "",
        phone: "",
        ...enrollment,
      },
      "signup",
    ).catch(() => {});
  }
  return cred.user;
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
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password don't match. Try again or reset your password.";
    case "auth/email-already-in-use":
      return "An account already exists with this email. Sign in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Choose a stronger password — at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window. Allow pop-ups and try again.";
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
