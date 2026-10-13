"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { authErrorMessage, safeNext, signInWithGoogle, signUpWithEmail, type Enrollment } from "@/lib/auth";
import { classLevels } from "@/lib/coaching";
import { isAdminEmail } from "@/lib/admins";
import type { ClassLevel } from "@/lib/types";
import { useAuth } from "./auth-provider";
import { Divider, ErrorNote, Field, GoogleButton, inputClass, NotConfiguredNote, PasswordInput, SubmitButton } from "./auth-ui";
import { EnrollmentPicker } from "./enrollment-picker";
import { useCoaching } from "./use-locations";

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next");
  const { user, loading: authLoading, configured, isAdmin } = useAuth();
  // An explicit ?next= wins; otherwise admins go to the admin dashboard and students to theirs.
  const next = nextParam ? safeNext(nextParam) : isAdmin ? "/admin" : "/dashboard";
  const coaching = useCoaching();

  // Pre-filled when arriving from a batch's "Join this batch" button.
  const initialClass = params.get("class");
  const [enrollment, setEnrollment] = useState<Enrollment>({
    classLevel: classLevels.includes(initialClass as ClassLevel) ? (initialClass as ClassLevel) : "",
    locationId: params.get("location") ?? "",
    batchId: params.get("batch") ?? "",
  });
  const [busy, setBusy] = useState<"" | "email" | "google">("");
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && user && !busy) router.replace(next);
  }, [authLoading, user, next, router, busy]);

  // Make sure the message is seen whichever button was pressed.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  /** Class, centre and batch are required for every new student. */
  function enrollmentError() {
    if (!enrollment.classLevel) return "Choose your class.";
    if (!enrollment.locationId) return "Choose your centre.";
    if (!enrollment.batchId) return "Choose a batch.";
    const batch = coaching.batches.find((b) => b.id === enrollment.batchId);
    if (!batch || batch.classLevel !== enrollment.classLevel || batch.locationId !== enrollment.locationId) return "Choose a batch for your class and centre.";
    if (batch.status === "full") return "That batch is full — please choose another.";
    return "";
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const missing = enrollmentError();
    if (missing) return setError(missing);
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password"));
    if (password !== String(data.get("confirm"))) return setError("The two passwords don't match.");
    if (password.length < 6) return setError("Choose a password with at least 6 characters.");

    setBusy("email");
    setError("");
    try {
      await signUpWithEmail({
        name: String(data.get("name")),
        email: String(data.get("email")),
        phone: String(data.get("phone") ?? ""),
        password,
        ...enrollment,
      });
      router.replace(next);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy("");
    }
  }

  async function google() {
    const missing = enrollmentError();
    if (missing) return setError(missing);
    setBusy("google");
    setError("");
    try {
      const signedIn = await signInWithGoogle(enrollment);
      router.replace(nextParam ? safeNext(nextParam) : isAdminEmail(signedIn.email) ? "/admin" : "/dashboard");
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy("");
    }
  }

  const ready = !enrollmentError();

  return (
    <div>
      <p className="eyebrow">Join CS Masterclass</p>
      <h1 className="mt-3 font-display text-4xl sm:text-5xl">Create your account</h1>
      <p className="mt-3 text-ink-soft">
        Already have one?{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-4 hover:text-ember">
          Sign in
        </Link>
      </p>

      <div className="mt-8">
        {!configured ? (
          <NotConfiguredNote />
        ) : (
          <form onSubmit={onSubmit} className="space-y-8">
            <EnrollmentPicker
              value={enrollment}
              onChange={(v) => {
                setEnrollment(v);
                setError("");
              }}
              {...coaching}
            />

            <fieldset className="space-y-5 border-t border-line pt-8">
              <legend className="sr-only">Your account</legend>
              <p className="text-sm font-medium">
                4. Your account{" "}
                {!ready && <span className="font-normal text-ink-soft">— finish steps 1–3 first</span>}
              </p>

              <div ref={errorRef}>
                <ErrorNote message={error} />
              </div>

              <GoogleButton onClick={google} loading={busy === "google"} label="Join with Google" />
              <Divider label="or with email" />

              <Field label="Full name">
                <input name="name" required autoComplete="name" className={inputClass} placeholder="Your name" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Email">
                  <input name="email" type="email" required autoComplete="email" className={inputClass} placeholder="you@example.com" />
                </Field>
                <Field label="Phone" hint="Optional">
                  <input name="phone" type="tel" autoComplete="tel" className={inputClass} placeholder="01XXXXXXXXX" />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Password">
                  <PasswordInput name="password" required minLength={6} autoComplete="new-password" placeholder="At least 6 characters" />
                </Field>
                <Field label="Confirm password">
                  <PasswordInput name="confirm" required minLength={6} autoComplete="new-password" placeholder="Repeat password" />
                </Field>
              </div>

              <SubmitButton loading={busy === "email"}>Create account</SubmitButton>
              <p className="text-center text-xs text-ink-soft">We&apos;ll send a link to verify your email address.</p>
            </fieldset>
          </form>
        )}
      </div>
    </div>
  );
}
