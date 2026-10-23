import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Timeline } from "@/components/sections/timeline";
import { TopicMarquee } from "@/components/sections/marquee";
import { CtaBand } from "@/components/sections/cta-band";
import { Coaching } from "@/components/sections/coaching";
import { formats, lessonFlow, principles, subjects } from "@/lib/content";
import { aLevel, oLevel } from "@/lib/courses";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Computer Science Coaching in Dhaka — Mirpur & Uttara Batches",
  description:
    "Computer Science classes at Mirpur Academia and Uttara QED, Dhaka — batches for Class 9 to 12, O Level / IGCSE 0478 / 2210 and A Level 9618, Cambridge and Edexcel.",
  path: "/teaching",
});

export default function TeachingPage() {
  return (
    <>
      <PageHero
        eyebrow="Teaching · 10+ years"
        title={["The art of making the complex ", { em: "feel obvious." }]}
        intro="Thousands of lessons have taught one thing above all: students don't struggle with computer science — they struggle with how it's explained. Here is the approach that changes that."
      />
      <TopicMarquee />
      <Coaching />

      {/* Course guides — one page per syllabus */}
      <section className="container-x pb-20 sm:pb-28">
        <Stagger className="grid gap-5 md:grid-cols-2">
          {[oLevel, aLevel].map((c) => (
            <StaggerItem key={c.path}>
              <Link
                href={c.path}
                className="group flex h-full flex-col rounded-[2rem] border border-line p-8 transition-[transform,box-shadow] duration-500 hover:-translate-y-1.5 hover:shadow-soft sm:p-10"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-ember">{c.eyebrow}</p>
                  <ArrowUpRight className="size-5 shrink-0 text-ink-faint transition-all duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-ember" aria-hidden />
                </div>
                <h2 className="mt-8 font-display text-3xl leading-tight sm:text-4xl">{c.name}</h2>
                <p className="mt-3 leading-relaxed text-ink-soft">{c.description}</p>
                <p className="mt-auto pt-8 text-sm font-semibold">Course guide, syllabus &amp; FAQs</p>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Principles — sticky heading, scrolling list */}
      <section className="container-x grid gap-12 py-20 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeader
            eyebrow="Philosophy"
            title={["Three habits behind ", { em: "every lesson." }]}
            intro="Simple to say, hard to do well, and practised daily for over a decade."
          />
        </div>
        <div className="divide-y divide-line border-y border-line">
          {principles.map((p) => (
            <Reveal key={p.no}>
              <article className="grid gap-4 py-10 sm:grid-cols-[80px_1fr]">
                <span className="font-display text-5xl italic text-ember">{p.no}</span>
                <div>
                  <h3 className="font-display text-3xl">{p.title}</h3>
                  <p className="mt-3 text-lg leading-relaxed text-ink-soft">{p.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Anatomy of a lesson */}
      <section className="bg-paper-2/60 py-20 sm:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-2 lg:gap-20">
          <SectionHeader
            eyebrow="Anatomy of a lesson"
            title={["Five steps from ", { em: "“huh?” to “aha!”" }]}
            intro="Every class follows the same rhythm, so students always know where they are — and where they're going next."
          />
          <Timeline items={lessonFlow.map((s, i) => ({ marker: String(i + 1), title: s.step, body: s.body }))} />
        </div>
      </section>

      {/* Subjects */}
      <section className="container-x py-20 sm:py-28">
        <SectionHeader eyebrow="What I teach" title={["Subjects, from first line ", { em: "to final exam." }]} />
        <Stagger className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s, i) => (
            <StaggerItem key={s.title} className="group bg-paper p-7 transition-colors duration-500 hover:bg-paper-2 sm:p-9">
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs text-ink-faint">0{i + 1}</span>
                <ArrowUpRight className="size-5 text-ink-faint transition-all duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-ember" aria-hidden />
              </div>
              <h3 className="mt-10 font-display text-2xl">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{s.detail}</p>
              <p className="mt-5 inline-block rounded-full border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                {s.level}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Formats */}
      <section className="container-x pb-20 sm:pb-28">
        <SectionHeader eyebrow="Ways to learn" title={["Choose the room ", { em: "that suits you." }]} />
        <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {formats.map((f) => (
            <StaggerItem key={f.title}>
              <div className="h-full rounded-3xl border border-line p-7 transition-[transform,box-shadow] duration-500 hover:-translate-y-1.5 hover:shadow-soft">
                <h3 className="font-display text-2xl">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{f.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <CtaBand
        title={["Ready to make it ", { em: "click?" }]}
        body="Enquire about batch timings at Mirpur Academia or Uttara QED, one-to-one mentoring or school workshops."
        href="/contact"
        label="Start a conversation"
      />
    </>
  );
}
