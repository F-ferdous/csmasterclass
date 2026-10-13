import type { Timestamp } from "firebase/firestore";
import type { Weekday } from "./types";

export type Mark = "present" | "late" | "absent" | "excused";

export const marks: Mark[] = ["present", "late", "absent", "excused"];

export const markLabels: Record<Mark, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  excused: "Excused",
};

/** Short code for compact grids. */
export const markShort: Record<Mark, string> = { present: "P", late: "L", absent: "A", excused: "E" };

export const markStyles: Record<Mark, { on: string; dot: string }> = {
  present: { on: "border-forest bg-forest text-forest-ink", dot: "bg-forest text-forest-ink" },
  late: { on: "border-gold bg-gold text-ink", dot: "bg-gold text-ink" },
  absent: { on: "border-ember bg-ember text-white", dot: "bg-ember text-white" },
  excused: { on: "border-ink-soft bg-ink-soft text-paper", dot: "bg-paper-3 text-ink-soft" },
};

/** attendance/{batchId}_{YYYY-MM-DD} — one class session's register. */
export type AttendanceSession = {
  id: string;
  batchId: string;
  date: string; // "2026-10-13"
  start: string;
  end: string;
  records: Record<string, Mark>; // uid → mark
  note: string;
  updatedAt: Date | null;
};

export const sessionId = (batchId: string, date: string) => `${batchId}_${date}`;

/** Local calendar date as YYYY-MM-DD (not UTC, so late-evening classes keep the right day). */
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const jsDayToWeekday: Weekday[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayOf(date: string): Weekday {
  const [y, m, d] = date.split("-").map(Number);
  return jsDayToWeekday[new Date(y, m - 1, d).getDay()];
}

export function prettyDate(date: string, style: "long" | "short" = "long") {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(
    "en-GB",
    style === "long" ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "short" },
  );
}

export function normalizeSession(id: string, raw: Record<string, unknown>): AttendanceSession {
  const records: Record<string, Mark> = {};
  if (raw.records && typeof raw.records === "object") {
    for (const [uid, v] of Object.entries(raw.records as Record<string, unknown>)) {
      if (marks.includes(v as Mark)) records[uid] = v as Mark;
    }
  }
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const ts = raw.updatedAt as Timestamp | undefined;
  return {
    id,
    batchId: str(raw.batchId),
    date: str(raw.date),
    start: str(raw.start),
    end: str(raw.end),
    records,
    note: str(raw.note),
    updatedAt: ts?.toDate ? ts.toDate() : null,
  };
}

/** Present + late count as attended; excused sessions are left out of the rate. */
export function attendanceRate(marksForStudent: Mark[]) {
  const counted = marksForStudent.filter((m) => m !== "excused");
  if (!counted.length) return null;
  return Math.round((counted.filter((m) => m === "present" || m === "late").length / counted.length) * 100);
}
