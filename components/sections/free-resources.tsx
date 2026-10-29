"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, FolderOpen, MessageCircle, MousePointerClick } from "lucide-react";
import { Suspense, useState } from "react";
import { ResourceCard } from "@/components/dashboard/resource-card";
import { ease } from "@/components/motion/reveal";
import { bookLevelLabels } from "@/lib/books";
import { classLabels, classLevels } from "@/lib/coaching";
import { freeFileUrl, levelForClass, type FreeResource } from "@/lib/free-resources";
import { waLink } from "@/lib/phone";
import { kindPlural, resourceKinds, type ResourceKind } from "@/lib/resources";
import { site } from "@/lib/site";
import type { Book, ClassLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PremiumPopup } from "./premium-popup";

type Props = { resources: FreeResource[]; books: Book[]; bundleTier?: { kind: "soft" | "hard"; bdt: number; percent?: number } };

const isClass = (v: string | null): v is ClassLevel => classLevels.includes(v as ClassLevel);

/** Class picker + that class's free resources. The chosen class is kept in the address (?class=10) so links can be shared. */
export function FreeResources(props: Props) {
  return (
    <Suspense fallback={<Browser {...props} initial={null} />}>
      <FromAddress {...props} />
    </Suspense>
  );
}

function FromAddress(props: Props) {
  const param = useSearchParams().get("class");
  return <Browser {...props} initial={isClass(param) ? param : null} />;
}

function Browser({ resources, books, bundleTier, initial }: Props & { initial: ClassLevel | null }) {
  const [chosen, setChosen] = useState<ClassLevel | null>(null);
  const [kind, setKind] = useState<ResourceKind | "all">("all");
  const cls = chosen ?? initial;

  function choose(c: ClassLevel) {
    setChosen(c);
    setKind("all");
    window.history.replaceState(null, "", `?class=${c}`);
  }

  const forClass = cls ? resources.filter((r) => r.classes.includes(cls)) : [];
  const kinds = resourceKinds.filter((k) => forClass.some((r) => r.kind === k));
  const shown = forClass.filter((r) => kind === "all" || r.kind === kind);
  const level = cls ? levelForClass(cls) : null;

  return (
    <div>
      <p className="eyebrow mb-5">Step 1 · Choose your class</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="radiogroup" aria-label="Your class">
        {classLevels.map((c, i) => {
          const on = cls === c;
          const count = resources.filter((r) => r.classes.includes(c)).length;
          return (
            <motion.button
              key={c}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(c)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.07, ease }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "relative overflow-hidden rounded-3xl border p-5 text-left transition-colors sm:p-6",
                on ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink/50",
              )}
            >
              <span className={cn("block font-mono text-xs uppercase tracking-[0.16em]", on ? "opacity-70" : "text-ink-faint")}>Class</span>
              <span className="mt-1 block font-display text-5xl leading-none sm:text-6xl">{c}</span>
              <span className={cn("mt-3 block text-sm", on ? "opacity-80" : "text-ink-soft")}>{classLabels[c]}</span>
              <span className={cn("mt-1 block text-xs", on ? "opacity-60" : "text-ink-faint")}>
                {count} free resource{count === 1 ? "" : "s"}
              </span>
              {on && <motion.span layoutId="free-class-dot" className="absolute right-5 top-5 size-2.5 rounded-full bg-ember" />}
            </motion.button>
          );
        })}
      </div>

      {/* Swaps straight away when the class changes (no exit animation to wait on), then fades in. */}
      {!cls ? (
        <motion.div
          key="pick"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-10 flex items-center gap-3 rounded-3xl border border-dashed border-line p-8 text-ink-soft"
        >
          <MousePointerClick className="size-5 shrink-0 text-ember" aria-hidden />
          Pick your class above to see its free notes, worksheets, past papers and videos.
        </motion.div>
      ) : (
        <motion.section key={cls} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="mt-12" aria-live="polite">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow mb-3">Step 2 · Open what you need</p>
              <h2 className="font-display text-3xl sm:text-4xl">
                Class {cls} <em className="text-ember">free resources</em>
              </h2>
              <p className="mt-1.5 text-sm text-ink-soft">
                {classLabels[cls]} · {forClass.length} item{forClass.length === 1 ? "" : "s"}
              </p>
            </div>
            {kinds.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {(["all", ...kinds] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", kind === k ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}
                  >
                    {k === "all" ? "All" : kindPlural[k]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {forClass.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-line px-6 py-14 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-paper-2 text-ember">
                <FolderOpen className="size-6" aria-hidden />
              </span>
              <p className="mt-4 font-display text-2xl">Coming soon for Class {cls}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">New free material is added regularly. Need something now? Ask on WhatsApp.</p>
              <a
                href={waLink(site.whatsapp, `Hello! Do you have free Computer Science resources for Class ${cls}?`)}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-forest-ink transition-colors hover:bg-ink hover:text-paper"
              >
                <MessageCircle className="size-4" aria-hidden /> WhatsApp {site.phone}
              </a>
            </div>
          ) : (
            <motion.div layout className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {shown.map((r, i) => (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.45, delay: Math.min(i, 8) * 0.05, ease }}
                  >
                    <ResourceCard resource={r} fileHref={r.kind === "html" ? freeFileUrl(r.id) : r.fileUrl || undefined} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {level && (
            <div className="mt-12 flex flex-col gap-4 rounded-3xl bg-band p-6 text-band-ink sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <p className="font-display text-2xl">Want the complete {bookLevelLabels[level]} books?</p>
                <p className="mt-1 text-sm opacity-75">Handbooks, topical questions, past papers and mock exams — plus premium coaching.</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link href="/books" className="inline-flex items-center gap-1.5 rounded-full bg-band-accent px-5 py-3 text-sm font-semibold text-band">
                  See the books <ArrowUpRight className="size-4" aria-hidden />
                </Link>
                <a
                  href={waLink(site.whatsapp, `Hello! I'd like to know about the ${bookLevelLabels[level]} books and premium services (Class ${cls}).`)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-band-ink/30 px-5 py-3 text-sm font-semibold hover:border-band-ink"
                >
                  <MessageCircle className="size-4" aria-hidden /> Ask on WhatsApp
                </a>
              </div>
            </div>
          )}
        </motion.section>
      )}

      <PremiumPopup books={books} classLevel={cls} bundleTier={bundleTier} />
    </div>
  );
}
