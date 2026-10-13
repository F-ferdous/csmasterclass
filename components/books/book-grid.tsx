"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useMemo, useState } from "react";
import { BookCard } from "./book-card";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ease } from "@/components/motion/reveal";

/** Filterable grid — category chips animate the grid reflow. */
export function BookGrid({ books }: { books: Book[] }) {
  const categories = useMemo(() => ["All", ...Array.from(new Set(books.map((b) => b.category)))], [books]);
  const [active, setActive] = useState("All");
  const visible = active === "All" ? books : books.filter((b) => b.category === active);

  return (
    <LayoutGroup>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={active === c}
            onClick={() => setActive(c)}
            className={cn(
              "relative rounded-full border px-4 py-2 text-sm transition-colors",
              active === c ? "border-ink text-paper" : "border-line text-ink-soft hover:border-ink hover:text-ink",
            )}
          >
            {active === c && (
              <motion.span layoutId="chip" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
            )}
            <span className="relative">{c}</span>
          </button>
        ))}
      </div>

      <motion.div layout className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {visible.map((book, i) => (
            <motion.div
              key={book.slug}
              layout
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.6, delay: i * 0.05, ease }}
            >
              <BookCard book={book} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}
