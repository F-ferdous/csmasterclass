import { Reveal } from "@/components/motion/reveal";
import { Magnetic } from "@/components/motion/magnetic";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { getCoaching } from "@/lib/data";
import { BatchSchedule } from "./batch-schedule";
import { CentreCards } from "./centre-cards";

/** Home page: the coaching centres and the live batch timetable (same data as /teaching). */
export async function BatchesLocations() {
  const { locations, batches } = await getCoaching();
  const centres = new Intl.ListFormat("en", { type: "conjunction" }).format(locations.map((l) => l.name));

  return (
    <section id="batches" className="scroll-mt-24 py-20 sm:py-28">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeader
            eyebrow="Batches & locations"
            title={["Find your batch, ", { em: "close to home." }]}
            intro={
              batches.length > 0
                ? `${batches.length} batch${batches.length === 1 ? "" : "es"} for Class 9 to 12 at ${centres} in Dhaka. Pick your class and centre to see the days and times.`
                : `Classes for Class 9 to 12 at ${centres} in Dhaka — multiple batches at each centre.`
            }
          />
          <Reveal className="flex shrink-0 flex-wrap gap-3">
            <Magnetic>
              <ButtonLink href="/signup">Register for a batch</ButtonLink>
            </Magnetic>
            <ButtonLink href="/teaching#coaching" variant="ghost" arrow={false}>
              About the classes
            </ButtonLink>
          </Reveal>
        </div>

        <div className="mt-14">
          <CentreCards locations={locations} batches={batches} />
        </div>

        {batches.length > 0 && (
          <Reveal className="mt-14">
            <BatchSchedule batches={batches} locations={locations} />
          </Reveal>
        )}
      </div>
    </section>
  );
}
