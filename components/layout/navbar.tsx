"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ease } from "@/components/motion/reveal";
import { ThemeToggle } from "./theme-toggle";
import { AuthActions, MobileAuthLinks } from "./user-menu";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label={`${site.brand} — home`}>
      <span className="grid size-9 place-items-center rounded-xl bg-forest font-mono text-sm font-bold text-forest-ink transition-transform duration-500 group-hover:rotate-[-8deg]">
        {"{}"}
      </span>
      <span className="font-display text-lg tracking-tight">{site.brand}</span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  // The menu remembers which page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "transition-[background,border-color,backdrop-filter] duration-500",
          scrolled || open ? "border-b border-line bg-paper/80 backdrop-blur-xl" : "border-b border-transparent",
        )}
      >
        <nav className="container-x flex h-18 items-center justify-between" aria-label="Main">
          <Logo />

          <ul className="flex max-lg:hidden items-center gap-1 rounded-full border border-line bg-paper/60 p-1 backdrop-blur">
            {site.nav.map((item) => (
              <li key={item.href} className="relative">
                {isActive(item.href) && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-ink"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "relative z-10 block whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    isActive(item.href) ? "text-paper" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthActions />
            <button
              type="button"
              onClick={() => setOpenOn(open ? null : pathname)}
              className="grid size-11 place-items-center rounded-full border border-line lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-x-0 bottom-0 top-18 bg-paper lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.ul
              className="container-x flex flex-col pt-8"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
            >
              {[...site.nav, { label: "Contact", href: "/contact" }].map((item, i) => (
                <motion.li
                  key={item.href}
                  variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }}
                  className="border-b border-line"
                >
                  <Link href={item.href} className="flex items-baseline justify-between py-5">
                    <span className={cn("font-display text-4xl", isActive(item.href) && "italic text-ember")}>{item.label}</span>
                    <span className="font-mono text-xs text-ink-faint">0{i + 1}</span>
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
            <div className="container-x">
              <MobileAuthLinks />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
