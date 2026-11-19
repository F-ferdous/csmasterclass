import { StudentQuizzes } from "@/components/dashboard/student-quizzes";

// Rendered only after sign-in (see app/dashboard/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function QuizzesPage() {
  return <StudentQuizzes />;
}
