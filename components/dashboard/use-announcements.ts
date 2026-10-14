"use client";

import { useEffect, useState } from "react";
import { getMyAnnouncements } from "@/app/student-data";
import { useStudentSession } from "@/components/auth/student-session";
import type { Announcement } from "@/lib/announcements";
import { useStudentData } from "./use-student-data";

const seenKey = (uid: string) => `announcements-seen:${uid}`;

function readSeen(uid: string) {
  try {
    return Number(localStorage.getItem(seenKey(uid))) || 0;
  } catch {
    return 0;
  }
}

/** Published, unexpired announcements meant for the signed-in student. */
export function useMyAnnouncements(): Announcement[] | null {
  return useStudentData("announcements", getMyAnnouncements);
}

/**
 * "New" = published after the student last opened Announcements.
 * Returns the cut-off captured on mount, so badges stay visible during this visit.
 */
export function useSeenCutoff(markSeenOnMount: boolean) {
  const { student } = useStudentSession();
  const uid = student?.uid ?? "";
  const [cutoff] = useState(() => (uid ? readSeen(uid) : 0));

  useEffect(() => {
    if (!markSeenOnMount || !uid) return;
    try {
      localStorage.setItem(seenKey(uid), String(Date.now()));
    } catch {}
  }, [markSeenOnMount, uid]);

  return cutoff;
}

export const isNewSince = (a: Announcement, cutoff: number) => ((a.publishedAt ?? a.createdAt)?.getTime() ?? 0) > cutoff;
