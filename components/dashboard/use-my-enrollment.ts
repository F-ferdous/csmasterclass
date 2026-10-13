"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { byNewest, normalizeEnrollment, type EnrollmentRecord } from "@/lib/enrollments";
import { db } from "@/lib/firebase";

/** The signed-in student's most recent enrollment request (live). */
export function useMyEnrollment() {
  const { user } = useAuth();
  const [latest, setLatest] = useState<EnrollmentRecord | null>(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db(), "enrollments"), where("uid", "==", user.uid)),
      (snap) => setLatest(snap.docs.map((d) => normalizeEnrollment(d.id, d.data())).sort(byNewest)[0] ?? null),
      () => setLatest(null),
    );
  }, [user]);

  return latest;
}
