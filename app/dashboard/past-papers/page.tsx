import { StudentPastPapers } from "@/components/dashboard/student-past-papers";

// Rendered only after sign-in (see app/dashboard/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function PastPapersPage() {
  return <StudentPastPapers />;
}
