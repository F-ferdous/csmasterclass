import { existsSync } from "node:fs";
import { join } from "node:path";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Server-side Firebase (full admin access — never import this from client code).
// Credentials, in order: service-account.json in the project folder (local dev, git-ignored),
// FIREBASE_SERVICE_ACCOUNT_KEY (the JSON as one line), or the host's own (Firebase App Hosting).
const keyFile = join(process.cwd(), "service-account.json");

function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (inline) return initializeApp({ credential: cert(JSON.parse(inline)), projectId });
  if (existsSync(keyFile)) return initializeApp({ credential: cert(keyFile), projectId });
  return initializeApp({ projectId });
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());

/** True for the "no credentials" family of errors, so callers can explain the setup step. */
export function isCredentialError(err: unknown) {
  const msg = String((err as Error)?.message ?? err);
  return /default credentials|Credential implementation|invalid_grant|Failed to determine service account|Could not refresh access token|metadata\.google\.internal/i.test(msg);
}
