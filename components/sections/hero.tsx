"use client";

import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowDown } from "lucide-react";
import { useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";
import { SplitHeading } from "@/components/motion/split-heading";
import { ease } from "@/components/motion/reveal";
import { HeroMachine } from "./hero-machine";

export function Hero() {
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

        <HeroMachine mx={mx} my={my} progress={progress} />
      </div>
      <span id="after-hero" className="absolute bottom-0" />
    </section>
  );
}
