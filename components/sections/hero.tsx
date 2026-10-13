"use client";

import Link from "next/link";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { ArrowDown } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { BookCover } from "@/components/books/book-cover";
import { ButtonLink } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";
import { SplitHeading } from "@/components/motion/split-heading";
import { ease } from "@/components/motion/reveal";
import type { Book } from "@/lib/types";

export function Hero({ books }: { books: Book[] }) {
  const ref = useRef<HTMLElement>(null);

  // Pointer position normalised to -0.5…0.5, smoothed by a spring.
  const mx = useSpring(useMotionValue(0), { stiffness: 80, damping: 20 });
  const my = useSpring(useMotionValue(0), { stiffness: 80, damping: 20 });

  // 0 → 1 as the hero scrolls out of view.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });
  const textY = useTransform(progress, [0, 1], [0, -160]);
  const textOpacity = useTransform(progress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden pb-20 pt-28 sm:pt-36 lg:min-h-[100svh] lg:pb-24"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {/* atmosphere */}
      <div aria-hidden className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_70%)]" />
      <motion.div
        aria-hidden
        className="absolute -right-40 top-10 size-[38rem] rounded-full bg-gold/25 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -left-40 bottom-0 size-[28rem] rounded-full bg-sage/30 blur-3xl"
        animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="container-x relative grid items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
        <motion.div style={{ y: textY, opacity: textOpacity }}>
          <motion.p
            className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-line bg-paper/70 px-4 py-2 text-xs font-medium text-ink-soft backdrop-blur"
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease }}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-ember opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-ember" />
            </span>
            <span className="sm:hidden">IGCSE &amp; O Level CS · 10+ years</span>
            <span className="hidden sm:inline">Cambridge IGCSE &amp; O Level Computer Science · 10+ years</span>
          </motion.p>

          <SplitHeading
            as="h1"
            immediate
            delay={0.2}
            segments={["Making computer science ", { em: "feel like common sense." }]}
            className="text-[2.6rem] leading-[1.08] sm:text-6xl lg:text-[4.1rem] xl:text-[4.6rem]"
          />

          <motion.p
            className="mt-7 max-w-xl text-lg leading-relaxed text-ink-soft text-pretty"
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.9, ease }}
          >
            A decade of helping 0478 and 2210 students think clearly, code confidently and walk into exams calm —
            now gathered into handbooks, notes, question banks and mock papers you can learn from at your own pace.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.1, ease }}
          >
            <Magnetic>
              <ButtonLink href="/books">Explore the books</ButtonLink>
            </Magnetic>
            <ButtonLink href="/teaching" variant="ghost" arrow={false}>
              How I teach
            </ButtonLink>
          </motion.div>

          <motion.a
            href="#after-hero"
            className="mt-14 hidden items-center gap-3 text-sm text-ink-soft lg:inline-flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 1 }}
          >
            <span className="grid size-10 place-items-center rounded-full border border-line">
              <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
                <ArrowDown className="size-4" aria-hidden />
              </motion.span>
            </span>
            Scroll to explore
          </motion.a>
        </motion.div>

        <BookStack books={books} mx={mx} my={my} progress={progress} />
      </div>
      <span id="after-hero" className="absolute bottom-0" />
    </section>
  );
}

// Resting pose for each book (back-left, back-right, front-centre) and how far it fans out on scroll.
const placements = [
  { x: -36, rotate: -12, spreadX: -30, spreadR: -10, depth: 18, z: 1, delay: 0.5 },
  { x: 36, rotate: 10, spreadX: 30, spreadR: 10, depth: 26, z: 2, delay: 0.7 },
  { x: 0, rotate: -2, spreadX: 0, spreadR: 2, depth: 40, z: 3, delay: 0.9 },
];

