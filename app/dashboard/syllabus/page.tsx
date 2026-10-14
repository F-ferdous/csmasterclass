import { StudentSyllabus } from "@/components/dashboard/student-syllabus";

// Rendered only after sign-in (see app/dashboard/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function SyllabusPage() {
  return <StudentSyllabus />;
}
