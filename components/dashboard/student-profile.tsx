"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { motion } from "motion/react";
import { BadgeCheck, Check, LayoutDashboard, Loader2, LogOut, MailWarning } from "lucide-react";
import { useState, type FormEvent } from "react";
import { db } from "@/lib/firebase";
import { authErrorMessage, resendVerification, signOut, type Enrollment } from "@/lib/auth";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorNote, Field, inputClass } from "@/components/auth/auth-ui";
import { useCoaching } from "@/components/auth/use-locations";
import { EnrollmentPicker } from "@/components/auth/enrollment-picker";
import { requestSeat } from "@/lib/enrollments";
import { AppSettings } from "./app-install";
import { EnrollmentBadge } from "./enrollment-badge";
import { ease } from "@/components/motion/reveal";

export function StudentProfile() {
  const router = useRouter();
  const { user, profile, isAdmin } = useAuth();
  if (!user) return null; // the dashboard shell handles signed-out visitors

  const name = profile?.name || user.displayName || "Student";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const usesPassword = user.providerData.some((p) => p.providerId === "password");
  const realEmail = profile ? profile.email : user.email; // phone-only students sign in with a placeholder address

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
        <p className="mt-1 break-all text-sm opacity-75">{[realEmail, profile?.phone].filter(Boolean).join(" · ")}</p>
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-band-ink/20 px-3 py-1 text-xs capitalize">
          {profile?.role ?? "student"}
        </p>
        {profile?.batchId && (
          <div className="mt-4 rounded-2xl bg-paper p-3 text-ink">
            <EnrollmentBadge batchId={profile.batchId} detailed />
          </div>
        )}

        {realEmail && usesPassword && !user.emailVerified && <VerifyNotice />}
        {realEmail && user.emailVerified && (
          <p className="mt-6 flex items-center gap-2 text-sm opacity-90">
            <BadgeCheck className="size-4 text-band-accent" aria-hidden /> Email verified
          </p>
        )}

        <div className="mt-8 flex flex-col gap-2">
          {isAdmin && (
            <Link href="/admin" className="inline-flex items-center justify-center gap-2 rounded-full bg-band-accent px-5 py-3 text-sm font-semibold text-band">
              <LayoutDashboard className="size-4" aria-hidden /> Open admin dashboard
            </Link>
          )}
          <button
            type="button"
            onClick={() => signOut().then(() => router.replace("/"))}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-band-ink/25 px-5 py-3 text-sm hover:bg-band-ink hover:text-band"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      </motion.aside>

      <div className="space-y-8">
        <ProfileForm key={profile ? "loaded" : "empty"} />
        <AppSettings />
      </div>
    </div>
  );
}

function VerifyNotice() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  return (
    <div className="mt-6 rounded-2xl bg-band-ink/10 p-4 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <MailWarning className="size-4 text-band-accent" aria-hidden /> Please verify your email
      </p>
      <p className="mt-1 opacity-75">We sent a link when you signed up.</p>
      <button
        type="button"
        disabled={state !== "idle"}
        onClick={() => {
          setState("sending");
          resendVerification().finally(() => setState("sent"));
        }}
        className="mt-3 text-sm font-medium underline underline-offset-4 disabled:no-underline disabled:opacity-70"
      >
        {state === "sent" ? "Link sent — check your inbox" : state === "sending" ? "Sending…" : "Resend verification link"}
      </button>
    </div>
  );
}

function ProfileForm() {
  const { user, profile } = useAuth();
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
    if (!user) return;
    const data = new FormData(e.currentTarget);
    if (!enrollment.classLevel || !enrollment.locationId || !enrollment.batchId) return setError("Choose your class, centre and batch.");
    setState("saving");
    setError("");
    try {
      const name = String(data.get("name")).trim();
      const parentPhone = String(data.get("parentPhone")).trim();
      // Students can only change these two; class, centre and batch change when an admin confirms.
      await updateDoc(doc(db(), "users", user.uid), { name, parentPhone, updatedAt: serverTimestamp() });
      // A different batch is a request — the student stays in their current batch until it's confirmed.
      if (enrollment.batchId !== profile?.batchId) {
        await requestSeat({ uid: user.uid, name, email: profile?.email ?? "", phone: profile?.phone ?? "", ...enrollment }, "profile");
      }
      setState("saved");
      setTimeout(() => setState("idle"), 2500);
    } catch (err) {
      setError(authErrorMessage(err));
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
        <input name="name" required defaultValue={profile?.name ?? user?.displayName ?? ""} className={inputClass} />
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
