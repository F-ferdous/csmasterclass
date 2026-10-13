import { formatTimeRange, sortSessions } from "./coaching";
import type { Session, Weekday } from "./types";

/** JavaScript's Date#getDay() index for each weekday (Sunday = 0). */
const jsDay: Record<Weekday, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export const fullDayName: Record<Weekday, string> = {
  Sat: "Saturday",
  Sun: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
};

export function todayWeekday(now: Date): Weekday {
  return (Object.keys(jsDay) as Weekday[]).find((d) => jsDay[d] === now.getDay())!;
}

function at(date: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export type UpcomingClass = { session: Session; start: Date; end: Date; live: boolean };

/** The class happening now, or the next one to start (in the browser's local time). */
export function nextClass(sessions: Session[], now = new Date()): UpcomingClass | null {
  let best: UpcomingClass | null = null;
  for (const session of sortSessions(sessions)) {
    if (!session.start) continue;
    const ahead = (jsDay[session.day] - now.getDay() + 7) % 7;
    for (const extra of [0, 7]) {
      const day = new Date(now);
      day.setDate(now.getDate() + ahead + extra);
      const start = at(day, session.start);
      const end = session.end ? at(day, session.end) : new Date(start.getTime() + 60 * 60 * 1000);
      if (end <= now) continue; // already finished — try next week
      const candidate = { session, start, end, live: start <= now };
      if (!best || candidate.start < best.start) best = candidate;
      break;
    }
  }
  return best;
}

/** "Today", "Tomorrow" or the weekday name. */
export function dayLabel(date: Date, now = new Date()) {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(date) - startOf(now)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return fullDayName[todayWeekday(date)];
}

/** "2 days 3 h", "3 h 15 min", "12 min". */
export function countdown(to: Date, now = new Date()) {
  const mins = Math.max(0, Math.round((to.getTime() - now.getTime()) / 60_000));
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""}${hours ? ` ${hours} h` : ""}`;
  if (hours > 0) return `${hours} h${m ? ` ${m} min` : ""}`;
  return `${m} min`;
}

export { formatTimeRange };
