"use client";

import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { Check, MessageCircle, Users } from "lucide-react";
import { useState } from "react";
import { classLevels } from "@/lib/coaching";
import type { EnrollmentRecord } from "@/lib/enrollments";
import { db } from "@/lib/firebase";
import { waLink } from "@/lib/phone";
import { bdt, defaultMonthlyFee, feeMessage, monthLabel, sheetPaymentId, todayISO, tuitionStatus, type Payment } from "@/lib/payments";
import { rosterFor } from "@/lib/roster";
import { paymentLines } from "@/lib/settings";
import type { Batch, ClassLevel, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "./use-settings";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, Field, Segmented } from "./ui";

type Row = {
  user: UserProfile;
  batch: Batch;
  /** The payment this sheet's switch wrote for the month, if any. */
  sheet: Payment | undefined;
  /** Tuition for the month recorded some other way (Record payment / waived). */
  other: Payment[];
};

const WhatsAppGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.42-9.45 9.42zm8.03-17.46A11.3 11.3 0 0 0 12.05.7C5.8.7.7 5.8.7 12.04c0 2 .52 3.95 1.52 5.67L.6 23.3l5.73-1.5a11.3 11.3 0 0 0 5.72 1.46h.01c6.25 0 11.34-5.09 11.35-11.34a11.27 11.27 0 0 0-3.33-8.03z" />
  </svg>
);

/**
 * Monthly fee sheet: pick a class and batch, see every student in a table with this month's fee
 * (editable, 3,500 / 4,500 BDT by default) and a Paid switch. Turning it on records a tuition
 * payment (payments/tuition-YYYY-MM-uid); turning it off deletes that payment again.
 */
