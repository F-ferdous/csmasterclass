"use client";

import Link from "next/link";
import { collection, getCountFromServer, limit, onSnapshot, orderBy, query, where, type Timestamp } from "firebase/firestore";
import { motion } from "motion/react";
import { ArrowUpRight, BookOpen, CalendarClock, GraduationCap, Inbox, Mail, Plus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { db } from "@/lib/firebase";
import { ease } from "@/components/motion/reveal";
import { soonItems } from "./nav";
import { PageHeader } from "./ui";

type Counts = Record<"pending" | "batches" | "books" | "students" | "messages" | "subscribers", number | null>;

const cards: { key: keyof Counts; label: string; href: string; icon: typeof BookOpen }[] = [
  { key: "pending", label: "Pending enrollments", href: "/admin/enrollments", icon: UserPlus },
  { key: "batches", label: "Batches", href: "/admin/batches", icon: CalendarClock },
  { key: "students", label: "Students", href: "/admin/students", icon: GraduationCap },
  { key: "books", label: "Books", href: "/admin/books", icon: BookOpen },
  { key: "messages", label: "Messages", href: "/admin/messages", icon: Inbox },
  { key: "subscribers", label: "Subscribers", href: "/admin/subscribers", icon: Mail },
];

type Message = { id: string; name?: string; topic?: string; message?: string; createdAt?: Timestamp };

export function Overview() {
  const { profile } = useAuth();
  const [counts, setCounts] = useState<Counts>({ pending: null, batches: null, books: null, students: null, messages: null, subscribers: null });
  const [recent, setRecent] = useState<Message[] | null>(null);

  useEffect(() => {
    const d = db();
    const sources: [keyof Counts, ReturnType<typeof query> | ReturnType<typeof collection>][] = [
      ["pending", query(collection(d, "enrollments"), where("status", "==", "pending"))],
      ["batches", collection(d, "batches")],
      ["books", collection(d, "books")],
      ["students", collection(d, "students")],
      ["messages", collection(d, "messages")],
      ["subscribers", collection(d, "subscribers")],
    ];
    for (const [key, q] of sources) {
      getCountFromServer(q)
        .then((snap) => setCounts((c) => ({ ...c, [key]: snap.data().count })))
        .catch(() => setCounts((c) => ({ ...c, [key]: 0 })));
    }
    return onSnapshot(
      query(collection(d, "messages"), orderBy("createdAt", "desc"), limit(5)),
      (snap) => setRecent(snap.docs.map((x) => ({ id: x.id, ...(x.data() as Omit<Message, "id">) }))),
      () => setRecent([]),
    );
  }, []);

  const firstName = (profile?.name || "there").split(" ")[0];

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Hello, ${firstName}`}
        description="Here's what's happening across your coaching and publishing."
        actions={
          <>
            <QuickLink href="/admin/batches" label="New batch" />
            <QuickLink href="/admin/books" label="Publish a book" />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div key={c.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.06, ease }}>
            <Link href={c.href} className="group block rounded-3xl border border-line p-5 transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-soft sm:p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-paper-2 text-ink-soft transition-colors group-hover:bg-forest group-hover:text-forest-ink">
                  <c.icon className="size-[18px]" aria-hidden />
                </span>
                <ArrowUpRight className="size-4 text-ink-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </div>
              <p className="mt-5 font-display text-4xl tabular-nums">{counts[c.key] ?? <span className="inline-block h-9 w-12 animate-pulse rounded-lg bg-paper-2 align-middle" />}</p>
              <p className="mt-1 text-sm text-ink-soft">{c.label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-3xl border border-line p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Latest messages</h2>
            <Link href="/admin/messages" className="text-sm text-ink-soft underline-offset-4 hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {recent === null && <li className="py-6 text-sm text-ink-soft">Loading…</li>}
            {recent?.length === 0 && <li className="py-6 text-sm text-ink-soft">No messages yet.</li>}
            {recent?.map((m) => (
              <li key={m.id} className="py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-medium">{m.name}</p>
                  <span className="shrink-0 rounded-full bg-paper-2 px-2.5 py-0.5 text-xs">{m.topic}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-sm text-ink-soft">{m.message}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl bg-band p-6 text-band-ink">
          <h2 className="font-display text-xl">On the roadmap</h2>
          <p className="mt-1 text-sm opacity-75">Sections coming to this dashboard next.</p>
          <ul className="mt-5 space-y-2.5">
            {soonItems.map((s) => (
              <li key={s.href} className="flex items-center gap-3 text-sm">
                <span className="grid size-8 place-items-center rounded-lg bg-band-ink/10">
                  <s.icon className="size-4" aria-hidden />
                </span>
                {s.label}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm hover:border-ink">
      <Plus className="size-4" aria-hidden /> {label}
    </Link>
  );
}
