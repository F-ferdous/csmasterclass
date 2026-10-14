"use client";

import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { db } from "@/lib/firebase";
import { normalizeHomework, normalizeSubmission, type Homework, type Submission } from "@/lib/homework";
import { studentAudienceKeys } from "@/lib/resources";

export type MyHomework = { homework: Homework; submission: Submission | null };

/**
 * Homework set for the signed-in student's batch, each with their own submission (live).
 * Queries only the student's audience keys, as firestore.rules requires.
 */
export function useMyHomework() {
  const { user, profile } = useAuth();
  const uid = user?.uid ?? "";
  const keys = profile ? studentAudienceKeys(profile).join("|") : "";
  const [state, setState] = useState<{ key: string; homework: Homework[] } | null>(null);
  const [subs, setSubs] = useState<Record<string, Submission | null>>({});

  useEffect(() => {
    if (!uid || !keys) return;
    const key = `${uid}|${keys}`;
    return onSnapshot(
      query(collection(db(), "homework"), where("audienceKeys", "array-contains-any", keys.split("|"))),
      (snap) => setState({ key, homework: snap.docs.map((d) => normalizeHomework(d.id, d.data())) }),
      () => setState({ key, homework: [] }),
    );
  }, [uid, keys]);

  const current = state?.key === `${uid}|${keys}` ? state.homework : null;
  const ids = current?.map((h) => h.id).join(",") ?? "";

  // The student's own submission for each piece of homework.
  useEffect(() => {
    if (!uid || !ids) return;
    const stops = ids.split(",").map((id) =>
      onSnapshot(
        doc(db(), "homework", id, "submissions", uid),
        (snap) => setSubs((s) => ({ ...s, [id]: snap.exists() ? normalizeSubmission(uid, snap.data()) : null })),
        () => setSubs((s) => ({ ...s, [id]: null })),
      ),
    );
    return () => stops.forEach((s) => s());
  }, [uid, ids]);

  // Wait until every submission has loaded, so cards don't flash the "submit" form.
  if (!current || current.some((h) => !(h.id in subs))) return null;
  return current.map((homework) => ({ homework, submission: subs[homework.id] ?? null })) as MyHomework[];
}
