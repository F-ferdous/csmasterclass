"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, CalendarDays, Clock, MapPin, Phone, StickyNote } from "lucide-react";
import { classLabels, sortSessions, statusLabels } from "@/lib/coaching";
import { formatTimeRange, fullDayName } from "@/lib/schedule";
import { ease } from "@/components/motion/reveal";
import { PageHeader, Spinner } from "@/components/admin/ui";
import { NextClassCard } from "./next-class";
import { useStudent } from "./use-student";
import { WeekTimetable } from "./week-timetable";

export function StudentSchedule() {
  const { batch, location, loading } = useStudent();

  if (loading) return <Spinner />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="My schedule"
        description={batch ? `${batch.name} · Class ${batch.classLevel} · ${classLabels[batch.classLevel]}` : "Your weekly class timetable."}
        actions={
          <Link href="/dashboard/profile" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm hover:border-ink">
            Change batch
          </Link>
        }
      />

      {!batch ? (
        <div className="rounded-3xl border border-dashed border-line px-6 py-14 text-center">
          <CalendarDays className="mx-auto size-8 text-ember" aria-hidden />
          <h2 className="mt-4 font-display text-2xl">No batch selected</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">Choose your class, centre and batch in your profile to see your timetable.</p>
          <Link href="/dashboard/profile" className="mt-6 inline-flex rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-forest-ink">
            Choose my batch
          </Link>
        </div>
      ) : (
        <>
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
            <WeekTimetable sessions={batch.sessions} batchName={batch.name} />
          </motion.section>

          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease }}
              className="rounded-3xl border border-line p-6"
            >
              <h2 className="flex items-center gap-2 font-display text-xl">
                <Clock className="size-5 text-ember" aria-hidden /> Class times
              </h2>
              <ul className="mt-4 divide-y divide-line">
                {sortSessions(batch.sessions).map((s) => (
                  <li key={`${s.day}-${s.start}`} className="flex items-center justify-between py-3 text-sm">
                    <span className="font-medium">{fullDayName[s.day]}</span>
                    <span className="text-ink-soft">{formatTimeRange(s.start, s.end)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-paper-2 px-3 py-1">{batch.board === "Both" ? "Cambridge & Edexcel" : batch.board}</span>
                <span className="rounded-full bg-forest/15 px-3 py-1 text-forest">{statusLabels[batch.status]}</span>
              </div>
              {batch.notes && (
                <p className="mt-5 flex items-start gap-2 rounded-2xl bg-paper-2/70 p-4 text-sm">
                  <StickyNote className="mt-0.5 size-4 shrink-0 text-ember" aria-hidden /> {batch.notes}
                </p>
              )}
            </motion.section>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease }} className="grid gap-5">
              <NextClassCard batch={batch} location={location} />
              {location && (
                <section className="rounded-3xl border border-line p-6">
                  <h2 className="flex items-center gap-2 font-display text-xl">
                    <MapPin className="size-5 text-ember" aria-hidden /> {location.name}
                  </h2>
                  <p className="mt-2 text-sm text-ink-soft">{location.address || location.area}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {location.mapUrl && (
                      <a
                        href={location.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-sm font-medium text-forest-ink"
                      >
                        Get directions <ArrowUpRight className="size-4" aria-hidden />
                      </a>
                    )}
                    {location.phone && (
                      <a href={`tel:${location.phone}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm hover:border-ink">
                        <Phone className="size-4" aria-hidden /> {location.phone}
                      </a>
                    )}
                  </div>
                </section>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