function BookStack({
  books,
  mx,
  my,
  progress,
}: {
  books: Book[];
  mx: MotionValue<number>;
  my: MotionValue<number>;
  progress: MotionValue<number>;
}) {
  // The lead title sits on top, in the centre.
  const [lead, second, third] = books;
  const trio = [second, third, lead].filter(Boolean);
  const stackY = useTransform(progress, [0, 1], [0, 140]);
  const stackScale = useTransform(progress, [0, 1], [1, 0.88]);

  return (
    <motion.div
      className="relative mx-auto h-[420px] w-full max-w-[540px] sm:h-[520px] lg:h-[600px]"
      style={{ y: stackY, scale: stackScale }}
    >
      {/* slowly turning orbit rings */}
      <motion.div
        aria-hidden
        className="absolute inset-[6%] rounded-full border border-dashed border-ink/15"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute -top-1.5 left-1/2 size-3 rounded-full bg-ember" />
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute inset-[20%] rounded-full border border-ink/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute -bottom-1 left-1/3 size-2 rounded-full bg-forest" />
      </motion.div>

      {trio.map((book, i) => (
        <StackedBook key={book.slug} book={book} index={i} mx={mx} my={my} progress={progress} />
      ))}

      <FloatingCard mx={mx} my={my} depth={-30} className="left-0 top-4 hidden sm:block sm:-left-4" delay={1.4}>
        <p className="font-mono text-[11px] leading-relaxed text-ink-soft">
          <span className="text-ember">IF</span> student = &quot;stuck&quot;
          <br />
          &nbsp;&nbsp;<span className="text-ember">THEN</span> draw_it()
          <br />
          <span className="text-ember">ENDIF</span>
        </p>
      </FloatingCard>

      <FloatingCard mx={mx} my={my} depth={-45} className="bottom-2 right-0 sm:bottom-8 sm:-right-2" delay={1.6}>
        <p className="font-display text-2xl leading-none">471</p>
        <p className="mt-1 text-xs text-ink-soft">exam questions, topic by topic</p>
      </FloatingCard>
    </motion.div>
  );
}

function StackedBook({
  book,
  index,
  mx,
  my,
  progress,
}: {
  book: Book;
  index: number;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  progress: MotionValue<number>;
}) {
  const p = placements[index];
  const x = useTransform(mx, (v) => v * p.depth);
  const y = useTransform(my, (v) => v * p.depth);
  // Fan out as the page scrolls.
  const spreadX = useTransform(progress, [0, 1], ["0%", `${p.spreadX}%`]);
  const spreadRotate = useTransform(progress, [0, 1], [0, p.spreadR]);

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" style={{ zIndex: p.z }}>
      <motion.div className="pointer-events-auto w-[46%] max-w-[250px]" style={{ x, y }}>
        <motion.div style={{ x: spreadX, rotate: spreadRotate }}>
          <motion.div
            initial={{ opacity: 0, y: 160, rotate: 0, x: "0%", scale: 0.85 }}
            animate={{ opacity: 1, y: 0, rotate: p.rotate, x: `${p.x}%`, scale: 1 }}
            whileHover={{ y: -22, rotate: p.rotate * 0.3, scale: 1.05, transition: { duration: 0.45, ease } }}
            transition={{ duration: 1.3, delay: p.delay, ease }}
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6 + index, repeat: Infinity, ease: "easeInOut", delay: index * 0.8 }}
            >
              <Link href={`/books/${book.slug}`} className="block" aria-label={book.title}>
                <BookCover book={book} priority sizes="250px" />
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function FloatingCard({
  children,
  className,
  mx,
  my,
  depth,
  delay,
}: {
  children: ReactNode;
  className?: string;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  depth: number;
  delay: number;
}) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return (
    <motion.div className={`absolute z-10 ${className}`} style={{ x, y }}>
      <motion.div
        className="rounded-2xl border border-line bg-paper/85 px-4 py-3 shadow-soft backdrop-blur-md"
        initial={{ opacity: 0, scale: 0.6, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
        transition={{
          opacity: { duration: 0.6, delay },
          scale: { type: "spring", stiffness: 200, damping: 14, delay },
          y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: delay + 0.6 },
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
