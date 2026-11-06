import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock, ExternalLink, Hourglass, Info } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { ExamDaysLeft } from "@/components/sections/exam-days-left";
import { examTimetable, formatExamDate, sessionLabel, type ExamLevel } from "@/lib/exam-timetable";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

const { series, levels } = examTimetable;

export const metadata: Metadata = pageMetadata({
  title: `Cambridge ${series} Computer Science Exam Timetable — O Level, AS & A Level`,
  description: `Dates and sessions for every Cambridge ${series} Computer Science paper in Bangladesh: O Level 2210 / IGCSE 0478, AS Level 9618 and A Level 9618 — paper names, dates, morning or afternoon session and duration.`,
  path: "/exam-timetable",
});

const byDate = (l: ExamLevel) => [...l.papers].sort((a, b) => a.date.localeCompare(b.date));

export default function ExamTimetablePage() {
  const all = levels.flatMap((l) => l.papers).sort((a, b) => a.date.localeCompare(b.date));
  const first = all[0];
  const last = all[all.length - 1];
  const practical = all.find((p) => p.session === null) ?? last;

  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Exam timetable", path: "/exam-timetable" }])} />
      <PageHero
        eyebrow={`Cambridge ${series}`}
        title={["Computer Science ", { em: "exam timetable." }]}
        intro={`Every O Level, AS Level and A Level Computer Science paper for the ${series} series in Bangladesh, from ${formatExamDate(first.date, "short").replace(/ \d{4}$/, "")} to ${formatExamDate(last.date, "short")}.`}
      >
        <Reveal delay={0.4} className="mt-10 flex flex-wrap gap-2.5">
          {levels.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className="rounded-full border border-line bg-paper px-4 py-2 text-sm transition-colors hover:border-ember hover:text-ember"
            >
              {l.label} <span className="font-mono text-xs text-ink-faint">{l.syllabus}</span>
            </a>
          ))}
        </Reveal>
      </PageHero>

      <div className="space-y-20 pb-20 sm:space-y-28 sm:pb-28">
        {levels.map((level) => (
          <section key={level.id} id={level.id} className="container-x scroll-mt-28">
            <SectionHeader
              eyebrow={`${level.classes} · Syllabus ${level.syllabus}`}
              title={[`${level.label} `, { em: level.subject + "." }]}
            />

            {/* Phones & tablets: one card per paper */}
            <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 xl:hidden">
              {byDate(level).map((p) => (
                <StaggerItem key={p.codes[0]}>
                  <article className="flex h-full flex-col rounded-3xl border border-line bg-paper p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ember">{p.paper}</p>
                      <ExamDaysLeft date={p.date} className="rounded-full bg-paper-2 px-2.5 py-1 font-mono text-[11px] text-ink-soft" />
                    </div>
                    <h3 className="mt-3 font-display text-2xl leading-snug">{p.name}</h3>
                    <p className="mt-1 font-mono text-xs text-ink-faint">
                      {level.subject} · {p.codes.join(" · ")}
                    </p>
                    <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm">
                      <div className="flex items-center gap-2.5">
                        <CalendarDays className="size-4 shrink-0 text-forest" aria-hidden />
                        <dt className="sr-only">Date</dt>
                        <dd className="font-medium">{formatExamDate(p.date)}</dd>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Clock className="size-4 shrink-0 text-forest" aria-hidden />
                        <dt className="sr-only">Time</dt>
                        <dd>{sessionLabel(p.session)}</dd>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Hourglass className="size-4 shrink-0 text-forest" aria-hidden />
                        <dt className="sr-only">Duration</dt>
                        <dd>{p.duration}</dd>
                      </div>
                    </dl>
                  </article>
                </StaggerItem>
              ))}
            </Stagger>

            {/* Wide screens: a table */}
            <Reveal className="mt-10 block overflow-hidden rounded-3xl border border-line bg-paper max-xl:hidden">
              <table className="w-full text-left">
                <caption className="sr-only">
                  {level.label} {level.subject} {series} timetable
                </caption>
                <thead className="bg-paper-2/70 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  <tr>
                    <th scope="col" className="px-7 py-4 font-normal">Subject</th>
                    <th scope="col" className="px-5 py-4 font-normal">Paper</th>
                    <th scope="col" className="px-5 py-4 font-normal">Date</th>
                    <th scope="col" className="px-5 py-4 font-normal">Time</th>
                    <th scope="col" className="px-5 py-4 font-normal">Duration</th>
                    <th scope="col" className="px-7 py-4 text-right font-normal">Countdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {byDate(level).map((p) => (
                    <tr key={p.codes[0]} className="transition-colors hover:bg-paper-2/40">
                      <td className="px-7 py-5 align-top">
                        <p className="font-medium">{level.subject}</p>
                        <p className="mt-1 font-mono text-xs text-ink-faint">{p.codes.join(" · ")}</p>
                      </td>
                      <td className="px-5 py-5 align-top">
                        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ember">{p.paper}</p>
                        <p className="mt-1 font-display text-lg leading-snug">{p.name}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-5 align-top font-medium">{formatExamDate(p.date)}</td>
                      <td className="whitespace-nowrap px-5 py-5 align-top">{sessionLabel(p.session)}</td>
                      <td className="whitespace-nowrap px-5 py-5 align-top">{p.duration}</td>
                      <td className="px-7 py-5 text-right align-top">
                        <ExamDaysLeft date={p.date} className="rounded-full bg-paper-2 px-2.5 py-1 font-mono text-xs text-ink-soft" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Reveal>

            <Reveal className="mt-5">
              <Link href={level.coursePath} className="link-underline text-sm text-ink-soft">
                About the {level.label} course →
              </Link>
            </Reveal>
          </section>
        ))}

        <section className="container-x">
          <Reveal className="rounded-3xl border border-line bg-paper-2/60 p-6 sm:p-8">
            <div className="flex gap-3">
              <Info className="mt-0.5 size-5 shrink-0 text-ember" aria-hidden />
              <div className="space-y-3 text-sm leading-relaxed text-ink-soft text-pretty">
                <p>
                  <strong className="text-ink">Morning (AM) and afternoon (PM)</strong> are Cambridge sessions — your exam centre gives
                  the exact start time on your admit card. A Level Paper 4 (Practical) is fixed for{" "}
                  {formatExamDate(practical.date)}; the centre sets its time. Durations already include reading time.
                </p>
                <p>
                  Taken from Cambridge&apos;s final {series} timetable for {examTimetable.zone} (Bangladesh), checked{" "}
                  {examTimetable.checkedOn}. Cambridge can still change a date, so always confirm with your centre.{" "}
                  <a href={examTimetable.sourceUrl} target="_blank" rel="noreferrer" className="link-underline inline-flex items-center gap-1 text-ink">
                    Official timetable (PDF) <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </p>
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </>
  );
}
