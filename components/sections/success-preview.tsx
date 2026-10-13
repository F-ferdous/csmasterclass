import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { ButtonLink } from "@/components/ui/button";
import { TestimonialCarousel } from "./testimonials";
import { results } from "@/lib/content";

export function SuccessPreview() {
  return (
    <section className="container-x py-20 sm:py-28">
      <SectionHeader
        eyebrow="Student success"
        title={["Results that speak ", { em: "for themselves." }]}
        intro="Grades matter — but the real result is a student who believes they can figure things out. Here is what that looks like."
      />

      <div className="mt-14 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Reveal>
          <TestimonialCarousel />
        </Reveal>
        <Stagger className="grid gap-5">
          {results.map((r) => (
            <StaggerItem key={r.label}>
              <div className="flex h-full items-center gap-6 rounded-[1.5rem] border border-line bg-paper-2/50 p-6 sm:p-8">
                <p className="font-display text-4xl tracking-tight text-ember sm:text-5xl">{r.value}</p>
                <p className="text-sm leading-snug text-ink-soft">{r.label}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      <Reveal className="mt-10">
        <ButtonLink href="/success" variant="ghost">
          See the full story
        </ButtonLink>
      </Reveal>
    </section>
  );
}
