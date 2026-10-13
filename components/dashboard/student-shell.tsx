"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { DashboardFrame, FullScreenSpinner } from "./frame";
import { studentNav } from "./student-nav";

/** Signed-in students only: sidebar, top bar and redirect to sign-in. */
export function StudentShell({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, loading, configured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Keep any filters in the URL (e.g. ?batch=…) so sign-in returns to the same view.
    if (configured && !loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
    }
  }, [configured, loading, user, router, pathname]);

  if (!configured) {
    return (
      <div className="grid min-h-dvh place-items-center px-4 text-ink-soft">Accounts aren&apos;t available yet.</div>
    );
  }
  if (loading || !user) return <FullScreenSpinner />;

  return (
    <DashboardFrame
      nav={studentNav}
      subtitle="Student dashboard"
      name={profile?.name || user.displayName || "Student"}
      email={profile?.email || profile?.phone || user.email || ""}
      actions={
        <>
          {isAdmin && (
            <Link href="/admin" className="hidden items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm hover:border-ink sm:inline-flex">
              <LayoutDashboard className="size-3.5" aria-hidden /> Admin
            </Link>
          )}
          <Link href="/" className="hidden rounded-full border border-line px-4 py-2 text-sm hover:border-ink sm:inline-flex">
            Website
          </Link>
        </>
      }
    >
      {children}
    </DashboardFrame>
  );
}
