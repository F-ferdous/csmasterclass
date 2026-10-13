"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, MapPin } from "lucide-react";
import { classLabels, classLevels, groupSessions, statusLabels } from "@/lib/coaching";
import type { Enrollment } from "@/lib/auth";
import type { Batch, ClassLevel, Location } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  value: Enrollment;
  onChange: (next: Enrollment) => void;
  locations: Location[];
  batches: Batch[];
  loading: boolean;
  /** Admins may place a student in a full batch. */
  allowFull?: boolean;
};

/** Required Class → Centre → Batch selection, shared by Join now and the dashboard Profile page. */
export function EnrollmentPicker({ value, onChange, locations, batches, loading, allowFull = false }: Props) {
  // Picking a different class or centre clears a batch that no longer matches.
  const set = (patch: Partial<Enrollment>) => {
    const next = { ...value, ...patch };
    const batch = batches.find((b) => b.id === next.batchId);
    if (batch && (batch.classLevel !== next.classLevel || batch.locationId !== next.locationId)) next.batchId = "";
    onChange(next);
  };

  const options = batches.filter((b) => b.classLevel === value.classLevel && b.locationId === value.locationId);

  return (
    <div className="space-y-6">
      <Step n={1} title="Your class" done={Boolean(value.classLevel)}>
        <div className="grid grid-cols-4 gap-2">
          {classLevels.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={value.classLevel === c}
              onClick={() => set({ classLevel: c as ClassLevel })}
              className={cn(
                "rounded-2xl border px-2 py-3 text-center transition-colors",
                value.classLevel === c ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
              )}
            >
              <span className="block text-lg font-medium leading-none">{c}</span>
              <span className={cn("mt-1 block text-[10px]", value.classLevel === c ? "opacity-70" : "text-ink-soft")}>
                {classLabels[c].split(" / ")[0]}
              </span>
            </button>
          ))}
        </div>
      </Step>

      <Step n={2} title="Centre" done={Boolean(value.locationId)}>
        <div className="grid gap-2 sm:grid-cols-2">
          {locations.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={value.locationId === l.id}
              onClick={() => set({ locationId: l.id })}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                value.locationId === l.id ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
              )}
            >
              <MapPin className={cn("size-4 shrink-0", value.locationId === l.id ? "opacity-80" : "text-ember")} aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{l.name}</span>
                {l.area && <span className={cn("block truncate text-xs", value.locationId === l.id ? "opacity-70" : "text-ink-soft")}>{l.area}</span>}
              </span>
            </button>
          ))}
        </div>
      </Step>

      <Step n={3} title="Batch" done={Boolean(value.batchId)}>
        {!value.classLevel || !value.locationId ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-ink-soft">Choose your class and centre to see the batches.</p>
        ) : loading ? (
          <p className="flex items-center gap-2 px-1 py-3 text-sm text-ink-soft">
            <Loader2 className="size-4 animate-spin" /> Loading batches…
          </p>
        ) : options.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-ink-soft">
            No batches for Class {value.classLevel} at this centre yet. Try the other centre, or{" "}
            <Link href="/contact" className="font-medium text-ink underline underline-offset-4">
              ask about upcoming batches
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-2" role="radiogroup" aria-label="Batch">
            <AnimatePresence initial={false}>
              {options.map((b) => {
                const selected = value.batchId === b.id;
                const full = b.status === "full" && !allowFull;
                return (
                  <motion.button
                    key={b.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={full}
                    onClick={() => set({ batchId: b.id })}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      selected ? "border-ink bg-paper-2" : "border-line hover:border-ink",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                        selected ? "border-ink bg-ink text-paper" : "border-line",
                      )}
                    >
                      {selected && <Check className="size-3" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{b.name}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px]", b.status === "full" ? "bg-ember/15 text-ember" : "bg-forest/15 text-forest")}>
                          {statusLabels[b.status]}
                        </span>
                      </span>
                      <span className="mt-1.5 grid gap-0.5 text-xs text-ink-soft">
                        {groupSessions(b.sessions).map((g) => (
                          <span key={g.days}>
                            <span className="text-ink">{g.days}</span> · {g.time}
                          </span>
                        ))}
                        <span>{b.board === "Both" ? "Cambridge & Edexcel" : b.board}</span>
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </Step>
    </div>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2.5 flex items-center gap-2 text-sm font-medium">
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full text-xs transition-colors",
            done ? "bg-forest text-forest-ink" : "border border-line text-ink-soft",
          )}
        >
          {done ? <Check className="size-3.5" aria-hidden /> : n}
        </span>
        {title} <span className="text-ember">*</span>
      </legend>
      {children}
    </fieldset>
  );
}
