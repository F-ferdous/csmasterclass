"use client";

import Link from "next/link";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { useLenis } from "lenis/react";
import { ArrowUpRight } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { BookCover } from "@/components/books/book-cover";
import { Tilt } from "@/components/motion/tilt";
import { SplitHeading } from "@/components/motion/split-heading";
import { Reveal, ease } from "@/components/motion/reveal";
import { bookLevelLabels, bookLevels } from "@/lib/books";
import type { Book, BookLevel } from "@/lib/types";
import { formatBdt, priceLabels } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type LevelPick = { level: BookLevel; levels: { level: BookLevel; count: number }[]; onChange: (l: BookLevel) => void };

/**
 * Home-page book showcase with an O Level / A Level toggle. On tablets and up the
 * section pins to the screen and vertical scrolling slides the books sideways; on
 * phones it becomes a swipeable carousel.
 */
export function BookShowcase({ books }: { books: Book[] }) {
  const ref = useRef<HTMLElement>(null);
  const lenis = useLenis();
  const levels = bookLevels.map((level) => ({ level, count: books.filter((b) => b.level === level).length })).filter((l) => l.count > 0);
  const [level, setLevel] = useState<BookLevel>(levels[0]?.level ?? "o-level");
  const shown = books.filter((b) => b.level === level);

  function pick(next: BookLevel) {
    setLevel(next);
    // The pinned track's height depends on how many books it holds — go back to its start
    // so a shorter list doesn't drop the reader past the section.
    const el = ref.current;
    if (el && el.getBoundingClientRect().top < 0) {
      if (lenis) lenis.scrollTo(el, { immediate: true });
      else el.scrollIntoView();
    }
  }

  const picker: LevelPick = { level, levels, onChange: pick };
  return (
    <section ref={ref} className="relative bg-band text-band-ink">
      <PinnedTrack books={shown} picker={picker} />
      <SwipeTrack books={shown} picker={picker} />
    </section>
  );
}

