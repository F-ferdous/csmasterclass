"use client";

import { AlertTriangle, CalendarClock, Pin } from "lucide-react";
import { categoryLabels, categoryStyles, formatWhen, type Announcement } from "@/lib/announcements";
import { cn } from "@/lib/utils";

/** How an announcement looks to students (also used as the admin preview). */
export function AnnouncementCard({
  announcement: a,
  isNew = false,
  audience,
  compact = false,
}: {
  announcement: Pick<Announcement, "title" | "body" | "category" | "priority" | "pinned" | "expiresOn" | "publishedAt" | "createdAt">;
  isNew?: boolean;
  /** Admin-only: who it's for. */
  audience?: string;
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-3xl border p-5 sm:p-6",
        a.priority === "urgent" ? "border-ember/50 bg-ember/[0.05]" : a.priority === "important" ? "border-gold/50 bg-gold/[0.06]" : "border-line bg-paper",
      )}
    >
      {a.priority !== "normal" && (
        <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", a.priority === "urgent" ? "bg-ember" : "bg-gold")} />
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={cn("rounded-full px-2.5 py-1 font-medium", categoryStyles[a.category])}>{categoryLabels[a.category]}</span>
        {a.priority !== "normal" && (
          <span className={cn("inline-flex items-center gap-1 font-medium", a.priority === "urgent" ? "text-ember" : "text-gold")}>
            <AlertTriangle className="size-3.5" aria-hidden /> {a.priority === "urgent" ? "Urgent" : "Important"}
          </span>
        )}
        {a.pinned && (
          <span className="inline-flex items-center gap-1 text-ink-soft">
            <Pin className="size-3.5" aria-hidden /> Pinned
          </span>
        )}
        {isNew && <span className="rounded-full bg-ember px-2 py-0.5 font-semibold text-white">New</span>}
        <span className="ml-auto text-ink-faint">{formatWhen(a.publishedAt ?? a.createdAt) || "Not published yet"}</span>
      </div>
      <h3 className={cn("mt-3 font-display leading-snug", compact ? "text-lg" : "text-xl sm:text-2xl")}>{a.title || "Untitled announcement"}</h3>
      {a.body && (
        <p className={cn("mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft", compact && "line-clamp-2")}>{a.body}</p>
      )}
      {(audience || a.expiresOn) && (
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-faint">
          {audience && <span>For: {audience}</span>}
          {a.expiresOn && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" aria-hidden /> Until {formatWhen(new Date(`${a.expiresOn}T00:00:00`))}
            </span>
          )}
        </p>
      )}
    </article>
  );
}
