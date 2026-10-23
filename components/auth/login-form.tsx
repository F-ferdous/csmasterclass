"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authErrorMessage, safeNext, signInStudentAccount } from "@/lib/auth";
import { useAuth } from "./auth-provider";
import { useStudentSession } from "./student-session";
import { ErrorNote, Field, inputClass, NotConfiguredNote, SubmitButton } from "./auth-ui";

/** Student sign-in: email + mobile number (no Firebase Auth). Admins use /admin-login. */
export function LoginForm() {
  const router = useRouter();
  const nextParam = useSearchParams().get("next");
  const { user, loading: authLoading, configured, isAdmin } = useAuth();
  const { student, loading: studentLoading, refresh } = useStudentSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Already signed in (or just signed in) → continue to the student dashboard (or ?next=).
  // An admin who lands here goes to the admin dashboard.
  useEffect(() => {
    if (!studentLoading && student) router.replace(nextParam && !nextParam.startsWith("/admin") ? safeNext(nextParam) : "/dashboard");
    else if (!authLoading && user && isAdmin) router.replace("/admin");
  }, [authLoading, user, isAdmin, studentLoading, student, nextParam, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await signInStudentAccount(String(data.get("email")), String(data.get("phone")));
      refresh(); // the effect above then continues to the dashboard
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="eyebrow">Students</p>
      <h1 className="mt-3 font-display text-4xl sm:text-5xl">Sign in</h1>
      <p className="mt-3 text-ink-soft">
        New here?{" "}
        <Link href="/signup" className="font-medium text-ink underline underline-offset-4 hover:text-ember">
          Register for a batch
        </Link>
      </p>

      <div className="mt-8">
        {!configured ? (
          <NotConfiguredNote />
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <Field label="Email">
              <input name="email" type="email" required autoComplete="username" className={inputClass} placeholder="you@example.com" />
            </Field>
            <Field label="Password" hint="Your mobile number">
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                required
                autoComplete="current-password"
                className={inputClass}
                placeholder="01XXXXXXXXX"
              />
            </Field>
            <ErrorNote message={error} />
            <SubmitButton loading={busy}>Sign in</SubmitButton>
            <p className="text-center text-sm text-ink-soft">
              Use the email and mobile number you registered with. Trouble signing in?{" "}
              <Link href="/contact" className="font-medium text-ink underline underline-offset-4 hover:text-ember">
                Contact your teacher
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
