import { cache } from "react";
import { normalizeProfile } from "@/lib/normalize";
import type { UserProfile } from "@/lib/types";
import { adminDb } from "./firebase-admin";
import { sessionFromCookies } from "./session";

// Students live in students/{id} and sign in with their email + mobile number (app/student-actions.ts).
// Browsers can't read that collection (firestore.rules) — only this server.

export const studentDoc = (id: string) => adminDb().doc(`students/${id}`);

/** The student signed in on this request, or null (no cookie, bad signature, old session, or disabled). */
export const currentStudent = cache(async (): Promise<UserProfile | null> => {
  const session = await sessionFromCookies();
  if (!session) return null;
  const snap = await studentDoc(session.id).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if ((data.sessionVersion ?? 1) !== session.version || data.status === "disabled") return null;
  return normalizeProfile(snap.id, data);
});

/** Same, but throws when nobody is signed in — every student Server Function starts with this. */
export async function requireStudent() {
  const me = await currentStudent();
  if (!me) throw new Error("signed-out");
  return me;
}
