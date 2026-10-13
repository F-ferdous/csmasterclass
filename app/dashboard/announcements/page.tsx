import { StudentAnnouncements } from "@/components/dashboard/student-announcements";

// Rendered only after sign-in (see app/dashboard/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function AnnouncementsPage() {
  return <StudentAnnouncements />;
}
