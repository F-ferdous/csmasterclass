"use client";

import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-2xl border border-line bg-paper px-4 py-3.5 text-base outline-none transition-colors placeholder:text-ink-faint focus:border-ink";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between gap-3 text-sm font-medium">
        {label}
        {hint && <span className="text-xs font-normal text-ink-soft">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={cn(inputClass, "pr-12")} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-soft hover:text-ink"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-forest px-6 py-4 text-sm font-semibold text-forest-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** "Continue with Google" — uses Google's standard multicolour G mark. */
export function GoogleButton({ onClick, loading, label = "Continue with Google" }: { onClick: () => void; loading: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-paper px-6 py-3.5 text-sm font-medium transition-colors hover:border-ink disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
      )}
      {label}
    </button>
  );
}

export function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-[0.18em] text-ink-faint">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl border border-ember/30 bg-ember/[0.08] px-4 py-3 text-sm text-ember">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function NotConfiguredNote() {
  return (
    <p className="rounded-2xl border border-line bg-paper-2 px-4 py-3 text-sm text-ink-soft">
      Sign-in isn&apos;t available yet — Firebase is not configured for this site.
    </p>
  );
}
