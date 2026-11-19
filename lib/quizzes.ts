import type { Timestamp } from "firebase/firestore";

// Online tests & quizzes. quizzes/{id} (with the correct answers) and quizzes/{id}/attempts/{studentId}
// are admin-only in firestore.rules — students take them through the server (app/quiz-actions.ts),
// which never sends an answer key before the quiz has closed. Each quiz has a linked tests/{testId}
// document, so final scores land in Tests & marks and reach students when that test is published.

export type QuestionType = "mcq" | "short";

export type QuizQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  /** MCQ choices (2–6). */
  options: string[];
  /** Index of the correct choice (MCQ). */
  correct: number;
  marks: number;
  /** Written questions: model answer / marking notes (shown to students after the quiz closes). */
  answer: string;
};

export type Quiz = {
  id: string;
  title: string;
  instructions: string;
  batchIds: string[];
  /** ms since epoch; 0 = not set. */
  opensAt: number;
  closesAt: number;
  /** Minutes once started; 0 = no limit (until it closes). */
  timeLimit: number;
  questions: QuizQuestion[];
  /** false = draft (students don't see it). */
  published: boolean;
  /** Linked tests/{id} in Tests & marks. */
  testId: string;
  createdAt: Date | null;
};

export type Answer = number | string;

export type QuizAttempt = {
  uid: string;
  name: string;
  startedAt: number;
  submittedAt: number;
  /** question id → choice index (MCQ) or text (written). */
  answers: Record<string, Answer>;
  /** Marks for the MCQs, set on submit. */
  autoScore: number;
  /** Teacher's marks for written answers. */
  shortMarks: Record<string, number>;
  feedback: Record<string, string>;
  /** Final total — set once every written answer has a mark (straight away for MCQ-only quizzes). */
  score: number | null;
  markedAt: number;
};

export type QuizState = "draft" | "upcoming" | "open" | "closed";

/** Seconds of grace after the time is up (slow connections) before answers stop being accepted. */
export const GRACE_SECONDS = 90;
export const MAX_QUESTIONS = 100;

const str = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const ms = (v: unknown) => {
  const t = v as Timestamp | Date | number | undefined;
  if (typeof t === "number") return t;
  if (t instanceof Date) return t.getTime();
  return t && typeof (t as Timestamp).toMillis === "function" ? (t as Timestamp).toMillis() : 0;
};

export function normalizeQuestion(raw: Record<string, unknown>, i: number): QuizQuestion {
  const type: QuestionType = raw.type === "short" ? "short" : "mcq";
  const options = Array.isArray(raw.options) ? raw.options.map((o) => str(o, 500)) : [];
  return {
    id: str(raw.id, 40) || `q${i + 1}`,
    type,
    text: str(raw.text, 4000),
    options: type === "mcq" ? options : [],
    correct: Math.max(0, Math.min(num(raw.correct), Math.max(0, options.length - 1))),
    marks: Math.max(0, num(raw.marks) || 1),
    answer: str(raw.answer, 4000),
  };
}

export function normalizeQuiz(id: string, raw: Record<string, unknown>): Quiz {
  return {
    id,
    title: str(raw.title, 200),
    instructions: str(raw.instructions, 4000),
    batchIds: Array.isArray(raw.batchIds) ? raw.batchIds.filter((b): b is string => typeof b === "string") : [],
    opensAt: ms(raw.opensAt),
    closesAt: ms(raw.closesAt),
    timeLimit: Math.max(0, Math.round(num(raw.timeLimit))),
    questions: (Array.isArray(raw.questions) ? (raw.questions as Record<string, unknown>[]) : []).map(normalizeQuestion),
    published: raw.published === true,
    testId: str(raw.testId, 100),
    createdAt: ms(raw.createdAt) ? new Date(ms(raw.createdAt)) : null,
  };
}

export function normalizeAttempt(uid: string, raw: Record<string, unknown>): QuizAttempt {
  const answers: Record<string, Answer> = {};
  for (const [k, v] of Object.entries((raw.answers ?? {}) as Record<string, unknown>)) {
    if (typeof v === "number" || typeof v === "string") answers[k] = v;
  }
  const shortMarks: Record<string, number> = {};
  for (const [k, v] of Object.entries((raw.shortMarks ?? {}) as Record<string, unknown>)) if (typeof v === "number") shortMarks[k] = v;
  const feedback: Record<string, string> = {};
  for (const [k, v] of Object.entries((raw.feedback ?? {}) as Record<string, unknown>)) if (typeof v === "string") feedback[k] = v;
  return {
    uid,
    name: str(raw.name, 200),
    startedAt: ms(raw.startedAt),
    submittedAt: ms(raw.submittedAt),
    answers,
    autoScore: num(raw.autoScore),
    shortMarks,
    feedback,
    score: typeof raw.score === "number" ? raw.score : null,
    markedAt: ms(raw.markedAt),
  };
}

