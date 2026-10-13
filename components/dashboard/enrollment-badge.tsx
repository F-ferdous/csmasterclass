"use client";

import { CheckCircle2, Clock3, ListOrdered, XCircle } from "lucide-react";
import { enrollmentStatusLabels, enrollmentStatusStyles, type EnrollmentStatus } from "@/lib/enrollments";
import { cn } from "@/lib/utils";
import { useMyEnrollment } from "./use-my-enrollment";

const icons: Record<EnrollmentStatus, typeof Clock3> = {
  pending: Clock3,
  confirmed: CheckCircle2,
  waitlisted: ListOrdered,
  rejected: XCircle,
  cancelled: XCircle,
};

const help: Record<EnrollmentStatus, string> = {
  pending: "Your teacher will confirm your seat soon.",
  confirmed: "Your seat in this batch is confirmed.",
  waitlisted: "You're on the waiting list — we'll confirm as soon as a seat opens.",
  rejected: "This request wasn't accepted. Please choose another batch in your profile.",
  cancelled: "This request was cancelled.",
};

/** Seat status for the student's current batch request. */
export function EnrollmentBadge({ batchId, detailed = false }: { batchId?: string; detailed?: boolean }) {
  const latest = useMyEnrollment();
  if (!latest || (batchId && latest.batchId !== batchId && latest.status !== "rejected")) return null;
  const Icon = icons[latest.status];
  return (
    <div className={cn(detailed && "space-y-1.5")}>
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", enrollmentStatusStyles[latest.status])}>
        <Icon className="size-3.5" aria-hidden /> {enrollmentStatusLabels[latest.status]}
      </span>
      {detailed && (
        <p className="text-xs opacity-80">
          {help[latest.status]}
          {latest.note && <span className="mt-1 block italic">“{latest.note}”</span>}
        </p>
      )}
    </div>
  );
}
