"use client";

import { motion } from "motion/react";
import { weekdays } from "@/lib/coaching";
import { formatTimeRange, fullDayName, todayWeekday } from "@/lib/schedule";
import type { Session } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Saturday → Friday week view; today is highlighted. */
export function WeekTimetable({ sessions, batchName }: { sessions: Session[]; batchName: string }) {
  const today = todayWeekday(new Date());

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {weekdays.map((d, i) => {
        const daySessions = sessions.filter((s) => s.day === d);
        const isToday = d === today;
        return (
          <motion.div
            key={d}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-3 sm:min-h-[132px] sm:flex-col sm:items-stretch",
              isToday ? "border-ember bg-ember/[0.06]" : "border-line",
            )}
          >
            <p className={cn("w-24 shrink-0 text-sm font-medium sm:w-auto", isToday && "text-ember")}>
              <span className="sm:hidden">{fullDayName[d]}</span>
              <span className="hidden sm:inline">{d}</span>
              {isToday && <span className="ml-1.5 text-[10px] uppercase tracking-wider">Today</span>}
            </p>
            <div className="flex flex-1 flex-col gap-1.5">
              {daySessions.length === 0 ? (
                <p className="text-xs text-ink-faint">—</p>
              ) : (
                daySessions.map((s) => (
                  <div key={`${s.day}-${s.start}`} className="rounded-xl bg-forest px-2.5 py-2 text-forest-ink">
                    <p className="text-xs font-semibold leading-tight">{formatTimeRange(s.start, s.end)}</p>
                    <p className="mt-0.5 truncate text-[11px] opacity-75">{batchName}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