export const totalMarks = (q: Pick<Quiz, "questions">) => q.questions.reduce((s, x) => s + x.marks, 0);
export const hasWritten = (q: Pick<Quiz, "questions">) => q.questions.some((x) => x.type === "short");

export function quizState(q: Pick<Quiz, "published" | "opensAt" | "closesAt">, now = Date.now()): QuizState {
  if (!q.published) return "draft";
  if (q.opensAt && now < q.opensAt) return "upcoming";
  if (q.closesAt && now >= q.closesAt) return "closed";
  return "open";
}

/** When this student's answers are due: the time limit from when they started, never after closing. */
export function deadline(q: Pick<Quiz, "closesAt" | "timeLimit">, startedAt: number) {
  const byLimit = q.timeLimit > 0 && startedAt ? startedAt + q.timeLimit * 60_000 : Infinity;
  const byClose = q.closesAt || Infinity;
  return Math.min(byLimit, byClose);
}

/** Marks for the MCQs. */
export function gradeMcq(questions: QuizQuestion[], answers: Record<string, Answer>) {
  return questions.reduce((s, q) => s + (q.type === "mcq" && answers[q.id] === q.correct ? q.marks : 0), 0);
}

/** The final total, or null while a written answer still needs a mark. Unanswered written questions count as 0. */
export function finalScore(questions: QuizQuestion[], a: Pick<QuizAttempt, "answers" | "shortMarks">) {
  let total = gradeMcq(questions, a.answers);
  for (const q of questions.filter((x) => x.type === "short")) {
    const answered = typeof a.answers[q.id] === "string" && (a.answers[q.id] as string).trim() !== "";
    if (!answered) continue;
    if (typeof a.shortMarks[q.id] !== "number") return null;
    total += a.shortMarks[q.id];
  }
  return total;
}

/** Cleans answers coming from a student: only known questions, valid choice indexes, text capped. */
export function cleanAnswers(questions: QuizQuestion[], raw: unknown): Record<string, Answer> {
  const out: Record<string, Answer> = {};
  if (!raw || typeof raw !== "object") return out;
  const given = raw as Record<string, unknown>;
  for (const q of questions) {
    const v = given[q.id];
    if (q.type === "mcq" && typeof v === "number" && Number.isInteger(v) && v >= 0 && v < q.options.length) out[q.id] = v;
    if (q.type === "short" && typeof v === "string" && v.trim()) out[q.id] = v.slice(0, 5000);
  }
  return out;
}

export const newQuestionId = () => `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const stateLabels: Record<QuizState, string> = { draft: "Draft", upcoming: "Upcoming", open: "Open now", closed: "Closed" };
export const stateStyles: Record<QuizState, string> = {
  draft: "bg-paper-2 text-ink-soft",
  upcoming: "bg-series-3/15 text-series-3",
  open: "bg-forest/15 text-forest",
  closed: "bg-paper-2 text-ink-soft",
};

/** "Sat 22 Nov, 5:00 pm" in the viewer's time zone. */
export function whenLabel(t: number) {
  if (!t) return "—";
  return new Date(t).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

/** "1h 05m" / "4m 09s" countdown text. */
export function countdown(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

// ── What students get from the server ─────────────────────────────

/** A quiz in the student's list (no questions). */
export type MyQuiz = {
  id: string;
  title: string;
  instructions: string;
  opensAt: number;
  closesAt: number;
  timeLimit: number;
  questionCount: number;
  totalMarks: number;
  state: Exclude<QuizState, "draft">;
  startedAt: number;
  submittedAt: number;
  /** MCQ marks once submitted. */
  autoScore: number | null;
  /** Final total once fully marked. */
  score: number | null;
  hasWritten: boolean;
};

/** A question as a student sees it while taking the quiz (no answer key). */
export type StudentQuestion = Pick<QuizQuestion, "id" | "type" | "text" | "options" | "marks">;

export type QuizSession = {
  quiz: MyQuiz;
  questions: StudentQuestion[];
  answers: Record<string, Answer>;
  /** ms since epoch; Infinity is sent as 0 (no deadline). */
  deadline: number;
  serverNow: number;
};

/** After closing: everything, with the student's own answers and marks. */
export type QuizReview = {
  quiz: MyQuiz;
  questions: QuizQuestion[];
  answers: Record<string, Answer>;
  shortMarks: Record<string, number>;
  feedback: Record<string, string>;
};
