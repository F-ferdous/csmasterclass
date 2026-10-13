"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { DashboardFrame } from "@/components/dashboard/frame";
import { adminNav } from "./nav";

/** Admin-only frame: sidebar, top bar and access control. */
export function AdminShell({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, loading, configured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Keep any filters in the URL (e.g. ?batch=…) so sign-in returns to the same view.
    if (configured && !loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
    }
  }, [configured, loading, user, router, pathname]);

  if (!configured) return <Centered><p className="text-ink-soft">Firebase is not configured for this site.</p></Centered>;
  if (loading || !user) return <Centered><Loader2 className="size-6 animate-spin text-ink-soft" /></Centered>;
  if (!isAdmin) return <NoAccess uid={user.uid} email={user.email ?? ""} hasProfile={Boolean(profile)} />;

  return (
    <DashboardFrame
      nav={adminNav}
      subtitle="Admin dashboard"
      name={profile?.name || user.displayName || "Admin"}
      email={user.email ?? ""}
      actions={
        <>
          <Link href="/dashboard" className="hidden items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm hover:border-ink md:inline-flex">
            Student view
          </Link>
          <Link href="/" target="_blank" className="hidden items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm hover:border-ink sm:inline-flex">
            View site <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </>
      }
    >
      {children}
    </DashboardFrame>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="grid min-h-dvh place-items-center px-4">{children}</div>;
}

/** Signed in but not an admin — explains exactly how to grant access. */
function NoAccess({ uid, email, hasProfile }: { uid: string; email: string; hasProfile: boolean }) {
  const [copied, setCopied] = useState(false);
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const docUrl = projectId ? `https://console.firebase.google.com/project/${projectId}/firestore/databases/-default-/data/~2Fusers~2F${uid}` : undefined;

  return (
    <Centered>
      <div className="w-full max-w-xl rounded-[2rem] border border-line p-8 sm:p-10">
        <span className="grid size-12 place-items-center rounded-2xl bg-ember/15 text-ember">
          <ShieldAlert className="size-6" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-3xl">Admins only</h1>
        <p className="mt-2 text-ink-soft">
          You&apos;re signed in as <strong className="font-medium text-ink">{email}</strong>, but this account isn&apos;t an admin yet.
        </p>

        <div className="mt-6 rounded-2xl bg-paper-2 p-5 text-sm">
          <p className="font-medium">To make this account an admin:</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-ink-soft">
            <li>Open Firebase console → Firestore → <code>users</code> → this user&apos;s document.</li>
            <li>
              Change the <code>role</code> field from <code>student</code> to <code>admin</code>.
            </li>
            <li>Come back here — the dashboard opens automatically.</li>
          </ol>
          {!hasProfile && (
            <p className="mt-3 text-ember">
              No profile document was found for this account — make sure the Firestore security rules are deployed, then sign out and in again.
            </p>
          )}
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2">
            <span className="text-xs text-ink-faint">User ID</span>
            <code className="min-w-0 flex-1 truncate text-xs">{uid}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(uid).then(() => setCopied(true))}
              aria-label="Copy user ID"
              className="grid size-8 place-items-center rounded-lg hover:bg-paper-2"
            >
              {copied ? <Check className="size-4 text-forest" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {docUrl && (
            <a href={docUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-forest-ink">
              Open in Firebase console <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
          <Link href="/" className="rounded-full border border-line px-5 py-2.5 text-sm">
            Back to site
          </Link>
        </div>
      </div>
    </Centered>
  );
}
