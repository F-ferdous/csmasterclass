import { StudentBooks } from "@/components/dashboard/student-books";

// Rendered only after sign-in (see app/dashboard/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function DashboardBooksPage() {
  return <StudentBooks />;
}
