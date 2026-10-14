"use client";

import { motion } from "motion/react";
import { Receipt, Wallet } from "lucide-react";
import { getMyPayments } from "@/app/student-data";
import { EmptyState, PageHeader, Spinner } from "@/components/admin/ui";
import { ease } from "@/components/motion/reveal";
import { bdt, dueLabels, dueStyles, methodLabels, monthLabel, thisMonth, tuitionStatus, typeLabels } from "@/lib/payments";
import { cn } from "@/lib/utils";
import { useStudent } from "./use-student";
import { useStudentData } from "./use-student-data";

export function StudentPayments() {
  const { batch } = useStudent();
  const payments = useStudentData("payments", getMyPayments);

  if (payments === null) return <Spinner />;

  const month = thisMonth();
  const fee = batch?.fee ?? 0;
  const current = tuitionStatus(fee, payments.filter((p) => p.type === "tuition" && p.month === month));
  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Payments" description="Your tuition fees and book purchases." />

      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="rounded-3xl bg-band p-6 text-band-ink sm:col-span-2"
        >
          <p className="text-xs uppercase tracking-[0.18em] opacity-70">{monthLabel(month)} tuition</p>
          {fee > 0 ? (
            <>
              <p className="mt-3 flex flex-wrap items-center gap-3">
                <span className="font-display text-4xl">{bdt(fee)}</span>
                <span className={cn("rounded-full px-3 py-1 text-sm", current.status === "unpaid" ? "bg-ember text-white" : current.status === "partial" ? "bg-gold text-ink" : "bg-band-ink/15")}>
                  {dueLabels[current.status]}
                </span>
              </p>
              <p className="mt-2 text-sm opacity-80">
                {current.status === "partial" && `You've paid ${bdt(current.paid)} — ${bdt(current.remaining)} remaining. `}
                {current.status === "unpaid" && "Please pay at your centre or ask your teacher about bKash / Nagad. "}
                {batch && `${batch.name} · Class ${batch.classLevel}`}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm opacity-80">{batch ? "Your batch's monthly fee hasn't been set yet." : "Choose your batch in Profile to see your fees."}</p>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease }} className="rounded-3xl border border-line p-6">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-ink-faint">
            <Wallet className="size-3.5" aria-hidden /> Paid so far
          </p>
          <p className="mt-3 font-display text-3xl">{bdt(total)}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {payments.length} payment{payments.length === 1 ? "" : "s"}
          </p>
        </motion.div>
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl">History</h2>
        {payments.length === 0 ? (
          <EmptyState icon={<Receipt className="size-6" />} title="No payments yet" body="Payments recorded by your teacher will appear here." />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line">
            {payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 last:border-b-0">
                <div className="min-w-0">
                  <p className="font-medium">
                    <span className="mr-2 rounded-full bg-paper-2 px-2 py-0.5 text-xs font-normal">{typeLabels[p.type]}</span>
                    {p.description || (p.type === "tuition" ? monthLabel(p.month) : typeLabels[p.type])}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {p.receivedOn} · {methodLabels[p.method]}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg">{p.method === "waived" ? "Waived" : bdt(p.amount)}</p>
                  {p.type === "tuition" && <span className={cn("rounded-full px-2 py-0.5 text-[11px]", dueStyles.paid)}>Received</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
