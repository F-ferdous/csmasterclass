"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useRef } from "react";
import { topics } from "@/lib/content";

const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

/** A row that drifts constantly and speeds up / reverses with scroll velocity. */
function VelocityRow({ children, baseVelocity }: { children: React.ReactNode; baseVelocity: number }) {
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(velocity, [-1000, 0, 1000], [-4, 0, 4], { clamp: false });
  const x = useTransform(base, (v) => `${wrap(-50, 0, v)}%`);
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    let move = direction.current * baseVelocity * (delta / 1000);
    const f = factor.get();
    if (f < 0) direction.current = -1;
    else if (f > 0) direction.current = 1;
    move += direction.current * move * f;
    base.set(base.get() + move);
  });

  return (
    <div className="flex overflow-hidden whitespace-nowrap">
      <motion.div className="flex w-max" style={{ x }}>
        {children}
        {children}
      </motion.div>
    </div>
  );
}

export function TopicMarquee() {
  return (
    <div
      className="relative space-y-3 overflow-hidden border-y border-line bg-paper-2/60 py-6 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]"
      aria-label={`Topics: ${topics.join(", ")}`}
    >
      <VelocityRow baseVelocity={-2}>
        <ul className="flex items-center" aria-hidden>
          {topics.map((t) => (
            <li key={t} className="flex items-center gap-8 pr-8">
              <span className="font-display text-3xl italic text-ink sm:text-4xl">{t}</span>
              <span className="text-xl text-ember">✦</span>
            </li>
          ))}
        </ul>
      </VelocityRow>
      <VelocityRow baseVelocity={1.5}>
        <ul className="flex items-center" aria-hidden>
          {["0478", "2210", "Paper 1", "Paper 2", "IGCSE", "O Level", "Pseudocode", "Exam technique"].map((t) => (
            <li key={t} className="flex items-center gap-6 pr-6">
              <span className="font-mono text-sm uppercase tracking-[0.2em] text-ink-soft">{t}</span>
              <span className="size-1.5 rounded-full bg-ink-faint" />
            </li>
          ))}
        </ul>
      </VelocityRow>
    </div>
  );
}
