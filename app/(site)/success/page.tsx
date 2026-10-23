import type { Metadata } from "next";
import { Award, Quote } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { StatsBand } from "@/components/sections/stats";
import { Timeline } from "@/components/sections/timeline";
import { CtaBand } from "@/components/sections/cta-band";
import { milestones, recognitions, results, testimonials } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Student Results & Reviews — O Level & A Level Computer Science",
  description:
    "A* and A grades in Cambridge and Edexcel Computer Science, university places and reviews from students and parents — over a decade of teaching in Dhaka.",
  path: "/success",
});

export default function SuccessPage() {
  return (
    <>
      <PageHero
        eyebrow="Student success"
        title={["A decade of students ", { em: "proving what's possible." }]}
        intro="Top grades, university places and careers in tech — but most of all, students who discovered they were capable of far more than they thought."
      />

      <StatsBand />

      {/* Results */}
      <section className="container-x pb-20 sm:pb-28">
        <Stagger className="grid gap-5 md:grid-cols-3">
          {results.map((r) => (
            <StaggerItem key={r.label}>
              <div className="relative h-full overflow-hidden rounded-3xl bg-band p-8 text-band-ink sm:p-10">
                <div aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-band-accent/20 blur-2xl" />
                <p className="relative font-display text-5xl tracking-tight text-band-accent sm:text-6xl">{r.value}</p>
                <p className="relative mt-4 leading-snug opacity-80">{r.label}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Journey */}
      <section className="bg-paper-2/60 py-20 sm:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHeader
              eyebrow="The journey"
              title={["Ten years, ", { em: "one classroom at a time." }]}
              intro="From a single class of 28 to thousands of learners, teachers and readers."
            />
            <Reveal delay={0.2}>
              <ul className="mt-10 space-y-3">
                {recognitions.map((r) => (
                  <li key={r} className="flex items-start gap-3 text-sm">
                    <Award className="mt-0.5 size-4 shrink-0 text-ember" aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Timeline wideMarker items={milestones.map((m) => ({ marker: m.year, title: m.title, body: m.body }))} />
        </div>
      </section>

      {/* Wall of words */}
      <section className="container-x py-20 sm:py-28">
        <SectionHeader eyebrow="In their words" title={["Stories from ", { em: "students & parents." }]} align="center" className="mx-auto" />
        <div className="mt-14 gap-5 [column-fill:_balance] sm:columns-2 lg:columns-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={(i % 3) * 0.08} className="mb-5 break-inside-avoid">
              <figure className="rounded-3xl border border-line bg-paper p-7 transition-shadow duration-500 hover:shadow-soft">
                <Quote className="size-6 text-ember" aria-hidden />
                <blockquote className="mt-4 font-display text-xl leading-snug text-pretty">“{t.quote}”</blockquote>
                <figcaption className="mt-5 border-t border-line pt-4">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-ink-soft">{t.detail}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      <CtaBand
        title={["Your success story ", { em: "starts here." }]}
        body="Join a class, or begin with a book written to make every idea click."
        href="/books"
        label="Explore the books"
      />
    </>
  );
}
