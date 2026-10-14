"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { normalizeMyAttendance, type MyAttendanceEntry } from "@/lib/attendance";
import { db } from "@/lib/firebase";
import { normalizePastPapers, type PaperAttempt } from "@/lib/past-papers";
import { normalizeSyllabusProgress, type TopicProgress } from "@/lib/syllabus";
import { normalizeMyResults, type MyResult } from "@/lib/tests";

/** Live copy of one of the student's own per-uid documents (attendance, results, revision). */
function useOwnDoc<T>(collectionName: string, normalize: (raw: Record<string, unknown> | undefined) => T) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const [state, setState] = useState<{ uid: string; value: T } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db(), collectionName, uid),
      (snap) => setState({ uid, value: normalize(snap.data()) }),
      () => setState({ uid, value: normalize(undefined) }),
    );
  }, [uid, collectionName, normalize]);

  return state?.uid === uid ? state.value : null;
}

export const useMyAttendance = (): MyAttendanceEntry[] | null => useOwnDoc("studentAttendance", normalizeMyAttendance);
export const useMyResults = (): MyResult[] | null => useOwnDoc("studentResults", normalizeMyResults);
export const useMySyllabus = (): Record<string, TopicProgress> | null => useOwnDoc("syllabusProgress", normalizeSyllabusProgress);
export const useMyPastPapers = (): Record<string, PaperAttempt> | null => useOwnDoc("pastPapers", normalizePastPapers);
