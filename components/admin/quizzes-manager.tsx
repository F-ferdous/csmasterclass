"use client";

import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  ListChecks,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  UserX,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { normalizeBatch, normalizeLocation, sortBatches } from "@/lib/coaching";
import { normalizeEnrollment, type EnrollmentRecord } from "@/lib/enrollments";
import { db } from "@/lib/firebase";
import { normalizeProfile } from "@/lib/normalize";
import {
  finalScore,
  gradeMcq,
  hasWritten,
  MAX_QUESTIONS,
  newQuestionId,
  normalizeAttempt,
  normalizeQuiz,
  quizState,
  stateLabels,
  stateStyles,
  totalMarks,
  whenLabel,
  type Quiz,
  type QuizAttempt,
  type QuizQuestion,
} from "@/lib/quizzes";
import { rosterFor } from "@/lib/roster";
import { normalizeTest, syncResults, type Score } from "@/lib/tests";
import type { Batch, Location, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AudienceFilters, FilterSummary, useAudienceFilters } from "./audience-filters";
import { notifyStudents } from "./notify";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, Field, GhostButton, PageHeader, PrimaryButton, Segmented, Spinner } from "./ui";

const blankQuestion = (type: QuizQuestion["type"] = "mcq"): QuizQuestion => ({
  id: newQuestionId(),
  type,
  text: "",
  options: type === "mcq" ? ["", "", "", ""] : [],
  correct: 0,
  marks: 1,
  answer: "",
});

const blank: Quiz = { id: "", title: "", instructions: "", batchIds: [], opensAt: 0, closesAt: 0, timeLimit: 20, questions: [blankQuestion()], published: false, testId: "", createdAt: null };

/** ms → value for <input type="datetime-local"> in this browser's time zone. */
const toLocalInput = (t: number) => {
  if (!t) return "";
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).getTime() : 0);
const localDay = (t: number) => toLocalInput(t || Date.now()).slice(0, 10);

/** Writes one student's mark (or "absent", or null to clear) into the quiz's linked test, re-syncing results if it's published. */
async function writeTestMarks(quiz: Pick<Quiz, "testId">, marks: Record<string, Score | null>) {
  if (!quiz.testId || !Object.keys(marks).length) return;
  const ref = doc(db(), "tests", quiz.testId);
  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [uid, s] of Object.entries(marks)) update[`marks.${uid}`] = s === null ? deleteField() : s;
  await updateDoc(ref, update);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const test = normalizeTest(snap.id, snap.data());
  if (test.published) await syncResults(test, test.id, Object.keys(marks));
}

