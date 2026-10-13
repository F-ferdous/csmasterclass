import { StudentResources } from "@/components/dashboard/student-resources";

// Rendered only after sign-in (see app/dashboard/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function MaterialsPage() {
  return <StudentResources />;
}
