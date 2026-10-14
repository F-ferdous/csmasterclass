"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, BadgeCheck, PartyPopper, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { BookCard } from "@/components/books/book-card";
import { BookCover } from "@/components/books/book-cover";
import { PageHeader } from "@/components/admin/ui";
import { ease } from "@/components/motion/reveal";
import { suggestBooks } from "@/lib/books";
import { bundle } from "@/lib/content";
import { bundleBooks, bundleTiers, formatBdt } from "@/lib/pricing";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useBooks } from "./use-books";
import { useStudent } from "./use-student";

export function StudentBooks() {
  const books = useBooks();
  const { profile } = useStudent();
  const classLevel = profile?.classLevel ?? "";
  const { must, optional, owned, other, planned } = suggestBooks(books, classLevel, profile?.booksOwned ?? []);
  const ownedSlugs = new Set(owned.map((b) => b.slug));
  // The bundle is for 0478 / 2210 — offer it to Class 9–10 while they're missing any of its books.
  const showBundle = (classLevel === "9" || classLevel === "10" || !classLevel) && bundleBooks(books).some((b) => !ownedSlugs.has(b.slug));
  const hadMust = books.some((b) => classLevel && b.forClasses[classLevel] === "must");

  if (!planned) {
    return (
      <div className="space-y-8">
        <PageHeader title="Books" description="Everything for Cambridge Computer Science — notes, question banks, past papers and mock exams." />
        {showBundle && <BundleBanner books={books} />}
        <Grid books={[...owned, ...other]} owned={ownedSlugs} />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <PageHeader title="Books" description={`Your book list for Class ${classLevel} — what you need, what helps, and what you already have.`} />

      {hadMust && (
        <Section title="Must have" note={must.length ? `${must.length} to get` : undefined}>
          {must.length ? (
            <Grid books={must} tag={<Chip tone="must">Must have</Chip>} />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="flex items-center gap-4 rounded-3xl border border-forest/30 bg-forest/[0.06] p-6"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-forest text-forest-ink">
                <PartyPopper className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-display text-xl">You have every must-have book</p>
                <p className="mt-0.5 text-sm text-ink-soft">That&apos;s everything you need for Class {classLevel}.</p>
              </div>
            </motion.div>
          )}
        </Section>
      )}

      {showBundle && <BundleBanner books={books} />}

      {optional.length > 0 && (
        <Section title="Optional" note="Helpful extra practice">
          <Grid books={optional} tag={<Chip tone="optional">Optional</Chip>} />
        </Section>
      )}

      {owned.length > 0 && (
        <Section title="Your books" note={`${owned.length} bought`}>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {owned.map((b) => (
              <Link key={b.slug} href={`/books/${b.slug}`} className="group">
                <div className="relative transition-transform duration-500 group-hover:-translate-y-1">
                  <BookCover book={b} sizes="140px" />
                  <span className="absolute -right-1.5 -top-1.5 grid size-7 place-items-center rounded-full bg-forest text-forest-ink shadow-soft">
                    <BadgeCheck className="size-4" aria-label="Bought" />
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-snug">{b.title}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {other.length > 0 && (
        <Section title="More from the library">
          <Grid books={other} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-line pb-3">
        <h2 className="font-display text-2xl">{title}</h2>
        {note && <p className="text-sm text-ink-soft">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Grid({ books, tag, owned }: { books: Book[]; tag?: ReactNode; owned?: Set<string> }) {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
      {books.map((b) => (
        <BookCard key={b.slug} book={b} tag={owned?.has(b.slug) ? <Chip tone="owned">Bought</Chip> : tag} />
      ))}
    </div>
  );
}

export function Chip({ tone, children }: { tone: "must" | "optional" | "owned"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider",
        tone === "must" && "bg-ember text-paper",
        tone === "optional" && "border border-line bg-paper text-ink-soft",
        tone === "owned" && "bg-forest text-forest-ink",
      )}
    >
      {children}
    </span>
  );
}

function BundleBanner({ books }: { books: Book[] }) {
  const soft = bundleTiers(books).find((t) => t.kind === "soft");
  if (!soft) return null;
  return (
    <Link
      href="/books#bundle"
      className="group flex flex-col justify-between gap-4 rounded-3xl bg-band p-6 text-band-ink transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:p-8"
    >
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-band-accent text-band">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-band-accent">Best value{soft.percent ? ` · save ${soft.percent}%` : ""}</p>
          <p className="mt-1 font-display text-2xl">All five books for {formatBdt(soft.bdt)}</p>
          <p className="mt-1 text-sm opacity-75">{bundle.title} — softcopy or hardcopy.</p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-band-accent px-5 py-2.5 text-sm font-semibold text-band">
        See the bundle <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
