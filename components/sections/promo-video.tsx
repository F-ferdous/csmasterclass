"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeader } from "@/components/ui/section-header";

/**
 * The 32-second promo film (made in motion/cs-masterclass-promo). Plays muted when at least half of it
 * is on screen and pauses when it scrolls away. Visitors who prefer reduced motion get the poster and
 * the play button instead of autoplay.
 */
export function PromoVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  // a visitor who pauses it keeps it paused, even when they scroll back
  const userPaused = useRef(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !reduced && !userPaused.current) el.play().catch(() => {});
        else if (!entry.isIntersecting) el.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) {
      userPaused.current = false;
      el.play().catch(() => {});
    } else {
      userPaused.current = true;
      el.pause();
    }
  };

  return (
    <section className="container-x py-20 sm:py-28" aria-label="Watch: CS Masterclass in one short film">
      <SectionHeader
        eyebrow="Watch"
        title={["Everything CS Masterclass, ", { em: "in one short film." }]}
        intro="How lessons are taught, the books, the results and where to find a batch — watch it here."
        align="center"
      />
      <Reveal delay={0.1}>
        <div className="relative mt-12 overflow-hidden rounded-3xl border border-line bg-forest shadow-[var(--shadow-lg)] sm:mt-16">
          <video
            ref={video}
            className="block aspect-video w-full"
            src="/videos/cs-masterclass-promo.mp4"
            poster="/videos/cs-masterclass-promo.jpg"
            muted
            loop
            playsInline
            preload="none"
            aria-label="CS Masterclass promo: teaching method, results, books and coaching centres in Dhaka"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onClick={toggle}
          />
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause video" : "Play video"}
            className="absolute bottom-3 right-3 grid size-11 place-items-center rounded-full bg-paper/90 text-ink shadow-[var(--shadow)] backdrop-blur transition hover:scale-105 sm:bottom-5 sm:right-5 sm:size-12"
          >
            {playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5 translate-x-px" aria-hidden />}
          </button>
        </div>
      </Reveal>
    </section>
  );
}
