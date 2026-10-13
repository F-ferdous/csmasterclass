import { StudentPayments } from "@/components/dashboard/student-payments";

// Rendered only after sign-in (see app/dashboard/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function PaymentsPage() {
  return <StudentPayments />;
}
