import { PageHeader } from "@/components/admin/ui";
import { StudentProfile } from "@/components/dashboard/student-profile";

// Rendered only after sign-in (see app/dashboard/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Profile" description="Your details, class, centre and batch." />
      <StudentProfile />
    </div>
  );
}