export function FeeSheet({
  month,
  batches,
  users,
  enrollments,
  payments,
}: {
  month: string;
  batches: Batch[];
  users: UserProfile[];
  enrollments: EnrollmentRecord[];
  payments: Payment[];
}) {
  const [klass, setKlass] = useState<ClassLevel | "">("");
  const [batchId, setBatchId] = useState<string>("all");
  // Amounts typed into the boxes, per student and month (until saved with the switch).
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [messaging, setMessaging] = useState<{ row: Row; amount: number; paid: boolean } | null>(null);
  const settings = useSiteSettings();

  const running = batches.filter((b) => b.status !== "closed");
  const classBatches = klass ? running.filter((b) => b.classLevel === klass) : [];
  const shownBatches = batchId === "all" ? classBatches : classBatches.filter((b) => b.id === batchId);

  const rows: Row[] = shownBatches.flatMap((b) =>
    rosterFor(b, users, enrollments).map((u) => {
      const monthPays = payments.filter((p) => p.uid === u.uid && p.type === "tuition" && p.month === month);
      const sheetId = sheetPaymentId(month, u.uid);
      return { user: u, batch: b, sheet: monthPays.find((p) => p.id === sheetId), other: monthPays.filter((p) => p.id !== sheetId) };
    }),
  );

  const key = (r: Row) => `${month}:${r.user.uid}`;
  const defaultFee = (r: Row) => defaultMonthlyFee(r.batch.classLevel || r.user.classLevel, settings.fees);
  const amountText = (r: Row) => typed[key(r)] ?? String(r.sheet?.amount ?? defaultFee(r));
  const amountOf = (r: Row) => Number(amountText(r));
  const isPaid = (r: Row) => {
    if (r.sheet) return true;
    if (r.other.length === 0) return false;
    const s = tuitionStatus(amountOf(r) || defaultFee(r), r.other).status;
    return s === "paid" || s === "waived";
  };
  /** Paid only through payments recorded elsewhere — the switch can't undo those. */
  const lockedPaid = (r: Row) => !r.sheet && isPaid(r);

  const paidRows = rows.filter(isPaid);
  const collected = rows.reduce((s, r) => s + (r.sheet?.amount ?? 0) + r.other.reduce((t, p) => t + p.amount, 0), 0);

  async function setPaid(r: Row, paid: boolean) {
    const k = key(r);
    const id = sheetPaymentId(month, r.user.uid);
    setError("");
    if (paid) {
      const amount = amountOf(r);
      if (!Number.isFinite(amount) || amount <= 0) return setError(`Enter the fee for ${r.user.name || "this student"} first.`);
      setBusy((b) => ({ ...b, [k]: true }));
      try {
        await setDoc(doc(db(), "payments", id), {
          uid: r.user.uid,
          studentName: r.user.name,
          email: r.user.email,
          batchId: r.batch.id,
          classLevel: r.batch.classLevel || r.user.classLevel,
          type: "tuition",
          month,
          description: `Tuition — ${monthLabel(month)}`,
          amount,
          method: "cash",
          reference: "",
          receivedOn: todayISO(),
          note: "Marked paid on the fee sheet",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        setError((err as Error).message);
      }
    } else {
      if (!r.sheet) return;
      setBusy((b) => ({ ...b, [k]: true }));
      try {
        await deleteDoc(doc(db(), "payments", id));
      } catch (err) {
        setError((err as Error).message);
      }
    }
    setBusy((b) => ({ ...b, [k]: false }));
  }

  /** Editing the amount of a student already marked paid updates that payment. */
  async function saveAmount(r: Row) {
    if (!r.sheet) return;
    const amount = amountOf(r);
    if (!Number.isFinite(amount) || amount <= 0) {
      setTyped((t) => ({ ...t, [key(r)]: String(r.sheet!.amount) }));
      return setError("The fee must be more than 0. Turn Paid off instead to undo it.");
    }
    if (amount === r.sheet.amount) return;
    setError("");
    try {
      await updateDoc(doc(db(), "payments", r.sheet.id), { amount, updatedAt: serverTimestamp() });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <div className="grid gap-3 rounded-3xl border border-line p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-end">
        <Field label="Class">
          <select
            value={klass}
            onChange={(e) => {
              setKlass(e.target.value as ClassLevel | "");
              setBatchId("all");
            }}
            className={adminInput}
          >
            <option value="">Choose a class</option>
            {classLevels.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Batch">
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)} disabled={!klass} className={cn(adminInput, !klass && "opacity-50")}>
            <option value="all">{klass ? `All Class ${klass} batches` : "Choose a class first"}</option>
            {classBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2 lg:col-span-1 lg:text-right">
          <p className="text-xs text-ink-soft">Month</p>
          <p className="font-display text-2xl">{monthLabel(month)}</p>
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorText message={error} />
        </div>
      )}

      <div className="mt-4">
        {!klass ? (
          <EmptyState icon={<Users className="size-6" />} title="Choose a class and batch" body="Every student in that batch will be listed with this month's fee and a Paid switch." />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users className="size-6" />}
            title="No students here"
            body={classBatches.length === 0 ? `There are no running batches for Class ${klass}.` : "Confirmed students in this batch will be listed here."}
          />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line">
            <div className="overflow-x-auto">
              <table className="w-full text-sm sm:min-w-[640px]">
                <thead>
                  <tr className="border-b border-line bg-paper-2/50 text-left text-xs text-ink-soft">
                    <th scope="col" className="w-10 px-4 py-3 font-medium max-sm:hidden">#</th>
                    <th scope="col" className="py-3 pl-4 pr-2 font-medium sm:px-3">Student</th>
                    {batchId === "all" && classBatches.length > 1 && <th scope="col" className="px-3 py-3 font-medium max-md:hidden">Batch</th>}
                    <th scope="col" className="px-3 py-3 font-medium max-sm:hidden">Month</th>
                    <th scope="col" className="px-2 py-3 font-medium sm:px-3">Fee (BDT)</th>
                    <th scope="col" className="px-2 py-3 font-medium sm:px-3">Paid</th>
                    <th scope="col" className="w-12 py-3 pl-1 pr-3 text-right font-medium sm:w-14 sm:px-4">
                      <span className="sr-only">WhatsApp</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const paid = isPaid(r);
                    const locked = lockedPaid(r);
                    const working = Boolean(busy[key(r)]);
                    return (
                      <tr key={`${r.batch.id}-${r.user.uid}`} className={cn("border-b border-line last:border-b-0", paid && "bg-forest/[0.05]")}>
                        <td className="px-4 py-3 tabular-nums text-ink-faint max-sm:hidden">{i + 1}</td>
                        <td className="max-w-[9rem] py-3 pl-4 pr-2 sm:max-w-[16rem] sm:px-3">
                          <p className="truncate font-medium">{r.user.name || "Unnamed"}</p>
                          <p className="truncate text-xs text-ink-soft">{r.user.phone || r.user.email}</p>
                        </td>
                        {batchId === "all" && classBatches.length > 1 && <td className="px-3 py-3 text-ink-soft max-md:hidden">{r.batch.name}</td>}
                        <td className="whitespace-nowrap px-3 py-3 max-sm:hidden">{monthLabel(month)}</td>
                        <td className="px-2 py-3 sm:px-3">
                          {locked ? (
                            <p className="text-xs text-ink-soft">
                              {r.other.some((p) => p.method === "waived") ? "Waived" : `${bdt(r.other.reduce((s, p) => s + p.amount, 0))} recorded`}
                            </p>
                          ) : (
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={100}
                              aria-label={`Fee for ${r.user.name || "student"}`}
                              value={amountText(r)}
                              onChange={(e) => setTyped((t) => ({ ...t, [key(r)]: e.target.value }))}
                              onBlur={() => saveAmount(r)}
                              className={cn(adminInput, "w-[5.5rem] px-2.5 tabular-nums sm:w-28 sm:px-3.5")}
                            />
                          )}
                        </td>
                        <td className="px-2 py-3 sm:px-3">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={paid}
                            aria-label={`${r.user.name || "Student"} paid for ${monthLabel(month)}`}
                            title={locked ? "Paid with a payment recorded under All payments — change it there" : paid ? "Turn off to mark unpaid" : "Mark as paid"}
                            disabled={working || locked}
                            onClick={() => setPaid(r, !paid)}
                            className={cn(
                              "group inline-flex items-center gap-2.5 rounded-full py-1 pr-1 disabled:cursor-not-allowed",
                              working && "opacity-60",
                            )}
                          >
                            <span
                              className={cn(
                                "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
                                paid ? "bg-forest" : "bg-line group-hover:bg-ink-faint",
                                locked && "opacity-60",
                              )}
                            >
                              <span
                                className={cn(
                                  "grid size-5 place-items-center rounded-full bg-paper shadow transition-transform",
                                  paid ? "translate-x-6" : "translate-x-1",
                                )}
                              >
                                {paid && <Check className="size-3.5 text-forest" strokeWidth={3} aria-hidden />}
                              </span>
                            </span>
                            <span className={cn("text-sm max-sm:sr-only", paid ? "font-medium text-forest" : "text-ink-soft")}>{paid ? "Paid" : "Unpaid"}</span>
                          </button>
                        </td>
                        <td className="py-3 pl-1 pr-3 text-right sm:px-4">
                          <button
                            type="button"
                            onClick={() =>
                              setMessaging({
                                row: r,
                                amount: r.sheet?.amount ?? (locked ? r.other.reduce((s, p) => s + p.amount, 0) : amountOf(r) || defaultFee(r)),
                                paid,
                              })
                            }
                            aria-label={`WhatsApp message about ${r.user.name || "this student"}`}
                            title="WhatsApp message to parent"
                            className="inline-grid size-9 place-items-center rounded-full text-[#1fa855] hover:bg-paper-2"
                          >
                            <WhatsAppGlyph className="size-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap justify-between gap-2 bg-paper-2/50 px-5 py-3 text-sm">
              <span className="text-ink-soft">
                {paidRows.length} of {rows.length} paid for {monthLabel(month)}
              </span>
              <span className="font-semibold">{bdt(collected)} collected</span>
            </div>
          </div>
        )}
      </div>

      <Drawer open={Boolean(messaging)} title="WhatsApp message" onClose={() => setMessaging(null)}>
        {messaging && <MessageForm key={key(messaging.row)} {...messaging} month={month} payment={paymentLines(settings.payment)} onDone={() => setMessaging(null)} />}
      </Drawer>
    </div>
  );
}

type Recipient = "parent" | "student";

function MessageForm({ row, amount, paid, month, payment, onDone }: { row: Row; amount: number; paid: boolean; month: string; payment: string[]; onDone: () => void }) {
  const { user, batch } = row;
  const [to, setTo] = useState<Recipient>(user.parentPhone ? "parent" : "student");
  const [kind, setKind] = useState<"receipt" | "reminder">(paid ? "receipt" : "reminder");
  const build = (k: "receipt" | "reminder") => feeMessage({ studentName: user.name, batch, month, amount, paid: k === "receipt", payment });
  const [text, setText] = useState(() => build(kind));
  const phone = to === "parent" ? user.parentPhone : user.phone;

  function switchKind(k: "receipt" | "reminder") {
    setKind(k);
    setText(build(k));
  }

  return (
    <div className={drawerFormClass}>
      <DrawerBody>
        <div className="rounded-2xl border border-line px-4 py-3">
          <p className="font-medium">{user.name || "Unnamed"}</p>
          <p className="text-xs text-ink-soft">
            Class {batch.classLevel} · {batch.name} · {monthLabel(month)} · {paid ? "Paid" : "Unpaid"}
          </p>
        </div>

        <Field label="Send to">
          <Segmented<Recipient>
            options={["parent", "student"]}
            value={to}
            onChange={setTo}
            render={(r) => (r === "parent" ? `Parent${user.parentPhone ? ` · ${user.parentPhone}` : " · no number"}` : `Student${user.phone ? ` · ${user.phone}` : " · no number"}`)}
          />
        </Field>

        <Field label="Message type">
          <Segmented<"receipt" | "reminder">
            options={["receipt", "reminder"]}
            value={kind}
            onChange={switchKind}
            render={(k) => (k === "receipt" ? "Payment received" : "Fee reminder")}
          />
        </Field>

        <Field label="Message" hint="Edit before sending">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={11} className={cn(adminInput, "resize-y leading-relaxed")} />
        </Field>

        {!phone && <ErrorText message={`No ${to === "parent" ? "parent's" : "student's"} mobile number saved — add it in Students.`} />}
      </DrawerBody>
      <DrawerFooter>
        <button type="button" onClick={onDone} className="rounded-full border border-line px-5 py-2.5 text-sm hover:border-ink">
          Close
        </button>
        {phone ? (
          <a
            href={waLink(phone, text)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#1fa855] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <MessageCircle className="size-4" aria-hidden /> Send on WhatsApp
          </a>
        ) : (
          <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-paper-2 px-5 py-2.5 text-sm text-ink-faint">
            <MessageCircle className="size-4" aria-hidden /> Send on WhatsApp
          </span>
        )}
      </DrawerFooter>
    </div>
  );
}
