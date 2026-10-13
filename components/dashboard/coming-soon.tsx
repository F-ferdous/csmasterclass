"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { adminNav } from "@/components/admin/nav";
import { studentNav } from "./student-nav";

/** Placeholder for a dashboard section that's planned but not built yet. */
export function ComingSoon({ area, href }: { area: "admin" | "student"; href: string }) {
  const nav = area === "admin" ? adminNav : studentNav;
  const backHref = area === "admin" ? "/admin" : "/dashboard";
  const item = nav.flatMap((g) => g.items).find((i) => i.href === href);
  if (!item) return null;
  const Icon = item.icon;
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-md text-center">
        <motion.span
          initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="mx-auto grid size-16 place-items-center rounded-2xl bg-forest text-forest-ink"
        >
          <Icon className="size-7" aria-hidden />
        </motion.span>
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-ember">Coming soon</p>
        <h1 className="mt-2 font-display text-4xl">{item.label}</h1>
        <p className="mt-3 text-ink-soft">{item.description}</p>
        <Link href={backHref} className="mt-8 inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm hover:border-ink">
          <ArrowLeft className="size-4" aria-hidden /> Back to overview
        </Link>
      </div>
    </div>
  );
}
