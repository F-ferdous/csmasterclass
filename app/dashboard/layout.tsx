import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StudentShell } from "@/components/dashboard/student-shell";

/** Rendered only after a student signs in, so skip instant-navigation validation. */
export const instant = false;

export const metadata: Metadata = {
  title: "My dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
