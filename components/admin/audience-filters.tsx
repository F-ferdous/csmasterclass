"use client";

import { X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { reaches, type Announcement } from "@/lib/announcements";
import { classLevels } from "@/lib/coaching";
import type { Batch, ClassLevel, Location, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminInput } from "./ui";

type Profile = Pick<UserProfile, "classLevel" | "batchId" | "locationId">;

/**
 * Class / centre / batch filters for admin lists. Items set for batches (tests, homework) match when one
 * of their batches is in the selection; targeted items (announcements) match when students in the
 * selection would see them.
 */
export function useAudienceFilters(batches: Batch[]) {
  const [classLevel, setClassLevel] = useState<ClassLevel | "all">("all");
  const [locationId, setLocationId] = useState("all");
  const [batchId, setBatchId] = useState("all");

  const active = classLevel !== "all" || locationId !== "all" || batchId !== "all";
  const inRange = (b: Batch, withBatch = true) =>
    (classLevel === "all" || b.classLevel === classLevel) &&
    (locationId === "all" || b.locationId === locationId) &&
    (!withBatch || batchId === "all" || b.id === batchId);
  const selected = new Set(batches.filter((b) => inRange(b)).map((b) => b.id));
  const batchOptions = batches.filter((b) => inRange(b, false));

  // One "student profile" per batch in range, plus the class / centre on its own (no batch picked).
  const profiles: Profile[] = [
    ...batches.filter((b) => inRange(b)).map((b) => ({ classLevel: b.classLevel, batchId: b.id, locationId: b.locationId })),
    ...(batchId === "all" ? [{ classLevel: classLevel === "all" ? "" : classLevel, batchId: "", locationId: locationId === "all" ? "" : locationId } as Profile] : []),
  ];

  return {
    classLevel,
    locationId,
    batchId,
    active,
    batchOptions,
    setClass(v: ClassLevel | "all") {
      setClassLevel(v);
      setBatchId("all");
    },
    setLocation(v: string) {
      setLocationId(v);
      setBatchId("all");
    },
    setBatch: setBatchId,
    clear() {
      setClassLevel("all");
      setLocationId("all");
      setBatchId("all");
    },
    /** For items set for batches: true when any of them is in the selection. */
    matchesBatches: (ids: string[]) => !active || ids.some((id) => selected.has(id)),
    /** For targeted items: true when students in the selection would see it. */
    reachesSelection: (a: Pick<Announcement, "audienceType" | "audienceValues">) => !active || profiles.some((p) => reaches(a, p)),
  };
}

export type AudienceFilterState = ReturnType<typeof useAudienceFilters>;

export function AudienceFilters({
  f,
  locations,
  batchLabel,
  extra,
  className,
}: {
  f: AudienceFilterState;
  locations: Location[];
  batchLabel?: (b: Batch) => string;
  /** Optional fourth control (e.g. a checkbox) placed after the three selects. */
  extra?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-3", extra && "sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-center", className)}>
      <select aria-label="Class" value={f.classLevel} onChange={(e) => f.setClass(e.target.value as ClassLevel | "all")} className={adminInput}>
        <option value="all">All classes</option>
        {classLevels.map((c) => (
          <option key={c} value={c}>
            Class {c}
          </option>
        ))}
      </select>
      <select aria-label="Centre" value={f.locationId} onChange={(e) => f.setLocation(e.target.value)} className={adminInput}>
        <option value="all">All centres</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <select aria-label="Batch" value={f.batchId} onChange={(e) => f.setBatch(e.target.value)} className={adminInput}>
        <option value="all">All batches</option>
        {f.batchOptions.map((b) => (
          <option key={b.id} value={b.id}>
            {batchLabel ? batchLabel(b) : `Class ${b.classLevel} · ${b.name}`}
          </option>
        ))}
      </select>
      {extra}
    </div>
  );
}

/** "Showing 3 of 12 · Clear filters" line, shown only while a filter is on. */
export function FilterSummary({ shown, total, note, onClear }: { shown: number; total: number; note?: string; onClear: () => void }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
      <span>
        Showing {shown} of {total}
        {note ? ` — ${note}` : ""}
      </span>
      <button type="button" onClick={onClear} className="inline-flex items-center gap-1 text-ink underline-offset-4 hover:underline">
        <X className="size-3.5" aria-hidden /> Clear filters
      </button>
    </p>
  );
}
