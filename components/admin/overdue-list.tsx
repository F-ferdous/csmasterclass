"use client";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { AlertTriangle, CheckCircle2, MessageCircle, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { normalizeLocation } from "@/lib/coaching";
import type { EnrollmentRecord } from "@/lib/enrollments";
import { db } from "@/lib/firebase";
import { bdt, defaultMonthlyFee, monthLabel, monthsBefore, monthsBetween, overdueMessage, sheetPaymentId, thisMonth, todayISO, tuitionStatus, type Payment } from "@/lib/payments";
import { waLink } from "@/lib/phone";
import { rosterFor } from "@/lib/roster";
import { paymentLines } from "@/lib/settings";
import type { Batch, Location, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AudienceFilters, FilterSummary, useAudienceFilters } from "./audience-filters";
import { adminInput, EmptyState } from "./ui";
import { useSiteSettings } from "./use-settings";

type Owed = { month: string; fee: number; paid: number; remaining: number };
type Row = { user: UserProfile; batch: Batch; owed: Owed[]; total: number };

/**
 * Tuition still owed over several months, per student: each month from "From" to the month picked on
 * the Payments page (never before the student registered). The month's fee is the fee-sheet amount if
 * one was saved, else the batch fee, else the class fee from Settings.
 */
export function OverdueList({
  month,
  batches,
  users,
  enrollments,
  payments,
  onRecord,
}: {
  month: string;
  batches: Batch[];
  users: UserProfile[];
  enrollments: EnrollmentRecord[];
  payments: Payment[];
  onRecord: (p: Partial<Payment>) => void;
}) {
  const settings = useSiteSettings();
  const [locations, setLocations] = useState<Location[]>([]);
  const [from, setFrom] = useState(() => monthsBefore(month, 2));
  const [search, setSearch] = useState("");
  const filters = useAudienceFilters(batches);

  useEffect(
    () => onSnapshot(query(collection(db(), "locations"), orderBy("order", "asc")), (snap) => setLocations(snap.docs.map((x) => normalizeLocation(x.id, x.data())))),
    [],
  );

  const start = from <= month ? from : month;
  const months = monthsBetween(start, month);
  // When each student first registered — earlier months aren't owed.
  const joined = new Map<string, string>();
  for (const e of enrollments) {
    if (!e.uid || !e.createdAt) continue;
    const m = thisMonth(e.createdAt);
    if (!joined.has(e.uid) || m < joined.get(e.uid)!) joined.set(e.uid, m);
  }

  const running = batches.filter((b) => b.status !== "closed");
  const rows: Row[] = running
    .flatMap((b) =>
      rosterFor(b, users, enrollments).map((u) => {
        const owed = months
          .filter((m) => !joined.has(u.uid) || m >= joined.get(u.uid)!)
          .map((m) => {
            const monthPays = payments.filter((p) => p.uid === u.uid && p.type === "tuition" && p.month === m);
            const sheet = monthPays.find((p) => p.id === sheetPaymentId(m, u.uid));
            const fee = sheet?.amount || b.fee || defaultMonthlyFee(b.classLevel || u.classLevel, settings.fees);
            const s = tuitionStatus(fee, monthPays);
            return { month: m, fee, paid: s.paid, remaining: s.status === "unpaid" || s.status === "partial" ? s.remaining : 0 };
          })
          .filter((o) => o.remaining > 0);
        return { user: u, batch: b, owed, total: owed.reduce((s, o) => s + o.remaining, 0) };
      }),
    )
    .filter((r) => r.total > 0)
    .sort((a, b) => b.owed.length - a.owed.length || b.total - a.total);

  const q = search.trim().toLowerCase();
  const visible = rows.filter(
    (r) => filters.matchesBatches([r.batch.id]) && (!q || [r.user.name, r.user.email, r.user.phone].some((v) => v.toLowerCase().includes(q))),
  );
  const totalOwed = visible.reduce((s, r) => s + r.total, 0);
  const payment = paymentLines(settings.payment);

  return (
    <div>
      <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,3fr)] lg:items-end">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">From</span>
          <input type="month" value={from} max={month} onChange={(e) => e.target.value && setFrom(e.target.value)} className={cn(adminInput, "w-auto")} />
        </label>
        <label className="relative">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student" className={cn(adminInput, "pl-10")} />
        </label>
        <AudienceFilters f={filters} locations={locations} />
      </div>
      {(filters.active || q) && (
        <FilterSummary
          shown={visible.length}
          total={rows.length}
          onClear={() => {
            filters.clear();
            setSearch("");
          }}
        />
      )}

      <p className="mt-4 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
        <AlertTriangle className="size-4 text-ember" aria-hidden />
        {months.length === 1 ? monthLabel(month) : `${monthLabel(start)} – ${monthLabel(month)}`}:
        <strong className="font-semibold text-ink">
          {visible.length === 1 ? "1 student owes" : `${visible.length} students owe`} {bdt(totalOwed)}
        </strong>
      </p>

      <div className="mt-3">
        {visible.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="size-6" />}
            title={rows.length ? "No matches" : "Nothing overdue"}
            body={rows.length ? "Try other filters, or clear them." : "Every confirmed student has paid tuition for these months."}
          />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line">
            {visible.map((r) => {
              const phone = r.user.parentPhone || r.user.phone;
              const text = overdueMessage({ studentName: r.user.name, batch: r.batch, months: r.owed, payment });
              const oldest = r.owed[0];
              return (
                <div
                  key={`${r.user.uid}-${r.batch.id}`}
                  className="grid gap-3 border-b border-line px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_auto_auto] md:items-center md:gap-5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.user.name || "Unnamed"}</p>
                    <p className="truncate text-xs text-ink-soft">
                      Class {r.batch.classLevel} · {r.batch.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.owed.map((o) => (
                      <span key={o.month} className={cn("rounded-full px-2.5 py-1 text-xs", o.paid > 0 ? "bg-gold/20" : "bg-ember/12 text-ember")}>
                        {monthLabel(o.month).replace(/ \d{4}$/, "")}
                        {o.paid > 0 ? ` · ${bdt(o.remaining)} left` : ""}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm font-semibold tabular-nums md:text-right">
                    {bdt(r.total)}
                    <span className="block text-xs font-normal text-ink-soft">
                      {r.owed.length} month{r.owed.length === 1 ? "" : "s"}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 md:justify-end">
                    {phone && (
                      <a
                        href={waLink(phone, text)}
                        target="_blank"
                        rel="noreferrer"
                        title={r.user.parentPhone ? "Send to parent" : "No parent number — sends to the student"}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm hover:border-ink"
                      >
                        <MessageCircle className="size-4" aria-hidden /> Remind {r.user.parentPhone ? "parent" : "student"}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onRecord({ uid: r.user.uid, type: "tuition", month: oldest.month, amount: oldest.remaining, method: "cash", receivedOn: todayISO(), batchId: r.batch.id })
                      }
                      className="inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-2 text-sm font-semibold text-forest-ink hover:bg-ink hover:text-paper"
                    >
                      <Plus className="size-4" aria-hidden /> Record {monthLabel(oldest.month).replace(/ \d{4}$/, "")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
