import { deleteField, doc, serverTimestamp, writeBatch, type Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export type TestType = "class-test" | "mock" | "quiz";
/** A mark, or "absent". Students with no entry yet simply aren't in `marks`. */
export type Score = number | "absent";

/** tests/{id} — admin only. Results reach students through studentResults/{uid} when published. */
export type Test = {
  id: string;
  title: string;
  type: TestType;
  /** Free text, e.g. "Paper 1", "Paper 2", "Chapter 4". */
  paper: string;
  date: string; // YYYY-MM-DD
  maxMarks: number;
  batchIds: string[];
  marks: Record<string, Score>;
  published: boolean;
  note: string;
  createdAt: Date | null;
};

export const testTypes: TestType[] = ["class-test", "mock", "quiz"];
export const testTypeLabels: Record<TestType, string> = { "class-test": "Class test", mock: "Mock exam", quiz: "Quiz" };
export const testTypeStyles: Record<TestType, string> = {
  "class-test": "bg-series-3/15 text-series-3",
  mock: "bg-ember/15 text-ember",
  quiz: "bg-gold/20 text-gold",
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

export function normalizeTest(id: string, raw: Record<string, unknown>): Test {
  const marks: Record<string, Score> = {};
  for (const [uid, v] of Object.entries((raw.marks ?? {}) as Record<string, unknown>)) {
    if (v === "absent" || (typeof v === "number" && Number.isFinite(v))) marks[uid] = v as Score;
  }
  const ts = raw.createdAt as Timestamp | undefined;
  return {
    id,
    title: str(raw.title) || "Untitled test",
    type: testTypes.includes(raw.type as TestType) ? (raw.type as TestType) : "class-test",
    paper: str(raw.paper),
    date: str(raw.date),
    maxMarks: typeof raw.maxMarks === "number" && raw.maxMarks > 0 ? raw.maxMarks : 100,
    batchIds: Array.isArray(raw.batchIds) ? (raw.batchIds as unknown[]).filter((b): b is string => typeof b === "string") : [],
    marks,
    published: Boolean(raw.published),
    note: str(raw.note),
    createdAt: ts?.toDate ? ts.toDate() : null,
  };
}

export const percent = (score: number, max: number) => (max > 0 ? Math.round((score / max) * 100) : 0);

/** Average (as %) and highest mark among students who sat the test. */
export function testStats(t: Pick<Test, "marks" | "maxMarks">) {
  const sat = Object.values(t.marks).filter((s): s is number => typeof s === "number");
  return {
    sat: sat.length,
    absent: Object.values(t.marks).filter((s) => s === "absent").length,
    average: sat.length ? percent(sat.reduce((a, b) => a + b, 0) / sat.length, t.maxMarks) : null,
    highest: sat.length ? Math.max(...sat) : null,
  };
}

/**
 * Rough Cambridge-style grade from a percentage. Real boundaries change every session,
 * so this is shown as "approx." — adjust the thresholds here if needed.
 */
const gradeBands: [number, string][] = [
  [80, "A*"],
  [70, "A"],
  [60, "B"],
  [50, "C"],
  [40, "D"],
  [30, "E"],
  [20, "F"],
  [10, "G"],
];
export const approxGrade = (pct: number) => gradeBands.find(([min]) => pct >= min)?.[1] ?? "U";

/** studentResults/{uid}.results[testId] — what one student sees about one published test. */
export type MyResult = {
  testId: string;
  title: string;
  type: TestType;
  paper: string;
  date: string;
  max: number;
  /** null = absent */
  score: number | null;
  classAverage: number | null; // %
  highest: number | null;
};

export function normalizeMyResults(raw: Record<string, unknown> | undefined): MyResult[] {
  const results = (raw?.results ?? {}) as Record<string, Record<string, unknown>>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return Object.entries(results)
    .filter(([, r]) => r && typeof r === "object")
    .map(([testId, r]) => ({
      testId,
      title: str(r.title) || "Test",
      type: testTypes.includes(r.type as TestType) ? (r.type as TestType) : "class-test",
      paper: str(r.paper),
      date: str(r.date),
      max: num(r.max) ?? 100,
      score: num(r.score),
      classAverage: num(r.classAverage),
      highest: num(r.highest),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Brings every student's copy in line with the test: published → each student with a mark gets
 * their result (and the class stats); unpublished, removed students or a deleted test → removed.
 */
export async function syncResults(test: Test | null, testId: string, previousUids: string[] = []) {
  const wb = writeBatch(db());
  const live = test?.published ? test : null;
  const stats = live ? testStats(live) : null;
  const current = live ? Object.keys(live.marks) : [];
  for (const uid of current) {
    const s = live!.marks[uid];
    wb.set(
      doc(db(), "studentResults", uid),
      {
        results: {
          [testId]: {
            title: live!.title,
            type: live!.type,
            paper: live!.paper,
            date: live!.date,
            max: live!.maxMarks,
            score: s === "absent" ? null : s,
            classAverage: stats!.average,
            highest: stats!.highest,
          },
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
  for (const uid of previousUids.filter((u) => !current.includes(u))) {
    wb.set(doc(db(), "studentResults", uid), { results: { [testId]: deleteField() }, updatedAt: serverTimestamp() }, { merge: true });
  }
  await wb.commit();
}
