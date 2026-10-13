import type { Batch, BatchStatus, Board, ClassLevel, Location, Session, Weekday } from "./types";

export const classLevels: ClassLevel[] = ["9", "10", "11", "12"];
export const weekdays: Weekday[] = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
export const boards: Board[] = ["Cambridge", "Edexcel", "Both"];

export const classLabels: Record<ClassLevel, string> = {
  "9": "O Level / IGCSE",
  "10": "O Level / IGCSE",
  "11": "AS / A Level",
  "12": "AS / A Level",
};

export const statusLabels: Record<BatchStatus, string> = {
  open: "Admission open",
  "few-seats": "Few seats left",
  full: "Batch full",
  closed: "Closed",
};

/** Default centres — shown publicly until locations are added in the dashboard. */
export const defaultLocations: Location[] = [
  { id: "mirpur-academia", name: "Mirpur Academia", area: "Mirpur, Dhaka", address: "", mapUrl: "", phone: "", active: true, order: 1 },
  { id: "uttara-qed", name: "Uttara QED", area: "Uttara, Dhaka", address: "", mapUrl: "", phone: "", active: true, order: 2 },
];

/** "16:00" → "4:00 PM" (deterministic, so server and browser render the same text). */
export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatTimeRange(start: string, end: string) {
  if (!start) return "";
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);
}

/** Sessions in week order (Saturday first). */
export function sortSessions(sessions: Session[]) {
  return [...sessions].sort((a, b) => weekdays.indexOf(a.day) - weekdays.indexOf(b.day) || a.start.localeCompare(b.start));
}

/**
 * Groups sessions that share the same time, e.g.
 * [{ days: "Sat · Mon", time: "4:00 PM – 5:30 PM" }, { days: "Wed", time: "6:00 PM – 7:30 PM" }]
 */
export function groupSessions(sessions: Session[]) {
  const groups = new Map<string, Weekday[]>();
  for (const s of sortSessions(sessions)) {
    const key = `${s.start}|${s.end}`;
    groups.set(key, [...(groups.get(key) ?? []), s.day]);
  }
  return [...groups.entries()].map(([key, days]) => {
    const [start, end] = key.split("|");
    return { days: days.join(" · "), time: formatTimeRange(start, end) };
  });
}

const str = (v: unknown, f = "") => (typeof v === "string" ? v : f);

export function normalizeLocation(id: string, raw: Record<string, unknown>): Location {
  return {
    id,
    name: str(raw.name, "Untitled centre"),
    area: str(raw.area),
    address: str(raw.address),
    mapUrl: str(raw.mapUrl),
    phone: str(raw.phone),
    active: raw.active !== false,
    order: typeof raw.order === "number" ? raw.order : 99,
  };
}

function normalizeSessions(raw: Record<string, unknown>): Session[] {
  if (Array.isArray(raw.sessions)) {
    return sortSessions(
      (raw.sessions as Record<string, unknown>[])
        .filter((s) => s && weekdays.includes(s.day as Weekday))
        .map((s) => ({ day: s.day as Weekday, start: str(s.start), end: str(s.end) })),
    );
  }
  // Older batches stored one time for all days.
  if (Array.isArray(raw.days)) {
    return weekdays
      .filter((d) => (raw.days as unknown[]).includes(d))
      .map((day) => ({ day, start: str(raw.startTime), end: str(raw.endTime) }));
  }
  return [];
}

export function normalizeBatch(id: string, raw: Record<string, unknown>): Batch {
  const classLevel = classLevels.includes(raw.classLevel as ClassLevel) ? (raw.classLevel as ClassLevel) : "9";
  const status = (["open", "few-seats", "full", "closed"] as BatchStatus[]).includes(raw.status as BatchStatus)
    ? (raw.status as BatchStatus)
    : "open";
  return {
    id,
    classLevel,
    locationId: str(raw.locationId),
    name: str(raw.name, "Batch"),
    board: boards.includes(raw.board as Board) ? (raw.board as Board) : "Both",
    sessions: normalizeSessions(raw),
    seats: typeof raw.seats === "number" ? raw.seats : 0,
    fee: typeof raw.fee === "number" ? raw.fee : 0,
    status,
    notes: str(raw.notes),
  };
}

/** Sort batches by class, then their first class day, then that day's start time. */
export function sortBatches(list: Batch[]) {
  const first = (b: Batch) => b.sessions[0];
  const dayIndex = (b: Batch) => (first(b) ? weekdays.indexOf(first(b).day) : 99);
  return [...list].sort(
    (a, b) =>
      Number(a.classLevel) - Number(b.classLevel) ||
      dayIndex(a) - dayIndex(b) ||
      (first(a)?.start ?? "").localeCompare(first(b)?.start ?? ""),
  );
}
