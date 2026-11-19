"use server";

import { FieldPath, FieldValue } from "firebase-admin/firestore";
import {
  cleanAnswers,
  deadline,
  finalScore,
  GRACE_SECONDS,
  gradeMcq,
  hasWritten,
  normalizeAttempt,
  normalizeQuiz,
  quizState,
  totalMarks,
  type Answer,
  type MyQuiz,
  type Quiz,
  type QuizAttempt,
  type QuizReview,
  type QuizSession,
} from "@/lib/quizzes";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireStudent } from "@/lib/server/students";
import { normalizeTest, testStats } from "@/lib/tests";
import type { UserProfile } from "@/lib/types";

// Online quizzes for signed-in students. Answer keys never leave the server until the quiz has closed;
// MCQs are marked here on submit, and final scores go into the linked test in Tests & marks.

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await fn();
  } catch (err) {
    if ((err as Error).message === "signed-out") return { ok: false, error: "Please sign in again." };
    console.error("[quiz]", err);
    return { ok: false, error: "Something went wrong — please try again." };
  }
}

const attemptRef = (quizId: string, uid: string) => adminDb().doc(`quizzes/${quizId}/attempts/${uid}`);

/** The quiz, if it's published and set for this student's batch. */
async function quizFor(me: UserProfile, id: string): Promise<Quiz | null> {
  if (!id || typeof id !== "string" || id.includes("/")) return null;
  const snap = await adminDb().doc(`quizzes/${id}`).get();
  if (!snap.exists) return null;
  const quiz = normalizeQuiz(snap.id, snap.data()!);
  return quiz.published && me.batchId && quiz.batchIds.includes(me.batchId) ? quiz : null;
}

function summary(q: Quiz, a: QuizAttempt | null, now = Date.now()): MyQuiz {
  const state = quizState(q, now);
  return {
    id: q.id,
    title: q.title,
    instructions: q.instructions,
    opensAt: q.opensAt,
    closesAt: q.closesAt,
    timeLimit: q.timeLimit,
    questionCount: q.questions.length,
    totalMarks: totalMarks(q),
    state: state === "draft" ? "closed" : state,
    startedAt: a?.startedAt ?? 0,
    submittedAt: a?.submittedAt ?? 0,
    autoScore: a?.submittedAt ? a.autoScore : null,
    score: a?.submittedAt ? a.score : null,
    hasWritten: hasWritten(q),
  };
}

/** Puts a final score into the linked test, and refreshes students' results if that test is already published. */
async function recordScore(quiz: Quiz, uid: string, score: number) {
  if (!quiz.testId) return;
  const db = adminDb();
  const ref = db.doc(`tests/${quiz.testId}`);
  await ref.update(new FieldPath("marks", uid), score, "updatedAt", FieldValue.serverTimestamp());
  const snap = await ref.get();
  if (!snap.exists) return;
  const test = normalizeTest(snap.id, snap.data()!);
  if (!test.published) return;
  const stats = testStats(test);
  const batch = db.batch();
  for (const [sid, s] of Object.entries(test.marks)) {
    batch.set(
      db.doc(`studentResults/${sid}`),
      {
        results: {
          [test.id]: {
            title: test.title,
            type: test.type,
            paper: test.paper,
            date: test.date,
            max: test.maxMarks,
            score: s === "absent" ? null : s,
            classAverage: stats.average,
            highest: stats.highest,
          },
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await batch.commit();
}

/** Quizzes for my batch (drafts never shown). */
export async function getMyQuizzes(): Promise<MyQuiz[]> {
  const me = await requireStudent();
  if (!me.batchId) return [];
  const db = adminDb();
  const snap = await db.collection("quizzes").where("batchIds", "array-contains", me.batchId).get();
  const quizzes = snap.docs.map((d) => normalizeQuiz(d.id, d.data())).filter((q) => q.published);
  const attempts = quizzes.length ? await db.getAll(...quizzes.map((q) => attemptRef(q.id, me.uid))) : [];
  const now = Date.now();
  return Promise.all(
    quizzes.map(async (q, i) => {
      let a = attempts[i]?.exists ? normalizeAttempt(me.uid, attempts[i].data()!) : null;
      // Started but never handed in, and the time is up: submit the saved answers now.
      if (a && !a.submittedAt && now > deadline(q, a.startedAt) + GRACE_SECONDS * 1000) {
        const done = await finish(q, me, a.answers);
        a = { ...a, ...done, submittedAt: now };
      }
      return summary(q, a, now);
    }),
  );
}

/** Starts (or continues) a quiz: the questions without answers, saved answers, and this student's deadline. */
export async function startQuiz(id: string): Promise<Result<QuizSession>> {
  return run(async () => {
    const me = await requireStudent();
    const quiz = await quizFor(me, id);
    if (!quiz) return { ok: false, error: "This quiz isn't available for your batch." };
    const now = Date.now();
    const state = quizState(quiz, now);
    if (state === "upcoming") return { ok: false, error: "This quiz hasn't opened yet." };
    if (state === "closed") return { ok: false, error: "This quiz has closed." };
    if (!quiz.questions.length) return { ok: false, error: "This quiz has no questions yet." };

    const ref = attemptRef(quiz.id, me.uid);
    const attempt = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) return normalizeAttempt(me.uid, snap.data()!);
      tx.set(ref, { uid: me.uid, name: me.name, startedAt: new Date(now), answers: {}, autoScore: 0, shortMarks: {}, feedback: {}, score: null });
      return normalizeAttempt(me.uid, { startedAt: now, name: me.name });
    });
    if (attempt.submittedAt) return { ok: false, error: "You've already submitted this quiz." };
    const due = deadline(quiz, attempt.startedAt);
    if (now > due + GRACE_SECONDS * 1000) {
      await finish(quiz, me, attempt.answers);
      return { ok: false, error: "Your time for this quiz is up — your saved answers were submitted." };
    }
    return {
      ok: true,
      data: {
        quiz: summary(quiz, attempt, now),
        questions: quiz.questions.map(({ id: qid, type, text, options, marks }) => ({ id: qid, type, text, options, marks })),
        answers: attempt.answers,
        deadline: Number.isFinite(due) ? due : 0,
        serverNow: now,
      },
    };
  });
}

/** Saves answers while the quiz is in progress (so a lost connection or closed tab loses nothing). */
export async function saveQuizAnswers(id: string, answers: Record<string, Answer>): Promise<Result<null>> {
  return run(async () => {
    const me = await requireStudent();
    const quiz = await quizFor(me, id);
    if (!quiz) return { ok: false, error: "This quiz isn't available for your batch." };
    const ref = attemptRef(quiz.id, me.uid);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "Start the quiz first." };
    const attempt = normalizeAttempt(me.uid, snap.data()!);
    if (attempt.submittedAt) return { ok: false, error: "You've already submitted this quiz." };
    if (Date.now() > deadline(quiz, attempt.startedAt) + GRACE_SECONDS * 1000) return { ok: false, error: "Time is up." };
    await ref.update({ answers: cleanAnswers(quiz.questions, answers), savedAt: FieldValue.serverTimestamp() });
    return { ok: true, data: null };
  });
}

