"use client";

import { motion } from "motion/react";
import { FolderOpen, Search } from "lucide-react";
import { useState } from "react";
import { adminInput, EmptyState, PageHeader, Spinner } from "@/components/admin/ui";
import { ease } from "@/components/motion/reveal";
import { kindPlural, resourceKinds, type ResourceKind } from "@/lib/resources";
import { cn } from "@/lib/utils";
import { ResourceCard } from "./resource-card";
import { useMyResources } from "./use-resources";

export function StudentResources() {
  const list = useMyResources();
  const [kind, setKind] = useState<ResourceKind | "all">("all");
  const [search, setSearch] = useState("");

  if (list === null) return <Spinner />;

  const used = resourceKinds.filter((k) => list.some((r) => r.kind === k));
  const q = search.trim().toLowerCase();
  const visible = list.filter((r) => (kind === "all" || r.kind === kind) && (!q || `${r.title} ${r.description}`.toLowerCase().includes(q)));

  return (
    <div className="space-y-6">
      <PageHeader title="Study materials" description="Notes, worksheets, past papers and videos from your teacher, for your class and batch." />

      {list.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {used.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {(["all", ...used] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", kind === k ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}
                >
                  {k === "all" ? "All" : kindPlural[k]}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}
          {list.length > 6 && (
            <label className="relative sm:w-72">
              <span className="sr-only">Search materials</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search materials" className={cn(adminInput, "pl-10")} />
            </label>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-6" />}
          title={list.length ? "No matches" : "No materials yet"}
          body={list.length ? "Try another type or search." : "When your teacher shares notes, worksheets or videos for your class or batch, they'll appear here."}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((r, i) => (
            <motion.div key={r.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.4), ease }}>
              <ResourceCard resource={r} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
