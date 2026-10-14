"use client";

import { getMyHomework } from "@/app/student-data";
import type { Homework, Submission } from "@/lib/homework";
import { useStudentData } from "./use-student-data";

export type MyHomework = { homework: Homework; submission: Submission | null };

/** Homework set for the signed-in student's batch, each with their own submission. */
export function useMyHomework(): MyHomework[] | null {
  return useStudentData("homework", getMyHomework);
}
