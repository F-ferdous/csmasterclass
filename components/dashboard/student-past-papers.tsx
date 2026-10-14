"use client";

import { deleteField, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { motion } from "motion/react";
import { Check, FileStack, Trash2 } from "lucide-react";
import { useState } from "react";
import { StatTile } from "@/components/admin/charts";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, Field, GhostButton, PageHeader, PrimaryButton, Spinner } from "@/components/admin/ui";
import { useAuth } from "@/components/auth/auth-provider";
import { ease } from "@/components/motion/reveal";
import { db } from "@/lib/firebase";
import { attemptStats, paperName, papersFor, sessionLabels, type PaperAttempt, type PaperSpec, type PastPaper } from "@/lib/past-papers";
import { cn } from "@/lib/utils";
import { useMyPastPapers } from "./use-my-records";

const pct = (a: PaperAttempt) => (a.score === null ? null : Math.round((a.score / a.max) * 100));
const tone = (p: number | null) => (p === null ? "border-forest/40 bg-forest/10 text-forest" : p >= 70 ? "border-forest bg-forest text-forest-ink" : p >= 50 ? "border-gold bg-gold text-ink" : "border-ember bg-ember text-white");

export function StudentPastPapers() {
  const { user, profile } = useAuth();
  const attempts = useMyPastPapers();
  const catalogue = papersFor(profile?.classLevel ?? "");
  const [paperNo, setPaperNo] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ paper: PastPaper; spec: PaperSpec } | null>(null);

  if (attempts === null) return <Spinner />;
  if (!catalogue || !user) {
    return (
      <div className="space-y-8">
        <PageHeader title="Past papers" description="Track the past papers you've practised and your scores." />
        <EmptyState icon={<FileStack className="size-6" />} title="No class set yet" body="Your past paper list appears once your teacher has placed you in a batch." />
      </div>
    );
  }

  const active = paperNo ?? catalogue.papers[0].paper;
  const stats = attemptStats(attempts);
  const total = catalogue.sessions.reduce((n, s) => n + s.byPaper.reduce((m, b) => m + b.items.length, 0), 0);
  const forPaper = Object.entries(attempts).filter(([code]) => code.split("-")[2]?.startsWith(String(active)));
  const paperStats = attemptStats(Object.fromEntries(forPaper));

  return (
    <div className="space-y-8">
      <PageHeader title="Past papers" description={`Cambridge ${catalogue.code} papers. Tap a paper when you've done it and add your score — your teacher can see your practice.`} />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Papers done" value={`${stats.done} / ${total}`} />
        <StatTile label="Average score" value={stats.average === null ? "—" : `${stats.average}%`} />
        <StatTile label={`Paper ${active} done`} value={String(paperStats.done)} />
        <StatTile label="Last practised" value={stats.last ? stats.last.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"} />
      </motion.div>

      <div className="flex flex-wrap gap-2">
        {catalogue.papers.map((p) => (
          <button
            key={p.paper}
            type="button"
            onClick={() => setPaperNo(p.paper)}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", active === p.paper ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-line">
        {catalogue.sessions.map((s, i) => {
          const group = s.byPaper.find((b) => b.spec.paper === active)!;
          return (
            <motion.div
              key={`${s.year}-${s.session}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-b-0"
            >
              <p className="text-sm">
                <span className="font-medium">{sessionLabels[s.session]}</span> <span className="text-ink-soft">{s.year}</span>
              </p>
              <div className="flex gap-1.5">
                {group.items.map((p) => {
                  const a = attempts[p.code];
                  const score = a ? pct(a) : null;
                  return (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => setEditing({ paper: p, spec: group.spec })}
                      title={paperName(p)}
                      className={cn(
                        "inline-flex h-9 min-w-16 items-center justify-center gap-1 rounded-xl border px-2.5 text-xs font-medium tabular-nums transition-colors",
                        a ? tone(score) : "border-line text-ink-soft hover:border-ink hover:text-ink",
                      )}
                    >
                      {a ? score === null ? <Check className="size-3.5" aria-hidden /> : `${score}%` : null}
                      <span className={cn(a && "opacity-80")}>
                        {p.paper}
                        {p.variant}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="text-xs text-ink-faint">Paper numbers like 12 mean Paper 1, variant 2. Green 70%+, gold 50–69%, red below 50%.</p>

      <Drawer open={Boolean(editing)} title={editing ? paperName(editing.paper) : ""} onClose={() => setEditing(null)}>
        {editing && <AttemptForm key={editing.paper.code} uid={user.uid} paper={editing.paper} spec={editing.spec} attempt={attempts[editing.paper.code]} onDone={() => setEditing(null)} />}
      </Drawer>
    </div>
  );
}

function AttemptForm({ uid, paper, spec, attempt, onDone }: { uid: string; paper: PastPaper; spec: PaperSpec; attempt?: PaperAttempt; onDone: () => void }) {
  const [score, setScore] = useState(attempt?.score === null || attempt?.score === undefined ? "" : String(attempt.score));
  const [max, setMax] = useState(String(attempt?.max ?? spec.max));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function write(value: Record<string, unknown> | ReturnType<typeof deleteField>) {
    setSaving(true);
    setError("");
    try {
      await setDoc(doc(db(), "pastPapers", uid), { papers: { [paper.code]: value }, updatedAt: serverTimestamp() }, { merge: true });
      onDone();
    } catch {
      setError("Couldn't save — check your connection and try again.");
      setSaving(false);
    }
  }

  function save() {
    const m = Number(max);
    const s = score.trim() === "" ? null : Number(score);
    if (!Number.isFinite(m) || m <= 0) return setError("Enter the paper's total marks.");
    if (s !== null && (!Number.isFinite(s) || s < 0 || s > m)) return setError(`Your score should be between 0 and ${m}.`);
    write({ score: s, max: m, at: serverTimestamp() });
  }

  return (
    <div className={drawerFormClass}>
      <DrawerBody>
        <p className="text-sm text-ink-soft">{spec.label}</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Your score" hint="Optional">
            <input inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value.replace(/[^\d.]/g, ""))} className={adminInput} placeholder="e.g. 58" autoFocus />
          </Field>
          <Field label="Out of">
            <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} className={adminInput} />
          </Field>
        </div>
        <p className="text-xs text-ink-soft">Mark it yourself with the mark scheme, or leave the score empty to just tick it off.</p>
        <ErrorText message={error} />
      </DrawerBody>
      <DrawerFooter>
        {attempt ? (
          <GhostButton onClick={() => write(deleteField())} className="mr-auto text-ember hover:border-ember">
            <Trash2 className="size-4" /> Not done
          </GhostButton>
        ) : (
          <GhostButton onClick={onDone} className="mr-auto">
            Cancel
          </GhostButton>
        )}
        <PrimaryButton onClick={save} loading={saving}>
          <Check className="size-4" /> {attempt ? "Save" : "Mark as done"}
        </PrimaryButton>
      </DrawerFooter>
    </div>
  );
}
