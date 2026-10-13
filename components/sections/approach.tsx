import { Eye, MessageCircle, Keyboard } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { ButtonLink } from "@/components/ui/button";
import { principles } from "@/lib/content";
import { CodeCard } from "./code-card";

const icons = [Eye, MessageCircle, Keyboard];

export function Approach() {
  return (
    <section className="container-x py-20 sm:py-28">
      <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-end">
        <SectionHeader
          eyebrow="The teaching"
          title={["Ten years of lessons, ", { em: "distilled into three habits." }]}
          intro="Great teaching isn't about saying more — it's about making the right idea impossible to miss. Every class, course and book follows the same simple rhythm."
        />
        <CodeCard />
      </div>

      <Stagger className="mt-16 grid gap-5 md:grid-cols-3">
        {principles.map((p, i) => {
          const Icon = icons[i];
          return (
            <StaggerItem key={p.no}>
              <article className="group h-full rounded-3xl border border-line bg-paper-2/50 p-7 transition-[background,transform,box-shadow] duration-500 hover:-translate-y-1.5 hover:bg-paper hover:shadow-soft sm:p-9">
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-forest text-forest-ink transition-transform duration-500 group-hover:rotate-[-8deg]">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-mono text-xs text-ink-faint">{p.no}</span>
                </div>
                <h3 className="mt-8 font-display text-2xl">{p.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">{p.body}</p>
              </article>
            </StaggerItem>
          );
        })}
      </Stagger>

      <Reveal className="mt-10">
        <ButtonLink href="/teaching" variant="ghost">
          Explore the teaching approach
        </ButtonLink>
      </Reveal>
    </section>
  );
}
