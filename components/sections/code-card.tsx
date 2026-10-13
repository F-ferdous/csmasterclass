"use client";

import { motion } from "motion/react";

const lines: { indent?: boolean; parts: { t: string; c?: string }[] }[] = [
  { parts: [{ t: "WHILE ", c: "text-gold" }, { t: "Student = " }, { t: '"confused"', c: "text-sage" }, { t: " DO", c: "text-gold" }] },
  { indent: true, parts: [{ t: "DrawIt()     " }, { t: "// see the shape", c: "opacity-40" }] },
  { indent: true, parts: [{ t: "ExplainIt()  " }, { t: "// in plain words", c: "opacity-40" }] },
  { indent: true, parts: [{ t: "TryIt()      " }, { t: "// prove it works", c: "opacity-40" }] },
  { parts: [{ t: "ENDWHILE", c: "text-gold" }] },
  { parts: [{ t: "OUTPUT ", c: "text-gold" }, { t: '"confidence"', c: "text-sage" }] },
];

/** Pseudocode that "types" itself line by line when scrolled into view. */
export function CodeCard() {
  return (
    <motion.div
      className="rounded-3xl bg-ink p-6 font-mono text-[13px] leading-7 text-paper shadow-lift sm:p-8"
      initial={{ opacity: 0, y: 60, rotate: 3 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ type: "spring", stiffness: 70, damping: 16 }}
    >
      <div className="mb-4 flex items-center gap-1.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-ember" />
        <span className="size-2.5 rounded-full bg-gold" />
        <span className="size-2.5 rounded-full bg-sage" />
        <span className="ml-3 text-[11px] opacity-50">lesson.pseudo</span>
      </div>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10% 0px" }}
        variants={{ show: { transition: { staggerChildren: 0.35, delayChildren: 0.4 } } }}
        className="whitespace-pre"
      >
        {lines.map((line, i) => (
          <motion.p
            key={i}
            className={line.indent ? "pl-6" : undefined}
            variants={{
              hidden: { clipPath: "inset(0 100% 0 0)", opacity: 0.3 },
              show: { clipPath: "inset(0 0% 0 0)", opacity: 1, transition: { duration: 0.45, ease: "linear" } },
            }}
          >
            {line.parts.map((p, j) => (
              <span key={j} className={p.c}>
                {p.t}
              </span>
            ))}
            {i === lines.length - 1 && (
              <motion.span
                aria-hidden
                className="ml-1 inline-block h-4 w-2 translate-y-0.5 bg-gold"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.p>
        ))}
      </motion.div>
    </motion.div>
  );
}
