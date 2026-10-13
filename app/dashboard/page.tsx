import { StudentOverview } from "@/components/dashboard/student-overview";

// Rendered only after sign-in (see app/dashboard/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function DashboardPage() {
  return <StudentOverview />;
}
