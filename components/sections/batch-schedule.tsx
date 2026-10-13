"use client";

import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowUpRight, CalendarDays, MapPin, Users } from "lucide-react";
import { useState } from "react";
import { classLabels, classLevels, groupSessions, statusLabels } from "@/lib/coaching";
import type { Batch, BatchStatus, ClassLevel, Location } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ease } from "@/components/motion/reveal";

const statusStyles: Record<BatchStatus, string> = {
  open: "bg-forest/15 text-forest",
  "few-seats": "bg-gold/20 text-gold",
  full: "bg-ember/15 text-ember",
  closed: "bg-paper-2 text-ink-soft",
};

/** Public batch timetable with class and centre filters. */
export function BatchSchedule({ batches, locations }: { batches: Batch[]; locations: Location[] }) {
  const firstClass = classLevels.find((c) => batches.some((b) => b.classLevel === c)) ?? "9";
  const [classLevel, setClassLevel] = useState<ClassLevel>(firstClass);
  const [locationId, setLocationId] = useState("all");
  const names = new Map(locations.map((l) => [l.id, l]));

  const visible = batches.filter((b) => b.classLevel === classLevel && (locationId === "all" || b.locationId === locationId));

  return (
    <div id="schedule" className="scroll-mt-24">
      <LayoutGroup>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-4 gap-2 rounded-full border border-line p-1 sm:w-fit" role="tablist" aria-label="Class">
            {classLevels.map((c) => {
              const count = batches.filter((b) => b.classLevel === c).length;
              return (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={classLevel === c}
                  onClick={() => setClassLevel(c)}
                  className={cn("relative rounded-full px-4 py-2.5 text-sm font-medium sm:px-6", classLevel === c ? "text-paper" : "text-ink-soft hover:text-ink")}
                >
                  {classLevel === c && (
                    <motion.span layoutId="class-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
                  )}
                  <span className="relative">
                    Class {c}
                    <span className={cn("ml-1.5 text-xs", classLevel === c ? "opacity-60" : "text-ink-faint")}>{count}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {[{ id: "all", name: "All centres" }, ...locations].map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLocationId(l.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-colors",
                  locationId === l.id ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
                )}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-sm text-ink-soft">
          Class {classLevel} · {classLabels[classLevel]}
        </p>

        <motion.div layout className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl border border-dashed border-line p-8 text-center text-sm text-ink-soft md:col-span-2 lg:col-span-3"
              >
                No batches listed here yet.{" "}
                <Link href="/contact" className="font-medium text-ink underline underline-offset-4">
                  Ask about upcoming batches
                </Link>
              </motion.div>
            ) : (
              visible.map((b, i) => {
                const loc = names.get(b.locationId);
                const full = b.status === "full";
                return (
                  <motion.article
                    key={b.id}
                    layout
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5, delay: i * 0.05, ease }}
                    className="group flex flex-col rounded-3xl border border-line bg-paper p-6 transition-shadow hover:shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-ink-faint">Class {b.classLevel}</p>
                        <h3 className="mt-1 font-display text-2xl">{b.name}</h3>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", statusStyles[b.status])}>{statusLabels[b.status]}</span>
                    </div>
                    <ul className="mt-5 space-y-2 text-sm">
                      <li className="flex items-center gap-2.5">
                        <MapPin className="size-4 text-ember" aria-hidden />
                        {loc?.name}
                        {loc?.area && <span className="text-ink-soft">· {loc.area}</span>}
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CalendarDays className="mt-0.5 size-4 shrink-0 text-ember" aria-hidden />
                        <span className="grid flex-1 gap-1">
                          {groupSessions(b.sessions).map((g) => (
                            <span key={g.days} className="flex flex-wrap justify-between gap-x-3">
                              <span className="font-medium">{g.days}</span>
                              <span className="text-ink-soft">{g.time}</span>
                            </span>
                          ))}
                        </span>
                      </li>
                      {b.seats > 0 && (
                        <li className="flex items-center gap-2.5">
                          <Users className="size-4 text-ember" aria-hidden /> {b.seats} seats
                        </li>
                      )}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-paper-2 px-2.5 py-1 text-xs">{b.board === "Both" ? "Cambridge & Edexcel" : b.board}</span>
                    </div>
                    {b.notes && <p className="mt-3 text-sm text-ink-soft">{b.notes}</p>}
                    <div className="mt-auto pt-6">
                      {full ? (
                        <Link href="/contact" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line px-5 py-3 text-sm hover:border-ink">
                          Join the waiting list
                        </Link>
                      ) : (
                        <Link
                          href={`/signup?class=${b.classLevel}&location=${b.locationId}&batch=${b.id}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-forest-ink transition-colors hover:bg-ink hover:text-paper"
                        >
                          Join this batch
                          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                        </Link>
                      )}
                    </div>
                  </motion.article>
                );
              })
            )}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
