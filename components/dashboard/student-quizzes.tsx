"use client";

import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, CircleDot, Clock, Eye, Hourglass, ListChecks, Pencil, Play, Send, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getMyQuizzes, getQuizReview, saveQuizAnswers, startQuiz, submitQuiz } from "@/app/quiz-actions";
import { adminInput, EmptyState, ErrorText, PageHeader, PrimaryButton, Spinner } from "@/components/admin/ui";
import { ease } from "@/components/motion/reveal";
import { countdown, whenLabel, type Answer, type MyQuiz, type QuizReview, type QuizSession } from "@/lib/quizzes";
import { cn } from "@/lib/utils";
import { refreshStudentData, setStudentData, useStudentData } from "./use-student-data";

export function useMyQuizzes(): MyQuiz[] | null {
  return useStudentData("quizzes", getMyQuizzes);
}

/** Open quizzes the student hasn't handed in yet (sidebar badge). */
export const quizzesToDo = (list: MyQuiz[] | null) => (list ?? []).filter((q) => q.state === "open" && !q.submittedAt).length;

type View = { kind: "list" } | { kind: "take"; session: QuizSession } | { kind: "review"; review: QuizReview };

export function StudentQuizzes() {
  const list = useMyQuizzes();
  const [view, setView] = useState<View>({ kind: "list" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function open(q: MyQuiz) {
    setBusy(q.id);
    setError("");
    try {
      if (q.state === "closed") {
        const r = await getQuizReview(q.id);
        if (r.ok) setView({ kind: "review", review: r.data });
        else setError(r.error);
      } else {
        const r = await startQuiz(q.id);
        if (r.ok) setView({ kind: "take", session: r.data });
        else {
          setError(r.error);
          await refreshStudentData("quizzes");
        }
      }
    } catch {
      setError("Couldn't open the quiz — check your connection and try again.");
    }
    setBusy("");
  }

  if (view.kind === "take") {
    return (
      <QuizTaker
        session={view.session}
        onDone={(updated) => {
          if (updated) setStudentData<MyQuiz[]>("quizzes", (cur) => (cur ?? []).map((q) => (q.id === updated.id ? updated : q)));
          refreshStudentData("quizzes");
          setView({ kind: "list" });
        }}
      />
    );
  }
  if (view.kind === "review") return <Review review={view.review} onBack={() => setView({ kind: "list" })} />;
  if (list === null) return <Spinner />;

  const now = list.filter((q) => q.state === "open" && !q.submittedAt);
  const upcoming = list.filter((q) => q.state === "upcoming").sort((a, b) => a.opensAt - b.opensAt);
  const done = list
    .filter((q) => q.submittedAt || q.state === "closed")
    .filter((q) => !now.includes(q))
    .sort((a, b) => (b.submittedAt || b.closesAt) - (a.submittedAt || a.closesAt));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Quizzes"
        description="Online tests from your teacher. Multiple-choice questions are marked straight away; written answers are marked by your teacher. Correct answers appear once a quiz closes."
      />
      <ErrorText message={error} />
      {list.length === 0 ? (
        <EmptyState icon={<ListChecks className="size-6" />} title="No quizzes yet" body="When your teacher sets an online quiz for your batch, it'll appear here." />
      ) : (
        <>
          <Group title="Open now" empty="Nothing to take right now." items={now} busy={busy} onOpen={open} />
          {upcoming.length > 0 && <Group title="Coming up" items={upcoming} busy={busy} onOpen={open} />}
          {done.length > 0 && <Group title="Finished" items={done} busy={busy} onOpen={open} />}
        </>
      )}
    </div>
  );
}

function Group({ title, items, empty, busy, onOpen }: { title: string; items: MyQuiz[]; empty?: string; busy: string; onOpen: (q: MyQuiz) => void }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl">
        {title} {items.length > 0 && <span className="text-base text-ink-soft">· {items.length}</span>}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line px-5 py-6 text-center text-sm text-ink-soft">{empty}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((q, i) => (
            <QuizCard key={q.id} quiz={q} index={i} busy={busy === q.id} onOpen={() => onOpen(q)} />
          ))}
        </div>
      )}
    </section>
  );
}

