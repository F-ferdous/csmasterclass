"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { signOut } from "@/lib/auth";
import { useStudentSession } from "@/components/auth/student-session";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Not built yet — shows a "Soon" badge and a placeholder page. */
  soon?: boolean;
  description: string;
};

export type NavGroup = { group: string; items: NavItem[] };

type Props = {
  children: ReactNode;
  nav: NavGroup[];
  /** Shown under the brand in the sidebar, e.g. "Admin dashboard". */
  subtitle: string;
  name: string;
  email: string;
  /** Small counts beside nav items, keyed by href (e.g. homework to do). */
  badges?: Record<string, number>;
  /** Extra buttons in the top bar (left of the theme toggle). */
  actions?: ReactNode;
};

/** Shared dashboard chrome: sidebar (drawer on mobile), sticky top bar, content area. */
export function DashboardFrame({ children, nav, subtitle, name, email, actions, badges = {} }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { refresh: refreshSession } = useStudentSession();
  const [navOn, setNavOn] = useState<string | null>(null);
  const mobileOpen = navOn === pathname; // closes automatically after navigating
  const items = nav.flatMap((g) => g.items);
  const current = [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-9 place-items-center rounded-xl bg-forest font-mono text-sm font-bold text-forest-ink">{"{}"}</span>
        <span className="leading-tight">
          <span className="block font-display">{site.brand}</span>
          <span className="block text-xs text-ink-soft">{subtitle}</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6" data-lenis-prevent aria-label={subtitle}>
        {nav.map((group) => (
          <div key={group.group}>
            <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-faint">{group.group}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = current?.href === item.href;
                return (
                  <li key={item.href} className="relative">
                    {active && (
                      <motion.span
                        layoutId={`${subtitle}-nav`}
                        className="absolute inset-0 rounded-xl bg-ink"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    )}
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        active ? "text-paper" : "text-ink-soft hover:bg-paper-2 hover:text-ink",
                      )}
                    >
                      <item.icon className="size-[18px]" aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      {(badges[item.href] ?? 0) > 0 && (
                        <span
                          aria-label={`${badges[item.href]} new`}
                          className={cn("min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums", active ? "bg-paper/25 text-paper" : "bg-ember text-white")}
                        >
                          {badges[item.href]}
                        </span>
                      )}
                      {item.soon && (
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", active ? "bg-paper/20" : "bg-paper-2 text-ink-faint")}>
                          Soon
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-forest text-xs font-semibold text-forest-ink">{initials}</span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-ink-soft">{email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut().then(() => {
              refreshSession();
              router.replace("/");
            })}
            aria-label="Sign out"
            title="Sign out"
            className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-paper-2 hover:text-ember"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-paper-2/40 lg:block">{sidebar}</aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="fixed inset-0 z-[60] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setNavOn(null)} />
            <motion.aside
              className="relative h-full w-[280px] bg-paper shadow-lift"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => setNavOn(null)}
                aria-label="Close menu"
                className="absolute right-3 top-5 grid size-9 place-items-center rounded-full border border-line"
              >
                <X className="size-4" />
              </button>
              {sidebar}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-line bg-paper/80 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setNavOn(pathname)} aria-label="Open menu" className="grid size-10 place-items-center rounded-full border border-line lg:hidden">
              <Menu className="size-4" />
            </button>
            <p className="truncate text-sm text-ink-soft">
              {subtitle} <span className="text-ink-faint">/</span> <span className="font-medium text-ink">{current?.label ?? "Overview"}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export function FullScreenSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <Loader2 className="size-6 animate-spin text-ink-soft" />
    </div>
  );
}
