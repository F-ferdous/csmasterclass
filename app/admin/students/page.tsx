import { Suspense } from "react";
import { StudentsManager } from "@/components/admin/students-manager";
import { Spinner } from "@/components/admin/ui";

// Rendered only after an admin signs in (see app/admin/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function AdminStudentsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <StudentsManager />
    </Suspense>
  );
}
