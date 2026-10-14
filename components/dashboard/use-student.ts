"use client";

import { useCoaching } from "@/components/auth/use-locations";
import { useStudentSession } from "@/components/auth/student-session";

/** The signed-in student's profile with their batch and centre resolved. */
export function useStudent() {
  const { student: profile, loading: sessionLoading } = useStudentSession();
  const { locations, batches, loading } = useCoaching();
  const batch = batches.find((b) => b.id === profile?.batchId) ?? null;
  const location = locations.find((l) => l.id === (batch?.locationId || profile?.locationId)) ?? null;
  return { profile, batch, location, loading: loading || sessionLoading };
}
