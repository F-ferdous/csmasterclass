"use client";

import { getMyResources } from "@/app/student-data";
import type { Resource } from "@/lib/resources";
import { useStudentData } from "./use-student-data";

/** Study materials meant for the signed-in student (their class, batch and centre), newest first. */
export function useMyResources(): Resource[] | null {
  return useStudentData("resources", getMyResources);
}
