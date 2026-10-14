"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BookCover } from "@/components/books/book-cover";
import { ease } from "@/components/motion/reveal";
import { bundle } from "@/lib/content";
import { formatBdt } from "@/lib/pricing";
import type { Book } from "@/lib/types";

type Tier = { kind: "soft" | "hard"; bdt: number; separate?: number; percent?: number };

const SEEN_KEY = "bundle-popup-seen";
const DELAY_MS = 2500;

/** A 400×300 bundle promotion that opens 2.5 s into a visit — once per browser session. */
export function BundlePopup({ books, tiers }: { books: Book[]; tiers: Tier[] }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const soft = tiers.find((t) => t.kind === "soft");
  const hard = tiers.find((t) => t.kind === "hard");

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

  if (!soft || books.length === 0) return null;
  const fan = books.slice(0, 5);
  const mid = (fan.length - 1) / 2;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[65] grid place-items-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button type="button" aria-label="Close offer" className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bundle-popup-title"
            className="relative grid h-[300px] w-full max-w-[400px] grid-cols-[112px_1fr] gap-5 overflow-hidden rounded-3xl bg-band p-6 text-band-ink shadow-lift"
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <motion.div
              aria-hidden
              className="absolute -right-16 -top-16 size-48 rounded-full bg-band-accent/25 blur-3xl"
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <div aria-hidden className="absolute -bottom-20 -left-10 size-48 rounded-full bg-ember/25 blur-3xl" />

            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-band-ink/10 transition-colors hover:bg-band-ink/20"
            >
              <X className="size-4" />
            </button>

            {/* Covers fanning upward */}
            <div className="relative self-center" style={{ height: 200 }} aria-hidden>
              {fan.map((b, i) => {
                const offset = i - mid;
                return (
                  <motion.div
                    key={b.slug}
                    className="absolute left-1/2 top-1/2 w-[76px] origin-bottom"
                    style={{ zIndex: 10 - Math.abs(Math.round(offset)), marginLeft: -38, marginTop: -54 }}
                    initial={{ y: 60, rotate: 0, opacity: 0 }}
                    animate={{ y: offset * 22, x: offset * 5, rotate: offset * 7, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 140, damping: 15, delay: 0.25 + 0.08 * i }}
                  >
                    <BookCover book={b} sizes="76px" />
                  </motion.div>
                );
              })}
            </div>

            <div className="relative flex min-w-0 flex-col">
              <motion.span
                className="inline-flex items-center gap-1.5 self-start rounded-full bg-band-accent px-3 py-1 text-xs font-semibold text-band"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease }}
              >
                <Sparkles className="size-3.5" aria-hidden />
                {soft.percent ? `Save ${soft.percent}%` : "Best value"}
              </motion.span>
              <motion.h2
                id="bundle-popup-title"
                className="mt-3 font-display text-2xl leading-[1.1] text-balance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease }}
              >
                All five books. <em className="text-band-accent">One price.</em>
              </motion.h2>
              <p className="mt-1 text-xs opacity-70">{bundle.title} · 0478 / 2210</p>

              <div className="mt-auto">
                {soft.separate && (
                  <p className="text-xs opacity-60">
                    <span className="sr-only">Regular price </span>
                    <s>{formatBdt(soft.separate)}</s>
                  </p>
                )}
                <p className="whitespace-nowrap font-display text-3xl tracking-tight text-band-accent">
                  {soft.bdt.toLocaleString("en-US")}
                  <span className="ml-1 text-sm font-normal tracking-normal">BDT softcopy</span>
                </p>
                {hard && <p className="text-xs opacity-70">or {formatBdt(hard.bdt)} printed</p>}
                <Link
                  href="/books#bundle"
                  onClick={() => setOpen(false)}
                  className="group mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-band-accent px-4 py-2.5 text-sm font-semibold text-band transition-transform active:scale-95"
                >
                  See the bundle
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
