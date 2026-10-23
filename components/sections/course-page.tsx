import { Check } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { ButtonLink } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { BookCard } from "@/components/books/book-card";
import { JsonLd } from "@/components/seo/json-ld";
import { CtaBand } from "./cta-band";
import { FaqSection } from "./faq";
import { CentreCards } from "./centre-cards";
import { BatchSchedule } from "./batch-schedule";
import { getBooks, getCoaching } from "@/lib/data";
import { syllabusFor, unitsOf } from "@/lib/syllabus";
import { breadcrumbLd, courseLd } from "@/lib/seo";
import type { Course } from "@/lib/courses";

/** A course guide: overview, exam papers, syllabus, live batches at the centres, books and FAQs. */
export async function CoursePage({ course }: { course: Course }) {
  const [{ locations, batches: allBatches }, allBooks] = await Promise.all([getCoaching(), getBooks()]);
  const batches = allBatches.filter((b) => course.classes.includes(b.classLevel));
  const books = allBooks.filter((b) => b.level === course.bookLevel);
  const units = unitsOf(syllabusFor(course.syllabusClass)!);

  return (
    <>
      <JsonLd
        data={[
          courseLd({
            name: course.name,
            description: course.description,
            path: course.path,
            code: course.code,
            level: `Class ${course.classes.join(" – ")}`,
            teaches: units.map((u) => u.unit.replace(/^\d+\s/, "")),
            locations,
            batches,
          }),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Teaching", path: "/teaching" },
            { name: course.name, path: course.path },
          ]),
        ]}
      />

      <PageHero eyebrow={course.eyebrow} title={course.heading} intro={course.intro}>
        <Reveal delay={0.4} className="mt-10 flex flex-wrap gap-3">
          <Magnetic>
            <ButtonLink href="/signup">Register for a batch</ButtonLink>
          </Magnetic>
          <ButtonLink href={batches.length ? "#schedule" : "#centres"} variant="ghost" arrow={false}>
            {batches.length ? "See batch timings" : "See the centres"}
          </ButtonLink>
        </Reveal>
      </PageHero>

      {/* Overview */}
      <section className="container-x grid gap-12 pb-20 sm:pb-28 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <div className="space-y-5 text-lg leading-relaxed text-ink-soft text-pretty">
          {course.overview.map((p) => (
            <Reveal key={p}>
              <p>{p}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="lg:sticky lg:top-32 lg:self-start">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line">
            {course.facts.map((f) => (
              <div key={f.label} className="bg-paper p-6">
                <dt className="text-xs text-ink-faint">{f.label}</dt>
                <dd className="mt-2 font-display text-xl sm:text-2xl">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      {/* Exam papers */}
      <section className="bg-paper-2/60 py-20 sm:py-28">
        <div className="container-x">
          <SectionHeader eyebrow="The exam" title={["How the papers ", { em: "work." }]} />
          <Stagger className={`mt-14 grid gap-5 sm:grid-cols-2 ${course.papers.length > 2 ? "lg:grid-cols-4" : ""}`}>
            {course.papers.map((p) => (
              <StaggerItem key={p.name}>
                <article className="flex h-full flex-col rounded-3xl border border-line bg-paper p-7 sm:p-8">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-ember">{p.name}</p>
                  <h3 className="mt-4 font-display text-2xl leading-snug">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.detail}</p>
                  <p className="mt-auto pt-6 font-mono text-xs text-ink-soft">{p.meta}</p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Syllabus */}
      <section className="container-x py-20 sm:py-28">
        <SectionHeader
          eyebrow={`Syllabus ${course.code}`}
          title={["Every topic, ", { em: "in order." }]}
          intro="The whole syllabus is taught in class — nothing is left for students to work out alone."
        />
        <Stagger className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {units.map((u) => (
            <StaggerItem key={u.unit} className="bg-paper p-7 sm:p-8">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">{u.paper}</p>
              <h3 className="mt-3 font-display text-2xl">{u.unit.replace(/^\d+\s/, "")}</h3>
              <ul className="mt-4 space-y-2">
                {u.topics.map((t) => (
                  <li key={t.id} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
                    <Check className="mt-1 size-3.5 shrink-0 text-forest" aria-hidden />
                    {t.title}
                  </li>
                ))}
              </ul>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Centres & batches */}
      <section id="centres" className="scroll-mt-24 bg-paper-2/60 py-20 sm:py-28">
        <div className="container-x">
          <SectionHeader
            eyebrow="Batches & centres"
            title={[`Class ${course.classes.join(" & ")} batches `, { em: "in Dhaka." }]}
            intro={`In-person classes at ${new Intl.ListFormat("en", { type: "conjunction" }).format(locations.map((l) => `${l.name} (${l.area || "Dhaka"})`))}.`}
          />
          <div className="mt-14">
            <CentreCards locations={locations} batches={batches} />
          </div>
          {batches.length > 0 && (
            <Reveal className="mt-14">
              <BatchSchedule batches={batches} locations={locations} classes={course.classes} />
            </Reveal>
          )}
        </div>
      </section>

      {/* Books */}
      {books.length > 0 && (
        <section className="container-x py-20 sm:py-28">
          <SectionHeader eyebrow="Books for this course" title={["Study at home ", { em: "with the books." }]} />
          <Stagger className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((b) => (
              <StaggerItem key={b.slug}>
                <BookCard book={b} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      <FaqSection faqs={course.faqs} className={books.length ? "border-t border-line" : ""} />

      <CtaBand
        title={["Ready for Class ", { em: `${course.classes[0]}?` }]}
        body="Register online, pick your centre and batch, and your seat is confirmed by the teacher."
        href="/signup"
        label="Register for a batch"
      />
    </>
  );
}
