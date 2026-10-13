"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { subscribe } from "@/lib/submit";
import { SplitHeading } from "@/components/motion/split-heading";
import { Reveal } from "@/components/motion/reveal";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [note, setNote] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("loading");
    const res = await subscribe(email);
    if (res.ok) {
      setState("done");
      setNote(res.demo ? "Preview mode — connect Firebase to store sign-ups." : "You're on the list. Watch your inbox.");
    } else {
      setState("error");
      setNote(res.error);
    }
  }

  return (
    <section className="container-x pt-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-line bg-paper-2 px-6 py-14 text-center sm:px-12 sm:py-20">
        <div aria-hidden className="dot-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div aria-hidden className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-ember/20 blur-3xl" />
        <div className="relative mx-auto max-w-2xl">
          <Reveal>
            <p className="eyebrow">The reading list</p>
          </Reveal>
          <SplitHeading
            segments={["New books, ", { em: "first." }]}
            className="mt-5 text-4xl leading-tight sm:text-5xl lg:text-6xl"
          />
          <Reveal delay={0.15}>
            <p className="mx-auto mt-5 max-w-lg text-ink-soft">
              Be the first to hear about new releases, launch discounts and free study resources. One thoughtful email a month.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <AnimatePresence mode="wait" initial={false}>
              {state === "done" ? (
                <motion.p
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mx-auto mt-10 inline-flex items-center gap-2 rounded-full bg-forest px-6 py-4 text-sm font-semibold text-forest-ink"
                  role="status"
                >
                  <Check className="size-4" aria-hidden /> {note}
                </motion.p>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={onSubmit}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="mx-auto mt-10 flex max-w-md flex-col gap-2 rounded-[1.75rem] border border-line bg-paper p-2 shadow-soft sm:flex-row sm:rounded-full"
                >
                  <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                  <input
                    id="newsletter-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="min-w-0 flex-1 rounded-full bg-transparent px-5 py-3 text-base outline-none placeholder:text-ink-faint"
                  />
                  <button
                    type="submit"
                    disabled={state === "loading"}
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-ember disabled:opacity-60"
                  >
                    {state === "loading" ? <Loader2 className="size-4 animate-spin" /> : "Subscribe"}
                    {state !== "loading" && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
            {state === "error" && <p className="mt-3 text-sm text-ember" role="alert">{note}</p>}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
