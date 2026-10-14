import { isAdminEmail } from "@/lib/admins";
import { adminAuth, adminDb } from "./firebase-admin";

/** The caller must be a signed-in admin (verified from their Firebase ID token). Throws otherwise. */
export async function requireAdmin(idToken: string) {
  const decoded = await adminAuth().verifyIdToken(String(idToken));
  if (isAdminEmail(decoded.email)) return decoded;
  const profile = await adminDb().doc(`users/${decoded.uid}`).get();
  if (profile.get("role") === "admin") return decoded;
  throw new Error("not-admin");
}
