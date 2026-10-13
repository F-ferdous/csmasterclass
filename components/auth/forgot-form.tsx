"use client";

import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { authErrorMessage, resetPassword } from "@/lib/auth";
import { useAuth } from "./auth-provider";
import { ErrorNote, Field, inputClass, NotConfiguredNote, SubmitButton } from "./auth-ui";

export function ForgotForm() {
  const { configured } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("loading");
    setError("");
    try {
      await resetPassword(email);
      setState("sent");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      // Don't reveal whether an account exists.
      if (code === "auth/user-not-found") return setState("sent");
      setError(authErrorMessage(err));
      setState("idle");
    }
  }

  return (
    <div>
      <Link href="/login" className="group inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" aria-hidden /> Back to sign in
      </Link>

      {state === "sent" ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-10" role="status">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            className="grid size-14 place-items-center rounded-2xl bg-forest text-forest-ink"
          >
            <MailCheck className="size-6" aria-hidden />
          </motion.span>
          <h1 className="mt-6 font-display text-4xl">Check your inbox</h1>
          <p className="mt-3 leading-relaxed text-ink-soft">
            If an account exists for <strong className="font-medium text-ink">{email}</strong>, we&apos;ve sent a link to reset your
            password. It may take a minute — check your spam folder too.
          </p>
          <button type="button" onClick={() => setState("idle")} className="mt-8 text-sm font-medium underline underline-offset-4 hover:text-ember">
            Use a different email
          </button>
        </motion.div>
      ) : (
        <div className="mt-10">
          <p className="eyebrow">Account recovery</p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">Forgot password?</h1>
          <p className="mt-3 text-ink-soft">Enter the email you registered with and we&apos;ll send you a reset link.</p>
          <div className="mt-8">
            {!configured ? (
              <NotConfiguredNote />
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <Field label="Email">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </Field>
                <ErrorNote message={error} />
                <SubmitButton loading={state === "loading"}>Send reset link</SubmitButton>
                <p className="text-center text-sm text-ink-soft">
                  Registered with your mobile number only? Ask your teacher to set a new password for you.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