export function QuizzesManager() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [openId, setOpenId] = useState("");
  const [search, setSearch] = useState("");
  const filters = useAudienceFilters(batches);

  useEffect(() => {
    const d = db();
    const stops = [
      onSnapshot(
        collection(d, "quizzes"),
        (snap) => setQuizzes(snap.docs.map((x) => normalizeQuiz(x.id, x.data())).sort((a, b) => (b.opensAt || b.createdAt?.getTime() || 0) - (a.opensAt || a.createdAt?.getTime() || 0))),
        () => setQuizzes([]),
      ),
      onSnapshot(collection(d, "batches"), (snap) => setBatches(sortBatches(snap.docs.map((x) => normalizeBatch(x.id, x.data()))))),
      onSnapshot(query(collection(d, "locations"), orderBy("order", "asc")), (snap) => setLocations(snap.docs.map((x) => normalizeLocation(x.id, x.data())))),
      onSnapshot(collection(d, "students"), (snap) => setUsers(snap.docs.map((x) => normalizeProfile(x.id, x.data())))),
      onSnapshot(collection(d, "enrollments"), (snap) => setEnrollments(snap.docs.map((x) => normalizeEnrollment(x.id, x.data())))),
    ];
    return () => stops.forEach((s) => s());
  }, []);

  // Submitted counts for the list (one read per quiz; the open one is live).
  const ids = (quizzes ?? []).map((q) => q.id).join(",");
  useEffect(() => {
    if (!ids) return;
    let live = true;
    Promise.all(
      ids.split(",").map(async (id) => {
        const snap = await getDocs(collection(db(), "quizzes", id, "attempts"));
        return [id, snap.docs.filter((x) => x.get("submittedAt")).length] as const;
      }),
    ).then((rows) => live && setCounts(Object.fromEntries(rows)));
    return () => {
      live = false;
    };
  }, [ids, openId]);

  const batchById = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches]);
  const locationName = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);
  const batchLabel = (id: string) => {
    const b = batchById.get(id);
    return b ? `Class ${b.classLevel} · ${b.name} · ${locationName.get(b.locationId) ?? ""}` : "Deleted batch";
  };
  const rosterOf = (q: Pick<Quiz, "batchIds">) =>
    q.batchIds.flatMap((id) => (batchById.get(id) ? rosterFor(batchById.get(id)!, users, enrollments).map((u) => ({ user: u, batchId: id })) : []));

  if (quizzes === null) return <Spinner />;

  if (editing) {
    return <QuizEditor key={editing.id || "new"} quiz={editing} batches={batches} batchLabel={batchLabel} onDone={(id) => {
          setEditing(null);
          if (id) setOpenId(id);
        }}
      />;
  }

  const open = quizzes.find((q) => q.id === openId);
  if (open) {
    return <QuizResults key={open.id} quiz={open} roster={rosterOf(open)} batchLabel={batchLabel} onBack={() => setOpenId("")} onEdit={() => setEditing(open)} />;
  }

  const q = search.trim().toLowerCase();
  const visible = quizzes.filter((x) => filters.matchesBatches(x.batchIds) && (!q || x.title.toLowerCase().includes(q)));
  const newButton = (
    <PrimaryButton onClick={() => setEditing({ ...blank, questions: [blankQuestion()] })}>
      <Plus className="size-4" /> New quiz
    </PrimaryButton>
  );

  return (
    <div>
      <PageHeader
        title="Online quizzes"
        description="Tests students take on their dashboard. Multiple choice is marked automatically; you mark written answers. Scores go into Tests & marks — publish them there as usual."
        actions={newButton}
      />

      {quizzes.length > 0 && (
        <>
          <div className="mt-8 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,3fr)]">
            <label className="relative">
              <span className="sr-only">Search quizzes</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quizzes" className={cn(adminInput, "pl-10")} />
            </label>
            <AudienceFilters f={filters} locations={locations} />
          </div>
          {(filters.active || q) && (
            <FilterSummary
              shown={visible.length}
              total={quizzes.length}
              onClear={() => {
                filters.clear();
                setSearch("");
              }}
            />
          )}
        </>
      )}

      <div className="mt-5">
        {quizzes.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="size-6" />}
            title="No quizzes yet"
            body="Write multiple-choice and short written questions, pick the batches and an opening time. Students take it on their dashboard."
            action={newButton}
          />
        ) : visible.length === 0 ? (
          <EmptyState icon={<ListChecks className="size-6" />} title="No matches" body="No quizzes for this class, centre or batch. Try other filters, or clear them." />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line">
            {visible.map((x) => {
              const state = quizState(x);
              const total = rosterOf(x).length;
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setOpenId(x.id)}
                  className="grid w-full gap-2 border-b border-line px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-paper-2/60 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{x.title || "Untitled quiz"}</span>
                    <span className="mt-0.5 block truncate text-xs text-ink-soft">{x.batchIds.map(batchLabel).join(", ") || "No batch"}</span>
                  </span>
                  <span className="text-sm text-ink-soft">
                    {state === "upcoming" ? `Opens ${whenLabel(x.opensAt)}` : x.closesAt ? `${state === "closed" ? "Closed" : "Closes"} ${whenLabel(x.closesAt)}` : "No closing time"}
                    <span className="block text-xs text-ink-faint">
                      {x.questions.length} questions · {totalMarks(x)} marks{x.timeLimit ? ` · ${x.timeLimit} min` : ""}
                    </span>
                  </span>
                  <span className="text-sm text-ink-soft">
                    {counts[x.id] ?? "…"}/{total} submitted
                  </span>
                  <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs", stateStyles[state])}>{stateLabels[state]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Write / edit ───────────────────────── */

function QuizEditor({ quiz, batches, batchLabel, onDone }: { quiz: Quiz; batches: Batch[]; batchLabel: (id: string) => string; onDone: (openId?: string) => void }) {
  const [draft, setDraft] = useState(quiz);
  const [opens, setOpens] = useState(toLocalInput(quiz.opensAt));
  const [closes, setCloses] = useState(toLocalInput(quiz.closesAt));
  const [limit, setLimit] = useState(quiz.timeLimit ? String(quiz.timeLimit) : "");
  const [notify, setNotify] = useState(!quiz.published);
  const [busy, setBusy] = useState<"" | "draft" | "publish">("");
  const [error, setError] = useState("");
  const set = <K extends keyof Quiz>(k: K, v: Quiz[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setQ = (i: number, q: QuizQuestion) => set("questions", draft.questions.map((x, j) => (j === i ? q : x)));
  const moveQ = (i: number, to: number) => {
    if (to < 0 || to >= draft.questions.length) return;
    const next = [...draft.questions];
    const [x] = next.splice(i, 1);
    next.splice(to, 0, x);
    set("questions", next);
  };
  const toggleBatch = (id: string) => set("batchIds", draft.batchIds.includes(id) ? draft.batchIds.filter((b) => b !== id) : [...draft.batchIds, id]);

  function check(publish: boolean) {
    if (!draft.title.trim()) return "Give the quiz a name.";
    if (!draft.batchIds.length) return "Choose at least one batch.";
    const opensAt = fromLocalInput(opens);
    const closesAt = fromLocalInput(closes);
    if (publish && !closesAt) return "Choose when the quiz closes.";
    if (opensAt && closesAt && closesAt <= opensAt) return "The closing time must be after the opening time.";
    const minutes = limit.trim() ? Number(limit) : 0;
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 600) return "Time limit must be a number of minutes (or empty for none).";
    if (!draft.questions.length) return "Add at least one question.";
    for (const [i, q] of draft.questions.entries()) {
      if (!q.text.trim()) return `Question ${i + 1} has no text.`;
      if (!(q.marks > 0)) return `Question ${i + 1} needs marks.`;
      if (q.type === "mcq") {
        const filled = q.options.filter((o) => o.trim());
        if (filled.length < 2) return `Question ${i + 1} needs at least two choices.`;
        if (!q.options[q.correct]?.trim()) return `Question ${i + 1}: tick the correct choice.`;
      }
    }
    return "";
  }

  async function save(publish: boolean) {
    const problem = check(publish);
    if (problem) return setError(problem);
    setBusy(publish ? "publish" : "draft");
    setError("");
    // Drop empty MCQ choices, keeping the correct one pointed at the same text.
    const questions = draft.questions.map((q) => {
      if (q.type !== "mcq") return { ...q, text: q.text.trim(), options: [], correct: 0, answer: q.answer.trim() };
      const kept = q.options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o);
      return { ...q, text: q.text.trim(), options: kept.map((x) => x.o), correct: Math.max(0, kept.findIndex((x) => x.i === q.correct)), answer: "" };
    });
    const opensAt = fromLocalInput(opens);
    const closesAt = fromLocalInput(closes);
    const d = db();
    const ref = quiz.id ? doc(d, "quizzes", quiz.id) : doc(collection(d, "quizzes"));
    const testRef = quiz.testId ? doc(d, "tests", quiz.testId) : doc(collection(d, "tests"));
    const max = questions.reduce((s, q) => s + q.marks, 0);
    const title = draft.title.trim();
    try {
      const wb = writeBatch(d);
      wb.set(
        ref,
        {
          title,
          instructions: draft.instructions.trim(),
          batchIds: draft.batchIds,
          opensAt: opensAt ? Timestamp.fromMillis(opensAt) : null,
          closesAt: closesAt ? Timestamp.fromMillis(closesAt) : null,
          timeLimit: limit.trim() ? Math.round(Number(limit)) : 0,
          questions,
          published: publish,
          testId: testRef.id,
          updatedAt: serverTimestamp(),
          ...(quiz.id ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true },
      );
      // The linked test in Tests & marks (its marks are kept).
      wb.set(
        testRef,
        {
          title,
          type: "quiz",
          paper: "Online quiz",
          date: localDay(closesAt || opensAt),
          maxMarks: max || 1,
          batchIds: draft.batchIds,
          note: "Linked to an online quiz — marks come from the quiz.",
          updatedAt: serverTimestamp(),
          ...(quiz.testId ? {} : { marks: {}, published: false, createdAt: serverTimestamp() }),
        },
        { merge: true },
      );
      await wb.commit();

      // Questions changed after students handed in: re-mark the multiple choice for everyone.
      if (quiz.id) await remark({ ...draft, id: ref.id, testId: testRef.id, questions });

      if (publish && notify) {
        await notifyStudents(
          { batchIds: draft.batchIds },
          { title: `New quiz: ${title}`, body: opensAt > Date.now() ? `Opens ${whenLabel(opensAt)}.` : `Open now${closesAt ? ` — closes ${whenLabel(closesAt)}` : ""}.`, url: "/dashboard/quizzes" },
        ).catch(() => {});
      }
      onDone(ref.id);
    } catch (err) {
      setError((err as Error).message);
      setBusy("");
    }
  }

  const max = draft.questions.reduce((s, q) => s + (q.marks || 0), 0);
  const hasAttemptsWarning = quiz.id && quiz.published;

  return (
    <div>
      <button type="button" onClick={() => onDone()} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {quiz.id ? "Back to the quiz" : "All quizzes"}
      </button>
      <PageHeader title={quiz.id ? "Edit quiz" : "New quiz"} description={`${draft.questions.length} question${draft.questions.length === 1 ? "" : "s"} · ${max} mark${max === 1 ? "" : "s"} in total`} />

      <section className="mt-6 grid gap-5 rounded-3xl border border-line p-5 sm:p-7">
        <Field label="Quiz name">
          <input value={draft.title} onChange={(e) => set("title", e.target.value)} className={adminInput} placeholder="e.g. Chapter 3 quiz — Hardware" maxLength={120} />
        </Field>
        <Field label="Instructions" hint="Optional — shown before the questions">
          <textarea value={draft.instructions} onChange={(e) => set("instructions", e.target.value)} rows={2} className={cn(adminInput, "resize-y")} maxLength={2000} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Opens" hint="Empty = as soon as published">
            <input type="datetime-local" value={opens} onChange={(e) => setOpens(e.target.value)} className={adminInput} />
          </Field>
          <Field label="Closes">
            <input type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} className={adminInput} />
          </Field>
          <Field label="Time limit (minutes)" hint="Empty = none">
            <input type="number" min={1} max={600} inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} className={adminInput} placeholder="20" />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Batches</p>
          <div className="flex flex-wrap gap-1.5">
            {batches
              .filter((b) => b.status !== "closed" || draft.batchIds.includes(b.id))
              .map((b) => {
                const on = draft.batchIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleBatch(b.id)}
                    className={cn("rounded-xl border px-3 py-2 text-left text-sm transition-colors", on ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}
                  >
                    {batchLabel(b.id)}
                  </button>
                );
              })}
          </div>
        </div>
      </section>

      <ol className="mt-6 space-y-4">
        {draft.questions.map((q, i) => (
          <li key={q.id} className="rounded-3xl border border-line p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-lg">Question {i + 1}</p>
              <div className="flex items-center gap-1">
                <Segmented
                  options={["mcq", "short"] as const}
                  value={q.type}
                  onChange={(t) => setQ(i, { ...q, type: t, options: t === "mcq" && q.options.length < 2 ? ["", "", "", ""] : q.options })}
                  render={(t) => (t === "mcq" ? "Multiple choice" : "Written")}
                />
                <IconBtn label="Move up" disabled={i === 0} onClick={() => moveQ(i, i - 1)}>
                  <ArrowUp className="size-4" />
                </IconBtn>
                <IconBtn label="Move down" disabled={i === draft.questions.length - 1} onClick={() => moveQ(i, i + 1)}>
                  <ArrowDown className="size-4" />
                </IconBtn>
                <IconBtn
                  label="Duplicate"
                  disabled={draft.questions.length >= MAX_QUESTIONS}
                  onClick={() => set("questions", [...draft.questions.slice(0, i + 1), { ...q, id: newQuestionId(), options: [...q.options] }, ...draft.questions.slice(i + 1)])}
                >
                  <Copy className="size-4" />
                </IconBtn>
                <IconBtn label="Delete question" danger onClick={() => set("questions", draft.questions.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" />
                </IconBtn>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_110px]">
              <Field label="Question">
                <textarea value={q.text} onChange={(e) => setQ(i, { ...q, text: e.target.value })} rows={2} className={cn(adminInput, "resize-y")} maxLength={4000} />
              </Field>
              <Field label="Marks">
                <input type="number" min={1} max={100} inputMode="numeric" value={q.marks || ""} onChange={(e) => setQ(i, { ...q, marks: Math.max(0, Number(e.target.value) || 0) })} className={adminInput} />
              </Field>
            </div>
            {q.type === "mcq" ? (
              <div className="mt-4">
                <p className="mb-1.5 text-sm font-medium">Choices <span className="font-normal text-ink-faint">— tick the correct one</span></p>
                <div className="grid gap-2">
                  {q.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={q.correct === oi}
                        aria-label={`Choice ${String.fromCharCode(65 + oi)} is correct`}
                        onClick={() => setQ(i, { ...q, correct: oi })}
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                          q.correct === oi ? "border-forest bg-forest text-forest-ink" : "border-line hover:border-ink",
                        )}
                      >
                        {q.correct === oi ? <CheckCircle2 className="size-4" /> : String.fromCharCode(65 + oi)}
                      </button>
                      <input
                        value={o}
                        onChange={(e) => setQ(i, { ...q, options: q.options.map((x, j) => (j === oi ? e.target.value : x)) })}
                        className={adminInput}
                        placeholder={`Choice ${String.fromCharCode(65 + oi)}`}
                        maxLength={500}
                      />
                      <IconBtn
                        label="Remove choice"
                        disabled={q.options.length <= 2}
                        onClick={() => setQ(i, { ...q, options: q.options.filter((_, j) => j !== oi), correct: q.correct > oi ? q.correct - 1 : q.correct === oi ? 0 : q.correct })}
                      >
                        <Trash2 className="size-4" />
                      </IconBtn>
                    </div>
                  ))}
                </div>
                {q.options.length < 6 && (
                  <button type="button" onClick={() => setQ(i, { ...q, options: [...q.options, ""] })} className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
                    <Plus className="size-4" aria-hidden /> Add a choice
                  </button>
                )}
              </div>
            ) : (
              <Field label="Model answer / marking notes" hint="Students see this after the quiz closes" className="mt-4">
                <textarea value={q.answer} onChange={(e) => setQ(i, { ...q, answer: e.target.value })} rows={3} className={cn(adminInput, "resize-y")} maxLength={4000} />
              </Field>
            )}
          </li>
        ))}
      </ol>

      {draft.questions.length < MAX_QUESTIONS && (
        <div className="mt-4 flex flex-wrap gap-2">
          <GhostButton onClick={() => set("questions", [...draft.questions, blankQuestion("mcq")])}>
            <Plus className="size-4" /> Multiple-choice question
          </GhostButton>
          <GhostButton onClick={() => set("questions", [...draft.questions, blankQuestion("short")])}>
            <Plus className="size-4" /> Written question
          </GhostButton>
        </div>
      )}

      <div className="sticky bottom-3 z-20 mt-8 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-line bg-paper/90 px-4 py-3 shadow-soft backdrop-blur">
        {error && <ErrorText message={error} />}
        {hasAttemptsWarning && <p className="mr-auto text-xs text-ink-soft">Changing a correct answer re-marks everyone who has handed in.</p>}
        {!quiz.published && (
          <label className="mr-auto flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-[var(--forest)]" />
            Notify students when published
          </label>
        )}
        {!quiz.published && (
          <GhostButton onClick={() => save(false)}>
            <Save className="size-4" /> {busy === "draft" ? "Saving…" : "Save draft"}
          </GhostButton>
        )}
        <PrimaryButton onClick={() => save(true)} loading={busy === "publish"}>
          {quiz.published ? "Save changes" : "Publish"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/** After editing a published quiz: re-mark multiple choice for submitted attempts and update their scores. */
async function remark(quiz: Quiz) {
  const d = db();
  const snap = await getDocs(collection(d, "quizzes", quiz.id, "attempts"));
  const wb = writeBatch(d);
  const marks: Record<string, Score | null> = {};
  let changed = 0;
  for (const x of snap.docs) {
    const a = normalizeAttempt(x.id, x.data());
    if (!a.submittedAt) continue;
    const autoScore = gradeMcq(quiz.questions, a.answers);
    const score = finalScore(quiz.questions, a);
    if (autoScore === a.autoScore && score === a.score) continue;
    wb.update(x.ref, { autoScore, score, ...(score !== null ? { markedAt: serverTimestamp() } : {}) });
    marks[a.uid] = score;
    changed++;
  }
  if (!changed) return;
  await wb.commit();
  await writeTestMarks(quiz, marks);
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("grid size-9 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink disabled:opacity-30", danger && "hover:bg-ember/10 hover:text-ember")}
    >
      {children}
    </button>
  );
}

