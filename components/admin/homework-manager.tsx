"use client";

import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { ArrowLeft, BookMarked, Check, ExternalLink, FileText, Link2, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { localDate, prettyDate } from "@/lib/attendance";
import { normalizeBatch, normalizeLocation, sortBatches } from "@/lib/coaching";
import { normalizeEnrollment, type EnrollmentRecord } from "@/lib/enrollments";
import { db } from "@/lib/firebase";
import { storage } from "@/lib/firebase-client";
import {
  dueText,
  homeworkAudienceKeys,
  homeworkStatus,
  normalizeHomework,
  normalizeSubmission,
  statusLabels,
  statusStyles,
  type Homework,
  type Submission,
} from "@/lib/homework";
import { normalizeProfile } from "@/lib/normalize";
import { waLink } from "@/lib/phone";
import { isWebUrl, storageErrorMessage } from "@/lib/resources";
import { rosterFor } from "@/lib/roster";
import type { Batch, Location, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { notifyStudents } from "./notify";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, Field, GhostButton, PageHeader, PrimaryButton, Spinner } from "./ui";

const blank: Homework = { id: "", title: "", instructions: "", link: "", batchIds: [], dueDate: "", maxMarks: null, visible: true, createdAt: null };

export function HomeworkManager() {
  const [items, setItems] = useState<Homework[] | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [counts, setCounts] = useState<Record<string, { submitted: number; marked: number }>>({});
  const [editing, setEditing] = useState<Homework | null>(null);
  const [openId, setOpenId] = useState("");

  useEffect(() => {
    const d = db();
    const stops = [
      onSnapshot(
        collection(d, "homework"),
        (snap) => setItems(snap.docs.map((x) => normalizeHomework(x.id, x.data())).sort((a, b) => b.dueDate.localeCompare(a.dueDate))),
        () => setItems([]),
      ),
      onSnapshot(collection(d, "batches"), (snap) => setBatches(sortBatches(snap.docs.map((x) => normalizeBatch(x.id, x.data()))))),
      onSnapshot(query(collection(d, "locations"), orderBy("order", "asc")), (snap) => setLocations(snap.docs.map((x) => normalizeLocation(x.id, x.data())))),
      onSnapshot(collection(d, "users"), (snap) => setUsers(snap.docs.map((x) => normalizeProfile(x.id, x.data())))),
      onSnapshot(collection(d, "enrollments"), (snap) => setEnrollments(snap.docs.map((x) => normalizeEnrollment(x.id, x.data())))),
    ];
    return () => stops.forEach((s) => s());
  }, []);

  // Submission counts for the list (one read per homework; the open one is live).
  const ids = (items ?? []).map((h) => h.id).join(",");
  useEffect(() => {
    if (!ids) return;
    let live = true;
    Promise.all(
      ids.split(",").map(async (id) => {
        const snap = await getDocs(collection(db(), "homework", id, "submissions"));
        const subs = snap.docs.map((x) => x.data());
        return [id, { submitted: subs.filter((s) => s.submittedAt).length, marked: subs.filter((s) => s.markedAt).length }] as const;
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
  const rosterOf = (h: Pick<Homework, "batchIds">) => h.batchIds.flatMap((id) => (batchById.get(id) ? rosterFor(batchById.get(id)!, users, enrollments).map((u) => ({ user: u, batchId: id })) : []));

  if (items === null) return <Spinner />;

  const open = items.find((h) => h.id === openId);
  const drawer = (
    <Drawer open={Boolean(editing)} title={editing?.id ? "Edit homework" : "Set homework"} onClose={() => setEditing(null)}>
      {editing && (
        <HomeworkForm
          key={editing.id || "new"}
          homework={editing}
          batches={batches}
          batchLabel={batchLabel}
          studentCount={(h) => rosterOf(h).length}
          onDone={(id) => {
            setEditing(null);
            if (id) setOpenId(id);
          }}
        />
      )}
    </Drawer>
  );

  if (open) {
    return (
      <>
        <Submissions key={open.id} homework={open} roster={rosterOf(open)} batchLabel={batchLabel} onBack={() => setOpenId("")} onEdit={() => setEditing(open)} />
        {drawer}
      </>
    );
  }

  const newButton = (
    <PrimaryButton onClick={() => setEditing({ ...blank })}>
      <Plus className="size-4" /> Set homework
    </PrimaryButton>
  );

  return (
    <div>
      <PageHeader title="Homework" description="Set work for your batches with a due date. Students submit a link (or a file once uploads are on); you mark it and add feedback." actions={newButton} />
      <div className="mt-8">
        {items.length === 0 ? (
          <EmptyState icon={<BookMarked className="size-6" />} title="No homework yet" body="Set your first task — students in the chosen batches see it on their dashboard straight away." action={newButton} />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line">
            {items.map((h) => {
              const total = rosterOf(h).length;
              const c = counts[h.id];
              const overdue = h.dueDate && h.dueDate < localDate();
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setOpenId(h.id)}
                  className="grid w-full gap-2 border-b border-line px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-paper-2/60 md:grid-cols-[110px_minmax(0,1.5fr)_minmax(0,1fr)_auto] md:items-center md:gap-5"
                >
                  <span className={cn("text-sm", overdue ? "text-ink-faint" : "text-ink-soft")}>{h.dueDate ? prettyDate(h.dueDate, "short") : "No date"}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{h.title}</span>
                    <span className="block truncate text-xs text-ink-soft">{h.batchIds.map(batchLabel).join(", ")}</span>
                  </span>
                  <span className="text-sm text-ink-soft">
                    {c ? `${c.submitted}/${total} submitted · ${c.marked} marked` : `${total} students`}
                  </span>
                  <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs", !h.visible ? "bg-paper-2 text-ink-soft" : overdue ? "bg-paper-2 text-ink-soft" : "bg-forest/15 text-forest")}>
                    {!h.visible ? "Hidden" : overdue ? "Closed" : dueText(h.dueDate)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {drawer}
    </div>
  );
}

/* ───────────────────────── Set / edit ───────────────────────── */

function HomeworkForm({
  homework,
  batches,
  batchLabel,
  studentCount,
  onDone,
}: {
  homework: Homework;
  batches: Batch[];
  batchLabel: (id: string) => string;
  studentCount: (h: Pick<Homework, "batchIds">) => number;
  onDone: (openId?: string) => void;
}) {
  const [draft, setDraft] = useState(homework);
  const [max, setMax] = useState(homework.maxMarks ? String(homework.maxMarks) : "");
  const [notify, setNotify] = useState(!homework.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof Homework>(k: K, v: Homework[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const toggleBatch = (id: string) => set("batchIds", draft.batchIds.includes(id) ? draft.batchIds.filter((b) => b !== id) : [...draft.batchIds, id]);

  async function save() {
    if (!draft.title.trim()) return setError("Give the homework a title.");
    if (!draft.batchIds.length) return setError("Choose at least one batch.");
    if (!draft.dueDate) return setError("Choose a due date.");
    if (draft.link.trim() && !isWebUrl(draft.link)) return setError("Paste the full link, starting with https://");
    const maxMarks = max.trim() ? Number(max) : null;
    if (maxMarks !== null && (!Number.isFinite(maxMarks) || maxMarks <= 0)) return setError("Total marks must be a number — or leave it empty for feedback only.");
    setSaving(true);
    setError("");
    const data = {
      title: draft.title.trim(),
      instructions: draft.instructions.trim(),
      link: draft.link.trim(),
      batchIds: draft.batchIds,
      dueDate: draft.dueDate,
      maxMarks,
      visible: draft.visible,
      audienceKeys: homeworkAudienceKeys(draft),
      updatedAt: serverTimestamp(),
    };
    try {
      let id = homework.id;
      if (id) await updateDoc(doc(db(), "homework", id), data);
      else id = (await addDoc(collection(db(), "homework"), { ...data, createdAt: serverTimestamp() })).id;
      if (notify && draft.visible) {
        await notifyStudents({ batchIds: draft.batchIds }, { title: `New homework: ${data.title}`, body: `${dueText(data.dueDate)} — tap to see it.`, url: "/dashboard/homework" }).catch(() => {});
      }
      onDone(homework.id ? undefined : id);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className={drawerFormClass}>
      <DrawerBody>
        <Field label="Title">
          <input value={draft.title} onChange={(e) => set("title", e.target.value)} className={adminInput} placeholder="e.g. Trace table practice — Worksheet 3" maxLength={120} />
        </Field>
        <Field label="Instructions" hint="Optional">
          <textarea value={draft.instructions} onChange={(e) => set("instructions", e.target.value)} rows={4} className={adminInput} placeholder="What to do, which questions, how to submit…" />
        </Field>
        <Field label="Worksheet / reference link" hint="Optional">
          <input type="url" value={draft.link} onChange={(e) => set("link", e.target.value)} className={adminInput} placeholder="https://drive.google.com/…" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Due date">
            <input type="date" value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} className={adminInput} />
          </Field>
          <Field label="Total marks" hint="Optional">
            <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} className={adminInput} placeholder="Feedback only" />
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
          <p className="mt-2 text-xs text-ink-soft">{studentCount(draft)} students</p>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
          <span className="text-sm font-medium">Show to students</span>
          <input type="checkbox" checked={draft.visible} onChange={(e) => set("visible", e.target.checked)} className="size-5 accent-[var(--forest)]" />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
          <span>
            <span className="block text-sm font-medium">Send a notification</span>
            <span className="block text-xs text-ink-soft">To students who turned on notifications</span>
          </span>
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-5 accent-[var(--forest)]" />
        </label>
        <ErrorText message={error} />
      </DrawerBody>
      <DrawerFooter>
        <GhostButton onClick={() => onDone()} className="mr-auto">
          Cancel
        </GhostButton>
        <PrimaryButton onClick={save} loading={saving}>
          {homework.id ? "Save" : "Set homework"}
        </PrimaryButton>
      </DrawerFooter>
    </div>
  );
}

/* ───────────────────────── Submissions & marking ───────────────────────── */

function Submissions({
  homework,
  roster,
  batchLabel,
  onBack,
  onEdit,
}: {
  homework: Homework;
  roster: { user: UserProfile; batchId: string }[];
  batchLabel: (id: string) => string;
  onBack: () => void;
  onEdit: () => void;
}) {
  const [subs, setSubs] = useState<Record<string, Submission> | null>(null);

  useEffect(
    () =>
      onSnapshot(
        collection(db(), "homework", homework.id, "submissions"),
        (snap) => setSubs(Object.fromEntries(snap.docs.map((x) => [x.id, normalizeSubmission(x.id, x.data())]))),
        () => setSubs({}),
      ),
    [homework.id],
  );

  if (subs === null) return <Spinner />;

  const statuses = roster.map((r) => homeworkStatus(homework, subs[r.user.uid]));
  const submitted = statuses.filter((s) => s === "submitted" || s === "late" || s === "marked").length;
  const late = statuses.filter((s) => s === "late").length;
  const marked = statuses.filter((s) => s === "marked").length;

  async function remove() {
    if (!window.confirm(`Delete “${homework.title}”? Students' submissions will be deleted too.`)) return;
    const snap = await getDocs(collection(db(), "homework", homework.id, "submissions"));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db(), "homework", homework.id));
    onBack();
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All homework
      </button>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-ink-soft">{homework.visible ? dueText(homework.dueDate) : "Hidden from students"}</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">{homework.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Due {homework.dueDate ? prettyDate(homework.dueDate) : "—"}
            {homework.maxMarks ? ` · out of ${homework.maxMarks}` : " · feedback only"}
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">{homework.batchIds.map(batchLabel).join(" · ")}</p>
          {homework.instructions && <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-relaxed">{homework.instructions}</p>}
          {homework.link && (
            <a href={homework.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
              <Link2 className="size-4" aria-hidden /> Worksheet / reference
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <GhostButton onClick={onEdit}>
            <Pencil className="size-4" /> Edit
          </GhostButton>
          <GhostButton onClick={remove} className="text-ember hover:border-ember">
            <Trash2 className="size-4" /> Delete
          </GhostButton>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Submitted" value={`${submitted} / ${roster.length}`} />
        <Stat label="Late" value={String(late)} />
        <Stat label="Not submitted" value={String(roster.length - submitted)} />
        <Stat label="Marked" value={`${marked} / ${submitted}`} />
      </div>

      <div className="mt-6 space-y-3">
        {roster.length === 0 ? (
          <EmptyState icon={<BookMarked className="size-6" />} title="No students in these batches" body="Confirm students in Enrollments — they'll appear here." />
        ) : (
          roster.map(({ user, batchId }, i) => <StudentRow key={user.uid} homework={homework} user={user} batchLabel={batchLabel(batchId)} sub={subs[user.uid]} status={statuses[i]} />)
        )}
      </div>
    </div>
  );
}

function StudentRow({ homework, user, batchLabel, sub, status }: { homework: Homework; user: UserProfile; batchLabel: string; sub?: Submission; status: ReturnType<typeof homeworkStatus> }) {
  const [mark, setMark] = useState(sub?.mark === null || sub?.mark === undefined ? "" : String(sub.mark));
  const [feedback, setFeedback] = useState(sub?.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const handedIn = Boolean(sub?.submittedAt || sub?.link || sub?.file);

  async function openFile() {
    if (!sub?.file) return;
    const tab = window.open("", "_blank");
    try {
      const url = await getDownloadURL(storageRef(storage(), sub.file.path));
      if (tab) tab.location.href = url;
    } catch (err) {
      tab?.close();
      setError(storageErrorMessage(err));
    }
  }

  async function save() {
    const m = mark.trim() === "" ? null : Number(mark);
    if (homework.maxMarks && m !== null && (!Number.isFinite(m) || m < 0 || m > homework.maxMarks)) return setError(`Mark must be between 0 and ${homework.maxMarks}.`);
    if (m === null && !feedback.trim()) return setError("Add a mark or some feedback.");
    setSaving(true);
    setError("");
    try {
      await setDoc(
        doc(db(), "homework", homework.id, "submissions", user.uid),
        { uid: user.uid, name: user.name, mark: m, feedback: feedback.trim(), markedAt: serverTimestamp(), updatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch (err) {
      setError((err as Error).message);
    }
    setSaving(false);
  }

  const remind = user.phone
    ? waLink(user.phone, `Hi ${user.name.split(" ")[0] || ""}, a reminder that your homework “${homework.title}” was due ${homework.dueDate ? prettyDate(homework.dueDate, "short") : ""}. Please submit it on your dashboard. — CS Masterclass`)
    : "";

  return (
    <div className="rounded-3xl border border-line p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{user.name || "Unnamed"}</p>
          <p className="text-xs text-ink-soft">{batchLabel}</p>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs", statusStyles[status])}>
          {statusLabels[status]}
          {sub?.submittedAt ? ` · ${sub.submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}
        </span>
      </div>

      {handedIn ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {sub?.link && (
              <a href={sub.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm hover:border-ink">
                <ExternalLink className="size-4" aria-hidden /> Open answer
              </a>
            )}
            {sub?.file && (
              <button type="button" onClick={openFile} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm hover:border-ink">
                <FileText className="size-4" aria-hidden /> {sub.file.name}
              </button>
            )}
          </div>
          {sub?.note && <p className="rounded-2xl bg-paper-2/60 px-4 py-2.5 text-sm italic text-ink-soft">“{sub.note}”</p>}
          <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-start">
            {homework.maxMarks ? (
              <label className="relative">
                <span className="sr-only">Mark</span>
                <input inputMode="decimal" value={mark} onChange={(e) => setMark(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Mark" className={cn(adminInput, "pr-12 text-right tabular-nums")} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">/{homework.maxMarks}</span>
              </label>
            ) : (
              <span className="hidden sm:block" />
            )}
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} placeholder="Feedback for the student" className={adminInput} />
            <PrimaryButton onClick={save} loading={saving}>
              <Check className="size-4" /> {sub?.markedAt ? "Update" : "Mark"}
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-soft">Nothing submitted yet.</p>
          {remind && (
            <a href={remind} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm hover:border-ink">
              <MessageCircle className="size-4" aria-hidden /> Remind on WhatsApp
            </a>
          )}
        </div>
      )}
      <ErrorText message={error} />
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
