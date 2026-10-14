import { BookOpenCheck, ClipboardCheck, Layers, Pencil, Target, UserRoundCheck } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { ButtonLink } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";
import { coaching } from "@/lib/content";
import { getCoaching } from "@/lib/data";
import { BatchSchedule } from "./batch-schedule";
import { CentreCards } from "./centre-cards";

const benefitIcons = [Layers, Pencil, BookOpenCheck, ClipboardCheck, Target, UserRoundCheck];

/** In-person coaching: centres, class batches, boards and benefits. */
export async function Coaching() {
  const { locations, batches } = await getCoaching();
  const hasSchedule = batches.length > 0;

  return (
    <section id="coaching" className="scroll-mt-24 py-20 sm:py-28">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeader
            eyebrow="Coaching"
            title={["Learn with me, ", { em: "in person." }]}
            intro={`Regular Computer Science classes at ${locations.length === 2 ? "two" : locations.length} coaching centre${locations.length === 1 ? "" : "s"} in Dhaka — with multiple batches for Class 9, 10, 11 and 12. Cambridge and Edexcel students are both welcome.`}
          />
          <Reveal className="flex shrink-0 flex-wrap gap-3">
            <Magnetic>
              <ButtonLink href={hasSchedule ? "#schedule" : "/signup"}>{hasSchedule ? "See batch timings" : "Join now"}</ButtonLink>
            </Magnetic>
            <ButtonLink href="/contact" variant="ghost" arrow={false}>
              Ask a question
            </ButtonLink>
          </Reveal>
        </div>

        {/* Centres */}
        <div className="mt-14">
          <CentreCards locations={locations} batches={batches} />
        </div>

        {/* Batches — live schedule from the dashboard, or a class overview until batches are added */}
        {hasSchedule ? (
          <div className="mt-16">
            <Reveal>
              <p className="eyebrow">Batch timings</p>
              <h3 className="mt-4 font-display text-3xl leading-tight sm:text-4xl text-balance">
                Find your batch — <em className="text-ember">by class and centre.</em>
              </h3>
            </Reveal>
            <Reveal className="mt-8">
              <BatchSchedule batches={batches} locations={locations} />
            </Reveal>
          </div>
        ) : (
          <StaticBatches />
        )}

        {/* Boards banner */}
        <Reveal className="mt-10">
          <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-ember/30 bg-ember/[0.07] p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="font-display text-2xl">Edexcel students can join too.</p>
              <p className="mt-1 text-sm text-ink-soft">Classes cover the shared Computer Science core, with board-specific exam practice.</p>
            </div>
            <div className="flex gap-2">
              {coaching.boards.map((b) => (
                <span key={b} className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper">{b}</span>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Benefits */}
        <div className="mt-20">
          <Reveal>
            <h3 className="font-display text-3xl sm:text-4xl">
              Why coach <em className="text-ember">with me</em>
            </h3>
          </Reveal>
          <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {coaching.benefits.map((b, i) => {
              const Icon = benefitIcons[i % benefitIcons.length];
              return (
                <StaggerItem key={b.title}>
                  <article className="group h-full rounded-3xl border border-line p-7 transition-[transform,box-shadow,background] duration-500 hover:-translate-y-1.5 hover:bg-paper-2/50 hover:shadow-soft">
                    <span className="grid size-11 place-items-center rounded-2xl bg-forest text-forest-ink transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <h4 className="mt-6 font-display text-xl">{b.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b.body}</p>
                  </article>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </div>
    </section>
  );
}

function StaticBatches() {
  return (
    <div className="mt-16 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
      <Reveal>
        <p className="eyebrow">Batches available</p>
        <h3 className="mt-4 font-display text-3xl leading-tight sm:text-4xl text-balance">
          Class 9, 10, 11 &amp; 12 — <em className="text-ember">multiple batches</em> at each centre.
        </h3>
        <p className="mt-4 leading-relaxed text-ink-soft">
          Choose the batch and timing that fits your school schedule. Students preparing for{" "}
          <strong className="font-medium text-ink">Cambridge</strong> or <strong className="font-medium text-ink">Edexcel</strong>{" "}
          examinations can join.
        </p>
      </Reveal>
      <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {coaching.batches.map((b) => (
          <StaggerItem key={b.grade}>
            <div className="group h-full rounded-3xl border border-line bg-paper-2/60 p-5 text-center transition-[background,transform,box-shadow] duration-500 hover:-translate-y-2 hover:bg-paper hover:shadow-soft sm:p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-ink-faint">Class</p>
              <p className="mt-1 font-display text-6xl leading-none transition-colors group-hover:text-ember">{b.grade}</p>
              <p className="mt-3 text-xs text-ink-soft">{b.level}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
