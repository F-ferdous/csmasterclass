"use client";

import { deleteField, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { motion } from "motion/react";
import { ListChecks } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorText, PageHeader, Spinner } from "@/components/admin/ui";
import { useAuth } from "@/components/auth/auth-provider";
import { ease } from "@/components/motion/reveal";
import { db } from "@/lib/firebase";
import { confidenceLabels, confidenceLevels, confidenceStyles, syllabusFor, unitsOf, type Confidence } from "@/lib/syllabus";
import { cn } from "@/lib/utils";
import { useMySyllabus } from "./use-my-records";

type Filter = "all" | "help" | "unrated";

export function StudentSyllabus() {
  const { user, profile } = useAuth();
  const saved = useMySyllabus();
  // Optimistic ratings while a save is in flight.
  const [pending, setPending] = useState<Record<string, Confidence>>({});
  const [paper, setPaper] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");
  const syllabus = syllabusFor(profile?.classLevel ?? "");

  if (saved === null) return <Spinner />;
  if (!syllabus || !user) {
    return (
      <div className="space-y-8">
        <PageHeader title="Syllabus" description="Rate how confident you feel on every topic." />
        <EmptyState icon={<ListChecks className="size-6" />} title="No class set yet" body="Your syllabus appears once your teacher has placed you in a batch." />
      </div>
    );
  }

  const ratingOf = (id: string): Confidence => pending[id] ?? saved[id]?.confidence ?? 0;

  async function rate(id: string, value: Confidence) {
    const next: Confidence = ratingOf(id) === value ? 0 : value; // tap again to clear
    setPending((p) => ({ ...p, [id]: next }));
    setError("");
    try {
      await setDoc(
        doc(db(), "syllabusProgress", user!.uid),
        { topics: { [id]: next === 0 ? deleteField() : { confidence: next, updatedAt: serverTimestamp() } }, updatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch {
      setError("Couldn't save — check your connection and try again.");
    }
    setPending((p) => {
      const rest = { ...p };
      delete rest[id];
      return rest;
    });
  }

  const all = syllabus.topics;
  const counts = Object.fromEntries(([0, 1, 2, 3] as Confidence[]).map((c) => [c, all.filter((t) => ratingOf(t.id) === c).length])) as Record<Confidence, number>;
  const papers = Array.from(new Set(all.map((t) => t.paper)));
  const units = unitsOf(syllabus)
    .filter((u) => paper === "all" || u.paper === paper)
    .map((u) => ({ ...u, topics: u.topics.filter((t) => filter === "all" || (filter === "help" ? ratingOf(t.id) === 1 : ratingOf(t.id) === 0)) }))
    .filter((u) => u.topics.length);

  return (
    <div className="space-y-8">
      <PageHeader title="Syllabus" description={`${syllabus.name} (${syllabus.code}). Rate each topic — your teacher sees which ones the class finds hardest.`} />

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="rounded-3xl border border-line p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-ink-soft">Confident on</p>
            <p className="mt-1 font-display text-4xl tabular-nums">
              {counts[3]} <span className="text-lg text-ink-soft">of {all.length} topics</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-ink-soft">
            {([3, 2, 1, 0] as Confidence[]).map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-full", confidenceStyles[c].dot)} /> {confidenceLabels[c]} {counts[c]}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-paper-2" role="img" aria-label={`${counts[3]} confident, ${counts[2]} getting there, ${counts[1]} need help, ${counts[0]} not rated`}>
          {([3, 2, 1] as Confidence[]).map((c) => (
            <motion.div key={c} className={confidenceStyles[c].dot} initial={{ width: 0 }} animate={{ width: `${(counts[c] / all.length) * 100}%` }} transition={{ duration: 0.8, ease }} />
          ))}
        </div>
      </motion.section>

      <div className="flex flex-wrap gap-2">
        {(["all", ...papers] as string[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPaper(p)}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", paper === p ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}
          >
            {p === "all" ? "All papers" : p}
          </button>
        ))}
        <span className="mx-1 hidden w-px bg-line sm:block" />
        {(
          [
            ["all", "All topics"],
            ["help", "Need help"],
            ["unrated", "Not rated"],
          ] as [Filter, string][]
        ).map(([f, label]) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", filter === f ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}
          >
            {label}
          </button>
        ))}
      </div>
      <ErrorText message={error} />

      {units.length === 0 ? (
        <EmptyState icon={<ListChecks className="size-6" />} title="Nothing here" body={filter === "help" ? "No topics marked “Need help” — nice work." : "Every topic has a rating."} />
      ) : (
        units.map((u, i) => (
          <motion.section key={u.unit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: Math.min(i * 0.04, 0.3), ease }}>
            <h2 className="mb-3 flex items-baseline justify-between gap-3 font-display text-xl">
              {u.unit} <span className="text-xs font-normal text-ink-faint">{u.paper}</span>
            </h2>
            <ul className="overflow-hidden rounded-3xl border border-line">
              {u.topics.map((topic) => {
                const r = ratingOf(topic.id);
                return (
                  <li key={topic.id} className="flex flex-col gap-3 border-b border-line px-5 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-start gap-2.5 text-sm">
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", confidenceStyles[r].dot)} aria-hidden />
                      {topic.title}
                    </p>
                    <div className="flex shrink-0 gap-1" role="group" aria-label={`How confident are you on ${topic.title}?`}>
                      {confidenceLevels.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={r === c}
                          onClick={() => rate(topic.id, c)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs transition-colors",
                            r === c ? confidenceStyles[c].on : "border-line text-ink-soft hover:border-ink hover:text-ink",
                          )}
                        >
                          {confidenceLabels[c]}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.section>
        ))
      )}
    </div>
  );
}
