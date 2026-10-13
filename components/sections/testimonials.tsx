"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { useEffect, useState } from "react";
import { testimonials } from "@/lib/content";
import { ease } from "@/components/motion/reveal";

/** Auto-advancing testimonial carousel; pauses while hovered or focused. */
export function TestimonialCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const t = testimonials[index];

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % testimonials.length), 6500);
    return () => clearTimeout(id);
  }, [index, paused]);

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + testimonials.length) % testimonials.length);

  return (
    <div
      className="relative flex h-full flex-col rounded-[2rem] border border-line bg-paper p-7 shadow-soft sm:p-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <Quote className="size-9 text-ember" aria-hidden />
      <div className="relative mt-6 min-h-[220px] flex-1 sm:min-h-[200px]" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.figure
            key={index}
            initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
            transition={{ duration: 0.55, ease }}
          >
            <blockquote className="font-display text-2xl leading-snug sm:text-3xl text-pretty">“{t.quote}”</blockquote>
            <figcaption className="mt-6">
              <p className="font-semibold">{t.name}</p>
              <p className="text-sm text-ink-soft">{t.detail}</p>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex gap-1.5">
          {testimonials.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show testimonial ${i + 1}`}
              aria-current={i === index}
              className="relative h-1.5 w-6 overflow-hidden rounded-full bg-line"
            >
              {i === index && (
                <motion.span
                  key={`${index}-${paused}`}
                  className="absolute inset-y-0 left-0 bg-ember"
                  initial={{ width: paused ? "100%" : "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: paused ? 0 : 6.5, ease: "linear" }}
                />
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => go(-1)} aria-label="Previous testimonial" className="grid size-11 place-items-center rounded-full border border-line transition-colors hover:bg-ink hover:text-paper">
            <ArrowLeft className="size-4" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next testimonial" className="grid size-11 place-items-center rounded-full border border-line transition-colors hover:bg-ink hover:text-paper">
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
