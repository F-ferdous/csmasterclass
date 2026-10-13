"use client";

import { motion } from "motion/react";
import { Megaphone } from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader, Spinner } from "@/components/admin/ui";
import { categories, categoryLabels, type AnnouncementCategory } from "@/lib/announcements";
import { cn } from "@/lib/utils";
import { ease } from "@/components/motion/reveal";
import { AnnouncementCard } from "./announcement-card";
import { isNewSince, useMyAnnouncements, useSeenCutoff } from "./use-announcements";

export function StudentAnnouncements() {
  const list = useMyAnnouncements();
  const cutoff = useSeenCutoff(true);
  const [filter, setFilter] = useState<AnnouncementCategory | "all">("all");

  if (list === null) return <Spinner />;

  const used = categories.filter((c) => list.some((a) => a.category === c));
  const visible = filter === "all" ? list : list.filter((a) => a.category === filter);

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Notices from your teacher — schedule changes, exams and results." />

      {used.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {(["all", ...used] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                filter === c ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
              )}
            >
              {c === "all" ? "All" : categoryLabels[c]}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState icon={<Megaphone className="size-6" />} title="No announcements" body="When your teacher posts a notice for your class or batch, it'll appear here." />
      ) : (
        <div className="grid gap-4">
          {visible.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.4), ease }}>
              <AnnouncementCard announcement={a} isNew={isNewSince(a, cutoff)} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
