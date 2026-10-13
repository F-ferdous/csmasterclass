import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading, type HeadingSegment } from "@/components/motion/split-heading";

/** Shared top-of-page header for inner pages. */
export function PageHero({ eyebrow, title, intro, children }: { eyebrow: string; title: HeadingSegment[]; intro?: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden pb-14 pt-32 sm:pb-20 sm:pt-44">
      <div aria-hidden className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" />
      <div aria-hidden className="absolute -top-40 right-0 size-[30rem] rounded-full bg-gold/15 blur-3xl" />
      <div className="container-x relative">
        <Reveal>
          <p className="eyebrow mb-6 flex items-center gap-3">
            <span className="h-px w-8 bg-ember" />
            {eyebrow}
          </p>
        </Reveal>
        <SplitHeading as="h1" immediate segments={title} className="max-w-5xl text-5xl leading-[1.02] sm:text-6xl lg:text-8xl" />
        {intro && (
          <Reveal delay={0.3}>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft text-pretty">{intro}</p>
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}
