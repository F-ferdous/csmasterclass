"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { BookCover } from "./book-cover";
import { Tilt } from "@/components/motion/tilt";
import { ease } from "@/components/motion/reveal";
import type { Book } from "@/lib/types";
import { formatBdt, lowestPrice } from "@/lib/pricing";

/** `tag` is an optional label pinned to the top-left of the cover panel (e.g. "Must have"). */
export function BookCard({ book, tag }: { book: Book; tag?: ReactNode }) {
  const from = lowestPrice(book);
  return (
    <Link href={`/books/${book.slug}`} className="group block">
      <div
        className="relative overflow-hidden rounded-[1.75rem] px-[16%] pb-[13%] pt-[13%] transition-colors duration-500"
        style={{ background: `radial-gradient(circle at 50% 35%, ${book.coverAccent}40, transparent 70%), var(--paper-2)` }}
      >
        {/* curtain wipe on first view */}
        <motion.div
          initial={{ clipPath: "inset(100% 0 0 0)" }}
          whileInView={{ clipPath: "inset(0% 0 0 0)" }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 1.2, ease }}
        >
          <Tilt>
            <BookCover book={book} sizes="(min-width: 1024px) 280px, (min-width: 640px) 40vw, 70vw" />
          </Tilt>
        </motion.div>
        {tag && <span className="absolute left-4 top-4">{tag}</span>}
        {book.status === "coming-soon" && (
          <span className="absolute right-4 top-4 rounded-full bg-ember px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-paper">
            Coming soon
          </span>
        )}
        <span className="absolute bottom-4 right-4 grid size-11 translate-y-3 place-items-center rounded-full bg-ink text-paper opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="size-5" aria-hidden />
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{book.category}</p>
        {from && (
          <p className="shrink-0 rounded-full bg-paper-2 px-3 py-1 text-xs">
            From <strong className="font-semibold">{formatBdt(from.bdt)}</strong>
            {from.kind === "chapter" && " / chapter"}
          </p>
        )}
      </div>
      <h3 className="mt-1.5 font-display text-2xl leading-tight transition-colors group-hover:text-ember">{book.title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{book.subtitle}</p>
      {book.facts.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {book.facts.slice(0, 3).map((f) => (
            <span key={f.label}>
              <span className="font-display font-semibold">{f.value}</span> <span className="text-ink-soft">{f.label.toLowerCase()}</span>
            </span>
          ))}
        </p>
      )}
    </Link>
  );
}
