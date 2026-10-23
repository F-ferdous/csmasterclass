"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authErrorMessage, safeNext, signInAdmin } from "@/lib/auth";
import { useAuth } from "./auth-provider";
import { ErrorNote, Field, inputClass, NotConfiguredNote, PasswordInput, SubmitButton } from "./auth-ui";

/** Admin sign-in with Firebase Authentication (students sign in at /login). */
export function AdminLoginForm() {
  const router = useRouter();
  const nextParam = useSearchParams().get("next");
  const { user, loading, configured } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Signed in (or just signed in) → the admin dashboard, which also explains if this account isn't an admin.
  useEffect(() => {
    if (!loading && user) router.replace(nextParam?.startsWith("/admin") ? safeNext(nextParam, "/admin") : "/admin");
  }, [loading, user, nextParam, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await signInAdmin(String(data.get("email")), String(data.get("password")));
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="eyebrow">Admin</p>
      <h1 className="mt-3 font-display text-4xl sm:text-5xl">Admin sign in</h1>
      <p className="mt-3 text-ink-soft">
        For teachers and staff. Students sign in{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-4 hover:text-ember">
          here
        </Link>
        .
      </p>

      <div className="mt-8">
        {!configured ? (
          <NotConfiguredNote />
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <Field label="Email">
              <input name="email" type="email" required autoComplete="username" className={inputClass} placeholder="admin@example.com" />
            </Field>
            <Field
              label="Password"
              hint={
                <Link href="/forgot-password" className="font-medium text-ink underline-offset-4 hover:text-ember hover:underline">
                  Forgot password?
                </Link>
              }
            >
              <PasswordInput name="password" required autoComplete="current-password" placeholder="Your password" />
            </Field>
            <ErrorNote message={error} />
            <SubmitButton loading={busy}>Sign in</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
