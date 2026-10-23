import { Plus } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import type { HeadingSegment } from "@/components/motion/split-heading";
import { JsonLd } from "@/components/seo/json-ld";
import { faqLd, type Faq } from "@/lib/seo";

/** Questions & answers — sticky heading, expandable list. Also published as FAQ structured data. */
export function FaqSection({
  faqs,
  eyebrow = "Questions",
  title = ["Questions parents & students ", { em: "often ask." }],
  intro,
  className = "",
}: {
  faqs: Faq[];
  eyebrow?: string;
  title?: HeadingSegment[];
  intro?: string;
  className?: string;
}) {
  return (
    <section id="faq" className={`container-x grid scroll-mt-24 gap-12 py-20 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 ${className}`}>
      <JsonLd data={faqLd(faqs)} />
      <div className="lg:sticky lg:top-32 lg:self-start">
        <SectionHeader eyebrow={eyebrow} title={title} intro={intro} />
      </div>
      <div className="divide-y divide-line border-y border-line">
        {faqs.map((f, i) => (
          <Reveal key={f.q} delay={Math.min(i, 4) * 0.04}>
            <details className="group py-2" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
                <h3 className="font-display text-xl leading-snug sm:text-2xl">{f.q}</h3>
                <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-line transition-[transform,background-color,color] duration-300 group-open:rotate-45 group-open:bg-ink group-open:text-paper">
                  <Plus className="size-4" aria-hidden />
                </span>
              </summary>
              <p className="max-w-2xl pb-6 pr-12 leading-relaxed text-ink-soft text-pretty">{f.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
