"use client";

import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, ClipboardList, Eye, EyeOff, Pencil, Plus, Save, Search, Trash2, UserX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { localDate, prettyDate } from "@/lib/attendance";
import { normalizeBatch, normalizeLocation, sortBatches } from "@/lib/coaching";
import { normalizeEnrollment, type EnrollmentRecord } from "@/lib/enrollments";
import { db } from "@/lib/firebase";
import { normalizeProfile } from "@/lib/normalize";
import { rosterFor } from "@/lib/roster";
import { approxGrade, normalizeTest, percent, syncResults, testStats, testTypeLabels, testTypes, testTypeStyles, type Score, type Test } from "@/lib/tests";
import type { Batch, Location, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { notifyStudents } from "./notify";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, Field, GhostButton, PageHeader, PrimaryButton, Segmented, Spinner } from "./ui";

const blank: Test = { id: "", title: "", type: "class-test", paper: "", date: "", maxMarks: 50, batchIds: [], marks: {}, published: false, note: "", createdAt: null };

export function TestsManager() {
  const [tests, setTests] = useState<Test[] | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [editing, setEditing] = useState<Test | null>(null);
  const [openId, setOpenId] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const d = db();
    const stops = [
      onSnapshot(
        collection(d, "tests"),
        (snap) => setTests(snap.docs.map((x) => normalizeTest(x.id, x.data())).sort((a, b) => b.date.localeCompare(a.date))),
        () => setTests([]),
      ),
      onSnapshot(collection(d, "batches"), (snap) => setBatches(sortBatches(snap.docs.map((x) => normalizeBatch(x.id, x.data()))))),
      onSnapshot(query(collection(d, "locations"), orderBy("order", "asc")), (snap) => setLocations(snap.docs.map((x) => normalizeLocation(x.id, x.data())))),
      onSnapshot(collection(d, "users"), (snap) => setUsers(snap.docs.map((x) => normalizeProfile(x.id, x.data())))),
      onSnapshot(collection(d, "enrollments"), (snap) => setEnrollments(snap.docs.map((x) => normalizeEnrollment(x.id, x.data())))),
    ];
    return () => stops.forEach((s) => s());
  }, []);

  const batchById = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches]);
  const locationName = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);
  const batchLabel = (id: string) => {
    const b = batchById.get(id);
    return b ? `Class ${b.classLevel} · ${b.name} · ${locationName.get(b.locationId) ?? ""}` : "Deleted batch";
  };
  /** Confirmed students across the test's batches. */
  const rosterOf = (t: Pick<Test, "batchIds">) =>
    t.batchIds.flatMap((id) => (batchById.get(id) ? rosterFor(batchById.get(id)!, users, enrollments).map((u) => ({ user: u, batchId: id })) : []));

  if (tests === null) return <Spinner />;

  const open = tests.find((t) => t.id === openId);
  if (open) {
    return (
      <>
        <MarksSheet
          key={open.id}
          test={open}
          roster={rosterOf(open)}
          users={users}
          batchLabel={batchLabel}
          onBack={() => setOpenId("")}
          onEdit={() => setEditing(open)}
        />
        <Drawer open={Boolean(editing)} title="Edit test" onClose={() => setEditing(null)}>
          {editing && <TestForm key={editing.id} test={editing} batches={batches} batchLabel={batchLabel} onDone={() => setEditing(null)} />}
        </Drawer>
      </>
    );
  }

  const q = search.trim().toLowerCase();
  const visible = tests.filter((t) => (batchFilter === "all" || t.batchIds.includes(batchFilter)) && (!q || `${t.title} ${t.paper}`.toLowerCase().includes(q)));
  const newButton = (
    <PrimaryButton onClick={() => setEditing({ ...blank, date: localDate() })}>
      <Plus className="size-4" /> New test
    </PrimaryButton>
  );

  return (
    <div>
      <PageHeader
        title="Tests & marks"
        description="Class tests, quizzes and mock exams. Enter marks for each batch, then publish — students see only their own result, with the class average."
        actions={newButton}
      />

      {tests.length > 0 && (
        <div className="mt-8 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
          <label className="relative">
            <span className="sr-only">Search tests</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tests" className={cn(adminInput, "pl-10")} />
          </label>
          <select aria-label="Batch" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className={adminInput}>
            <option value="all">All batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {batchLabel(b.id)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-5">
        {tests.length === 0 ? (
          <EmptyState icon={<ClipboardList className="size-6" />} title="No tests yet" body="Add a class test or mock exam, choose the batches that sat it, and enter everyone's marks." action={newButton} />
        ) : visible.length === 0 ? (
          <EmptyState icon={<ClipboardList className="size-6" />} title="No matches" body="Try another batch or search." />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line">
            {visible.map((t) => {
              const stats = testStats(t);
              const total = rosterOf(t).length;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setOpenId(t.id)}
                  className="grid w-full gap-2 border-b border-line px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-paper-2/60 md:grid-cols-[90px_minmax(0,1.6fr)_minmax(0,1fr)_auto] md:items-center md:gap-5"
                >
                  <span className="text-sm text-ink-soft">{t.date ? prettyDate(t.date, "short") : "—"}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{t.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                      <span className={cn("rounded-full px-2 py-0.5", testTypeStyles[t.type])}>{testTypeLabels[t.type]}</span>
                      {t.paper && <span>{t.paper}</span>}
                      <span>out of {t.maxMarks}</span>
                    </span>
                  </span>
                  <span className="min-w-0 text-sm">
                    <span className="block truncate text-ink-soft">{t.batchIds.map(batchLabel).join(", ") || "No batch"}</span>
                    <span className="text-xs text-ink-faint">
                      {stats.sat + stats.absent}/{total} marked{stats.average !== null ? ` · average ${stats.average}%` : ""}
                    </span>
                  </span>
                  <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs", t.published ? "bg-forest/15 text-forest" : "bg-paper-2 text-ink-soft")}>
                    {t.published ? "Published" : "Draft"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Drawer open={Boolean(editing)} title={editing?.id ? "Edit test" : "New test"} onClose={() => setEditing(null)}>
        {editing && (
          <TestForm
            key={editing.id || "new"}
            test={editing}
            batches={batches}
            batchLabel={batchLabel}
            onDone={(id) => {
              setEditing(null);
              if (id) setOpenId(id);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

/* ───────────────────────── Test details ───────────────────────── */

function TestForm({ test, batches, batchLabel, onDone }: { test: Test; batches: Batch[]; batchLabel: (id: string) => string; onDone: (openId?: string) => void }) {
  const [draft, setDraft] = useState(test);
  const [max, setMax] = useState(String(test.maxMarks));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof Test>(k: K, v: Test[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const toggleBatch = (id: string) => set("batchIds", draft.batchIds.includes(id) ? draft.batchIds.filter((b) => b !== id) : [...draft.batchIds, id]);

  async function save() {
    const maxMarks = Number(max);
    if (!draft.title.trim()) return setError("Give the test a name.");
    if (!draft.date) return setError("Choose the date it was taken.");
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) return setError("Enter the total marks.");
    if (!draft.batchIds.length) return setError("Choose at least one batch.");
    const tooHigh = Object.values(draft.marks).some((s) => typeof s === "number" && s > maxMarks);
    if (tooHigh) return setError(`Some marks are above ${maxMarks}. Fix them first, or keep the total higher.`);
    setSaving(true);
    setError("");
    const data = { title: draft.title.trim(), type: draft.type, paper: draft.paper.trim(), date: draft.date, maxMarks, batchIds: draft.batchIds, note: draft.note.trim(), updatedAt: serverTimestamp() };
    try {
      if (test.id) {
        await updateDoc(doc(db(), "tests", test.id), data);
        if (test.published) await syncResults({ ...test, ...data, marks: test.marks, published: true }, test.id, Object.keys(test.marks));
        onDone();
      } else {
        const ref = await addDoc(collection(db(), "tests"), { ...data, marks: {}, published: false, createdAt: serverTimestamp() });
        onDone(ref.id);
      }
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className={drawerFormClass}>
      <DrawerBody>
        <Field label="Test name">
          <input value={draft.title} onChange={(e) => set("title", e.target.value)} className={adminInput} placeholder="e.g. Chapter 4 test — Algorithms" maxLength={120} />
        </Field>
        <Field label="Type">
          <Segmented options={testTypes} value={draft.type} onChange={(v) => set("type", v)} render={(t) => testTypeLabels[t]} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Paper / topic" hint="Optional">
            <input value={draft.paper} onChange={(e) => set("paper", e.target.value)} className={adminInput} placeholder="Paper 1" />
          </Field>
          <Field label="Date">
            <input type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} className={adminInput} />
          </Field>
          <Field label="Total marks">
            <input type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} className={adminInput} />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Batches that sat it</p>
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
        <Field label="Note" hint="Optional — for you">
          <input value={draft.note} onChange={(e) => set("note", e.target.value)} className={adminInput} />
        </Field>
        <ErrorText message={error} />
      </DrawerBody>
      <DrawerFooter>
        <GhostButton onClick={() => onDone()} className="mr-auto">
          Cancel
        </GhostButton>
        <PrimaryButton onClick={save} loading={saving}>
          {test.id ? "Save" : "Create & enter marks"}
        </PrimaryButton>
      </DrawerFooter>
    </div>
  );
}

/* ───────────────────────── Marks entry ───────────────────────── */

type Entry = string; // "" = not entered, "absent", or a number as text

function MarksSheet({
  test,
  roster,
  users,
  batchLabel,
  onBack,
  onEdit,
}: {
  test: Test;
  roster: { user: UserProfile; batchId: string }[];
  users: UserProfile[];
  batchLabel: (id: string) => string;
  onBack: () => void;
  onEdit: () => void;
}) {
  const [entries, setEntries] = useState<Record<string, Entry>>(() => Object.fromEntries(Object.entries(test.marks).map(([uid, s]) => [uid, String(s)])));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "publish">("");
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  // Students who have a mark but have since left the batch stay on the sheet.
  const rows = useMemo(() => {
    const inRoster = new Set(roster.map((r) => r.user.uid));
    const extra = Object.keys(test.marks)
      .filter((uid) => !inRoster.has(uid))
      .map((uid) => ({ user: users.find((u) => u.uid === uid), uid }))
      .map(({ user, uid }) => ({ user: user ?? ({ uid, name: "Former student", email: "" } as UserProfile), batchId: "" }));
    return [...roster, ...extra];
  }, [roster, test.marks, users]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (uid: string, v: Entry) => {
    setEntries((e) => ({ ...e, [uid]: v }));
    setDirty(true);
  };

  const invalid = rows.filter(({ user }) => {
    const v = entries[user.uid] ?? "";
    if (v === "" || v === "absent") return false;
    const n = Number(v);
    return !Number.isFinite(n) || n < 0 || n > test.maxMarks;
  });

  const marksFromEntries = () => {
    const marks: Record<string, Score> = {};
    for (const [uid, v] of Object.entries(entries)) {
      if (v === "absent") marks[uid] = "absent";
      else if (v.trim() !== "" && Number.isFinite(Number(v))) marks[uid] = Number(v);
    }
    return marks;
  };
  const preview = { ...test, marks: marksFromEntries() };
  const stats = testStats(preview);

  async function persist(published: boolean) {
    if (invalid.length) return setError(`Check the marks for ${invalid.map((r) => r.user.name || "a student").join(", ")} — they must be between 0 and ${test.maxMarks}.`);
    setError("");
    const marks = marksFromEntries();
    await updateDoc(doc(db(), "tests", test.id), { marks, published, updatedAt: serverTimestamp(), ...(published && !test.published ? { publishedAt: serverTimestamp() } : {}) });
    // Students' copies follow whenever the test is (or was) published.
    if (published || test.published) await syncResults({ ...test, marks, published }, test.id, Object.keys(test.marks));
    if (published && !test.published) {
      notifyStudents({ uids: Object.keys(marks) }, { title: `Results are out: ${test.title}`, body: "See your mark and the class average.", url: "/dashboard/progress" }).catch(() => {});
    }
    setDirty(false);
    setSavedAt(new Date());
  }

  async function run(kind: "save" | "publish", fn: () => Promise<unknown>) {
    setBusy(kind);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy("");
  }

  async function remove() {
    if (!window.confirm(`Delete “${test.title}” and everyone's marks?${test.published ? " Students will no longer see this result." : ""}`)) return;
    await syncResults(null, test.id, Object.keys(test.marks));
    await deleteDoc(doc(db(), "tests", test.id));
    onBack();
  }

  const next = (i: number) => inputs.current[rows[i + 1]?.user.uid]?.focus();

  return (
    <div>
      <button
        type="button"
        onClick={() => (!dirty || window.confirm("Leave without saving these marks?")) && onBack()}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> All tests
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("rounded-full px-2.5 py-1", testTypeStyles[test.type])}>{testTypeLabels[test.type]}</span>
            <span className={cn("rounded-full px-2.5 py-1", test.published ? "bg-forest/15 text-forest" : "bg-paper-2 text-ink-soft")}>
              {test.published ? "Published — students can see results" : "Draft — students can't see it yet"}
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl">{test.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {[test.paper, test.date && prettyDate(test.date), `out of ${test.maxMarks}`].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">{test.batchIds.map(batchLabel).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GhostButton onClick={onEdit}>
            <Pencil className="size-4" /> Details
          </GhostButton>
          <GhostButton onClick={remove} className="text-ember hover:border-ember">
            <Trash2 className="size-4" /> Delete
          </GhostButton>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Marked" value={`${stats.sat + stats.absent} / ${rows.length}`} />
        <Stat label="Average" value={stats.average === null ? "—" : `${stats.average}%`} />
        <Stat label="Highest" value={stats.highest === null ? "—" : `${stats.highest} / ${test.maxMarks}`} />
        <Stat label="Absent" value={String(stats.absent)} />
      </div>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<ClipboardList className="size-6" />} title="No students in these batches" body="Confirm students in Enrollments — they'll appear here to mark." />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl border border-line">
          {rows.map(({ user, batchId }, i) => {
            const v = entries[user.uid] ?? "";
            const n = v !== "" && v !== "absent" ? Number(v) : null;
            const bad = invalid.some((r) => r.user.uid === user.uid);
            const pct = n !== null && Number.isFinite(n) && !bad ? percent(n, test.maxMarks) : null;
            return (
              <div key={user.uid} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-5 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_90px]">
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.name || user.email || "Unnamed"}</p>
                  <p className="truncate text-xs text-ink-soft">{batchId ? batchLabel(batchId) : "No longer in this batch"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {v === "absent" ? (
                    <span className="inline-flex h-10 w-24 items-center justify-center rounded-xl bg-ember/15 text-sm text-ember">Absent</span>
                  ) : (
                    <label className="relative">
                      <span className="sr-only">Mark for {user.name}</span>
                      <input
                        ref={(el) => {
                          inputs.current[user.uid] = el;
                        }}
                        inputMode="decimal"
                        value={v}
                        onChange={(e) => set(user.uid, e.target.value.replace(/[^\d.]/g, ""))}
                        onKeyDown={(e) => e.key === "Enter" && next(i)}
                        placeholder="—"
                        className={cn(adminInput, "h-10 w-24 pr-10 text-right tabular-nums", bad && "border-ember")}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">/{test.maxMarks}</span>
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => set(user.uid, v === "absent" ? "" : "absent")}
                    aria-pressed={v === "absent"}
                    title={v === "absent" ? "Mark as present" : "Mark absent"}
                    className={cn("grid size-10 place-items-center rounded-xl border transition-colors", v === "absent" ? "border-ember text-ember" : "border-line text-ink-faint hover:border-ink hover:text-ink")}
                  >
                    <UserX className="size-4" aria-hidden />
                    <span className="sr-only">{v === "absent" ? "Undo absent" : "Absent"}</span>
                  </button>
                </div>
                <p className="hidden text-right text-sm tabular-nums text-ink-soft sm:block">{pct === null ? "" : `${pct}% · ${approxGrade(pct)}`}</p>
              </div>
            );
          })}
        </div>
      )}

      <ErrorText message={error} />

      {/* Sticky actions */}
      <div className="sticky bottom-4 z-10 mt-6 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-line bg-paper/95 px-4 py-3 shadow-lift backdrop-blur">
        <p className="mr-auto text-xs text-ink-soft">
          <AnimatePresence mode="wait">
            <motion.span key={dirty ? "dirty" : savedAt ? "saved" : "idle"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {dirty ? "Unsaved changes" : savedAt ? `Saved ${savedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "Press Enter to jump to the next student"}
            </motion.span>
          </AnimatePresence>
        </p>
        <GhostButton onClick={() => run("save", () => persist(test.published))}>
          <Save className="size-4" /> {busy === "save" ? "Saving…" : test.published ? "Save & update students" : "Save draft"}
        </GhostButton>
        <PrimaryButton onClick={() => run("publish", () => persist(!test.published))} loading={busy === "publish"}>
          {test.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {test.published ? "Unpublish" : "Publish results"}
        </PrimaryButton>
      </div>
      {test.published && !dirty && (
        <p className="mt-2 flex items-center justify-end gap-1.5 text-xs text-forest">
          <Check className="size-3.5" aria-hidden /> Students see their result on their Progress page.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}
