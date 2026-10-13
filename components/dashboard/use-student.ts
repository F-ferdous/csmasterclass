"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useCoaching } from "@/components/auth/use-locations";

/** The signed-in student's profile with their batch and centre resolved. */
export function useStudent() {
  const { user, profile } = useAuth();
  const { locations, batches, loading } = useCoaching();
  const batch = batches.find((b) => b.id === profile?.batchId) ?? null;
  const location = locations.find((l) => l.id === (batch?.locationId || profile?.locationId)) ?? null;
  return { user, profile, batch, location, loading };
}
