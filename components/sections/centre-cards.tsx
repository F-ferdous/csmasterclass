import Link from "next/link";
import { ArrowUpRight, MapPin, Navigation, Phone, Users } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { classLevels } from "@/lib/coaching";
import type { Batch, Location } from "@/lib/types";

/** One card per coaching centre: batches by class, address, phone and directions when set in Admin → Locations. */
export function CentreCards({ locations, batches }: { locations: Location[]; batches: Batch[] }) {
  const hasSchedule = batches.length > 0;
  return (
    <Stagger className="grid gap-5 md:grid-cols-2">
      {locations.map((c, i) => {
        const here = batches.filter((b) => b.locationId === c.id);
        const byClass = classLevels.map((cl) => ({ cl, n: here.filter((b) => b.classLevel === cl).length })).filter((x) => x.n > 0);
        return (
          <StaggerItem key={c.id}>
            <article className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-band p-8 text-band-ink transition-transform duration-500 hover:-translate-y-1.5 sm:p-10">
              <div aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-band-accent/15 blur-2xl transition-transform duration-700 group-hover:scale-125" />
              <div className="relative flex items-start justify-between gap-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-band-accent text-band">
                  <MapPin className="size-5" aria-hidden />
                </span>
                <span className="font-mono text-xs opacity-60">0{i + 1}</span>
              </div>
              <div className="relative mt-12">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-band-accent">{c.area}</p>
                <h3 className="mt-3 font-display text-4xl sm:text-5xl">{c.name}</h3>
                {c.address && <p className="mt-3 text-sm opacity-75">{c.address}</p>}
                <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-band-ink/20 px-3 py-1.5">
                    <Users className="size-3.5" aria-hidden />
                    {here.length > 0 ? `${here.length} batch${here.length === 1 ? "" : "es"}` : "Multiple batches"}
                  </span>
                  {byClass.length > 0 ? (
                    byClass.map(({ cl, n }) => (
                      <span key={cl} className="rounded-full border border-band-ink/20 px-3 py-1.5">
                        Class {cl}
                        {n > 1 && <span className="ml-1 opacity-60">×{n}</span>}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-band-ink/20 px-3 py-1.5">Class 9 – 12</span>
                  )}
                  <span className="rounded-full border border-band-ink/20 px-3 py-1.5">Cambridge &amp; Edexcel</span>
                </div>
              </div>
              <div className="relative mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-8 text-sm font-medium">
                <Link href={hasSchedule ? "#schedule" : "/signup"} className="group/link inline-flex items-center gap-2">
                  {hasSchedule ? "See timings" : "Join now"}
                  <ArrowUpRight className="size-4 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" aria-hidden />
                </Link>
                {c.mapUrl && (
                  <a href={c.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100">
                    <Navigation className="size-4" aria-hidden /> Directions
                  </a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100">
                    <Phone className="size-4" aria-hidden /> {c.phone}
                  </a>
                )}
              </div>
            </article>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
