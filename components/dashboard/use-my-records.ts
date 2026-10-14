"use client";

import { getMyAttendance, getMyPastPapers, getMyResults, getMySyllabus } from "@/app/student-data";
import type { MyAttendanceEntry } from "@/lib/attendance";
import type { PaperAttempt } from "@/lib/past-papers";
import type { TopicProgress } from "@/lib/syllabus";
import type { MyResult } from "@/lib/tests";
import { useStudentData } from "./use-student-data";

// The student's own per-student documents (attendance, results, revision trackers).
export const useMyAttendance = (): MyAttendanceEntry[] | null => useStudentData("attendance", getMyAttendance);
export const useMyResults = (): MyResult[] | null => useStudentData("results", getMyResults);
export const useMySyllabus = (): Record<string, TopicProgress> | null => useStudentData("syllabus", getMySyllabus);
export const useMyPastPapers = (): Record<string, PaperAttempt> | null => useStudentData("pastPapers", getMyPastPapers);