function QuizCard({ quiz: q, index, busy, onOpen }: { quiz: MyQuiz; index: number; busy: boolean; onOpen: () => void }) {
  const inProgress = q.state === "open" && q.startedAt && !q.submittedAt;
  const status = q.submittedAt
    ? q.score !== null
      ? { label: "Marked", style: "bg-forest/15 text-forest" }
      : { label: "Submitted", style: "bg-series-3/15 text-series-3" }
    : q.state === "open"
      ? { label: inProgress ? "In progress" : "Open now", style: "bg-ember/15 text-ember" }
      : q.state === "upcoming"
        ? { label: "Coming up", style: "bg-paper-2 text-ink-soft" }
        : { label: "Missed", style: "bg-paper-2 text-ink-soft" };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3), ease }}
      className={cn("flex flex-col rounded-3xl border p-5 sm:p-6", q.state === "open" && !q.submittedAt ? "border-ember/50 bg-ember/[0.04]" : "border-line")}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={cn("rounded-full px-2.5 py-1 font-medium", status.style)}>{status.label}</span>
        <span className="text-ink-soft">
          {q.questionCount} question{q.questionCount === 1 ? "" : "s"} · {q.totalMarks} mark{q.totalMarks === 1 ? "" : "s"}
        </span>
        {q.timeLimit > 0 && (
          <span className="inline-flex items-center gap-1 text-ink-soft">
            <Clock className="size-3.5" aria-hidden /> {q.timeLimit} min
          </span>
        )}
      </div>
      <h3 className="mt-3 font-display text-xl">{q.title}</h3>
      <p className="mt-1.5 text-sm text-ink-soft">
        {q.state === "upcoming" ? `Opens ${whenLabel(q.opensAt)}` : q.closesAt ? `${q.state === "closed" ? "Closed" : "Closes"} ${whenLabel(q.closesAt)}` : "No closing time"}
      </p>
      {q.instructions && q.state !== "closed" && <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-relaxed">{q.instructions}</p>}

      {q.submittedAt > 0 && (
        <div className="mt-4 rounded-2xl bg-paper-2/60 p-4 text-sm">
          {q.score !== null ? (
            <p className="flex items-baseline justify-between gap-3">
              <span>Your score</span>
              <span className="font-display text-2xl tabular-nums">
                {q.score}
                <span className="text-sm text-ink-soft">/{q.totalMarks}</span>
              </span>
            </p>
          ) : (
            <p>
              Multiple choice: <strong className="tabular-nums">{q.autoScore ?? 0}</strong> marks so far. Your written answers are waiting for your teacher to mark.
            </p>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
        {q.state === "open" && !q.submittedAt && (
          <PrimaryButton onClick={onOpen} loading={busy}>
            <Play className="size-4" aria-hidden /> {inProgress ? "Continue" : "Start quiz"}
          </PrimaryButton>
        )}
        {q.state === "closed" && (
          <button type="button" onClick={onOpen} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm hover:border-ink disabled:opacity-60">
            <Eye className="size-4" aria-hidden /> {busy ? "Opening…" : "See answers"}
          </button>
        )}
        {q.state === "open" && q.submittedAt > 0 && <p className="text-sm text-ink-soft">Answers show here after {whenLabel(q.closesAt)}.</p>}
        {q.state === "open" && !q.submittedAt && !inProgress && q.timeLimit > 0 && (
          <p className="text-xs text-ink-soft">The {q.timeLimit}-minute timer starts when you press Start.</p>
        )}
      </div>
    </motion.article>
  );
}

/* ───────────────────────── Taking a quiz ───────────────────────── */

const draftKey = (id: string) => `quiz-draft-${id}`;

function QuizTaker({ session, onDone }: { session: QuizSession; onDone: (updated?: MyQuiz) => void }) {
  const { quiz, questions } = session;
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => {
    try {
      const local = JSON.parse(localStorage.getItem(draftKey(quiz.id)) ?? "{}") as Record<string, Answer>;
      return { ...session.answers, ...local };
    } catch {
      return session.answers;
    }
  });
  const [saveState, setSaveState] = useState<"saved" | "saving" | "offline">("saved");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MyQuiz | null>(null);
  // Server clock minus this device's clock, so the countdown is right even if the phone's time is off.
  const [offset] = useState(() => session.serverNow - Date.now());
  const [now, setNow] = useState(session.serverNow);
  const latest = useRef(answers);
  const dirty = useRef(false);
  const submitted = useRef(false);

  const save = useCallback(async () => {
    if (!dirty.current || submitted.current) return;
    dirty.current = false;
    setSaveState("saving");
    try {
      const r = await saveQuizAnswers(quiz.id, latest.current);
      setSaveState(r.ok ? "saved" : "offline");
      if (!r.ok) dirty.current = true;
    } catch {
      dirty.current = true;
      setSaveState("offline");
    }
  }, [quiz.id]);

  const submit = useCallback(
    async (auto = false) => {
      if (submitted.current) return;
      if (!auto) {
        const left = questions.filter((q) => !(q.id in latest.current)).length;
        if (!window.confirm(left ? `${left} question${left === 1 ? " is" : "s are"} not answered. Submit anyway?` : "Submit your answers? You can't change them afterwards.")) return;
      }
      submitted.current = true;
      setSubmitting(true);
      setError("");
      let refused = "";
      for (let tries = 0; tries < 3; tries++) {
        try {
          const r = await submitQuiz(quiz.id, latest.current);
          if (r.ok) {
            try {
              localStorage.removeItem(draftKey(quiz.id));
            } catch {}
            setResult(r.data);
            setSubmitting(false);
            return;
          }
          refused = r.error;
          break;
        } catch {
          await new Promise((res) => setTimeout(res, 2000));
        }
      }
      setError(refused || "Couldn't submit — check your connection and press Submit again. Your answers are saved on this device.");
      submitted.current = false;
      setSubmitting(false);
    },
    [quiz.id, questions],
  );

  // Clock + auto-submit when the time is up.
  useEffect(() => {
    const t = window.setInterval(() => {
      const n = Date.now() + offset;
      setNow(n);
      if (session.deadline && n >= session.deadline && !submitted.current) submit(true);
    }, 1000);
    return () => window.clearInterval(t);
  }, [session.deadline, submit, offset]);

  // Save to the server every few seconds while there are changes.
  useEffect(() => {
    const t = window.setInterval(save, 4000);
    return () => window.clearInterval(t);
  }, [save]);

  function answer(id: string, value: Answer) {
    setAnswers((cur) => {
      const next = { ...cur };
      if (value === "") delete next[id];
      else next[id] = value;
      latest.current = next;
      try {
        localStorage.setItem(draftKey(quiz.id), JSON.stringify(next));
      } catch {}
      return next;
    });
    dirty.current = true;
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl rounded-[2rem] border border-line p-6 text-center sm:p-10" role="status">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-forest text-forest-ink">
          <CheckCircle2 className="size-7" aria-hidden />
        </span>
        <h2 className="mt-5 font-display text-3xl">Submitted</h2>
        {result.score !== null ? (
          <p className="mt-3 text-ink-soft">
            Your score: <strong className="font-display text-2xl text-ink">{result.score}</strong> / {result.totalMarks}
          </p>
        ) : (
          <p className="mt-3 text-ink-soft">
            Multiple choice: <strong className="text-ink">{result.autoScore ?? 0}</strong> marks. Your teacher will mark your written answers.
          </p>
        )}
        <p className="mt-2 text-sm text-ink-soft">The correct answers appear on the Quizzes page after the quiz closes{result.closesAt ? ` (${whenLabel(result.closesAt)})` : ""}.</p>
        <PrimaryButton onClick={() => onDone(result)} className="mt-6">
          Back to quizzes
        </PrimaryButton>
      </div>
    );
  }

  const left = session.deadline ? session.deadline - now : 0;
  const answered = questions.filter((q) => q.id in answers).length;

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={async () => {
              await save();
              onDone();
            }}
            aria-label="Back to quizzes (your answers are saved)"
            className="grid size-9 place-items-center rounded-full border border-line hover:border-ink"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{quiz.title}</p>
            <p className="text-xs text-ink-soft">
              {answered}/{questions.length} answered ·{" "}
              {saveState === "saving" ? "Saving…" : saveState === "offline" ? "Not saved yet — will retry" : "Saved"}
            </p>
          </div>
          {session.deadline > 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm tabular-nums",
                left < 60_000 ? "bg-ember text-paper" : left < 5 * 60_000 ? "bg-ember/15 text-ember" : "bg-paper-2",
              )}
              aria-live={left < 60_000 ? "polite" : "off"}
            >
              <Hourglass className="size-4" aria-hidden /> {countdown(left)}
            </span>
          )}
          <PrimaryButton onClick={() => submit(false)} loading={submitting}>
            <Send className="size-4" aria-hidden /> Submit
          </PrimaryButton>
        </div>
      </div>

      {quiz.instructions && <p className="mt-6 whitespace-pre-line rounded-2xl bg-paper-2/60 p-4 text-sm leading-relaxed">{quiz.instructions}</p>}
      <ErrorText message={error} />

      <ol className="mt-6 space-y-5">
        {questions.map((q, i) => (
          <li key={q.id} className="rounded-3xl border border-line p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <p className="whitespace-pre-line font-medium leading-relaxed">
                <span className="mr-2 text-ink-faint">{i + 1}.</span>
                {q.text}
              </p>
              <span className="shrink-0 text-xs text-ink-faint">
                {q.marks} mark{q.marks === 1 ? "" : "s"}
              </span>
            </div>
            {q.type === "mcq" ? (
              <div className="mt-4 grid gap-2" role="radiogroup" aria-label={`Question ${i + 1}`}>
                {q.options.map((o, oi) => {
                  const chosen = answers[q.id] === oi;
                  return (
                    <button
                      key={oi}
                      type="button"
                      role="radio"
                      aria-checked={chosen}
                      onClick={() => answer(q.id, oi)}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                        chosen ? "border-forest bg-forest/10" : "border-line hover:border-ink",
                      )}
                    >
                      <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold", chosen ? "border-forest bg-forest text-forest-ink" : "border-line")}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="whitespace-pre-line">{o}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
                onChange={(e) => answer(q.id, e.target.value)}
                rows={4}
                className={cn(adminInput, "mt-4 resize-y")}
                placeholder="Type your answer"
                maxLength={5000}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
              />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-8 flex justify-end">
        <PrimaryButton onClick={() => submit(false)} loading={submitting}>
          <Send className="size-4" aria-hidden /> Submit answers
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ───────────────────────── Review (after closing) ───────────────────────── */

function Review({ review, onBack }: { review: QuizReview; onBack: () => void }) {
  const { quiz, questions, answers, shortMarks, feedback } = review;
  const took = quiz.submittedAt > 0;
  return (
    <div>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All quizzes
      </button>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">{quiz.title}</h1>
          <p className="mt-1.5 text-sm text-ink-soft">Closed {whenLabel(quiz.closesAt)}</p>
        </div>
        {took ? (
          <p className="rounded-2xl bg-paper-2/60 px-4 py-3 text-sm">
            {quiz.score !== null ? (
              <>
                Score <strong className="font-display text-2xl tabular-nums">{quiz.score}</strong>/{quiz.totalMarks}
              </>
            ) : (
              <>Written answers not marked yet · MCQ {quiz.autoScore ?? 0} marks</>
            )}
          </p>
        ) : (
          <p className="rounded-2xl bg-paper-2/60 px-4 py-3 text-sm text-ink-soft">You didn&apos;t take this quiz — here are the answers to learn from.</p>
        )}
      </div>

      <ol className="mt-6 space-y-5">
        {questions.map((q, i) => {
          const mine = answers[q.id];
          const right = q.type === "mcq" && mine === q.correct;
          const mark = q.type === "mcq" ? (right ? q.marks : 0) : shortMarks[q.id];
          return (
            <li key={q.id} className="rounded-3xl border border-line p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-line font-medium leading-relaxed">
                  <span className="mr-2 text-ink-faint">{i + 1}.</span>
                  {q.text}
                </p>
                {took && (
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs tabular-nums", typeof mark === "number" && mark >= q.marks ? "bg-forest/15 text-forest" : "bg-paper-2")}>
                    {typeof mark === "number" ? mark : "–"}/{q.marks}
                  </span>
                )}
              </div>
              {q.type === "mcq" ? (
                <ul className="mt-4 grid gap-2">
                  {q.options.map((o, oi) => {
                    const correct = oi === q.correct;
                    const chosen = mine === oi;
                    return (
                      <li
                        key={oi}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
                          correct ? "border-forest bg-forest/10" : chosen ? "border-ember/60 bg-ember/[0.06]" : "border-line",
                        )}
                      >
                        {correct ? (
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-forest" aria-label="Correct answer" />
                        ) : chosen ? (
                          <XCircle className="mt-0.5 size-4 shrink-0 text-ember" aria-label="Your answer" />
                        ) : (
                          <CircleDot className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden />
                        )}
                        <span className="whitespace-pre-line">
                          {o}
                          {chosen && <span className="ml-2 text-xs text-ink-soft">(your answer)</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-4 space-y-3 text-sm">
                  {took && (
                    <div className="rounded-2xl border border-line p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Your answer</p>
                      <p className="mt-1.5 whitespace-pre-line">{typeof mine === "string" ? mine : <span className="text-ink-soft">Not answered</span>}</p>
                    </div>
                  )}
                  {q.answer && (
                    <div className="rounded-2xl border border-forest/30 bg-forest/[0.07] p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-forest">Model answer</p>
                      <p className="mt-1.5 whitespace-pre-line">{q.answer}</p>
                    </div>
                  )}
                </div>
              )}
              {feedback[q.id] && (
                <p className="mt-3 flex items-start gap-2 rounded-2xl bg-paper-2/60 p-3 text-sm">
                  <Pencil className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden />
                  <span className="whitespace-pre-line">{feedback[q.id]}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
