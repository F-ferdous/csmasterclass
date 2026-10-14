import type { Timestamp } from "firebase/firestore";
import type { ResourceFile } from "./resources";

/**
 * homework/{id} — set by an admin for one or more batches. Students in those batches can read it
 * (audienceKeys "batch:<id>", like resources; empty while hidden).
 * homework/{id}/submissions/{uid} — the student's answer (link and/or file) and the admin's mark.
 */
export type Homework = {
  id: string;
  title: string;
  instructions: string;
  /** Optional reference — worksheet, Google Doc, video. */
  link: string;
  batchIds: string[];
  dueDate: string; // YYYY-MM-DD, due by the end of that day
  /** null = not marked out of a number (feedback only). */
  maxMarks: number | null;
  visible: boolean;
  createdAt: Date | null;
};

export type Submission = {
  uid: string;
  name: string;
  link: string;
  note: string;
  file: ResourceFile | null;
  submittedAt: Date | null;
  mark: number | null;
  feedback: string;
  markedAt: Date | null;
};

export type HomeworkStatus = "todo" | "overdue" | "submitted" | "late" | "marked";

export const statusLabels: Record<HomeworkStatus, string> = {
  todo: "To do",
  overdue: "Overdue",
  submitted: "Submitted",
  late: "Submitted late",
  marked: "Marked",
};

export const statusStyles: Record<HomeworkStatus, string> = {
  todo: "bg-paper-2 text-ink-soft",
  overdue: "bg-ember/15 text-ember",
  submitted: "bg-series-3/15 text-series-3",
  late: "bg-gold/20 text-gold",
  marked: "bg-forest/15 text-forest",
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const date = (v: unknown) => ((v as Timestamp | undefined)?.toDate ? (v as Timestamp).toDate() : null);

export function normalizeHomework(id: string, raw: Record<string, unknown>): Homework {
  return {
    id,
    title: str(raw.title) || "Homework",
    instructions: str(raw.instructions),
    link: str(raw.link),
    batchIds: Array.isArray(raw.batchIds) ? (raw.batchIds as unknown[]).filter((b): b is string => typeof b === "string") : [],
    dueDate: str(raw.dueDate),
    maxMarks: typeof raw.maxMarks === "number" && raw.maxMarks > 0 ? raw.maxMarks : null,
    visible: raw.visible !== false,
    createdAt: date(raw.createdAt),
  };
}

export function normalizeSubmission(uid: string, raw: Record<string, unknown>): Submission {
  const f = raw.file as Record<string, unknown> | null | undefined;
  return {
    uid,
    name: str(raw.name),
    link: str(raw.link),
    note: str(raw.note),
    file: f && typeof f.path === "string" ? { path: f.path, name: str(f.name), size: typeof f.size === "number" ? f.size : 0, contentType: str(f.contentType) } : null,
    submittedAt: date(raw.submittedAt),
    mark: typeof raw.mark === "number" ? raw.mark : null,
    feedback: str(raw.feedback),
    markedAt: date(raw.markedAt),
  };
}

/** Local YYYY-MM-DD. */
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function homeworkStatus(hw: Pick<Homework, "dueDate">, sub: Submission | null | undefined, now = new Date()): HomeworkStatus {
  if (sub?.markedAt) return "marked";
  if (sub?.submittedAt) return hw.dueDate && ymd(sub.submittedAt) > hw.dueDate ? "late" : "submitted";
  if (sub && !sub.submittedAt) return "submitted"; // just sent; server time not back yet
  return hw.dueDate && ymd(now) > hw.dueDate ? "overdue" : "todo";
}

/** "Due today", "Due tomorrow", "Due in 3 days", "2 days overdue". */
export function dueText(dueDate: string, now = new Date()) {
  if (!dueDate) return "No due date";
  const [y, m, d] = dueDate.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((due.getTime() - today.getTime()) / 864e5);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  return `${-days} day${days === -1 ? "" : "s"} overdue`;
}

export const homeworkAudienceKeys = (hw: Pick<Homework, "batchIds" | "visible">) => (hw.visible ? hw.batchIds.map((b) => `batch:${b}`) : []);
