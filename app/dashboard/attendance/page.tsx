import { StudentAttendance } from "@/components/dashboard/student-attendance";

// Rendered only after sign-in (see app/dashboard/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function AttendancePage() {
  return <StudentAttendance />;
}
