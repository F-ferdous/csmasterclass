import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

// NEXT_PUBLIC_* vars must be referenced literally so Next.js can inline them.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/** False until the .env.local values are filled in — the site then runs on sample content. */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export function firebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured — see .env.example");
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/**
 * NEXT_PUBLIC_FIREBASE_EMULATORS=1 → use the local emulators (ports in firebase.json) instead of the
 * live project. For testing only; the server side also needs FIRESTORE_EMULATOR_HOST and
 * FIREBASE_AUTH_EMULATOR_HOST.
 */
export const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1";
export const emulatorHost = "127.0.0.1";

let firestore: Firestore | undefined;

export function db() {
  if (firestore) return firestore;
  firestore = getFirestore(firebaseApp());
  if (useEmulators) connectFirestoreEmulator(firestore, emulatorHost, 8181);
  return firestore;
}
