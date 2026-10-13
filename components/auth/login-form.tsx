"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authErrorMessage, safeNext, signIn } from "@/lib/auth";
import { useAuth } from "./auth-provider";
import { ErrorNote, Field, inputClass, NotConfiguredNote, PasswordInput, SubmitButton } from "./auth-ui";

export function LoginForm() {
  const router = useRouter();
  const nextParam = useSearchParams().get("next");
  const { user, loading: authLoading, configured, isAdmin } = useAuth();
  // An explicit ?next= wins; otherwise admins go to the admin dashboard and students to theirs.
  const next = nextParam ? safeNext(nextParam) : isAdmin ? "/admin" : "/dashboard";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Already signed in (or just signed in) → continue.
  useEffect(() => {
    if (!authLoading && user) router.replace(next);
  }, [authLoading, user, next, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await signIn(String(data.get("identifier")), String(data.get("password")));
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="eyebrow">Welcome back</p>
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
            <Field label="Email or mobile number">
              <input name="identifier" required autoComplete="username" className={inputClass} placeholder="you@example.com or 01XXXXXXXXX" />
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
