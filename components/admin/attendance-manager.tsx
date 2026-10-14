"use client";

import { collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CalendarClock, CheckCheck, ClipboardCheck, Download, History, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  attendanceRate,
  localDate,
  markLabels,
  marks,
  markShort,
  markStyles,
  normalizeSession,
  prettyDate,
  sessionId,
  weekdayOf,
  type AttendanceSession,
  type Mark,
} from "@/lib/attendance";
import { formatTimeRange, normalizeBatch, normalizeLocation, sortBatches } from "@/lib/coaching";
import { normalizeEnrollment, type EnrollmentRecord } from "@/lib/enrollments";
import { rosterFor } from "@/lib/roster";
import { db } from "@/lib/firebase";
import { normalizeProfile } from "@/lib/normalize";
import type { Batch, Location, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminInput, EmptyState, ErrorText, GhostButton, PageHeader, PrimaryButton, Spinner } from "./ui";

type View = "take" | "history";

export function AttendanceManager() {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [batchId, setBatchId] = useState("");
  const [date, setDate] = useState(() => localDate());
  const [view, setView] = useState<View>("take");

  useEffect(() => {
    const d = db();
    const stops = [
      onSnapshot(
        collection(d, "batches"),
        (snap) => setBatches(sortBatches(snap.docs.map((x) => normalizeBatch(x.id, x.data())))),
        () => setBatches([]),
      ),
      onSnapshot(query(collection(d, "locations"), orderBy("order", "asc")), (snap) =>
        setLocations(snap.docs.map((x) => normalizeLocation(x.id, x.data()))),
      ),
      onSnapshot(collection(d, "students"), (snap) => setUsers(snap.docs.map((x) => normalizeProfile(x.id, x.data())))),
      onSnapshot(collection(d, "enrollments"), (snap) => setEnrollments(snap.docs.map((x) => normalizeEnrollment(x.id, x.data())))),
    ];
    return () => stops.forEach((s) => s());
  }, []);

  const runningBatches = (batches ?? []).filter((b) => b.status !== "closed");
  const locationName = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);
  const today = localDate();
  const todaysClasses = runningBatches
    .flatMap((b) => b.sessions.filter((s) => s.day === weekdayOf(today)).map((s) => ({ batch: b, session: s })))
    .sort((a, b) => a.session.start.localeCompare(b.session.start));

  // Default to the first class happening today, otherwise the first batch.
  const effectiveBatchId = batchId || todaysClasses[0]?.batch.id || runningBatches[0]?.id || "";
  const batch = runningBatches.find((b) => b.id === effectiveBatchId) ?? (batches ?? []).find((b) => b.id === effectiveBatchId) ?? null;

  // Confirmed students in the batch (pending/waitlisted are left out of the register).
  const roster = batch ? rosterFor(batch, users, enrollments) : [];

  const pendingCount = batch
    ? enrollments.filter((e) => e.batchId === batch.id && (e.status === "pending" || e.status === "waitlisted")).length
    : 0;

  if (batches === null) return <Spinner />;

  return (
    <div>
      <PageHeader title="Attendance" description="Take the register for each class, and see every student's attendance over time." />

      {runningBatches.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={<CalendarClock className="size-6" />} title="No batches yet" body="Create batches first — then you can take attendance for each class." />
        </div>
      ) : (
        <>
          {/* Today's classes */}
          <section className="mt-8">
            <p className="mb-3 text-sm font-medium">
              Today&apos;s classes <span className="font-normal text-ink-soft">· {prettyDate(today)}</span>
            </p>
            {todaysClasses.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-ink-soft">No classes scheduled today.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1" data-lenis-prevent>
                {todaysClasses.map(({ batch: b, session }) => {
                  const active = b.id === effectiveBatchId && date === today;
                  return (
                    <button
                      key={`${b.id}-${session.start}`}
                      type="button"
                      onClick={() => {
                        setBatchId(b.id);
                        setDate(today);
                        setView("take");
                      }}
                      className={cn(
                        "w-60 shrink-0 rounded-2xl border p-4 text-left transition-colors",
                        active ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
                      )}
                    >
                      <p className={cn("text-xs", active ? "opacity-70" : "text-ink-faint")}>
                        Class {b.classLevel} · {locationName.get(b.locationId) ?? "—"}
                      </p>
                      <p className="mt-0.5 truncate font-medium">{b.name}</p>
                      <p className={cn("mt-2 text-sm", active ? "opacity-80" : "text-ink-soft")}>{formatTimeRange(session.start, session.end)}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Controls */}
          <div className="mt-6 grid gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
            <select aria-label="Batch" value={effectiveBatchId} onChange={(e) => setBatchId(e.target.value)} className={adminInput}>
              {runningBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  Class {b.classLevel} · {b.name} · {locationName.get(b.locationId) ?? ""}
                </option>
              ))}
            </select>
            <input
              type="date"
              aria-label="Date"
              value={date}
              max={today}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className={cn(adminInput, view === "history" && "opacity-50")}
              disabled={view === "history"}
            />
            <div className="flex gap-1 rounded-full border border-line p-1">
              {(
                [
                  { id: "take", label: "Take attendance", icon: ClipboardCheck },
                  { id: "history", label: "History", icon: History },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setView(t.id)}
                  className={cn("relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm", view === t.id ? "text-paper" : "text-ink-soft hover:text-ink")}
                >
                  {view === t.id && <motion.span layoutId="attendance-view" className="absolute inset-0 rounded-full bg-ink" />}
                  <t.icon className="relative size-4" aria-hidden />
                  <span className="relative">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {batch && (
            <div className="mt-6">
              {view === "take" ? (
                <TakeAttendance key={`${batch.id}_${date}`} batch={batch} date={date} roster={roster} pendingCount={pendingCount} />
              ) : (
                <AttendanceHistory
                  batch={batch}
                  roster={roster}
                  users={users}
                  onOpen={(d) => {
                    setDate(d);
                    setView("take");
                  }}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Take attendance ───────────────────────── */

function TakeAttendance({ batch, date, roster, pendingCount }: { batch: Batch; date: string; roster: UserProfile[]; pendingCount: number }) {
  const [loaded, setLoaded] = useState(false);
  const [existing, setExisting] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<Record<string, Mark>>({});
  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const scheduled = batch.sessions.find((s) => s.day === weekdayOf(date));

  useEffect(() => {
    getDoc(doc(db(), "attendance", sessionId(batch.id, date)))
      .then((snap) => {
        if (snap.exists()) {
          const s = normalizeSession(snap.id, snap.data());
          setExisting(s);
          setRecords(s.records);
          setNote(s.note);
          setSavedAt(s.updatedAt);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, [batch.id, date]);

  // Don't lose an unsaved register by closing the tab.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (uid: string, mark: Mark) => {
    setRecords((r) => ({ ...r, [uid]: mark }));
    setDirty(true);
  };

  const markAll = (mark: Mark) => {
    setRecords((r) => ({ ...r, ...Object.fromEntries(roster.map((s) => [s.uid, mark])) }));
    setDirty(true);
  };

  async function save() {
    setSaving(true);
    setError("");
    try {
      // Keep marks for students who've since left the batch, so history stays complete.
      const id = sessionId(batch.id, date);
      const start = scheduled?.start ?? existing?.start ?? "";
      const end = scheduled?.end ?? existing?.end ?? "";
      const wb = writeBatch(db());
      wb.set(
        doc(db(), "attendance", id),
        { batchId: batch.id, date, start, end, records, note: note.trim(), updatedAt: serverTimestamp(), ...(existing ? {} : { createdAt: serverTimestamp() }) },
        { merge: true },
      );
      // Each student's own copy — the only attendance students can read (see firestore.rules).
      for (const [uid, mark] of Object.entries(records)) {
        wb.set(doc(db(), "studentAttendance", uid), { records: { [id]: { batchId: batch.id, date, start, end, mark } }, updatedAt: serverTimestamp() }, { merge: true });
      }
      await wb.commit();
      setDirty(false);
      setSavedAt(new Date());
      if (!existing) setExisting({ id: sessionId(batch.id, date), batchId: batch.id, date, start: "", end: "", records, note, updatedAt: new Date() });
    } catch (err) {
      setError((err as Error).message);
    }
    setSaving(false);
  }

  if (!loaded) return <Spinner />;

  const counts = Object.fromEntries(marks.map((m) => [m, roster.filter((s) => records[s.uid] === m).length])) as Record<Mark, number>;
  const unmarked = roster.filter((s) => !records[s.uid]).length;

  return (
    <div className="space-y-5">
      {/* Session header */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl bg-band p-6 text-band-ink sm:flex-row sm:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-70">
            Class {batch.classLevel} · {batch.name}
          </p>
          <p className="mt-1 font-display text-2xl">{prettyDate(date)}</p>
          <p className="mt-1 text-sm opacity-80">
            {scheduled ? formatTimeRange(scheduled.start, scheduled.end) : "No class scheduled on this day — recording an extra class."}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {marks.map((m) => (
            <div key={m} className="rounded-2xl bg-band-ink/10 px-3 py-2">
              <p className="font-display text-2xl tabular-nums">{counts[m]}</p>
              <p className="text-[11px] opacity-75">{markLabels[m]}</p>
            </div>
          ))}
        </div>
      </div>

      {!scheduled && (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <AlertTriangle className="size-4 text-gold" aria-hidden /> {batch.name} doesn&apos;t normally meet on {prettyDate(date).split(",")[0]}.
        </p>
      )}

      {roster.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="size-6" />}
          title="No confirmed students in this batch"
          body={pendingCount > 0 ? `${pendingCount} request${pendingCount === 1 ? " is" : "s are"} waiting in Enrollments — confirm them to add them to the register.` : "Students appear here once they're confirmed in this batch."}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              {roster.length} student{roster.length === 1 ? "" : "s"}
              {unmarked > 0 && <span className="text-ember"> · {unmarked} not marked</span>}
              {pendingCount > 0 && <span> · {pendingCount} pending enrollment{pendingCount === 1 ? "" : "s"} not shown</span>}
            </p>
            <GhostButton onClick={() => markAll("present")}>
              <CheckCheck className="size-4" /> Mark all present
            </GhostButton>
          </div>

          <ul className="overflow-hidden rounded-3xl border border-line">
            {roster.map((s, i) => (
              <motion.li
                key={s.uid}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.4) }}
                className="flex flex-col gap-3 border-b border-line px-5 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums text-ink-faint">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name || "Unnamed"}</p>
                    <p className="truncate text-xs text-ink-soft">{s.phone || s.email}</p>
                  </div>
                </div>
                <div className="flex gap-1.5" role="radiogroup" aria-label={`Attendance for ${s.name}`}>
                  {marks.map((m) => {
                    const on = records[s.uid] === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => set(s.uid, m)}
                        className={cn(
                          "min-w-[4.5rem] rounded-full border px-3 py-1.5 text-sm transition-colors",
                          on ? markStyles[m].on : "border-line text-ink-soft hover:border-ink hover:text-ink",
                        )}
                      >
                        {markLabels[m]}
                      </button>
                    );
                  })}
                </div>
              </motion.li>
            ))}
          </ul>
        </>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Class note</span>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setDirty(true);
          }}
          rows={2}
          className={adminInput}
          placeholder="e.g. Covered binary shifts and overflow. Homework: Topical Question Bank Q12–18."
        />
      </label>

      <ErrorText message={error} />

      {/* Sticky save bar */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper/90 px-4 py-3 shadow-soft backdrop-blur">
        <p className="text-sm text-ink-soft">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={dirty ? "dirty" : "clean"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {dirty ? "Unsaved changes" : savedAt ? `Saved ${savedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}` : "Not taken yet"}
            </motion.span>
          </AnimatePresence>
        </p>
        <PrimaryButton onClick={save} loading={saving} disabled={!dirty && Boolean(existing)}>
          {!saving && <Save className="size-4" />} {existing ? "Save changes" : "Save attendance"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ───────────────────────── History ───────────────────────── */

function AttendanceHistory({
  batch,
  roster,
  users,
  onOpen,
}: {
  batch: Batch;
  roster: UserProfile[];
  users: UserProfile[];
  onOpen: (date: string) => void;
}) {
  const [sessions, setSessions] = useState<AttendanceSession[] | null>(null);

  useEffect(
    () =>
      onSnapshot(
        query(collection(db(), "attendance"), where("batchId", "==", batch.id)),
        (snap) => setSessions(snap.docs.map((d) => normalizeSession(d.id, d.data())).sort((a, b) => b.date.localeCompare(a.date))),
        () => setSessions([]),
      ),
    [batch.id],
  );

  if (sessions === null) return <Spinner />;
  if (sessions.length === 0) {
    return (
      <EmptyState icon={<History className="size-6" />} title="No attendance taken yet" body={`Registers you save for ${batch.name} will build up here.`} />
    );
  }

  const recorded = sessions; // narrowed: non-null and non-empty from here on

  // Everyone who appears in any register, plus the current roster.
  const userById = new Map(users.map((u) => [u.uid, u]));
  const uids = Array.from(new Set([...roster.map((r) => r.uid), ...sessions.flatMap((s) => Object.keys(s.records))]));
  const rows = uids
    .map((uid) => ({ uid, user: userById.get(uid), inBatch: roster.some((r) => r.uid === uid) }))
    .sort((a, b) => Number(b.inBatch) - Number(a.inBatch) || (a.user?.name ?? "").localeCompare(b.user?.name ?? ""));

  const columns = sessions.slice(0, 16); // most recent first
  const overall = attendanceRate(sessions.flatMap((s) => Object.values(s.records)));

  function exportCsv() {
    const ordered = [...recorded].sort((a, b) => a.date.localeCompare(b.date));
    const header = ["Student", "Email", "Rate %", ...ordered.map((s) => s.date)];
    const body = rows.map(({ uid, user }) => {
      const studentMarks = ordered.map((s) => s.records[uid]).filter(Boolean) as Mark[];
      return [user?.name ?? "Unknown", user?.email ?? "", attendanceRate(studentMarks) ?? "", ...ordered.map((s) => (s.records[uid] ? markLabels[s.records[uid]] : ""))];
    });
    const csv = [header, ...body].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${batch.name.replace(/\s+/g, "-").toLowerCase()}-${localDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Stat label="Classes recorded" value={String(sessions.length)} />
          <Stat label="Overall attendance" value={overall === null ? "—" : `${overall}%`} />
          <Stat label="Last taken" value={prettyDate(sessions[0].date, "short")} />
        </div>
        <GhostButton onClick={exportCsv}>
          <Download className="size-4" /> Export CSV
        </GhostButton>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-line" data-lenis-prevent>
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-2/50">
              <th className="sticky left-0 z-10 bg-paper-2 px-4 py-3 text-left font-medium">Student</th>
              <th className="px-3 py-3 text-right font-medium">Rate</th>
              {columns.map((s) => (
                <th key={s.id} className="px-1.5 py-3 text-center font-normal">
                  <button
                    type="button"
                    onClick={() => onOpen(s.date)}
                    title={`Open ${prettyDate(s.date)}`}
                    className="rounded-lg px-1.5 py-0.5 text-xs text-ink-soft hover:bg-paper hover:text-ink"
                  >
                    {prettyDate(s.date, "short")}
                    <span className="block text-[10px] text-ink-faint">{weekdayOf(s.date)}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ uid, user, inBatch }) => {
              const studentMarks = sessions.map((s) => s.records[uid]).filter(Boolean) as Mark[];
              const rate = attendanceRate(studentMarks);
              return (
                <tr key={uid} className="border-b border-line last:border-b-0">
                  <td className="sticky left-0 z-10 bg-paper px-4 py-2.5">
                    <p className={cn("max-w-[14rem] truncate font-medium", !inBatch && "text-ink-soft")}>{user?.name || user?.email || "Unknown student"}</p>
                    {!inBatch && <p className="text-[11px] text-ink-faint">No longer in this batch</p>}
                  </td>
                  <td className={cn("px-3 py-2.5 text-right font-medium tabular-nums", rate !== null && rate < 75 && "text-ember")}>
                    {rate === null ? "—" : `${rate}%`}
                  </td>
                  {columns.map((s) => {
                    const m = s.records[uid];
                    return (
                      <td key={s.id} className="px-1.5 py-2.5 text-center">
                        {m ? (
                          <span title={markLabels[m]} className={cn("inline-grid size-7 place-items-center rounded-lg text-xs font-semibold", markStyles[m].dot)}>
                            {markShort[m]}
                          </span>
                        ) : (
                          <span className="text-ink-faint">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-ink-soft">
        {marks.map((m) => (
          <span key={m} className="inline-flex items-center gap-1.5">
            <span className={cn("inline-grid size-5 place-items-center rounded-md text-[10px] font-semibold", markStyles[m].dot)}>{markShort[m]}</span>
            {markLabels[m]}
          </span>
        ))}
        <span>Rate counts present + late; excused classes are left out. Below 75% is highlighted.</span>
        {sessions.length > columns.length && <span>Showing the latest {columns.length} classes — export for the full record.</span>}
      </div>

      {sessions.some((s) => s.note) && (
        <section className="rounded-3xl border border-line p-5">
          <h3 className="font-display text-lg">Class notes</h3>
          <ul className="mt-3 space-y-2.5 text-sm">
            {sessions
              .filter((s) => s.note)
              .slice(0, 8)
              .map((s) => (
                <li key={s.id} className="flex gap-3">
                  <span className="w-16 shrink-0 text-ink-faint">{prettyDate(s.date, "short")}</span>
                  <span>{s.note}</span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line px-4 py-2.5">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="font-display text-xl">{value}</p>
    </div>
  );
}
