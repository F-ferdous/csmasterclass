"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, BookOpen, CalendarDays, GraduationCap, MailWarning, MapPin, Megaphone, Phone, Sparkles } from "lucide-react";
import { useState } from "react";
import { BookCover } from "@/components/books/book-cover";
import { ease } from "@/components/motion/reveal";
import { resendVerification } from "@/lib/auth";
import { classLabels } from "@/lib/coaching";
import { formatBdt, lowestPrice } from "@/lib/pricing";
import { NextClassCard } from "./next-class";
import { EnrollmentBadge } from "./enrollment-badge";
import { studentSoonItems } from "./student-nav";
import { useBooks } from "./use-books";
import { useStudent } from "./use-student";
import { WeekTimetable } from "./week-timetable";
import { AnnouncementCard } from "./announcement-card";
import { isNewSince, useMyAnnouncements, useSeenCutoff } from "./use-announcements";

const rise = (i: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay: i * 0.07, ease },
});

export function StudentOverview() {
  const { user, profile, batch, location, loading } = useStudent();
  const books = useBooks();
  const firstName = (profile?.name || user?.displayName || "there").split(" ")[0];
  const needsVerify = user?.providerData.some((p) => p.providerId === "password") && !user.emailVerified;

  return (
    <div className="space-y-8">
      <motion.div {...rise(0)}>
        <p className="text-sm text-ink-soft">{greeting()}</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Welcome back, {firstName}</h1>
      </motion.div>

      {needsVerify && <VerifyBanner />}

      <LatestAnnouncements />

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <div className="h-64 animate-pulse rounded-3xl bg-paper-2" />
          <div className="h-64 animate-pulse rounded-3xl bg-paper-2" />
        </div>
      ) : !batch ? (
        <motion.div {...rise(1)} className="rounded-3xl border border-dashed border-ember/50 bg-ember/[0.05] p-6 sm:p-8">
          <Sparkles className="size-6 text-ember" aria-hidden />
          <h2 className="mt-4 font-display text-2xl">Choose your batch to see your classes</h2>
          <p className="mt-2 max-w-lg text-sm text-ink-soft">
            Pick your class, centre and batch in your profile — your timetable and next class will appear here.
          </p>
          <Link href="/dashboard/profile" className="mt-5 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-forest-ink">
            Choose my batch <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </motion.div>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <motion.div {...rise(1)}>
              <NextClassCard batch={batch} location={location} />
            </motion.div>
            <motion.div {...rise(2)} className="grid gap-5">
              <InfoCard icon={GraduationCap} label="My batch">
                <p className="font-display text-2xl">{batch.name}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Class {batch.classLevel} · {classLabels[batch.classLevel]} · {batch.board === "Both" ? "Cambridge & Edexcel" : batch.board}
                </p>
                <div className="mt-3">
                  <EnrollmentBadge batchId={batch.id} detailed />
                </div>
              </InfoCard>
              {location && (
                <InfoCard icon={MapPin} label="My centre">
                  <p className="font-display text-2xl">{location.name}</p>
                  <p className="mt-1 text-sm text-ink-soft">{location.address || location.area}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    {location.phone && (
                      <a href={`tel:${location.phone}`} className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                        <Phone className="size-3.5" aria-hidden /> {location.phone}
                      </a>
                    )}
                    {location.mapUrl && (
                      <a href={location.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                        Directions <ArrowUpRight className="size-3.5" aria-hidden />
                      </a>
                    )}
                  </div>
                </InfoCard>
              )}
            </motion.div>
          </div>

          <motion.section {...rise(3)} className="rounded-3xl border border-line p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-xl">
                <CalendarDays className="size-5 text-ember" aria-hidden /> This week
              </h2>
              <Link href="/dashboard/schedule" className="text-sm text-ink-soft underline-offset-4 hover:underline">
                Full schedule
              </Link>
            </div>
            <WeekTimetable sessions={batch.sessions} batchName={batch.name} />
          </motion.section>
        </>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <motion.section {...rise(4)} className="rounded-3xl border border-line p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <BookOpen className="size-5 text-ember" aria-hidden /> Books for your syllabus
            </h2>
            <Link href="/dashboard/books" className="text-sm text-ink-soft underline-offset-4 hover:underline">
              All books
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {books.slice(0, 3).map((b) => {
              const from = lowestPrice(b);
              return (
                <Link key={b.slug} href={`/books/${b.slug}`} className="group">
                  <div className="transition-transform duration-500 group-hover:-translate-y-1.5">
                    <BookCover book={b} sizes="160px" />
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-sm font-medium leading-snug">{b.title}</p>
                  {from && <p className="text-xs text-ink-soft">From {formatBdt(from.bdt)}</p>}
                </Link>
              );
            })}
          </div>
        </motion.section>

        <motion.section {...rise(5)} className="rounded-3xl bg-paper-2/70 p-5 sm:p-6">
          <h2 className="font-display text-xl">Coming to your dashboard</h2>
          <ul className="mt-4 space-y-2.5">
            {studentSoonItems.map((s) => (
              <li key={s.href} className="flex items-start gap-3 text-sm">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-paper text-ink-soft">
                  <s.icon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block font-medium">{s.label}</span>
                  <span className="block text-xs text-ink-soft">{s.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>
    </div>
  );
}

function LatestAnnouncements() {
  const list = useMyAnnouncements();
  const cutoff = useSeenCutoff(false);
  if (!list || list.length === 0) return null;
  const fresh = list.filter((a) => isNewSince(a, cutoff)).length;

  return (
    <motion.section {...rise(1)}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl">
          <Megaphone className="size-5 text-ember" aria-hidden /> Announcements
          {fresh > 0 && <span className="rounded-full bg-ember px-2 py-0.5 text-xs font-semibold text-white">{fresh} new</span>}
        </h2>
        <Link href="/dashboard/announcements" className="text-sm text-ink-soft underline-offset-4 hover:underline">
          See all
        </Link>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {list.slice(0, 2).map((a) => (
          <Link key={a.id} href="/dashboard/announcements" className="block transition-transform hover:-translate-y-0.5">
            <AnnouncementCard announcement={a} isNew={isNewSince(a, cutoff)} compact />
          </Link>
        ))}
      </div>
    </motion.section>
  );
}

function InfoCard({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-line p-5 sm:p-6">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-ink-faint">
        <Icon className="size-3.5" aria-hidden /> {label}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function VerifyBanner() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 text-sm">
        <MailWarning className="size-4 shrink-0 text-gold" aria-hidden /> Please verify your email address — check your inbox for the link.
      </p>
      <button
        type="button"
        disabled={state !== "idle"}
        onClick={() => {
          setState("sending");
          resendVerification().finally(() => setState("sent"));
        }}
        className="shrink-0 text-sm font-medium underline underline-offset-4 disabled:no-underline disabled:opacity-70"
      >
        {state === "sent" ? "Link sent" : state === "sending" ? "Sending…" : "Resend link"}
      </button>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const date = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return `${part} · ${date}`;
}
