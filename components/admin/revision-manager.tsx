"use client";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { motion } from "motion/react";
import { FileStack, ListChecks } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { normalizeBatch, normalizeLocation, sortBatches } from "@/lib/coaching";
import { normalizeEnrollment, type EnrollmentRecord } from "@/lib/enrollments";
import { db } from "@/lib/firebase";
import { normalizeProfile } from "@/lib/normalize";
import { attemptStats, normalizePastPapers, type PaperAttempt } from "@/lib/past-papers";
import { rosterFor } from "@/lib/roster";
import { confidenceLabels, confidenceStyles, normalizeSyllabusProgress, syllabusFor, type Confidence, type TopicProgress } from "@/lib/syllabus";
import type { Batch, Location, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminInput, EmptyState, PageHeader, Spinner } from "./ui";

type Tab = "syllabus" | "papers";
const DAY = 864e5;

export function RevisionManager() {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [syllabus, setSyllabus] = useState<Record<string, Record<string, TopicProgress>>>({});
  const [papers, setPapers] = useState<Record<string, Record<string, PaperAttempt>>>({});
  const [batchId, setBatchId] = useState("");
  const [tab, setTab] = useState<Tab>("syllabus");
  const [weakestFirst, setWeakestFirst] = useState(true);

  useEffect(() => {
    const d = db();
    const stops = [
      onSnapshot(collection(d, "batches"), (snap) => setBatches(sortBatches(snap.docs.map((x) => normalizeBatch(x.id, x.data())))), () => setBatches([])),
      onSnapshot(query(collection(d, "locations"), orderBy("order", "asc")), (snap) => setLocations(snap.docs.map((x) => normalizeLocation(x.id, x.data())))),
      onSnapshot(collection(d, "users"), (snap) => setUsers(snap.docs.map((x) => normalizeProfile(x.id, x.data())))),
      onSnapshot(collection(d, "enrollments"), (snap) => setEnrollments(snap.docs.map((x) => normalizeEnrollment(x.id, x.data())))),
      onSnapshot(collection(d, "syllabusProgress"), (snap) => setSyllabus(Object.fromEntries(snap.docs.map((x) => [x.id, normalizeSyllabusProgress(x.data())])))),
      onSnapshot(collection(d, "pastPapers"), (snap) => setPapers(Object.fromEntries(snap.docs.map((x) => [x.id, normalizePastPapers(x.data())])))),
    ];
    return () => stops.forEach((s) => s());
  }, []);

  const locationName = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);
  if (batches === null) return <Spinner />;

  const running = batches.filter((b) => b.status !== "closed");
  const withStudents = running.filter((b) => rosterFor(b, users, enrollments).length > 0);
  const batch = running.find((b) => b.id === batchId) ?? withStudents[0] ?? running[0];
  const roster = batch ? rosterFor(batch, users, enrollments) : [];

  return (
    <div>
      <PageHeader title="Revision" description="How each batch is getting on with the syllabus and past papers — students rate their own confidence and log the papers they practise." />

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <label className="block min-w-64 flex-1 sm:flex-none">
          <span className="mb-1.5 block text-sm font-medium">Batch</span>
          <select value={batch?.id ?? ""} onChange={(e) => setBatchId(e.target.value)} className={adminInput}>
            {running.map((b) => (
              <option key={b.id} value={b.id}>
                Class {b.classLevel} · {b.name} · {locationName.get(b.locationId) ?? ""}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-1 rounded-full border border-line p-1">
          {(
            [
              ["syllabus", "Syllabus", ListChecks],
              ["papers", "Past papers", FileStack],
            ] as const
          ).map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={cn("relative rounded-full px-4 py-2 text-sm", tab === id ? "text-paper" : "text-ink-soft hover:text-ink")}>
              {tab === id && <motion.span layoutId="revision-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className="relative flex items-center gap-1.5">
                <Icon className="size-4" aria-hidden /> {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {!batch ? (
          <EmptyState icon={<ListChecks className="size-6" />} title="No batches yet" body="Create batches and confirm students first." />
        ) : roster.length === 0 ? (
          <EmptyState icon={<ListChecks className="size-6" />} title="No students in this batch" body="Confirmed students will appear here." />
        ) : tab === "syllabus" ? (
          <SyllabusView batch={batch} roster={roster} progress={syllabus} weakestFirst={weakestFirst} setWeakestFirst={setWeakestFirst} />
        ) : (
          <PapersView roster={roster} attempts={papers} />
        )}
      </div>
    </div>
  );
}

function SyllabusView({
  batch,
  roster,
  progress,
  weakestFirst,
  setWeakestFirst,
}: {
  batch: Batch;
  roster: UserProfile[];
  progress: Record<string, Record<string, TopicProgress>>;
  weakestFirst: boolean;
  setWeakestFirst: (v: boolean) => void;
}) {
  const [open, setOpen] = useState("");
  const syllabus = syllabusFor(batch.classLevel);
  if (!syllabus) return null;

  const ratingOf = (uid: string, topicId: string): Confidence => progress[uid]?.[topicId]?.confidence ?? 0;
  const rows = syllabus.topics.map((topic, order) => {
    const counts = Object.fromEntries(([0, 1, 2, 3] as Confidence[]).map((c) => [c, roster.filter((u) => ratingOf(u.uid, topic.id) === c).length])) as Record<Confidence, number>;
    const rated = roster.length - counts[0];
    // Lower = weaker; unrated topics sort after rated ones.
    const score = rated ? (counts[1] * 1 + counts[2] * 2 + counts[3] * 3) / rated : 99;
    return { topic, order, counts, rated, score };
  });
  const sorted = weakestFirst ? [...rows].sort((a, b) => a.score - b.score || b.counts[1] - a.counts[1] || a.order - b.order) : rows;
  const engaged = roster.filter((u) => Object.keys(progress[u.uid] ?? {}).length > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {syllabus.name} · <strong className="font-medium text-ink">{engaged}</strong> of {roster.length} students have rated topics
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={weakestFirst} onChange={(e) => setWeakestFirst(e.target.checked)} className="size-4 accent-[var(--forest)]" />
          Weakest topics first
        </label>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-ink-soft">
        {([1, 2, 3, 0] as Confidence[]).map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", confidenceStyles[c].dot)} /> {confidenceLabels[c]}
          </span>
        ))}
      </div>
      <div className="overflow-hidden rounded-3xl border border-line">
        {sorted.map(({ topic, counts }) => {
          const isOpen = open === topic.id;
          const needHelp = roster.filter((u) => ratingOf(u.uid, topic.id) === 1);
          return (
            <div key={topic.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? "" : topic.id)}
                aria-expanded={isOpen}
                className="grid w-full gap-2 px-5 py-3.5 text-left transition-colors hover:bg-paper-2/50 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center md:gap-6"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{topic.title}</span>
                  <span className="block text-xs text-ink-faint">
                    {topic.unit} · {topic.paper}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="flex h-2.5 overflow-hidden rounded-full bg-paper-2" role="img" aria-label={`${counts[1]} need help, ${counts[2]} getting there, ${counts[3]} confident, ${counts[0]} not rated`}>
                    {([1, 2, 3] as Confidence[]).map((c) => (
                      <span key={c} className={confidenceStyles[c].dot} style={{ width: `${(counts[c] / roster.length) * 100}%` }} />
                    ))}
                  </span>
                  <span className="mt-1 block truncate text-xs text-ink-soft">
                    {needHelp.length ? `Need help: ${needHelp.map((u) => u.name.split(" ")[0] || "Unnamed").join(", ")}` : counts[0] === roster.length ? "No ratings yet" : "Nobody needs help"}
                  </span>
                </span>
              </button>
              {isOpen && (
                <ul className="grid gap-1.5 bg-paper-2/40 px-5 py-3 sm:grid-cols-2">
                  {roster.map((u) => {
                    const r = ratingOf(u.uid, topic.id);
                    return (
                      <li key={u.uid} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate">{u.name || "Unnamed"}</span>
                        <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-xs", confidenceStyles[r].on)}>{confidenceLabels[r]}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PapersView({ roster, attempts }: { roster: UserProfile[]; attempts: Record<string, Record<string, PaperAttempt>> }) {
  const [now] = useState(() => Date.now());
  const rows = roster
    .map((u) => {
      const mine = attempts[u.uid] ?? {};
      const byPaper = Object.keys(mine).reduce<Record<string, number>>((acc, code) => {
        const p = code.split("-")[2]?.[0] ?? "?";
        acc[p] = (acc[p] ?? 0) + 1;
        return acc;
      }, {});
      return { user: u, stats: attemptStats(mine), byPaper };
    })
    .sort((a, b) => b.stats.done - a.stats.done || (a.user.name || "").localeCompare(b.user.name || ""));
  const paperNos = Array.from(new Set(rows.flatMap((r) => Object.keys(r.byPaper)))).sort();
  const quiet = rows.filter((r) => !r.stats.last || now - r.stats.last.getTime() > 14 * DAY).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        {quiet > 0 ? (
          <>
            <strong className="font-medium text-ember">{quiet}</strong> student{quiet === 1 ? " hasn't" : "s haven't"} logged a past paper in the last 2 weeks.
          </>
        ) : (
          "Everyone has practised in the last 2 weeks."
        )}
      </p>
      <div className="overflow-x-auto rounded-3xl border border-line" data-lenis-prevent>
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-soft">
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-3 py-3 text-right font-medium">Papers done</th>
              {paperNos.map((p) => (
                <th key={p} className="px-3 py-3 text-right font-medium">
                  Paper {p}
                </th>
              ))}
              <th className="px-3 py-3 text-right font-medium">Average</th>
              <th className="px-5 py-3 text-right font-medium">Last practised</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, stats, byPaper }) => {
              const stale = !stats.last || now - stats.last.getTime() > 14 * DAY;
              return (
                <tr key={user.uid} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3 font-medium">{user.name || "Unnamed"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{stats.done}</td>
                  {paperNos.map((p) => (
                    <td key={p} className="px-3 py-3 text-right tabular-nums text-ink-soft">
                      {byPaper[p] ?? 0}
                    </td>
                  ))}
                  <td className={cn("px-3 py-3 text-right tabular-nums", stats.average !== null && (stats.average >= 70 ? "text-forest" : stats.average < 50 ? "text-ember" : ""))}>
                    {stats.average === null ? "—" : `${stats.average}%`}
                  </td>
                  <td className={cn("px-5 py-3 text-right", stale ? "text-ember" : "text-ink-soft")}>
                    {stats.last ? stats.last.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Never"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
