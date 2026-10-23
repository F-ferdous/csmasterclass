"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useStudentSession } from "@/components/auth/student-session";
import { isFirebaseConfigured } from "@/lib/firebase";
import { homeworkStatus } from "@/lib/homework";
import { useAppSetup } from "./app-install";
import { DashboardFrame, FullScreenSpinner } from "./frame";
import { studentNav } from "./student-nav";
import { isNewSince, useMyAnnouncements, useSeenCutoff } from "./use-announcements";
import { useMyHomework } from "./use-homework";

/** Signed-in students only: sidebar, top bar and redirect to sign-in. */
export function StudentShell({ children }: { children: ReactNode }) {
  const { student, loading } = useStudentSession();
  const router = useRouter();
  const pathname = usePathname();
  useAppSetup();
  const homework = useMyHomework();
  const announcements = useMyAnnouncements();
  const seen = useSeenCutoff(false);
  const badges = {
    "/dashboard/homework": (homework ?? []).filter((h) => ["todo", "overdue"].includes(homeworkStatus(h.homework, h.submission))).length,
    "/dashboard/announcements": pathname === "/dashboard/announcements" ? 0 : (announcements ?? []).filter((a) => isNewSince(a, seen)).length,
  };

  useEffect(() => {
    // Keep any filters in the URL (e.g. ?batch=…) so sign-in returns to the same view.
    if (isFirebaseConfigured && !loading && !student) {
      router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
    }
  }, [loading, student, router, pathname]);

  if (!isFirebaseConfigured) {
    return (
      <div className="grid min-h-dvh place-items-center px-4 text-ink-soft">Accounts aren&apos;t available yet.</div>
    );
  }
  if (loading || !student) return <FullScreenSpinner />;

  return (
    <DashboardFrame
      nav={studentNav}
      badges={badges}
      subtitle="Student dashboard"
      name={student.name || "Student"}
      email={student.email || student.phone}
      actions={
        <Link href="/" className="inline-flex max-sm:hidden rounded-full border border-line px-4 py-2 text-sm hover:border-ink">
          Website
        </Link>
      }
    >
      {children}
    </DashboardFrame>
  );
}
