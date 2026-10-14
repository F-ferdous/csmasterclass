import { StudentProgress } from "@/components/dashboard/student-progress";

// Rendered only after sign-in (see app/dashboard/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function ProgressPage() {
  return <StudentProgress />;
}
