"use client";

import { Users } from "lucide-react";
import type { AudienceType } from "@/lib/announcements";
import { classLevels } from "@/lib/coaching";
import type { Batch, Location } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Field, Segmented } from "./ui";

export const audienceTypes: AudienceType[] = ["all", "class", "batch", "location"];
export const audienceTypeLabels: Record<AudienceType, string> = { all: "Everyone", class: "Classes", batch: "Batches", location: "Centres" };

export type Audience = { audienceType: AudienceType; audienceValues: string[] };

/** "Class 9, Class 10", "Morning batch (Class 10)", "Mirpur Academia"… */
export function audienceText(a: Audience, batchById: Map<string, Batch>, locationById: Map<string, Location>) {
  if (a.audienceType === "all") return "Everyone";
  if (!a.audienceValues.length) return "No one selected";
  if (a.audienceType === "class") return a.audienceValues.map((c) => `Class ${c}`).join(", ");
  if (a.audienceType === "batch")
    return a.audienceValues.map((id) => (batchById.get(id) ? `${batchById.get(id)!.name} (Class ${batchById.get(id)!.classLevel})` : "Deleted batch")).join(", ");
  return a.audienceValues.map((id) => locationById.get(id)?.name ?? "Deleted centre").join(", ");
}

/** Error text when a targeted audience has nothing ticked, else "". */
export function audienceError(a: Audience) {
  return a.audienceType !== "all" && a.audienceValues.length === 0
    ? `Choose at least one ${audienceTypeLabels[a.audienceType].toLowerCase().replace(/s$/, "")}.`
    : "";
}

/** Everyone / classes / batches / centres, with the matching options as toggle chips. */
export function AudiencePicker({
  value,
  onChange,
  batches,
  locations,
  reach,
  label = "Who should see it?",
}: {
  value: Audience;
  onChange: (next: Audience) => void;
  batches: Batch[];
  locations: Location[];
  /** Students it reaches right now. */
  reach: number;
  label?: string;
}) {
  const options: { value: string; label: string; hint?: string }[] =
    value.audienceType === "class"
      ? classLevels.map((c) => ({ value: c, label: `Class ${c}` }))
      : value.audienceType === "batch"
        ? batches.filter((b) => b.status !== "closed").map((b) => ({ value: b.id, label: b.name, hint: `Class ${b.classLevel}` }))
        : value.audienceType === "location"
          ? locations.map((l) => ({ value: l.id, label: l.name, hint: l.area }))
          : [];

  const toggle = (v: string) =>
    onChange({
      ...value,
      audienceValues: value.audienceValues.includes(v) ? value.audienceValues.filter((x) => x !== v) : [...value.audienceValues, v],
    });

  return (
    <div className="rounded-2xl border border-line p-4">
      <Field label={label}>
        <Segmented
          options={audienceTypes}
          value={value.audienceType}
          onChange={(t) => onChange({ audienceType: t, audienceValues: [] })}
          render={(t) => audienceTypeLabels[t]}
        />
      </Field>
      {options.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {options.map((o) => {
            const on = value.audienceValues.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(o.value)}
                className={cn("rounded-xl border px-3 py-2 text-left text-sm transition-colors", on ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}
              >
                {o.label}
                {o.hint && <span className={cn("block text-[11px]", on ? "opacity-70" : "text-ink-faint")}>{o.hint}</span>}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
        <Users className="size-3.5" aria-hidden /> Reaches {reach} student{reach === 1 ? "" : "s"} right now
      </p>
    </div>
  );
}
