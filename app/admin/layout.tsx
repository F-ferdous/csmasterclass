import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/shell";

/**
 * The dashboard is rendered only after the browser confirms an admin is signed in,
 * so its pages can't be part of the prerendered shell. Opt this segment out of
 * instant-navigation validation (it's expected to wait for sign-in).
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
  // Installs as the separate admin app (app/admin.webmanifest/route.ts), not the student one.
  manifest: "/admin.webmanifest",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
