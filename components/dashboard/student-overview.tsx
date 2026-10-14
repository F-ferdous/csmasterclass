"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, BookMarked, BookOpen, CalendarDays, ClipboardCheck, GraduationCap, MailWarning, MapPin, Megaphone, Phone, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { BookCover } from "@/components/books/book-cover";
import { ease } from "@/components/motion/reveal";
import { attendanceRate } from "@/lib/attendance";
import { resendVerification } from "@/lib/auth";
import { classLabels } from "@/lib/coaching";
import { formatBdt, lowestPrice } from "@/lib/pricing";
import { dueText, homeworkStatus } from "@/lib/homework";
import { approxGrade, percent } from "@/lib/tests";
import { GetTheAppCard } from "./app-install";
import { NextClassCard } from "./next-class";
import { EnrollmentBadge } from "./enrollment-badge";
import { bookNeedLabels, suggestBooks } from "@/lib/books";
import { useBooks } from "./use-books";
import { Chip } from "./student-books";
import { useMyHomework } from "./use-homework";
import { useMyAttendance, useMyResults } from "./use-my-records";
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
  const suggested = suggestBooks(books, profile?.classLevel ?? "", profile?.booksOwned ?? []);
  // Books still to get for their class (must-have first); everything not yet bought when the class has no list.
  const picks = suggested.planned ? [...suggested.must, ...suggested.optional] : suggested.other;
  const firstName = (profile?.name || user?.displayName || "there").split(" ")[0];
  // Students who registered with a phone only have no real email to verify.
  const needsVerify = Boolean(profile?.email) && user?.providerData.some((p) => p.providerId === "password") && !user?.emailVerified;

  return (
    <div className="space-y-8">
      <motion.div {...rise(0)}>
        <p className="text-sm text-ink-soft">{greeting()}</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Welcome back, {firstName}</h1>
      </motion.div>

      {needsVerify && <VerifyBanner />}

      <GetTheAppCard />

      <LatestAnnouncements />

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <div className="h-64 animate-pulse rounded-3xl bg-paper-2" />
          <div className="h-64 animate-pulse rounded-3xl bg-paper-2" />
        </div>
      ) : !batch ? (
        <motion.div {...rise(1)} className="rounded-3xl border border-dashed border-ember/50 bg-ember/[0.05] p-6 sm:p-8">
          <Sparkles className="size-6 text-ember" aria-hidden />
          <h2 className="mt-4 font-display text-2xl">You&apos;re not in a batch right now</h2>
          <p className="mt-2 max-w-lg text-sm text-ink-soft">
            Ask to join a batch from your profile — once your teacher confirms it, your timetable and next class will appear here.
          </p>
          <Link href="/dashboard/profile" className="mt-5 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-forest-ink">
            Request a batch <ArrowUpRight className="size-4" aria-hidden />
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
          {picks.length === 0 ? (
            <p className="rounded-2xl bg-paper-2/60 px-4 py-6 text-center text-sm text-ink-soft">
              You have every book on your list.{" "}
              <Link href="/dashboard/books" className="text-ink underline underline-offset-4">
                See your books
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {picks.slice(0, 3).map((b) => {
                const from = lowestPrice(b);
                const need = profile?.classLevel ? b.forClasses[profile.classLevel] : undefined;
                return (
                  <Link key={b.slug} href={`/books/${b.slug}`} className="group">
                    <div className="relative transition-transform duration-500 group-hover:-translate-y-1.5">
                      <BookCover book={b} sizes="160px" />
                      {need && (
                        <span className="absolute left-1.5 top-1.5 scale-90 origin-top-left">
                          <Chip tone={need}>{bookNeedLabels[need]}</Chip>
                        </span>
                      )}
                    </div>
                    <p className="mt-2.5 line-clamp-2 text-sm font-medium leading-snug">{b.title}</p>
                    {from && <p className="text-xs text-ink-soft">From {formatBdt(from.bdt)}</p>}
                  </Link>
                );
              })}
            </div>
          )}
        </motion.section>

        <motion.section {...rise(5)}>
          <ProgressSnapshot />
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

/** Attendance rate and latest published result, linking to the full pages. */
function ProgressSnapshot() {
  const attendance = useMyAttendance();
  const results = useMyResults();
  const rate = attendance ? attendanceRate(attendance.map((a) => a.mark)) : null;
  const latest = results?.filter((r) => r.score !== null).at(-1);
  const latestPct = latest ? percent(latest.score!, latest.max) : null;
  const homework = useMyHomework();
  const due = (homework ?? [])
    .filter((h) => ["todo", "overdue"].includes(homeworkStatus(h.homework, h.submission)))
    .sort((a, b) => a.homework.dueDate.localeCompare(b.homework.dueDate));

  return (
    <div className="grid h-full gap-4">
      <Link href="/dashboard/homework" className="group rounded-3xl border border-line p-5 transition-colors hover:border-ink sm:p-6">
        <p className="flex items-center justify-between text-sm text-ink-soft">
          <span className="flex items-center gap-2">
            <BookMarked className="size-4" aria-hidden /> Homework
          </span>
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </p>
        <p className="mt-2 font-display text-4xl tabular-nums">{homework === null ? "—" : due.length}</p>
        <p className="mt-1 truncate text-xs text-ink-soft">
          {due.length ? `${due[0].homework.title} · ${dueText(due[0].homework.dueDate)}` : "Nothing to submit right now"}
        </p>
      </Link>
      <Link href="/dashboard/attendance" className="group rounded-3xl border border-line p-5 transition-colors hover:border-ink sm:p-6">
        <p className="flex items-center justify-between text-sm text-ink-soft">
          <span className="flex items-center gap-2">
            <ClipboardCheck className="size-4" aria-hidden /> My attendance
          </span>
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </p>
        <p className="mt-2 font-display text-4xl tabular-nums">{rate === null ? "—" : `${rate}%`}</p>
        <p className="mt-1 text-xs text-ink-soft">{attendance && attendance.length ? `${attendance.length} class${attendance.length === 1 ? "" : "es"} recorded` : "No classes recorded yet"}</p>
      </Link>
      <Link href="/dashboard/progress" className="group rounded-3xl border border-line p-5 transition-colors hover:border-ink sm:p-6">
        <p className="flex items-center justify-between text-sm text-ink-soft">
          <span className="flex items-center gap-2">
            <TrendingUp className="size-4" aria-hidden /> Latest result
          </span>
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </p>
        {latest && latestPct !== null ? (
          <>
            <p className="mt-2 font-display text-4xl tabular-nums">
              {latestPct}% <span className="text-lg text-ink-soft">· {approxGrade(latestPct)}</span>
            </p>
            <p className="mt-1 truncate text-xs text-ink-soft">
              {latest.title}
              {latest.classAverage !== null ? ` · class average ${latest.classAverage}%` : ""}
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 font-display text-4xl">—</p>
            <p className="mt-1 text-xs text-ink-soft">No results published yet</p>
          </>
        )}
      </Link>
    </div>
  );
}