async function finish(quiz: Quiz, me: UserProfile, answers: Record<string, Answer>) {
  const autoScore = gradeMcq(quiz.questions, answers);
  const score = finalScore(quiz.questions, { answers, shortMarks: {} });
  await attemptRef(quiz.id, me.uid).set(
    {
      uid: me.uid,
      name: me.name,
      answers,
      autoScore,
      score,
      submittedAt: FieldValue.serverTimestamp(),
      ...(score !== null ? { markedAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true },
  );
  if (score !== null) {
    // The answers are safe either way; the teacher can still send marks to Tests & marks from the quiz page.
    await recordScore(quiz, me.uid, score).catch((err) => console.error("[quiz] couldn't record score", err));
  }
  return { autoScore, score };
}

/** Hands the quiz in. Late answers (after the deadline + grace) are ignored — the last saved ones count. */
export async function submitQuiz(id: string, answers: Record<string, Answer>): Promise<Result<MyQuiz>> {
  return run(async () => {
    const me = await requireStudent();
    const quiz = await quizFor(me, id);
    if (!quiz) return { ok: false, error: "This quiz isn't available for your batch." };
    const snap = await attemptRef(quiz.id, me.uid).get();
    if (!snap.exists) return { ok: false, error: "Start the quiz first." };
    const attempt = normalizeAttempt(me.uid, snap.data()!);
    if (attempt.submittedAt) return { ok: true, data: summary(quiz, attempt) };
    const inTime = Date.now() <= deadline(quiz, attempt.startedAt) + GRACE_SECONDS * 1000;
    const final = inTime ? cleanAnswers(quiz.questions, answers) : attempt.answers;
    const { autoScore, score } = await finish(quiz, me, final);
    return { ok: true, data: summary(quiz, { ...attempt, answers: final, autoScore, score, submittedAt: Date.now() }) };
  });
}

/** After the quiz closes: questions with the right answers, my answers, marks and feedback. */
export async function getQuizReview(id: string): Promise<Result<QuizReview>> {
  return run(async () => {
    const me = await requireStudent();
    const quiz = await quizFor(me, id);
    if (!quiz) return { ok: false, error: "This quiz isn't available for your batch." };
    if (quizState(quiz) !== "closed") return { ok: false, error: "Answers are shown once the quiz closes." };
    const snap = await attemptRef(quiz.id, me.uid).get();
    const attempt = snap.exists ? normalizeAttempt(me.uid, snap.data()!) : null;
    return {
      ok: true,
      data: {
        quiz: summary(quiz, attempt),
        questions: quiz.questions,
        answers: attempt?.submittedAt ? attempt.answers : {},
        shortMarks: attempt?.shortMarks ?? {},
        feedback: attempt?.feedback ?? {},
      },
    };
  });
}
