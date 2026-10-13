"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ease } from "./reveal";

/** A segment is plain text, or `{ em }` for an italic accent phrase. Use "\n" for a line break. */
export type HeadingSegment = string | { em: string };

type Props = {
  segments: HeadingSegment[];
  className?: string;
  as?: "h1" | "h2";
  delay?: number;
  /** Animate on mount (hero) instead of when scrolled into view. */
  immediate?: boolean;
};

/** Headline whose words rise out of a mask one after another. */
export function SplitHeading({ segments, className, as = "h2", delay = 0, immediate = false }: Props) {
  const Tag = motion[as];
  const words: { word: string; em: boolean; br: boolean }[] = [];

  for (const seg of segments) {
    const em = typeof seg !== "string";
    const text = typeof seg === "string" ? seg : seg.em;
    text.split(/(\n)| /).forEach((w) => {
      if (w === "\n") words.push({ word: "", em, br: true });
      else if (w) words.push({ word: w, em, br: false });
    });
  }

  const label = segments.map((s) => (typeof s === "string" ? s : s.em)).join("").replace(/\n/g, " ");
  const trigger = immediate ? { animate: "show" } : { whileInView: "show", viewport: { once: true, margin: "-10% 0px" } };

  return (
    <Tag
      aria-label={label}
      className={cn("font-display tracking-tight text-balance", className)}
      initial="hidden"
      {...trigger}
      transition={{ staggerChildren: 0.06, delayChildren: delay }}
    >
      {words.map((w, i) =>
        w.br ? (
          <br key={i} />
        ) : (
          <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
            <motion.span
              className={cn("inline-block", w.em && "italic text-ember")}
              variants={{ hidden: { y: "110%" }, show: { y: 0, transition: { duration: 0.9, ease } } }}
            >
              {w.word}
              {" "}
            </motion.span>
          </span>
        ),
      )}
    </Tag>
  );
}
