"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, MessageCircle, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BookCover } from "@/components/books/book-cover";
import { whatsappGreen } from "@/components/layout/whatsapp-button";
import { ease } from "@/components/motion/reveal";
import { bookLevelLabels, bookLevels } from "@/lib/books";
import { bundle, premiumServices } from "@/lib/content";
import { levelForClass } from "@/lib/free-resources";
import { waLink } from "@/lib/phone";
import { formatBdt, lowestPrice } from "@/lib/pricing";
import { site } from "@/lib/site";
import type { Book, BookLevel, ClassLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tier = { kind: "soft" | "hard"; bdt: number; percent?: number };

const SEEN_KEY = "premium-popup-seen";
/** How long someone browses the free resources before the offer opens. */
const DELAY_MS = 150_000;

const levelClasses: Record<BookLevel, string> = { "o-level": "Class 9 & 10", "a-level": "Class 11 & 12" };

/**
 * Opens 2½ minutes into a visit to /free-resources (once per browser session): the books for the
 * visitor's class (Class 9–10 → O Level, 11–12 → A Level) and premium services, with WhatsApp buttons.
 */
export function PremiumPopup({ books, classLevel, bundleTier }: { books: Book[]; classLevel: ClassLevel | null; bundleTier?: Tier }) {
  const [open, setOpen] = useState(false);
  // Follows the class picked on the page until the visitor switches it here.
  const [picked, setPicked] = useState<BookLevel | null>(null);
  const level = picked ?? (classLevel ? levelForClass(classLevel) : "o-level");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
    } catch {
      // Storage blocked — still show it once for this page view.
    }
    const timer = window.setTimeout(() => {
      setOpen(true);
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {}
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const shown = books.filter((b) => b.status !== "draft" && b.level === level);
  const who = classLevel && levelForClass(classLevel) === level ? `Class ${classLevel}` : levelClasses[level];
  const orderText = `Hello! I'd like to buy the ${bookLevelLabels[level]} Computer Science books (${who}). Please share the details.`;
  const premiumText = `Hello! I'm interested in your premium services for ${who} (${bookLevelLabels[level]} Computer Science).`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[65] grid place-items-center px-4 py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button type="button" aria-label="Close offer" className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="premium-popup-title"
            data-lenis-prevent
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-3xl bg-band p-6 text-band-ink shadow-lift sm:p-8"
            initial={{ opacity: 0, scale: 0.88, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-band-accent/25 blur-3xl"
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-ember/25 blur-3xl" />

            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-band-ink/10 transition-colors hover:bg-band-ink/20"
            >
              <X className="size-4" />
            </button>

            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-band-accent px-3 py-1 text-xs font-semibold text-band">
                <Sparkles className="size-3.5" aria-hidden /> Enjoying the free resources?
              </span>
              <h2 id="premium-popup-title" className="mt-4 pr-8 font-display text-3xl leading-[1.08] text-balance sm:text-4xl">
                Go further with the <em className="text-band-accent">full books.</em>
              </h2>

              {/* Level switch: Class 9–10 → O Level, Class 11–12 → A Level */}
              <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-band-ink/10 p-1 text-sm" role="tablist" aria-label="Books for">
                {bookLevels.map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="tab"
                    aria-selected={level === l}
                    onClick={() => setPicked(l)}
                    className="relative rounded-full px-3 py-2 text-center leading-tight"
                  >
                    {level === l && (
                      <motion.span layoutId="premium-level" className="absolute inset-0 rounded-full bg-band-ink" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                    )}
                    <span className={cn("relative block font-semibold", level === l && "text-band")}>{levelClasses[l]}</span>
                    <span className={cn("relative block text-[11px]", level === l ? "text-band/70" : "opacity-70")}>{bookLevelLabels[l]}</span>
                  </button>
                ))}
              </div>

              {/* Swaps straight away (no exit animation to wait on) and fades the new list in. */}
              <motion.div key={level} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease }}>
                {shown.length > 0 ? (
                  <ul className="-mx-1 mt-5 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
                    {shown.map((b, i) => {
                      const from = lowestPrice(b);
                      return (
                        <motion.li
                          key={b.slug}
                          className="w-24 shrink-0 snap-start"
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.05 * i, ease }}
                        >
                          <Link href={`/books/${b.slug}`} onClick={() => setOpen(false)} className="group block">
                            <BookCover book={b} sizes="96px" className="transition-transform duration-500 group-hover:-translate-y-1" />
                            <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug">{b.title}</p>
                            <p className="mt-0.5 text-[11px] opacity-70">{from && from.bdt > 0 ? `From ${formatBdt(from.bdt)}` : "Price on request"}</p>
                          </Link>
                        </motion.li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-5 text-sm opacity-80">These books are on the way — message us to reserve a copy.</p>
                )}
                {level === "o-level" && bundleTier && (
                  <Link
                    href="/books#bundle"
                    onClick={() => setOpen(false)}
                    className="mt-2 inline-flex items-center gap-1 text-sm text-band-accent underline-offset-4 hover:underline"
                  >
                    {bundle.title}: all five for {formatBdt(bundleTier.bdt)}
                    {bundleTier.percent ? ` — save ${bundleTier.percent}%` : ""}
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </Link>
                )}
              </motion.div>

              <div className="mt-6 rounded-2xl border border-band-ink/15 bg-band-ink/5 p-4">
                <p className="font-display text-lg">Premium services</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {premiumServices.map((s) => (
                    <li key={s} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-band-accent" aria-hidden /> <span className="opacity-90">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <a
                  href={waLink(site.whatsapp, orderText)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white transition-transform active:scale-95"
                  style={{ backgroundColor: whatsappGreen }}
                >
                  <MessageCircle className="size-4" aria-hidden /> Order the books
                </a>
                <a
                  href={waLink(site.whatsapp, premiumText)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-band-accent px-4 py-3 text-sm font-semibold text-band transition-transform active:scale-95"
                >
                  <Sparkles className="size-4" aria-hidden /> Get premium services
                </a>
              </div>
              <p className="mt-3 text-center text-xs opacity-70">Both open WhatsApp · {site.phone}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
