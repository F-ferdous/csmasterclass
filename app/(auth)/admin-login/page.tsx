import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/auth/admin-login-form";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
