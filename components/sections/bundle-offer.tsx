"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { BookCover } from "@/components/books/book-cover";
import { ease } from "@/components/motion/reveal";
import { bundle } from "@/lib/content";
import { formatBdt, formatUsd, orderHref, priceLabels, wholeBookPrice } from "@/lib/pricing";
import type { Book } from "@/lib/types";

/**
 * The all-books bundle, shown as the best-value option. The "separately" price
 * and the saving are worked out from each book's own prices.
 */
export function BundleOffer({ books }: { books: Book[] }) {
  const included = books.filter((b) => b.status !== "draft");

  const tiers = bundle.options.map((option) => {
    const parts = included.map((b) => wholeBookPrice(b, option.kind));
    const separate = parts.every((p) => p !== undefined) ? parts.reduce<number>((sum, p) => sum + (p ?? 0), 0) : undefined;
    const saving = separate && separate > option.bdt ? separate - option.bdt : undefined;
    const percent = saving && separate ? Math.round((saving / separate) * 100) : undefined;
    const order = orderHref(`Hello! I'd like to order ${bundle.title} — ${priceLabels[option.kind]} (${formatBdt(option.bdt)}).`);
    return { ...option, separate, saving, percent, order };
  });

  return (
    <section id="bundle" className="container-x scroll-mt-24 py-12 sm:py-16">
      <motion.div
        className="relative overflow-hidden rounded-[2rem] bg-band p-6 text-band-ink sm:p-10 lg:p-14"
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 1, ease }}
      >
        <motion.div
          aria-hidden
          className="absolute -right-24 -top-24 size-96 rounded-full bg-band-accent/20 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div aria-hidden className="absolute -bottom-32 -left-20 size-96 rounded-full bg-ember/20 blur-3xl" />

        <div className="relative grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          {/* Story + fanned covers */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="relative inline-flex items-center gap-1.5 rounded-full bg-band-accent px-4 py-1.5 text-sm font-semibold text-band">
                <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-band-accent opacity-30" />
                <Sparkles className="relative size-4" aria-hidden />
                <span className="relative">Best value</span>
              </span>
              <span className="text-xs uppercase tracking-[0.18em] opacity-70">Bundle offer</span>
            </div>
            <h2 className="mt-6 font-display text-4xl leading-[1.05] sm:text-5xl text-balance">
              All five books. <em className="text-band-accent">One price.</em>
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed opacity-80">
              Everything for Cambridge 0478 / 2210 — the Handbook, Topical Notes, Question Bank, Past Papers and Mock Exams —
              together for far less than buying them one by one.
            </p>

            <CoverFan books={included} />

            <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              {included.map((b) => (
                <li key={b.slug} className="flex items-center gap-2 opacity-90">
                  <Check className="size-4 shrink-0 text-band-accent" aria-hidden />
                  {b.title}
                </li>
              ))}
            </ul>
          </div>

          {/* Price tiers */}
          <div className="grid gap-5 sm:grid-cols-2">
            {tiers.map((t, i) => (
              <motion.div
                key={t.kind}
                className="group relative flex flex-col rounded-3xl border border-band-ink/15 bg-band-ink/[0.06] p-6 backdrop-blur transition-colors hover:border-band-accent/60 sm:p-7"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.15, ease }}
                whileHover={{ y: -6 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{priceLabels[t.kind]} bundle</p>
                  {t.percent && (
                    <motion.span
                      className="shrink-0 whitespace-nowrap rounded-full bg-ember px-3 py-1 text-xs font-bold text-white"
                      initial={{ scale: 0, rotate: -20 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.7 + i * 0.15 }}
                    >
                      Save {t.percent}%
                    </motion.span>
                  )}
                </div>

                {t.separate && (
                  <p className="mt-6 text-sm opacity-60">
                    <span className="sr-only">Regular price </span>
                    <s>{formatBdt(t.separate)}</s>
                  </p>
                )}
                <p className="mt-1 whitespace-nowrap font-display text-5xl tracking-tight text-band-accent">
                  {t.bdt.toLocaleString("en-US")}
                  <span className="ml-1.5 text-lg font-normal tracking-normal">BDT</span>
                </p>
                <p className="mt-1 text-sm opacity-70">
                  {t.usd ? `${formatUsd(t.usd)} USD` : t.kind === "hard" ? "Printed books" : "Digital PDFs"}
                </p>
                {t.saving && (
                  <p className="mt-4 rounded-xl bg-band-ink/10 px-3 py-2 text-sm">
                    You save <strong className="font-semibold">{formatBdt(t.saving)}</strong>
                  </p>
                )}

                <Link
                  href={t.order.href}
                  {...(t.order.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-band-accent px-5 py-3 text-sm font-semibold text-band transition-transform active:scale-95"
                >
                  Get the bundle
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </motion.div>
            ))}
            <p className="text-xs leading-relaxed opacity-60 sm:col-span-2">
              Compared with buying each book separately in the same format. Topical Notes is counted at its all-chapters price.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/** Five covers that fan out when scrolled into view and spread further on hover. */
function CoverFan({ books }: { books: Book[] }) {
  const mid = (books.length - 1) / 2;
  return (
    <motion.div
      className="relative my-8 flex h-44 items-end justify-center sm:h-52"
      initial="stacked"
      whileInView="fanned"
      whileHover="spread"
      viewport={{ once: true, margin: "-10% 0px" }}
    >
      {books.map((b, i) => {
        const offset = i - mid;
        return (
          <motion.div
            key={b.slug}
            className="absolute bottom-0 w-24 origin-bottom sm:w-28"
            style={{ zIndex: 10 - Math.abs(Math.round(offset)) }}
            variants={{
              stacked: { x: 0, rotate: 0, y: 30, opacity: 0 },
              fanned: { x: offset * 46, rotate: offset * 8, y: Math.abs(offset) * 6, opacity: 1 },
              spread: { x: offset * 62, rotate: offset * 11, y: Math.abs(offset) * 8, opacity: 1 },
            }}
            transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.1 * i }}
          >
            <BookCover book={b} sizes="112px" />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
