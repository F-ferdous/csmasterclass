"use client";

import { collection, limit, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";

type Row = { id: string; email: string; name?: string; topic?: string; message?: string; createdAt?: Timestamp };

/** Read-only, newest-first view of contact messages or newsletter subscribers. */
export function InboxList({ kind }: { kind: "messages" | "subscribers" }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(
    () =>
      onSnapshot(query(collection(db(), kind), orderBy("createdAt", "desc"), limit(200)), (snap) =>
        setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Row, "id">) }))),
      ),
    [kind],
  );

  if (!rows) return <Loader2 className="size-6 animate-spin text-ink-soft" />;
  if (!rows.length) return <p className="text-ink-soft">Nothing here yet.</p>;

  const date = (t?: Timestamp) => (t ? t.toDate().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

  if (kind === "subscribers") {
    return (
      <div>
        <p className="mb-4 text-sm text-ink-soft">{rows.length} subscribers</p>
        <ul className="divide-y divide-line rounded-3xl border border-line">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
              <a href={`mailto:${r.email}`} className="truncate hover:text-ember">{r.email}</a>
              <span className="shrink-0 font-mono text-xs text-ink-faint">{date(r.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {rows.map((r) => (
        <li key={r.id} className="rounded-3xl border border-line p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-xl">{r.name}</p>
              <a href={`mailto:${r.email}`} className="text-sm text-ink-soft hover:text-ember">{r.email}</a>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-paper-2 px-3 py-1 text-xs">{r.topic}</span>
              <p className="mt-2 font-mono text-[11px] text-ink-faint">{date(r.createdAt)}</p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{r.message}</p>
        </li>
      ))}
    </ul>
  );
}
