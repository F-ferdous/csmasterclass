"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { registerStudent } from "@/app/student-actions";
import type { Enrollment } from "@/lib/auth";
import { classLevels } from "@/lib/coaching";
import type { ClassLevel } from "@/lib/types";
import { useAuth } from "./auth-provider";
import { useStudentSession } from "./student-session";
import { ErrorNote, Field, inputClass, NotConfiguredNote, PasswordInput, SubmitButton } from "./auth-ui";
import { EnrollmentPicker } from "./enrollment-picker";
import { useCoaching } from "./use-locations";

/**
 * Registration for a batch. Nothing is created in Firebase Auth here — the request waits in
 * Admin → Enrollments, and the student's login is created when an admin confirms the seat.
 */
export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading, configured, isAdmin } = useAuth();
  const { student } = useStudentSession();
  const coaching = useCoaching();

  // Pre-filled when arriving from a batch's "Join this batch" button.
  const initialClass = params.get("class");
  const [enrollment, setEnrollment] = useState<Enrollment>({
    classLevel: classLevels.includes(initialClass as ClassLevel) ? (initialClass as ClassLevel) : "",
    locationId: params.get("location") ?? "",
    batchId: params.get("batch") ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ name: string; identifier: string } | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Already signed in → this page isn't for you.
  useEffect(() => {
    if (student) router.replace("/dashboard");
    else if (!authLoading && user) router.replace(isAdmin ? "/admin" : "/");
  }, [authLoading, user, isAdmin, student, router]);

  // Make sure the message is seen.
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

    setBusy(true);
    setError("");
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const result = await registerStudent({ name, email, phone, parentPhone: String(data.get("parentPhone") ?? ""), password, ...enrollment }).catch(
      () => ({ ok: false as const, error: "Network error — check your connection and try again." }),
    );
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setDone({ name: name.split(" ")[0], identifier: email || phone });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <span className="grid size-14 place-items-center rounded-2xl bg-forest/15 text-forest">
          <CheckCircle2 className="size-7" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-4xl sm:text-5xl">Registration received{done.name ? `, ${done.name}` : ""}!</h1>
        <p className="mt-4 leading-relaxed text-ink-soft">
          Your teacher will review your request and confirm your seat in the batch. Once it&apos;s confirmed, sign in with{" "}
          <strong className="font-medium text-ink">{done.identifier}</strong> and the password you just chose.
        </p>
        <p className="mt-3 text-sm text-ink-soft">If you try to sign in before then, we&apos;ll tell you it&apos;s still waiting for confirmation.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-forest-ink hover:bg-ink hover:text-paper">
            Go to sign in
          </Link>
          <Link href="/teaching" className="rounded-full border border-line px-6 py-3.5 text-sm hover:border-ink">
            See the timetable
          </Link>
        </div>
      </motion.div>
    );
  }

  const ready = !enrollmentError();

  return (
    <div>
      <p className="eyebrow">Join CS Masterclass</p>
      <h1 className="mt-3 font-display text-4xl sm:text-5xl">Register for a batch</h1>
      <p className="mt-3 text-ink-soft">
        Already confirmed?{" "}
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
              <legend className="sr-only">Your details</legend>
              <p className="text-sm font-medium">
                4. Your details{" "}
                {!ready && <span className="font-normal text-ink-soft">— finish steps 1–3 first</span>}
              </p>

              <Field label="Full name">
                <input name="name" required autoComplete="name" className={inputClass} placeholder="Your name" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Mobile number" hint="You'll sign in with this">
                  <input name="phone" type="tel" required autoComplete="tel" className={inputClass} placeholder="01XXXXXXXXX" />
                </Field>
                <Field label="Email" hint="Optional">
                  <input name="email" type="email" autoComplete="email" className={inputClass} placeholder="you@example.com" />
                </Field>
              </div>
              <Field label="Parent's / guardian's phone" hint="Payment receipts are sent here">
                <input name="parentPhone" type="tel" className={inputClass} placeholder="01XXXXXXXXX" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Password">
                  <PasswordInput name="password" required minLength={6} autoComplete="new-password" placeholder="At least 6 characters" />
                </Field>
                <Field label="Confirm password">
                  <PasswordInput name="confirm" required minLength={6} autoComplete="new-password" placeholder="Repeat password" />
                </Field>
              </div>

              <div ref={errorRef}>
                <ErrorNote message={error} />
              </div>
              <SubmitButton loading={busy}>Send registration</SubmitButton>
              <p className="text-center text-xs text-ink-soft">
                Your teacher confirms your seat first — then you can sign in with your mobile number or email.
              </p>
            </fieldset>
          </form>
        )}
      </div>
    </div>
  );
}
