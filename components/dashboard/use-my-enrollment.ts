"use client";

import { getMyEnrollment } from "@/app/student-data";
import type { EnrollmentRecord } from "@/lib/enrollments";
import { useStudentData } from "./use-student-data";

/** The signed-in student's most recent enrollment request. */
export function useMyEnrollment(): EnrollmentRecord | null {
  return useStudentData("enrollment", getMyEnrollment);
}
