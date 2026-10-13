"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { isExpired, normalizeAnnouncement, reaches, sortAnnouncements, type Announcement } from "@/lib/announcements";
import { db } from "@/lib/firebase";

const seenKey = (uid: string) => `announcements-seen:${uid}`;

function readSeen(uid: string) {
  try {
    return Number(localStorage.getItem(seenKey(uid))) || 0;
  } catch {
    return 0;
  }
}

/** Published, unexpired announcements meant for the signed-in student (live). */
export function useMyAnnouncements() {
  const { user, profile } = useAuth();
  const [all, setAll] = useState<Announcement[] | null>(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db(), "announcements"), where("status", "==", "published")),
      (snap) => setAll(snap.docs.map((d) => normalizeAnnouncement(d.id, d.data()))),
      () => setAll([]),
    );
  }, [user]);

  const mine = all && profile ? sortAnnouncements(all.filter((a) => !isExpired(a) && reaches(a, profile))) : all ? [] : null;
  return mine;
}

/**
 * "New" = published after the student last opened Announcements.
 * Returns the cut-off captured on mount, so badges stay visible during this visit.
 */
export function useSeenCutoff(markSeenOnMount: boolean) {
  const { user } = useAuth();
  const [cutoff] = useState(() => (user ? readSeen(user.uid) : 0));

  useEffect(() => {
    if (!markSeenOnMount || !user) return;
    try {
      localStorage.setItem(seenKey(user.uid), String(Date.now()));
    } catch {}
  }, [markSeenOnMount, user]);

  return cutoff;
}

export const isNewSince = (a: Announcement, cutoff: number) => ((a.publishedAt ?? a.createdAt)?.getTime() ?? 0) > cutoff;
