"use client";

import { motion } from "motion/react";
import { ClipboardCheck } from "lucide-react";
import { useMemo } from "react";
import { StatTile } from "@/components/admin/charts";
import { EmptyState, PageHeader, Spinner } from "@/components/admin/ui";
import { useCoaching } from "@/components/auth/use-locations";
import { ease } from "@/components/motion/reveal";
import { attendanceRate, markCounts, markLabels, markStyles, prettyDate, type MyAttendanceEntry } from "@/lib/attendance";
import { formatTimeRange } from "@/lib/coaching";
import { monthLabel } from "@/lib/payments";
import { cn } from "@/lib/utils";
import { useMyAttendance } from "./use-my-records";

export function StudentAttendance() {
  const list = useMyAttendance();
  const { batches } = useCoaching();
  const batchName = useMemo(() => new Map(batches.map((b) => [b.id, b.name])), [batches]);

  if (list === null) return <Spinner />;

  const counts = markCounts(list.map((e) => e.mark));
  const rate = attendanceRate(list.map((e) => e.mark));
  const months = Array.from(new Set(list.map((e) => e.date.slice(0, 7))));

  return (
    <div className="space-y-8">
      <PageHeader title="Attendance" description="Your record for every class. Late still counts as attended; excused classes don't count against you." />

      {list.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="size-6" />} title="No classes recorded yet" body="Once your teacher takes the register, your attendance appears here." />
      ) : (
        <>
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="rounded-3xl border border-line p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-ink-soft">Overall attendance</p>
                <p className="mt-1 font-display text-5xl tabular-nums">{rate === null ? "—" : `${rate}%`}</p>
              </div>
              <p className="max-w-xs text-sm text-ink-soft">
                {rate === null ? "" : rate >= 90 ? "Excellent — keep it up!" : rate >= 75 ? "Good. Try not to miss any more classes." : "You've missed quite a few classes — talk to your teacher about catching up."}
              </p>
            </div>
            {rate !== null && (
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-paper-2" role="meter" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} aria-label="Attendance rate">
                <motion.div
                  className={cn("h-full rounded-full", rate >= 75 ? "bg-forest" : "bg-ember")}
                  initial={{ width: 0 }}
                  animate={{ width: `${rate}%` }}
                  transition={{ duration: 1, ease }}
                />
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Present" value={String(counts.present)} />
              <StatTile label="Late" value={String(counts.late)} />
              <StatTile label="Absent" value={String(counts.absent)} />
              <StatTile label="Excused" value={String(counts.excused)} />
            </div>
          </motion.section>

          {months.map((m, i) => (
            <MonthBlock key={m} month={m} entries={list.filter((e) => e.date.startsWith(m))} batchName={batchName} index={i} />
          ))}
        </>
      )}
    </div>
  );
}

function MonthBlock({ month, entries, batchName, index }: { month: string; entries: MyAttendanceEntry[]; batchName: Map<string, string>; index: number }) {
  const rate = attendanceRate(entries.map((e) => e.mark));
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: Math.min(0.1 + index * 0.05, 0.4), ease }}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-xl">{monthLabel(month)}</h2>
        {rate !== null && <span className="text-sm text-ink-soft">{rate}% attended</span>}
      </div>
      <ul className="overflow-hidden rounded-3xl border border-line">
        {entries.map((e) => (
          <li key={e.sessionId} className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5 last:border-b-0">
            <div className="min-w-0">
              <p className="font-medium">{prettyDate(e.date)}</p>
              <p className="truncate text-xs text-ink-soft">
                {[batchName.get(e.batchId), e.start && e.end ? formatTimeRange(e.start, e.end) : ""].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-medium", markStyles[e.mark].dot)}>{markLabels[e.mark]}</span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
