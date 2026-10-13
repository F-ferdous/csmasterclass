"use client";

import { AnimatePresence, motion } from "motion/react";
import { Award, Quote } from "lucide-react";
import { useEffect, useState } from "react";
import { ease } from "@/components/motion/reveal";

const levels = ["O Level", "IGCSE", "AS Level", "A Level"];

const lines = [
  "Every expert was once a beginner who refused to give up.",
  "Understand the idea first — the code will follow.",
  "Small steps every day become top grades in June.",
  "Confusion is where learning begins, not where it ends.",
  "You don't have to be a genius. You have to be curious.",
];

/** Cycles through a list on a timer. */
function useCycle(length: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % length), ms);
    return () => clearInterval(id);
  }, [length, ms]);
  return i;
}

/** Inspirational right-hand panel on sign-in / join / reset pages. */
export function AuthAside() {
  const level = useCycle(levels.length, 2200);
  const line = useCycle(lines.length, 5000);

  return (
    // Pinned to the viewport (it never stretches with a long form), and sized so everything stays on screen.
    <aside className="relative hidden overflow-hidden bg-band text-band-ink lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:gap-6 lg:self-start lg:px-12 lg:py-10 xl:px-14 xl:py-12">
      {/* atmosphere */}
      <motion.div
        aria-hidden
        className="absolute -right-32 -top-32 size-[30rem] rounded-full bg-band-accent/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-ember/25 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <div aria-hidden className="dot-grid absolute inset-0 opacity-30" />

      {/* Levels */}
      <div className="relative">
        <motion.p
          className="text-xs uppercase tracking-[0.2em] opacity-70"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ duration: 0.7, ease }}
        >
          Cambridge &amp; Edexcel · Class 9 – 12
        </motion.p>
        <motion.h2
          className="mt-4 font-display text-4xl leading-[1.05] xl:text-5xl [@media(min-height:900px)]:xl:text-6xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease }}
        >
          Available for
          <span className="relative block h-[1.15em] overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.em
                key={levels[level]}
                className="absolute left-0 top-0 text-band-accent"
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.6, ease }}
              >
                {levels[level]}
              </motion.em>
            </AnimatePresence>
          </span>
        </motion.h2>
        <motion.div
          className="mt-5 flex flex-wrap gap-2"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } } }}
        >
          {["O Level", "IGCSE", "AS Level", "A Level", "Cambridge", "Edexcel"].map((t) => (
            <motion.span
              key={t}
              variants={{ hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1 } }}
              className="rounded-full border border-band-ink/20 bg-band-ink/[0.06] px-3 py-1 text-sm"
            >
              {t}
            </motion.span>
          ))}
        </motion.div>
      </div>

      {/* Best facilitator badge */}
      <motion.div
        className="relative flex w-fit items-center gap-5 rounded-[2rem] border border-band-ink/15 bg-band-ink/[0.06] px-6 py-5 backdrop-blur"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.5 }}
      >
        <div className="relative grid size-16 shrink-0 place-items-center">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-dashed border-band-accent/60"
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />
          <span className="grid size-12 place-items-center rounded-full bg-band-accent text-band">
            <Award className="size-6" aria-hidden />
          </span>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-band-accent">Recognised as</p>
          <p className="mt-1 font-display text-2xl leading-tight xl:text-3xl">Best Facilitator</p>
          <p className="mt-0.5 text-sm opacity-75">in Computer Science</p>
        </div>
      </motion.div>

      {/* Inspiration */}
      <div className="relative">
        <Quote className="size-7 text-band-accent" aria-hidden />
        <div className="relative mt-3 min-h-[4.5rem]" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p
              key={line}
              className="max-w-md font-display text-xl leading-snug xl:text-2xl"
              initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
              transition={{ duration: 0.6, ease }}
            >
              {lines[line]}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="mt-4 flex gap-1.5" aria-hidden>
          {lines.map((_, i) => (
            <span key={i} className="relative h-1 w-8 overflow-hidden rounded-full bg-band-ink/15">
              {i === line && (
                <motion.span
                  key={line}
                  className="absolute inset-y-0 left-0 bg-band-accent"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 5, ease: "linear" }}
                />
              )}
            </span>
          ))}
        </div>

        {/* Hidden on short screens so the quote is never pushed out of view. */}
        <ul className="mt-6 grid grid-cols-3 gap-4 border-t border-band-ink/15 pt-6 text-sm [@media(max-height:760px)]:hidden">
          {[
            ["10+ years", "Teaching CS"],
            ["Class 9 – 12", "O & A Level"],
            ["2 centres", "Mirpur & Uttara"],
          ].map(([a, b]) => (
            <li key={b}>
              <p className="font-display text-xl text-band-accent">{a}</p>
              <p className="mt-1 opacity-70">{b}</p>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
