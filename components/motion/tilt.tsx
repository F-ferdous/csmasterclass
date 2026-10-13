"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 3D tilt that follows the cursor, with a moving light glare. */
export function Tilt({ children, className, max = 14 }: { children: ReactNode; className?: string; max?: number }) {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 180, damping: 18, mass: 0.5 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.35), transparent 55%)`;

  return (
    <div className={cn("[perspective:1100px]", className)}>
      <motion.div
        className="group/tilt relative [transform-style:preserve-3d]"
        style={{ rotateX, rotateY }}
        whileHover={{ scale: 1.03 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
      >
        {children}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 mix-blend-soft-light transition-opacity duration-300 group-hover/tilt:opacity-100"
          style={{ background: glare }}
        />
      </motion.div>
    </div>
  );
}
