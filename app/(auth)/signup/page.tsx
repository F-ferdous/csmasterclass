import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Register for a Computer Science Batch",
  description: "Register for an O Level / IGCSE or A Level Computer Science batch at Mirpur Academia or Uttara QED, Dhaka — choose your class, centre and batch.",
  path: "/signup",
});

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