/* ───────────────────────── Results & marking ───────────────────────── */

type RowStatus = "not-started" | "in-progress" | "to-mark" | "done";
const rowLabels: Record<RowStatus, string> = { "not-started": "Not started", "in-progress": "In progress", "to-mark": "To mark", done: "Done" };
const rowStyles: Record<RowStatus, string> = {
  "not-started": "bg-paper-2 text-ink-soft",
  "in-progress": "bg-gold/20",
  "to-mark": "bg-ember/15 text-ember",
  done: "bg-forest/15 text-forest",
};

function QuizResults({
  quiz,
  roster,
  batchLabel,
  onBack,
  onEdit,
}: {
  quiz: Quiz;
  roster: { user: UserProfile; batchId: string }[];
  batchLabel: (id: string) => string;
  onBack: () => void;
  onEdit: () => void;
}) {
  const [attempts, setAttempts] = useState<Record<string, QuizAttempt> | null>(null);
  const [marking, setMarking] = useState<string>("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const state = quizState(quiz);
  const max = totalMarks(quiz);
  const written = hasWritten(quiz);

  useEffect(
    () =>
      onSnapshot(collection(db(), "quizzes", quiz.id, "attempts"), (snap) =>
        setAttempts(Object.fromEntries(snap.docs.map((x) => [x.id, normalizeAttempt(x.id, x.data())]))),
      ),
    [quiz.id],
  );

  if (attempts === null) return <Spinner />;

  const statusOf = (uid: string): RowStatus => {
    const a = attempts[uid];
    if (!a) return "not-started";
    if (!a.submittedAt) return "in-progress";
    return a.score === null ? "to-mark" : "done";
  };
  const extra = Object.values(attempts)
    .filter((a) => !roster.some((r) => r.user.uid === a.uid))
    .map((a) => ({ user: { uid: a.uid, name: a.name || "Former student", email: "" } as UserProfile, batchId: "" }));
  const rows = [...roster, ...extra];
  const submitted = rows.filter((r) => attempts[r.user.uid]?.submittedAt);
  const toMark = rows.filter((r) => statusOf(r.user.uid) === "to-mark");
  const notTaken = rows.filter((r) => !attempts[r.user.uid]?.submittedAt);
  const scores = submitted.map((r) => attempts[r.user.uid].score).filter((s): s is number => s !== null);
  const average = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length / Math.max(max, 1)) * 100) : null;

  async function togglePublished() {
    setBusy("publish");
    setError("");
    try {
      await updateDoc(doc(db(), "quizzes", quiz.id), { published: !quiz.published, updatedAt: serverTimestamp() });
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy("");
  }

  // After closing: hand in what in-progress students saved, and mark the rest absent in Tests & marks.
  async function closeOut() {
    const unfinished = rows.filter((r) => statusOf(r.user.uid) === "in-progress");
    const absent = rows.filter((r) => statusOf(r.user.uid) === "not-started");
    if (!window.confirm(`Hand in saved answers for ${unfinished.length} student${unfinished.length === 1 ? "" : "s"} who didn't press Submit, and mark ${absent.length} who never started as absent in Tests & marks?`)) return;
    setBusy("close");
    setError("");
    try {
      const d = db();
      const wb = writeBatch(d);
      const marks: Record<string, Score | null> = {};
      for (const r of unfinished) {
        const a = attempts![r.user.uid];
        const autoScore = gradeMcq(quiz.questions, a.answers);
        const score = finalScore(quiz.questions, { answers: a.answers, shortMarks: {} });
        wb.update(doc(d, "quizzes", quiz.id, "attempts", r.user.uid), { autoScore, score, submittedAt: serverTimestamp(), ...(score !== null ? { markedAt: serverTimestamp() } : {}) });
        if (score !== null) marks[r.user.uid] = score;
      }
      await wb.commit();
      for (const r of absent) marks[r.user.uid] = "absent";
      await writeTestMarks(quiz, marks);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy("");
  }

  async function remove() {
    if (!window.confirm(`Delete “${quiz.title}”, everyone's answers and its marks in Tests & marks? This can't be undone.`)) return;
    setBusy("delete");
    try {
      const d = db();
      const snap = await getDocs(collection(d, "quizzes", quiz.id, "attempts"));
      const wb = writeBatch(d);
      snap.docs.forEach((x) => wb.delete(x.ref));
      wb.delete(doc(d, "quizzes", quiz.id));
      if (quiz.testId) {
        const t = await getDoc(doc(d, "tests", quiz.testId));
        if (t.exists()) {
          wb.delete(t.ref);
          await wb.commit();
          await syncResults(null, quiz.testId, Object.keys(normalizeTest(t.id, t.data()).marks));
          onBack();
          return;
        }
      }
      await wb.commit();
      onBack();
    } catch (err) {
      setError((err as Error).message);
      setBusy("");
    }
  }

  async function duplicate() {
    setBusy("copy");
    try {
      const d = db();
      const ref = doc(collection(d, "quizzes"));
      await setDoc(ref, {
        title: `${quiz.title} (copy)`,
        instructions: quiz.instructions,
        batchIds: [],
        opensAt: null,
        closesAt: null,
        timeLimit: quiz.timeLimit,
        questions: quiz.questions.map((q) => ({ ...q, id: newQuestionId() })),
        published: false,
        testId: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onBack();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy("");
  }

  const current = marking ? rows.find((r) => r.user.uid === marking) : undefined;

  return (
    <div>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All quizzes
      </button>
      <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("rounded-full px-2.5 py-1", stateStyles[state])}>{stateLabels[state]}</span>
            <span className="text-ink-soft">
              {quiz.questions.length} questions · {max} marks{quiz.timeLimit ? ` · ${quiz.timeLimit} min` : ""}
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl">{quiz.title}</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            {quiz.opensAt ? `Opens ${whenLabel(quiz.opensAt)} · ` : ""}
            {quiz.closesAt ? `Closes ${whenLabel(quiz.closesAt)}` : "No closing time"} · {quiz.batchIds.map(batchLabel).join(", ")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <GhostButton onClick={onEdit}>
            <Pencil className="size-4" /> Edit
          </GhostButton>
          <GhostButton onClick={togglePublished}>
            {quiz.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {quiz.published ? "Unpublish" : "Publish"}
          </GhostButton>
          <GhostButton onClick={duplicate}>
            <Copy className="size-4" /> Duplicate
          </GhostButton>
          <GhostButton onClick={remove} className="hover:border-ember hover:text-ember">
            <Trash2 className="size-4" /> Delete
          </GhostButton>
        </div>
      </div>
      <ErrorText message={error} />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Handed in" value={`${submitted.length}/${rows.length}`} />
        <Stat label="To mark" value={String(toMark.length)} warn={toMark.length > 0} note={written ? "Written answers" : "All multiple choice"} />
        <Stat label="Class average" value={average === null ? "—" : `${average}%`} />
        <Stat label="In Tests & marks" value={quiz.testId ? "Linked" : "—"} note="Publish results there" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        {quiz.testId && (
          <Link href="/admin/tests" className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
            <ClipboardList className="size-4" aria-hidden /> Open Tests &amp; marks to publish results
          </Link>
        )}
        {state === "closed" && notTaken.length > 0 && (
          <button type="button" onClick={closeOut} disabled={busy === "close"} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 hover:border-ink disabled:opacity-60">
            <UserX className="size-4" aria-hidden /> {busy === "close" ? "Working…" : "Close out: hand in unfinished, mark the rest absent"}
          </button>
        )}
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-line">
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-soft">No confirmed students in these batches yet.</p>
        ) : (
          rows.map(({ user, batchId }) => {
            const a = attempts[user.uid];
            const s = statusOf(user.uid);
            return (
              <div key={user.uid} className="grid gap-2 border-b border-line px-5 py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)_auto] sm:items-center sm:gap-5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.name || "Unnamed"}</p>
                  <p className="truncate text-xs text-ink-soft">{batchId ? batchLabel(batchId) : "Not in these batches now"}</p>
                </div>
                <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs", rowStyles[s])}>{rowLabels[s]}</span>
                <p className="text-sm tabular-nums text-ink-soft">
                  {a?.submittedAt ? (
                    a.score !== null ? (
                      <>
                        <strong className="font-display text-xl text-ink">{a.score}</strong>/{max}
                      </>
                    ) : (
                      `MCQ ${a.autoScore} · written to mark`
                    )
                  ) : a?.startedAt ? (
                    `Started ${whenLabel(a.startedAt)}`
                  ) : (
                    "—"
                  )}
                </p>
                {a?.submittedAt ? (
                  <button
                    type="button"
                    onClick={() => setMarking(user.uid)}
                    className={cn(
                      "inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-2 text-sm sm:justify-self-end",
                      s === "to-mark" ? "bg-forest font-semibold text-forest-ink hover:bg-ink hover:text-paper" : "border border-line hover:border-ink",
                    )}
                  >
                    {s === "to-mark" ? <Pencil className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />} {s === "to-mark" ? "Mark" : "View"}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })
        )}
      </div>

      <Drawer open={Boolean(current)} title={current ? `${current.user.name || "Student"} — answers` : ""} onClose={() => setMarking("")}>
        {current && attempts[current.user.uid] && (
          <MarkingForm key={current.user.uid} quiz={quiz} attempt={attempts[current.user.uid]} onDone={() => setMarking("")} />
        )}
      </Drawer>
    </div>
  );
}

function Stat({ label, value, note, warn }: { label: string; value: string; note?: string; warn?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-4", warn ? "border-ember/40 bg-ember/[0.05]" : "border-line")}>
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-xs text-ink-faint">{note}</p>}
    </div>
  );
}

function MarkingForm({ quiz, attempt, onDone }: { quiz: Quiz; attempt: QuizAttempt; onDone: () => void }) {
  const [marks, setMarks] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(attempt.shortMarks).map(([k, v]) => [k, String(v)])));
  const [feedback, setFeedback] = useState<Record<string, string>>(attempt.feedback);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const shortMarks: Record<string, number> = {};
    for (const q of quiz.questions.filter((x) => x.type === "short")) {
      const v = (marks[q.id] ?? "").trim();
      if (!v) continue;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > q.marks) return setError(`Question ${quiz.questions.indexOf(q) + 1}: enter 0–${q.marks}.`);
      shortMarks[q.id] = n;
    }
    const cleanFeedback = Object.fromEntries(Object.entries(feedback).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    const score = finalScore(quiz.questions, { answers: attempt.answers, shortMarks });
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db(), "quizzes", quiz.id, "attempts", attempt.uid), {
        shortMarks,
        feedback: cleanFeedback,
        score,
        markedAt: score !== null ? serverTimestamp() : deleteField(),
      });
      await writeTestMarks(quiz, { [attempt.uid]: score });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const running = gradeMcq(quiz.questions, attempt.answers) + Object.values(marks).reduce((s, v) => s + (Number(v) || 0), 0);

  return (
    <div className={drawerFormClass}>
      <DrawerBody>
        <p className="rounded-2xl bg-paper-2/60 px-4 py-3 text-sm">
          Handed in {whenLabel(attempt.submittedAt)} · running total <strong className="tabular-nums">{running}</strong>/{totalMarks(quiz)}
        </p>
        {quiz.questions.map((q, i) => {
          const mine = attempt.answers[q.id];
          return (
            <div key={q.id} className="rounded-2xl border border-line p-4">
              <p className="whitespace-pre-line text-sm font-medium">
                <span className="mr-1.5 text-ink-faint">{i + 1}.</span>
                {q.text} <span className="text-xs font-normal text-ink-faint">({q.marks})</span>
              </p>
              {q.type === "mcq" ? (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {q.options.map((o, oi) => (
                    <li key={oi} className={cn("flex items-start gap-2", oi === q.correct ? "text-forest" : mine === oi ? "text-ember" : "text-ink-soft")}>
                      {oi === q.correct ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : mine === oi ? <XCircle className="mt-0.5 size-4 shrink-0" /> : <CircleDot className="mt-0.5 size-4 shrink-0 opacity-40" />}
                      <span>
                        {o}
                        {mine === oi && <span className="ml-1.5 text-xs">(chosen)</span>}
                      </span>
                    </li>
                  ))}
                  {mine === undefined && <li className="text-xs text-ink-faint">Not answered</li>}
                </ul>
              ) : (
                <>
                  <p className="mt-3 whitespace-pre-line rounded-xl bg-paper-2/60 p-3 text-sm">{typeof mine === "string" ? mine : <span className="text-ink-faint">Not answered</span>}</p>
                  {q.answer && <p className="mt-2 whitespace-pre-line text-xs text-ink-soft">Model answer: {q.answer}</p>}
                  {typeof mine === "string" && (
                    <label className="mt-3 flex items-center gap-2 text-sm">
                      Marks
                      <input
                        type="number"
                        min={0}
                        max={q.marks}
                        inputMode="numeric"
                        value={marks[q.id] ?? ""}
                        onChange={(e) => setMarks((m) => ({ ...m, [q.id]: e.target.value }))}
                        className={cn(adminInput, "w-24")}
                      />
                      <span className="text-ink-soft">/ {q.marks}</span>
                    </label>
                  )}
                </>
              )}
              <input
                value={feedback[q.id] ?? ""}
                onChange={(e) => setFeedback((f) => ({ ...f, [q.id]: e.target.value }))}
                className={cn(adminInput, "mt-3")}
                placeholder="Feedback (optional — shown after the quiz closes)"
                maxLength={1000}
              />
            </div>
          );
        })}
        <ErrorText message={error} />
      </DrawerBody>
      <DrawerFooter>
        <GhostButton onClick={onDone} className="mr-auto">
          Cancel
        </GhostButton>
        <PrimaryButton onClick={save} loading={saving}>
          Save marks
        </PrimaryButton>
      </DrawerFooter>
    </div>
  );
}
