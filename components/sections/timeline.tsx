"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import { ease } from "@/components/motion/reveal";

type Item = { marker: string; title: string; body: string };

/** Vertical timeline whose line draws itself as you scroll. */
export function Timeline({ items, wideMarker = false }: { items: Item[]; wideMarker?: boolean }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const pad = wideMarker ? "pl-20 sm:pl-24" : "pl-12 sm:pl-16";
  const line = wideMarker ? "left-[31px] sm:left-[35px]" : "left-[15px] sm:left-[19px]";
  const dot = wideMarker ? "-left-20 sm:-left-24 h-8 w-16 sm:h-10 sm:w-[4.5rem]" : "-left-12 sm:-left-16 size-8 sm:size-10";

  return (
    <ol ref={ref} className={`relative space-y-10 ${pad}`}>
      <span aria-hidden className={`absolute bottom-2 top-2 w-px bg-line ${line}`} />
      <motion.span aria-hidden style={{ scaleY }} className={`absolute bottom-2 top-2 w-px origin-top bg-ember ${line}`} />
      {items.map((s) => (
        <motion.li
          key={s.title}
          className="relative"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.7, ease }}
        >
          <span className={`absolute top-0 grid place-items-center rounded-full border border-line bg-paper font-mono text-xs ${dot}`}>
            {s.marker}
          </span>
          <h3 className="font-display text-2xl sm:text-3xl">{s.title}</h3>
          <p className="mt-1.5 max-w-lg text-ink-soft">{s.body}</p>
        </motion.li>
      ))}
    </ol>
  );
}
