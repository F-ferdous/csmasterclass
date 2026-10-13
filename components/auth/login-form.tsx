"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authErrorMessage, safeNext, signInWithEmail, signInWithGoogle } from "@/lib/auth";
import { useAuth } from "./auth-provider";
import { Divider, ErrorNote, Field, GoogleButton, inputClass, NotConfiguredNote, PasswordInput, SubmitButton } from "./auth-ui";

export function LoginForm() {
  const router = useRouter();
  const nextParam = useSearchParams().get("next");
  const { user, loading: authLoading, configured, isAdmin } = useAuth();
  // An explicit ?next= wins; otherwise admins go to the admin dashboard and students to theirs.
  const next = nextParam ? safeNext(nextParam) : isAdmin ? "/admin" : "/dashboard";
  const [busy, setBusy] = useState<"" | "email" | "google">("");
  const [error, setError] = useState("");

  // Already signed in (or just signed in) → continue.
  useEffect(() => {
    if (!authLoading && user) router.replace(next);
  }, [authLoading, user, next, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy("email");
    setError("");
    try {
      await signInWithEmail(String(data.get("email")), String(data.get("password")));
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy("");
    }
  }

  async function google() {
    setBusy("google");
    setError("");
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy("");
    }
  }

  return (
    <div>
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-3 font-display text-4xl sm:text-5xl">Sign in</h1>
      <p className="mt-3 text-ink-soft">
        New here?{" "}
        <Link href={`/signup${nextParam ? `?next=${encodeURIComponent(safeNext(nextParam))}` : ""}`} className="font-medium text-ink underline underline-offset-4 hover:text-ember">
          Join now
        </Link>
      </p>

      <div className="mt-8">
        {!configured ? (
          <NotConfiguredNote />
        ) : (
          <>
            <GoogleButton onClick={google} loading={busy === "google"} />
            <Divider label="or with email" />
            <form onSubmit={onSubmit} className="space-y-5">
              <Field label="Email">
                <input name="email" type="email" required autoComplete="email" className={inputClass} placeholder="you@example.com" />
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
              <SubmitButton loading={busy === "email"}>Sign in</SubmitButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
