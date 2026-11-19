"use client";

import { LayoutGroup, motion } from "motion/react";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { BookCard } from "./book-card";
import { bookLevelLabels, bookLevels } from "@/lib/books";
import type { Book, BookLevel, ClassLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ease } from "@/components/motion/reveal";

const classes: ClassLevel[] = ["9", "10", "11", "12"];
const levelOfClass = (c: ClassLevel): BookLevel => (c === "9" || c === "10" ? "o-level" : "a-level");

/** Books meant for a class: the ones ticked for it in Admin → Books, else every book of that class's level. */
function forClass(books: Book[], c: ClassLevel) {
  const planned = books.filter((b) => b.forClasses[c]);
  return planned.length ? planned : books.filter((b) => b.level === levelOfClass(c));
}

/** Filterable grid: level, class, type and a search box. Chips animate the grid reflow. */
export function BookGrid({ books }: { books: Book[] }) {
  const [level, setLevel] = useState<BookLevel | "all">("all");
  const [klass, setKlass] = useState<ClassLevel | "all">("all");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const levels = bookLevels.filter((l) => books.some((b) => b.level === l));
  const categories = useMemo(() => ["All", ...Array.from(new Set(books.map((b) => b.category)))], [books]);

  const q = search.trim().toLowerCase();
  const classBooks = klass === "all" ? books : forClass(books, klass);
  const visible = classBooks.filter(
    (b) =>
      (level === "all" || b.level === level) &&
      (category === "All" || b.category === category) &&
      (!q || [b.title, b.subtitle, b.category, b.syllabus ?? "", b.description].some((v) => v.toLowerCase().includes(q))),
  );
  const filtered = level !== "all" || klass !== "all" || category !== "All" || q !== "";

  function reset() {
    setLevel("all");
    setKlass("all");
    setCategory("All");
    setSearch("");
  }

  return (
    <LayoutGroup>
      <div className="grid gap-3 lg:grid-cols-[auto_auto_1fr] lg:items-center">
        {levels.length > 1 && (
          <div className="grid grid-cols-3 gap-1 rounded-2xl border border-line p-1 sm:flex sm:w-fit sm:rounded-full" role="group" aria-label="Level">
            {(["all", ...levels] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={level === l}
                onClick={() => setLevel(l)}
                className={cn("relative rounded-xl px-2 py-2 text-[13px] leading-tight sm:rounded-full sm:px-4 sm:text-sm", level === l ? "text-paper" : "text-ink-soft hover:text-ink")}
              >
                {level === l && <motion.span layoutId="book-level" className="absolute inset-0 rounded-xl bg-ink sm:rounded-full" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                <span className="relative">{l === "all" ? "All levels" : bookLevelLabels[l]}</span>
              </button>
            ))}
          </div>
        )}
        <label className="block sm:w-fit">
          <span className="sr-only">Class</span>
          <select
            value={klass}
            onChange={(e) => setKlass(e.target.value as ClassLevel | "all")}
            className="w-full rounded-full border border-line bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-ink sm:w-auto"
          >
            <option value="all">Any class</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                Books for Class {c}
              </option>
            ))}
          </select>
        </label>
        <label className="relative block lg:ml-auto lg:w-72">
          <span className="sr-only">Search books</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books"
            className="w-full rounded-full border border-line bg-paper py-2.5 pl-10 pr-4 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Type of book">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={cn(
              "relative rounded-full border px-4 py-2 text-sm transition-colors",
              category === c ? "border-ink text-paper" : "border-line text-ink-soft hover:border-ink hover:text-ink",
            )}
          >
            {category === c && (
              <motion.span layoutId="chip" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
            )}
            <span className="relative">{c === "All" ? "All types" : c}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex min-h-8 items-center gap-3 text-sm text-ink-soft" aria-live="polite">
        <span>
          {visible.length} {visible.length === 1 ? "book" : "books"}
          {klass !== "all" ? ` for Class ${klass}` : ""}
        </span>
        {filtered && (
          <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-ink underline-offset-4 hover:underline">
            <X className="size-3.5" aria-hidden /> Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 rounded-3xl border border-line px-6 py-12 text-center text-ink-soft">No books match these filters.</p>
      ) : (
        <motion.div layout className="mt-6 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((book, i) => (
            <motion.div
              key={book.slug}
              layout
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.05, ease }}
            >
              <BookCard book={book} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </LayoutGroup>
  );
}