function LevelToggle({ level, levels, onChange, id }: LevelPick & { id: string }) {
  if (levels.length < 2) return null;
  return (
    <div role="tablist" aria-label="Book level" className="inline-flex w-fit rounded-full border border-band-ink/20 p-1">
      {levels.map((l) => (
        <button
          key={l.level}
          type="button"
          role="tab"
          aria-selected={level === l.level}
          onClick={() => onChange(l.level)}
          className={cn(
            "relative rounded-full px-4 py-2 text-sm font-medium transition-colors sm:px-5",
            level === l.level ? "text-band" : "opacity-75 hover:opacity-100",
          )}
        >
          {level === l.level && (
            <motion.span layoutId={`level-pill-${id}`} className="absolute inset-0 rounded-full bg-band-accent" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
          )}
          <span className="relative whitespace-nowrap">
            {bookLevelLabels[l.level]}
            <span className="ml-1.5 text-xs opacity-60">{l.count}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Header({ picker, id }: { picker: LevelPick; id: string }) {
  return (
    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div>
        <p className="mb-5 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] opacity-70">
          <span className="h-px w-8 bg-band-accent" /> The books
        </p>
        <SplitHeading
          segments={["Lessons you can ", { em: "take home." }]}
          className="text-4xl leading-[1.05] sm:text-5xl lg:text-6xl [&_.text-ember]:text-band-accent"
        />
        <div className="mt-6">
          <LevelToggle {...picker} id={id} />
        </div>
      </div>
      <Link
        href="/books"
        className="group inline-flex w-fit items-center gap-2 rounded-full border border-band-ink/25 px-5 py-3 text-sm font-medium transition-colors hover:bg-band-ink hover:text-band"
      >
        View all books
        <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </div>
  );
}

function PinnedTrack({ books, picker }: { books: Book[]; picker: LevelPick }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  // How far the track must travel so its last card ends at the right edge.
  useLayoutEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;
      setDistance(Math.max(0, trackRef.current.scrollWidth - window.innerWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.0005 });
  const x = useTransform(progress, [0, 1], [0, -distance]);
  const [active, setActive] = useState(1);
  useMotionValueEvent(progress, "change", (v) => {
    setActive(Math.min(books.length, Math.max(1, Math.round(v * (books.length - 1)) + 1)));
  });

  return (
    <div ref={sectionRef} className="relative hidden md:block" style={{ height: `${100 + books.length * 70}vh` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center gap-10 overflow-hidden pt-16">
        <div className="container-x">
          <Header picker={picker} id="pin" />
        </div>

        <motion.div
          ref={trackRef}
          style={{ x, paddingLeft: "max(2rem, calc((100vw - 1200px) / 2 + 2rem))" }}
          className="flex w-max gap-8 pr-16"
        >
          {books.map((book, i) => (
            <ShowcaseCard key={book.slug} book={book} index={i} />
          ))}
          <Link
            href="/books"
            className="group grid w-[300px] shrink-0 place-items-center rounded-[2rem] border border-dashed border-band-ink/25 transition-colors hover:border-band-accent"
          >
            <span className="text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-band-accent text-band transition-transform duration-500 group-hover:rotate-45">
                <ArrowUpRight className="size-6" aria-hidden />
              </span>
              <span className="mt-5 block font-display text-2xl">The full library</span>
            </span>
          </Link>
        </motion.div>

        <div className="container-x flex items-center gap-5">
          <span className="font-mono text-xs tabular-nums opacity-70">
            {String(Math.min(active, books.length)).padStart(2, "0")} / {String(books.length).padStart(2, "0")}
          </span>
          <div className="relative h-px flex-1 bg-band-ink/15">
            <motion.div style={{ scaleX: progress }} className="absolute inset-0 origin-left bg-band-accent" />
          </div>
          <span className="font-mono text-xs uppercase tracking-[0.18em] opacity-70">Scroll</span>
        </div>
      </div>
    </div>
  );
}

function ShowcaseCard({ book, index }: { book: Book; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease }}
      className="grid w-[min(78vw,880px)] shrink-0 grid-cols-[minmax(0,280px)_1fr] items-center gap-10 rounded-[2rem] border border-band-ink/10 bg-band-ink/[0.04] p-8 lg:gap-14 lg:p-12">
      <Tilt>
        <Link href={`/books/${book.slug}`} className="block" aria-label={book.title}>
          <BookCover book={book} sizes="280px" />
        </Link>
      </Tilt>
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-band-accent">
          {String(index + 1).padStart(2, "0")} · {book.category}
        </p>
        <h3 className="mt-4 font-display text-3xl leading-[1.1] lg:text-4xl text-balance">{book.title}</h3>
        <p className="mt-2 font-display text-lg italic opacity-80">{book.subtitle}</p>
        <p className="mt-5 line-clamp-3 leading-relaxed opacity-75">{book.description}</p>
        {book.facts.length > 0 && (
          <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-4">
            {book.facts.map((f) => (
              <div key={f.label}>
                <dt className="sr-only">{f.label}</dt>
                <dd className="font-display text-3xl leading-none text-band-accent">{f.value}</dd>
                <dd className="mt-1.5 text-xs opacity-70">{f.label}</dd>
              </div>
            ))}
          </dl>
        )}
        {book.prices.length > 0 && (
          <p className="mt-7 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {book.prices.map((p) => (
              <span key={p.kind}>
                <span className="opacity-70">{priceLabels[p.kind]}</span>{" "}
                <strong className="font-semibold">{formatBdt(p.bdt)}</strong>
              </span>
            ))}
          </p>
        )}
        <Link
          href={`/books/${book.slug}`}
          className="group mt-6 inline-flex items-center gap-2 rounded-full bg-band-ink px-6 py-3 text-sm font-medium text-band transition-transform active:scale-95"
        >
          Discover the book
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </motion.article>
  );
}

function SwipeTrack({ books, picker }: { books: Book[]; picker: LevelPick }) {
  return (
    <div className="py-20 md:hidden">
      <div className="container-x">
        <Header picker={picker} id="swipe" />
      </div>
      <Reveal className="mt-10">
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none]" data-lenis-prevent>
          {books.map((book, i) => (
            <Link
              key={book.slug}
              href={`/books/${book.slug}`}
              className="w-[72vw] max-w-[300px] shrink-0 snap-center rounded-[1.5rem] border border-band-ink/10 bg-band-ink/[0.04] p-5"
            >
              <BookCover book={book} sizes="72vw" />
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-band-accent">
                {String(i + 1).padStart(2, "0")} · {book.category}
              </p>
              <h3 className="mt-2 font-display text-2xl leading-tight">{book.title}</h3>
              {book.facts[0] && (
                <p className="mt-2 text-sm opacity-75">
                  <span className="font-display text-lg text-band-accent">{book.facts[0].value}</span> {book.facts[0].label.toLowerCase()}
                </p>
              )}
            </Link>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
