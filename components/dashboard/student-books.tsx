"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { BookCard } from "@/components/books/book-card";
import { PageHeader } from "@/components/admin/ui";
import { bundle } from "@/lib/content";
import { formatBdt } from "@/lib/pricing";
import { useBooks } from "./use-books";

export function StudentBooks() {
  const books = useBooks();
  const soft = bundle.options.find((o) => o.kind === "soft");

  return (
    <div className="space-y-8">
      <PageHeader title="Books" description="Everything for Cambridge 0478 / 2210 — notes, question banks, past papers and mock exams." />

      {soft && (
        <Link
          href="/books#bundle"
          className="group flex flex-col justify-between gap-4 rounded-3xl bg-band p-6 text-band-ink transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:p-8"
        >
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-band-accent text-band">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-band-accent">Best value</p>
              <p className="mt-1 font-display text-2xl">All five books for {formatBdt(soft.bdt)}</p>
              <p className="mt-1 text-sm opacity-75">{bundle.title} — softcopy or hardcopy.</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-band-accent px-5 py-2.5 text-sm font-semibold text-band">
            See the bundle <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
      )}

      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
        {books.map((b) => (
          <BookCard key={b.slug} book={b} />
        ))}
      </div>
    </div>
  );
}
