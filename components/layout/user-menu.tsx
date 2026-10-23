"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { GraduationCap, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useStudentSession } from "@/components/auth/student-session";
import { signOut } from "@/lib/auth";

/** Sign in / Join now when signed out; an account menu when signed in. */
export function AuthActions() {
  const { user, profile, isAdmin, loading, configured } = useAuth();
  const session = useStudentSession();

  if (!configured || loading || session.loading) {
    // Keep layout stable while auth state loads.
    return <span className="block max-sm:hidden h-11 w-[188px]" aria-hidden />;
  }

  if (session.student) {
    const s = session.student;
    return <AccountMenu name={s.name || "Student"} email={s.email || s.phone} isAdmin={false} />;
  }

  if (!user) {
    return (
      <>
        <Link
          href="/login"
          className="inline-flex max-lg:hidden rounded-full px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="inline-flex max-sm:hidden rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-forest-ink transition-colors hover:bg-ink hover:text-paper"
        >
          Join now
        </Link>
      </>
    );
  }

  const name = profile?.name || user.displayName || user.email || "Account";
  return <AccountMenu name={name} email={user.email ?? ""} isAdmin={isAdmin} />;
}

/** Students get their dashboard links; admins (Firebase sign-in) get the admin dashboard. */
function AccountMenu({ name, email, isAdmin }: { name: string; email: string; isAdmin: boolean }) {
  const router = useRouter();
  const { refresh } = useStudentSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = name.split(/[\s@]/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative block max-sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-line bg-paper/60 py-1 pl-1 pr-4 text-sm font-medium backdrop-blur transition-colors hover:border-ink"
      >
        <span className="grid size-9 place-items-center rounded-full bg-forest text-xs font-semibold text-forest-ink">{initials}</span>
        <span className="max-w-[9rem] truncate">{name.split(" ")[0]}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-[calc(100%+0.5rem)] w-64 origin-top-right rounded-2xl border border-line bg-paper p-2 shadow-lift"
          >
            <div className="px-3 py-2.5">
              <p className="truncate font-medium">{name}</p>
              <p className="truncate text-xs text-ink-soft">{email}</p>
            </div>
            <div className="my-1 h-px bg-line" />
            {isAdmin ? (
              <MenuLink href="/admin" icon={LayoutDashboard} label="Admin dashboard" onClick={() => setOpen(false)} />
            ) : (
              <>
                <MenuLink href="/dashboard" icon={GraduationCap} label="My dashboard" onClick={() => setOpen(false)} />
                <MenuLink href="/dashboard/profile" icon={UserRound} label="Profile" onClick={() => setOpen(false)} />
              </>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut().then(() => {
                  refresh();
                  router.push("/");
                });
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ember hover:bg-paper-2"
            >
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({ href, icon: Icon, label, onClick }: { href: string; icon: typeof UserRound; label: string; onClick: () => void }) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-paper-2">
      <Icon className="size-4 text-ink-soft" aria-hidden /> {label}
    </Link>
  );
}

/** Account links for the mobile menu. */
export function MobileAuthLinks() {
  const { user, isAdmin, configured } = useAuth();
  const { student, refresh } = useStudentSession();
  const router = useRouter();
  if (!configured) return null;
  if (!user && !student) {
    return (
      <div className="grid grid-cols-2 gap-3 pt-8">
        <Link href="/login" className="rounded-full border border-line px-5 py-3.5 text-center text-sm font-medium">
          Sign in
        </Link>
        <Link href="/signup" className="rounded-full bg-forest px-5 py-3.5 text-center text-sm font-semibold text-forest-ink">
          Join now
        </Link>
      </div>
    );
  }
  return (
    <div className="grid gap-3 pt-8">
      <div className="grid grid-cols-2 gap-3">
        <Link href={student ? "/dashboard" : "/admin"} className="rounded-full border border-line px-5 py-3.5 text-center text-sm font-medium">
          {student ? "My dashboard" : "Admin"}
        </Link>
        <button
          type="button"
          onClick={() =>
            signOut().then(() => {
              refresh();
              router.push("/");
            })
          }
          className="rounded-full border border-line px-5 py-3.5 text-sm text-ember"
        >
          Sign out
        </button>
      </div>
      {isAdmin && student && (
        <Link href="/admin" className="rounded-full bg-forest px-5 py-3.5 text-center text-sm font-semibold text-forest-ink">
          Admin dashboard
        </Link>
      )}
    </div>
  );
}
