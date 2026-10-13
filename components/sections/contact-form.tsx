"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { sendMessage } from "@/lib/submit";
import { cn } from "@/lib/utils";

const topics = ["Coaching batch", "One-to-one", "Book order", "School workshop", "Other"];

const field =
  "w-full rounded-2xl border border-line bg-paper px-4 py-3.5 text-base outline-none transition-colors placeholder:text-ink-faint focus:border-ink";

export function ContactForm() {
  const [topic, setTopic] = useState(topics[0]);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [note, setNote] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setState("loading");
    const res = await sendMessage({
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      topic,
      message: String(data.get("message") ?? "").trim(),
    });
    if (res.ok) {
      setState("done");
      setNote(res.demo ? "Preview mode — connect Firebase to receive messages." : "Thank you — I'll reply within two working days.");
    } else {
      setState("error");
      setNote(res.error);
    }
  }

  return (
    <div className="rounded-[2rem] border border-line bg-paper-2/50 p-6 sm:p-10">
      <AnimatePresence mode="wait" initial={false}>
        {state === "done" ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid min-h-[420px] place-items-center text-center"
            role="status"
          >
            <div>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                className="mx-auto grid size-16 place-items-center rounded-full bg-forest text-forest-ink"
              >
                <Check className="size-7" aria-hidden />
              </motion.span>
              <h2 className="mt-6 font-display text-3xl">Message sent.</h2>
              <p className="mt-2 text-ink-soft">{note}</p>
            </div>
          </motion.div>
        ) : (
          <motion.form key="form" exit={{ opacity: 0, y: -10 }} onSubmit={onSubmit} className="space-y-6">
            <fieldset>
              <legend className="mb-3 text-sm font-medium">What&apos;s it about?</legend>
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    aria-pressed={topic === t}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition-colors",
                      topic === t ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Name</span>
                <input name="name" required autoComplete="name" className={field} placeholder="Your name" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Email</span>
                <input name="email" type="email" required autoComplete="email" className={field} placeholder="you@example.com" />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Message</span>
              <textarea name="message" required rows={6} maxLength={4000} className={cn(field, "resize-y")} placeholder="Tell me a little about what you're looking for…" />
            </label>
            {state === "error" && <p className="text-sm text-ember" role="alert">{note}</p>}
            <button
              type="submit"
              disabled={state === "loading"}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest px-7 py-4 text-sm font-semibold text-forest-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-60 sm:w-auto"
            >
              {state === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />}
              Send message
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
