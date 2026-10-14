"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, KeyRound, Loader2, LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { changeMyPassword } from "@/app/student-actions";
import { requestBatchChange, updateMyProfile } from "@/app/student-data";
import { signOut, type Enrollment } from "@/lib/auth";
import { useStudentSession } from "@/components/auth/student-session";
import { ErrorNote, Field, inputClass, PasswordInput } from "@/components/auth/auth-ui";
import { useCoaching } from "@/components/auth/use-locations";
import { EnrollmentPicker } from "@/components/auth/enrollment-picker";
import { refreshStudentData } from "./use-student-data";
import { AppSettings } from "./app-install";
import { EnrollmentBadge } from "./enrollment-badge";
import { ease } from "@/components/motion/reveal";

export function StudentProfile() {
  const router = useRouter();
  const { student: profile, refresh } = useStudentSession();
  if (!profile) return null; // the dashboard shell handles signed-out visitors

  const name = profile.name || "Student";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <motion.aside
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
        className="h-fit rounded-[2rem] bg-band p-8 text-band-ink"
      >
        <span className="grid size-16 place-items-center rounded-2xl bg-band-accent text-2xl font-medium text-band">{initials}</span>
        <h2 className="mt-6 font-display text-3xl">{name}</h2>
        <p className="mt-1 break-all text-sm opacity-75">{[profile.email, profile.phone].filter(Boolean).join(" · ")}</p>
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-band-ink/20 px-3 py-1 text-xs">Student</p>
        {profile.batchId && (
          <div className="mt-4 rounded-2xl bg-paper p-3 text-ink">
            <EnrollmentBadge batchId={profile.batchId} detailed />
          </div>
        )}

        <div className="mt-8 flex flex-col gap-2">
          <button
            type="button"
            onClick={() =>
              signOut().then(() => {
                refresh();
                router.replace("/");
              })
            }
            className="inline-flex items-center justify-center gap-2 rounded-full border border-band-ink/25 px-5 py-3 text-sm hover:bg-band-ink hover:text-band"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      </motion.aside>

      <div className="space-y-8">
        <ProfileForm key={profile.uid} />
        <PasswordForm />
        <AppSettings />
      </div>
    </div>
  );
}

function ProfileForm() {
  const { student: profile, refresh } = useStudentSession();
  const coaching = useCoaching();
  const [enrollment, setEnrollment] = useState<Enrollment>({
    classLevel: profile?.classLevel ?? "",
    locationId: profile?.locationId ?? "",
    batchId: profile?.batchId ?? "",
  });
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    const data = new FormData(e.currentTarget);
    if (!enrollment.classLevel || !enrollment.locationId || !enrollment.batchId) return setError("Choose your class, centre and batch.");
    setState("saving");
    setError("");
    try {
      // Students can only change these two; class, centre and batch change when an admin confirms.
      const saved = await updateMyProfile({ name: String(data.get("name")), parentPhone: String(data.get("parentPhone")) });
      // A different batch is a request — the student stays in their current batch until it's confirmed.
      const moved = saved.ok && enrollment.batchId !== profile.batchId ? await requestBatchChange(enrollment) : saved;
      if (!moved.ok) {
        setError(moved.error);
        setState("idle");
        return;
      }
      refresh();
      refreshStudentData("enrollment");
      setState("saved");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setError("Couldn't save — check your connection and try again.");
      setState("idle");
    }
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.1, ease }}
      className="space-y-6 rounded-[2rem] border border-line p-6 sm:p-10"
    >
      <div>
        <h2 className="font-display text-2xl">Your details</h2>
        <p className="mt-1 text-sm text-ink-soft">Used for batch enquiries and updates about new books.</p>
      </div>
      <Field label="Full name">
        <input name="name" required defaultValue={profile?.name ?? ""} className={inputClass} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Mobile number" hint="Ask your teacher to change it">
          <input value={profile?.phone ?? ""} readOnly className={`${inputClass} bg-paper-2 text-ink-soft`} placeholder="—" />
        </Field>
        <Field label="Parent's / guardian's phone">
          <input name="parentPhone" type="tel" defaultValue={profile?.parentPhone ?? ""} className={inputClass} placeholder="01XXXXXXXXX" />
        </Field>
      </div>
      <div className="border-t border-line pt-6">
        <EnrollmentPicker value={enrollment} onChange={setEnrollment} {...coaching} />
        {enrollment.batchId !== (profile?.batchId ?? "") && (
          <p className="mt-3 text-sm text-ink-soft">Saving sends a request to change batch. You stay in your current batch until your teacher confirms it.</p>
        )}
      </div>
      <ErrorNote message={error} />
      <button
        type="submit"
        disabled={state === "saving" || !profile}
        className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-forest-ink hover:bg-ink hover:text-paper disabled:opacity-60"
      >
        {state === "saving" ? <Loader2 className="size-4 animate-spin" /> : state === "saved" ? <Check className="size-4" /> : null}
        {state === "saved" ? "Saved" : "Save changes"}
      </button>
    </motion.form>
  );
}

/** Change password — signs out the student's other devices. */
function PasswordForm() {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const next = String(data.get("next"));
    if (next !== String(data.get("confirm"))) return setError("The new passwords don't match.");
    setState("saving");
    setError("");
    try {
      const result = await changeMyPassword(String(data.get("current")), next);
      if (!result.ok) {
        setError(result.error);
        setState("idle");
        return;
      }
      form.reset();
      setState("saved");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setError("Couldn't change your password — try again.");
      setState("idle");
    }
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease }}
      className="space-y-6 rounded-[2rem] border border-line p-6 sm:p-10"
    >
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <KeyRound className="size-5 text-ember" aria-hidden /> Password
        </h2>
        <p className="mt-1 text-sm text-ink-soft">Changing it signs you out on your other devices. Forgot it? Ask your teacher to set a new one.</p>
      </div>
      <Field label="Current password">
        <PasswordInput name="current" required autoComplete="current-password" />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="New password">
          <PasswordInput name="next" required minLength={6} autoComplete="new-password" />
        </Field>
        <Field label="Repeat new password">
          <PasswordInput name="confirm" required minLength={6} autoComplete="new-password" />
        </Field>
      </div>
      <ErrorNote message={error} />
      <button
        type="submit"
        disabled={state === "saving"}
        className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3.5 text-sm font-semibold hover:border-ink disabled:opacity-60"
      >
        {state === "saving" ? <Loader2 className="size-4 animate-spin" /> : state === "saved" ? <Check className="size-4" /> : null}
        {state === "saved" ? "Password changed" : "Change password"}
      </button>
    </motion.form>
  );
}
