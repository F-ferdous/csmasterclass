import { StudentHomework } from "@/components/dashboard/student-homework";

// Rendered only after sign-in (see app/dashboard/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function HomeworkPage() {
  return <StudentHomework />;
}
