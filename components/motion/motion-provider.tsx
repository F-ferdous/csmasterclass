"use client";

import { MotionConfig, motion, useScroll, useSpring } from "motion/react";
import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

/**
 * Site-wide motion: buttery smooth scrolling (Lenis), a reading-progress bar,
 * and Motion defaults. `reducedMotion="never"` keeps the animations on even when
 * the OS "Reduce motion" setting is enabled — change to "user" to honour it.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="never">
      <ReactLenis root options={{ lerp: 0.09, smoothWheel: true }} />
      <ScrollProgress />
      {children}
    </MotionConfig>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[65] h-[3px] origin-left bg-gradient-to-r from-ember via-gold to-forest"
    />
  );
}
