"use client";

import { collection, deleteField, doc, getDocs, setDoc } from "firebase/firestore";
import { sendPush, type PushPayload, type PushSub } from "@/app/push-actions";
import { reaches, type AudienceType } from "@/lib/announcements";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase-client";
import { normalizeProfile } from "@/lib/normalize";
import { endpointKey } from "@/lib/push";

type Target = { uids?: string[]; batchIds?: string[]; audience?: { audienceType: AudienceType; audienceValues: string[] } };

/**
 * Sends a push notification to every device of the targeted students who turned notifications on.
 * Best effort: returns how many were sent, or 0 if push isn't set up.
 */
export async function notifyStudents(target: Target, payload: PushPayload) {
  const d = db();
  const [usersSnap, subsSnap] = await Promise.all([getDocs(collection(d, "students")), getDocs(collection(d, "pushSubscriptions"))]);
  const students = usersSnap.docs.map((x) => normalizeProfile(x.id, x.data())).filter((u) => u.role === "student");
  const wanted = new Set(
    students
      .filter((u) =>
        target.uids
          ? target.uids.includes(u.uid)
          : target.batchIds
            ? target.batchIds.includes(u.batchId)
            : target.audience
              ? reaches(target.audience, u)
              : false,
      )
      .map((u) => u.uid),
  );

  const owners = new Map<string, string>(); // endpoint → uid
  const subs: PushSub[] = [];
  for (const s of subsSnap.docs) {
    if (!wanted.has(s.id)) continue;
    for (const sub of Object.values((s.data().subs ?? {}) as Record<string, PushSub>)) {
      if (!sub?.endpoint) continue;
      owners.set(sub.endpoint, s.id);
      subs.push({ endpoint: sub.endpoint, keys: sub.keys });
    }
  }
  if (!subs.length) return 0;

  const token = await auth().currentUser?.getIdToken();
  if (!token) return 0;
  const result = await sendPush(token, subs, payload);
  if (!result.ok) return 0;

  // Forget devices that have unsubscribed or been reset.
  await Promise.all(
    result.gone.map((endpoint) => setDoc(doc(d, "pushSubscriptions", owners.get(endpoint)!), { subs: { [endpointKey(endpoint)]: deleteField() } }, { merge: true })),
  ).catch(() => {});
  return result.sent;
}
