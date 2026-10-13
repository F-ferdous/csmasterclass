import { StudentSchedule } from "@/components/dashboard/student-schedule";

// Rendered only after sign-in (see app/dashboard/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function SchedulePage() {
  return <StudentSchedule />;
}
