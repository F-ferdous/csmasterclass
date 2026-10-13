import { activeStatuses, type EnrollmentRecord } from "./enrollments";
import type { Batch, UserProfile } from "./types";

/**
 * Students who count as "in" a batch: it's on their profile and their seat is confirmed —
 * or they predate enrollments and have no open request at all. Pending/waitlisted are excluded.
 */
export function rosterFor(batch: Pick<Batch, "id">, users: UserProfile[], enrollments: EnrollmentRecord[]) {
  return users
    .filter((u) => u.batchId === batch.id)
    .filter((u) => {
      const open = enrollments.filter((e) => e.uid === u.uid && activeStatuses.includes(e.status));
      return open.length === 0 || open.some((e) => e.batchId === batch.id && e.status === "confirmed");
    })
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
}
