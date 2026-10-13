"use client";

import { AnimatePresence, motion } from "motion/react";
import { Loader2, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ease } from "@/components/motion/reveal";

export const adminInput =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-ink";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  loading,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-forest-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-60",
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm transition-colors hover:border-ink", className)}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-3 text-sm font-medium">
        {label}
        {hint && <span className="text-xs font-normal text-ink-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Pill-style single choice. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  render,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render?: (v: T) => ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full border px-3.5 py-2 text-sm transition-colors",
            value === o ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
          )}
        >
          {render ? render(o) : o}
        </button>
      ))}
    </div>
  );
}

/**
 * Right-hand slide-over panel used for create/edit forms.
 * Children should be a <form> containing <DrawerBody> and <DrawerFooter>.
 */
export function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex h-full w-full max-w-xl flex-col bg-paper shadow-lift"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease }}
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-7">
              <h2 className="font-display text-2xl">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-full border border-line hover:border-ink">
                <X className="size-4" />
              </button>
            </header>
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DrawerBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7" data-lenis-prevent>
      {children}
    </div>
  );
}

export function DrawerFooter({ children }: { children: ReactNode }) {
  return <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-4 sm:px-7">{children}</footer>;
}

/** A form that fills the drawer: scrollable body + pinned footer. */
export const drawerFormClass = "flex min-h-0 flex-1 flex-col";

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line px-6 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-paper-2 text-ember">{icon}</span>
      <h3 className="mt-5 font-display text-2xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-6 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="grid min-h-[30vh] place-items-center">
      <Loader2 className="size-6 animate-spin text-ink-soft" />
    </div>
  );
}

export function ErrorText({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="text-sm text-ember">
      {message}
    </p>
  ) : null;
}
