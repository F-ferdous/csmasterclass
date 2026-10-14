"use client";

import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Banknote, CheckCircle2, Download, MessageCircle, Pencil, Plus, Receipt, Search, Send, Trash2, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useBooks } from "@/components/dashboard/use-books";
import { classLevels, normalizeBatch, sortBatches } from "@/lib/coaching";
import { normalizeEnrollment, type EnrollmentRecord } from "@/lib/enrollments";
import { db } from "@/lib/firebase";
import { normalizeProfile } from "@/lib/normalize";
import { waLink } from "@/lib/phone";
import {
  bdt,
  dueLabels,
  dueStyles,
  methodLabels,
  monthLabel,
  normalizePayment,
  paymentMethods,
  paymentTypes,
  receiptMessage,
  thisMonth,
  todayISO,
  tuitionStatus,
  typeLabels,
  type DueStatus,
  type Payment,
  type PaymentMethod,
  type PaymentType,
} from "@/lib/payments";
import { priceLabels } from "@/lib/pricing";
import { bundle } from "@/lib/content";
import { rosterFor } from "@/lib/roster";
import type { Batch, ClassLevel, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, Field, GhostButton, PageHeader, PrimaryButton, Segmented, Spinner } from "./ui";

type View = "dues" | "ledger";
type DueRow = { user: UserProfile; batch: Batch; status: DueStatus; paid: number; remaining: number };

/** That month's tuition status for a student — added to receipts so parents see what's left. */
const tuitionAfter = (p: Pick<Payment, "uid" | "type" | "month">, batch: Batch | undefined, payments: Payment[]) =>
  p.type === "tuition" && batch?.fee
    ? tuitionStatus(batch.fee, payments.filter((x) => x.uid === p.uid && x.type === "tuition" && x.month === p.month))
    : undefined;

const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y ? new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
};

export function PaymentsManager() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [month, setMonth] = useState(() => thisMonth());
  const [view, setView] = useState<View>("dues");
  const [editing, setEditing] = useState<Partial<Payment> | null>(null);

  // Dues filters
  const [dueFilter, setDueFilter] = useState<DueStatus | "all" | "owing">("owing");
  const [classFilter, setClassFilter] = useState<ClassLevel | "all">("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [search, setSearch] = useState("");
  // Ledger filters
  const [typeFilter, setTypeFilter] = useState<PaymentType | "all">("all");
  const [allTime, setAllTime] = useState(false);

  useEffect(() => {
    const d = db();
    const stops = [
      onSnapshot(
        collection(d, "payments"),
        (snap) => setPayments(snap.docs.map((x) => normalizePayment(x.id, x.data()))),
        () => setPayments([]),
      ),
      onSnapshot(collection(d, "batches"), (snap) => setBatches(sortBatches(snap.docs.map((x) => normalizeBatch(x.id, x.data()))))),
      onSnapshot(collection(d, "students"), (snap) => setUsers(snap.docs.map((x) => normalizeProfile(x.id, x.data())))),
      onSnapshot(collection(d, "enrollments"), (snap) => setEnrollments(snap.docs.map((x) => normalizeEnrollment(x.id, x.data())))),
    ];
    return () => stops.forEach((s) => s());
  }, []);

  const all = payments ?? [];
  const batchById = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches]);
  const userById = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);

  // Tuition dues for the selected month: every confirmed student in a batch that has a fee.
  const running = batches.filter((b) => b.status !== "closed");
  const feeBatches = running.filter((b) => b.fee > 0);
  const noFeeBatches = running.filter((b) => b.fee === 0 && rosterFor(b, users, enrollments).length > 0);
  const dueRows: DueRow[] = feeBatches.flatMap((b) =>
    rosterFor(b, users, enrollments).map((u) => ({
      user: u,
      batch: b,
      ...tuitionStatus(
        b.fee,
        all.filter((p) => p.uid === u.uid && p.type === "tuition" && p.month === month),
      ),
    })),
  );

  const q = search.trim().toLowerCase();
  const matchesSearch = (name: string, email: string) => !q || name.toLowerCase().includes(q) || email.toLowerCase().includes(q);

  const visibleDues = dueRows.filter(
    (r) =>
      (dueFilter === "all" || (dueFilter === "owing" ? r.status === "unpaid" || r.status === "partial" : r.status === dueFilter)) &&
      (classFilter === "all" || r.batch.classLevel === classFilter) &&
      (batchFilter === "all" || r.batch.id === batchFilter) &&
      matchesSearch(r.user.name, r.user.email),
  );

  const inMonth = (p: Payment) => p.receivedOn.startsWith(month);
  const ledger = all
    .filter((p) => (allTime || inMonth(p)) && (typeFilter === "all" || p.type === typeFilter) && matchesSearch(p.studentName, p.email))
    .sort((a, b) => b.receivedOn.localeCompare(a.receivedOn) || (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

  // Month totals
  const collected = all.filter(inMonth).reduce((s, p) => s + p.amount, 0);
  const expected = dueRows.filter((r) => r.status !== "waived").reduce((s, r) => s + r.batch.fee, 0);
  const outstanding = dueRows.reduce((s, r) => s + r.remaining, 0);
  const settled = dueRows.filter((r) => r.status === "paid" || r.status === "waived").length;
  const bookSales = all.filter((p) => inMonth(p) && p.type === "book").reduce((s, p) => s + p.amount, 0);

  function exportCsv() {
    const rows = [
      ["Received", "Student", "Email", "Type", "Month", "Description", "Amount (BDT)", "Method", "Reference", "Note"],
      ...ledger.map((p) => [p.receivedOn, p.studentName, p.email, typeLabels[p.type], p.month, p.description, p.amount, methodLabels[p.method], p.reference, p.note]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${allTime ? "all" : month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function remove(p: Payment) {
    if (!window.confirm(`Delete this ${bdt(p.amount)} payment from ${p.studentName || p.email}? This can't be undone.`)) return;
    await deleteDoc(doc(db(), "payments", p.id));
  }

  if (payments === null) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Record tuition, book and other payments, and see who still owes for the month."
        actions={
          <>
            <GhostButton onClick={exportCsv}>
              <Download className="size-4" /> Export
            </GhostButton>
            <PrimaryButton onClick={() => setEditing({ type: "tuition", month, receivedOn: todayISO(), method: "cash" })}>
              <Plus className="size-4" /> Record payment
            </PrimaryButton>
          </>
        }
      />

      {/* Month + stats */}
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Month</span>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className={cn(adminInput, "w-auto")} />
        </label>
        <p className="text-sm text-ink-soft">{monthLabel(month)}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Collected" value={bdt(collected)} note="All payments received this month" />
        <StatCard icon={AlertTriangle} label="Tuition outstanding" value={bdt(outstanding)} note={expected ? `of ${bdt(expected)} expected` : "No fees set yet"} warn={outstanding > 0} />
        <StatCard icon={Banknote} label="Students paid" value={`${settled} / ${dueRows.length}`} note="Tuition for this month" />
        <StatCard icon={Receipt} label="Book sales" value={bdt(bookSales)} note="Received this month" />
      </div>

      {/* View switch */}
      <div className="mt-6 flex gap-1 rounded-full border border-line p-1 sm:w-fit">
        {(
          [
            ["dues", "Tuition dues"],
            ["ledger", "All payments"],
          ] as [View, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={cn("relative rounded-full px-4 py-2 text-sm", view === id ? "text-paper" : "text-ink-soft hover:text-ink")}
          >
            {view === id && <motion.span layoutId="payments-view" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
        <label className="relative">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student" className={cn(adminInput, "pl-10")} />
        </label>
        {view === "dues" ? (
          <>
            <select aria-label="Status" value={dueFilter} onChange={(e) => setDueFilter(e.target.value as typeof dueFilter)} className={adminInput}>
              <option value="owing">Owing (unpaid + partly paid)</option>
              <option value="all">All students</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partly paid</option>
              <option value="paid">Paid</option>
              <option value="waived">Waived</option>
            </select>
            <select aria-label="Class" value={classFilter} onChange={(e) => { setClassFilter(e.target.value as ClassLevel | "all"); setBatchFilter("all"); }} className={adminInput}>
              <option value="all">All classes</option>
              {classLevels.map((c) => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
            <select aria-label="Batch" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className={adminInput}>
              <option value="all">All batches</option>
              {feeBatches
                .filter((b) => classFilter === "all" || b.classLevel === classFilter)
                .map((b) => (
                  <option key={b.id} value={b.id}>Class {b.classLevel} · {b.name}</option>
                ))}
            </select>
          </>
        ) : (
          <>
            <select aria-label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as PaymentType | "all")} className={adminInput}>
              <option value="all">All types</option>
              {paymentTypes.map((t) => (
                <option key={t} value={t}>{typeLabels[t]}</option>
              ))}
            </select>
            <label className="flex items-center gap-2.5 rounded-xl border border-line px-3.5 py-2.5 text-sm">
              <input type="checkbox" checked={allTime} onChange={(e) => setAllTime(e.target.checked)} className="size-4 accent-[var(--forest)]" />
              All months
            </label>
          </>
        )}
      </div>

      <div className="mt-4">
        {view === "dues" ? (
          <>
            {noFeeBatches.length > 0 && (
              <p className="mb-3 flex items-start gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                <span>
                  No monthly fee set for {noFeeBatches.map((b) => `${b.name} (Class ${b.classLevel})`).join(", ")} — add one in Batches to track their dues.
                </span>
              </p>
            )}
            {dueRows.length === 0 ? (
              <EmptyState
                icon={<Wallet className="size-6" />}
                title="No tuition to track yet"
                body="Set a monthly fee on your batches (Batches → Edit → Monthly fee). Confirmed students in those batches will appear here each month."
              />
            ) : visibleDues.length === 0 ? (
              <EmptyState icon={<Wallet className="size-6" />} title={dueFilter === "owing" ? "Everyone has paid" : "No matches"} body={dueFilter === "owing" ? `No tuition is outstanding for ${monthLabel(month)}.` : "Try other filters."} />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-line">
                <AnimatePresence initial={false}>
                  {visibleDues.map((r) => (
                    <motion.div
                      key={`${r.user.uid}-${r.batch.id}`}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid gap-3 border-b border-line px-5 py-4 last:border-b-0 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center md:gap-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.user.name || "Unnamed"}</p>
                        <p className="truncate text-xs text-ink-soft">{r.user.phone || r.user.email}</p>
                      </div>
                      <p className="text-sm">
                        Class {r.batch.classLevel} · {r.batch.name}
                        <span className="block text-xs text-ink-soft">{bdt(r.batch.fee)} / month</span>
                      </p>
                      <div className="text-sm">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs", dueStyles[r.status])}>{dueLabels[r.status]}</span>
                        {r.status === "partial" && (
                          <span className="mt-1 block text-xs text-ink-soft">
                            Paid {bdt(r.paid)} · {bdt(r.remaining)} left
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 md:justify-end">
                        {(r.status === "unpaid" || r.status === "partial") && (
                          <>
                            {r.user.phone && (
                              <a
                                href={waLink(
                                  r.user.phone,
                                  `Hello ${r.user.name.split(" ")[0] || ""}, this is a friendly reminder that the tuition fee of ${bdt(r.remaining)} for ${monthLabel(month)} (${r.batch.name}) is due. Thank you! — CS Masterclass`,
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm hover:border-ink"
                              >
                                <MessageCircle className="size-4" aria-hidden /> Remind
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setEditing({
                                  uid: r.user.uid,
                                  type: "tuition",
                                  month,
                                  amount: r.remaining,
                                  method: "cash",
                                  receivedOn: todayISO(),
                                  batchId: r.batch.id,
                                })
                              }
                              className="inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-2 text-sm font-semibold text-forest-ink hover:bg-ink hover:text-paper"
                            >
                              <Plus className="size-4" aria-hidden /> Record
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : ledger.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-6" />}
            title="No payments recorded"
            body={allTime ? "Payments you record will be listed here." : `Nothing recorded for ${monthLabel(month)}.`}
          />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line">
            {ledger.map((p) => {
              const parentPhone = userById.get(p.uid)?.parentPhone;
              const batch = batchById.get(p.batchId);
              return (
              <div key={p.id} className="grid gap-2 border-b border-line px-5 py-4 last:border-b-0 md:grid-cols-[80px_1.3fr_1.4fr_auto_auto] md:items-center md:gap-5">
                <p className="text-sm text-ink-soft">{shortDate(p.receivedOn)}</p>
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.studentName || "—"}</p>
                  <p className="truncate text-xs text-ink-soft">{p.email}</p>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="truncate">
                    <span className="mr-1.5 rounded-full bg-paper-2 px-2 py-0.5 text-xs">{typeLabels[p.type]}</span>
                    {p.description || (p.type === "tuition" ? monthLabel(p.month) : "")}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-soft">
                    {methodLabels[p.method]}
                    {p.reference ? ` · ${p.reference}` : ""}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <p className={cn("font-display text-lg tabular-nums md:text-right", p.method === "waived" && "text-ink-soft")}>
                  {p.method === "waived" ? "Waived" : bdt(p.amount)}
                </p>
                <div className="flex gap-0.5 md:justify-end">
                  {parentPhone && (
                    <a
                      href={waLink(parentPhone, receiptMessage(p, { batch, tuition: tuitionAfter(p, batch, all) }))}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Send receipt to parent on WhatsApp"
                      title="Send receipt to parent"
                      className="grid size-9 place-items-center rounded-full text-forest hover:bg-paper-2"
                    >
                      <Send className="size-4" />
                    </a>
                  )}
                  <button type="button" onClick={() => setEditing(p)} aria-label="Edit payment" className="grid size-9 place-items-center rounded-full hover:bg-paper-2">
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" onClick={() => remove(p)} aria-label="Delete payment" className="grid size-9 place-items-center rounded-full text-ember hover:bg-paper-2">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              );
            })}
            <div className="flex justify-between bg-paper-2/50 px-5 py-3 text-sm">
              <span className="text-ink-soft">
                {ledger.length} payment{ledger.length === 1 ? "" : "s"}
              </span>
              <span className="font-semibold">{bdt(ledger.reduce((s, p) => s + p.amount, 0))}</span>
            </div>
          </div>
        )}
      </div>

      <Drawer open={Boolean(editing)} title={editing?.id ? "Edit payment" : "Record payment"} onClose={() => setEditing(null)}>
        {editing && (
          <PaymentForm
            key={editing.id ?? `${editing.uid ?? "new"}-${editing.month ?? ""}`}
            initial={editing}
            users={users.filter((u) => u.role === "student" || u.uid === editing.uid)}
            batchById={batchById}
            payments={all}
            onDone={() => setEditing(null)}
          />
        )}
      </Drawer>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, note, warn }: { icon: typeof Wallet; label: string; value: string; note: string; warn?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-2xl border p-4", warn ? "border-ember/40 bg-ember/[0.04]" : "border-line")}>
      <p className={cn("flex items-center gap-1.5 text-xs", warn ? "text-ember" : "text-ink-soft")}>
        <Icon className="size-3.5" aria-hidden /> {label}
      </p>
      <p className="mt-1.5 font-display text-2xl tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{note}</p>
    </motion.div>
  );
}

function PaymentForm({
  initial,
  users,
  batchById,
  payments,
  onDone,
}: {
  initial: Partial<Payment>;
  users: UserProfile[];
  batchById: Map<string, Batch>;
  payments: Payment[];
  onDone: () => void;
}) {
  const books = useBooks();
  const [uid, setUid] = useState(initial.uid ?? "");
  const [studentSearch, setStudentSearch] = useState("");
  const [type, setType] = useState<PaymentType>(initial.type ?? "tuition");
  const [month, setMonth] = useState(initial.month || thisMonth());
  const [bookChoice, setBookChoice] = useState(""); // "slug|kind"
  const [description, setDescription] = useState(initial.description ?? "");
  const [amount, setAmount] = useState<string>(initial.amount !== undefined ? String(initial.amount) : "");
  const [method, setMethod] = useState<PaymentMethod>(initial.method ?? "cash");
  const [reference, setReference] = useState(initial.reference ?? "");
  const [receivedOn, setReceivedOn] = useState(initial.receivedOn || todayISO());
  const [note, setNote] = useState(initial.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // A new payment, once saved — the drawer then offers to send the receipt.
  const [saved, setSaved] = useState<(Pick<Payment, "uid"> & Parameters<typeof receiptMessage>[0]) | null>(null);

  const student = users.find((u) => u.uid === uid);
  const batch = student ? batchById.get(initial.batchId || student.batchId) : undefined;
  const q = studentSearch.trim().toLowerCase();
  const matches = users
    .filter((u) => !q || [u.name, u.email, u.phone].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
    .slice(0, 40);

  // Tuition: show what's already paid for that month, and suggest the balance.
  const alreadyPaid = student
    ? payments.filter((p) => p.uid === student.uid && p.type === "tuition" && p.month === month && p.id !== initial.id).reduce((s, p) => s + p.amount, 0)
    : 0;

  function chooseBook(value: string) {
    setBookChoice(value);
    if (value.startsWith("bundle-")) {
      const option = bundle.options.find((o) => `bundle-${o.kind}` === value);
      if (option) {
        setAmount(String(option.bdt));
        setDescription(`${bundle.title} — ${priceLabels[option.kind]}`);
      }
      return;
    }
    const [slug, kind] = value.split("|");
    const book = books.find((b) => b.slug === slug);
    const price = book?.prices.find((p) => p.kind === kind);
    if (book && price) {
      setAmount(String(price.bdt));
      setDescription(`${book.title} — ${priceLabels[price.kind]}`);
    }
  }

  async function save() {
    if (!student) return setError("Choose a student.");
    const value = method === "waived" ? 0 : Number(amount);
    if (method !== "waived" && (!Number.isFinite(value) || value <= 0)) return setError("Enter the amount received.");
    if (type === "tuition" && !month) return setError("Choose the tuition month.");
    setSaving(true);
    setError("");
    const data = {
      uid: student.uid,
      studentName: student.name,
      email: student.email,
      batchId: batch?.id ?? student.batchId,
      classLevel: student.classLevel,
      type,
      month: type === "tuition" ? month : "",
      description: description.trim() || (type === "tuition" ? `Tuition — ${monthLabel(month)}` : typeLabels[type]),
      amount: value,
      method,
      reference: reference.trim(),
      receivedOn,
      note: note.trim(),
      updatedAt: serverTimestamp(),
    };
    try {
      if (initial.id) {
        await setDoc(doc(db(), "payments", initial.id), data, { merge: true });
        onDone();
      } else {
        await addDoc(collection(db(), "payments"), { ...data, createdAt: serverTimestamp() });
        setSaved(data);
        setSaving(false);
      }
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  if (saved && student) {
    return <ReceiptStep payment={saved} student={student} batch={batch} tuition={tuitionAfter(saved, batch, payments)} onDone={onDone} />;
  }

  return (
    <div className={drawerFormClass}>
      <DrawerBody>
        {/* Student */}
        <div>
          <p className="mb-1.5 text-sm font-medium">Student</p>
          {student ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{student.name || "Unnamed"}</p>
                <p className="truncate text-xs text-ink-soft">
                  {student.email}
                  {batch ? ` · Class ${batch.classLevel} · ${batch.name}` : ""}
                </p>
              </div>
              {!initial.id && (
                <button type="button" onClick={() => setUid("")} className="text-sm underline underline-offset-4">
                  Change
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-line">
              <label className="relative block border-b border-line">
                <span className="sr-only">Search students</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
                <input
                  autoFocus
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search name, email or phone"
                  className="w-full rounded-t-2xl bg-transparent py-3 pl-10 pr-3 text-sm outline-none"
                />
              </label>
              <ul className="max-h-56 overflow-y-auto" data-lenis-prevent>
                {matches.length === 0 && <li className="px-4 py-3 text-sm text-ink-soft">No students found.</li>}
                {matches.map((u) => (
                  <li key={u.uid}>
                    <button
                      type="button"
                      onClick={() => {
                        setUid(u.uid);
                        const b = batchById.get(u.batchId);
                        if (type === "tuition" && b?.fee && !amount) setAmount(String(b.fee));
                      }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-paper-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{u.name || "Unnamed"}</span>
                        <span className="block truncate text-xs text-ink-soft">{u.email}</span>
                      </span>
                      {u.classLevel && <span className="shrink-0 text-xs text-ink-faint">Class {u.classLevel}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Field label="Payment for">
          <Segmented options={paymentTypes} value={type} onChange={setType} render={(t) => typeLabels[t]} />
        </Field>

        {type === "tuition" && (
          <Field label="Tuition month">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={adminInput} />
            {student && (
              <span className="mt-1.5 block text-xs text-ink-soft">
                {batch?.fee ? `Fee ${bdt(batch.fee)}` : "No monthly fee set for this batch"}
                {alreadyPaid > 0 ? ` · already paid ${bdt(alreadyPaid)} for ${monthLabel(month)}` : ""}
              </span>
            )}
          </Field>
        )}

        {type === "book" && (
          <Field label="Book">
            <select value={bookChoice} onChange={(e) => chooseBook(e.target.value)} className={adminInput}>
              <option value="">Choose a book and edition…</option>
              {books.flatMap((b) =>
                b.prices.map((p) => (
                  <option key={`${b.slug}|${p.kind}`} value={`${b.slug}|${p.kind}`}>
                    {b.title} — {priceLabels[p.kind]} ({bdt(p.bdt)})
                  </option>
                )),
              )}
              {bundle.options.map((o) => (
                <option key={o.kind} value={`bundle-${o.kind}`}>
                  {bundle.title} — {priceLabels[o.kind]} ({bdt(o.bdt)})
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Description" hint="Optional">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={adminInput}
            placeholder={type === "tuition" ? `Tuition — ${monthLabel(month)}` : type === "admission" ? "Admission fee" : ""}
          />
        </Field>

        <Field label="How was it paid?">
          <Segmented options={paymentMethods} value={method} onChange={setMethod} render={(m) => methodLabels[m]} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Amount (BDT)">
            <input
              type="number"
              min={0}
              value={method === "waived" ? "0" : amount}
              disabled={method === "waived"}
              onChange={(e) => setAmount(e.target.value)}
              className={cn(adminInput, method === "waived" && "opacity-60")}
              placeholder="e.g. 3000"
            />
          </Field>
          <Field label="Received on">
            <input type="date" value={receivedOn} max={todayISO()} onChange={(e) => setReceivedOn(e.target.value)} className={adminInput} />
          </Field>
        </div>

        {method !== "cash" && method !== "waived" && (
          <Field label="Transaction ID / reference" hint="Optional">
            <input value={reference} onChange={(e) => setReference(e.target.value)} className={adminInput} placeholder="e.g. bKash TrxID 9A1B2C3D" />
          </Field>
        )}

        <Field label="Note" hint="Optional">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={adminInput} placeholder={method === "waived" ? "Reason for waiver" : ""} />
        </Field>

        <ErrorText message={error} />
      </DrawerBody>
      <DrawerFooter>
        <GhostButton onClick={onDone}>Cancel</GhostButton>
        <PrimaryButton onClick={save} loading={saving}>
          {initial.id ? "Save changes" : "Record payment"}
        </PrimaryButton>
      </DrawerFooter>
    </div>
  );
}

/** Shown after recording a payment: preview the receipt and send it to the parent on WhatsApp. */
function ReceiptStep({
  payment,
  student,
  batch,
  tuition,
  onDone,
}: {
  payment: Parameters<typeof receiptMessage>[0];
  student: UserProfile;
  batch?: Batch;
  tuition?: ReturnType<typeof tuitionStatus>;
  onDone: () => void;
}) {
  const [parentPhone, setParentPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const message = receiptMessage(payment, { batch, tuition });

  async function saveParentPhone() {
    const phone = parentPhone.trim();
    if (phone.replace(/\D/g, "").length < 10) return setError("Enter the parent's mobile number, e.g. 01712345678.");
    setSaving(true);
    setError("");
    try {
      // The live users list then picks it up and the Send button appears.
      await updateDoc(doc(db(), "students", student.uid), { parentPhone: phone, updatedAt: serverTimestamp() });
    } catch (err) {
      setError((err as Error).message);
    }
    setSaving(false);
  }

  return (
    <div className={drawerFormClass}>
      <DrawerBody>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-forest/30 bg-forest/10 px-4 py-3.5"
        >
          <CheckCircle2 className="size-5 shrink-0 text-forest" aria-hidden />
          <p className="text-sm">
            <span className="font-semibold">Payment recorded.</span> Send the receipt to {student.name ? `${student.name.split(" ")[0]}'s` : "the"} parent?
          </p>
        </motion.div>

        <div>
          <p className="mb-1.5 text-sm font-medium">Receipt message</p>
          <p className="whitespace-pre-wrap rounded-2xl border border-line bg-paper-2/50 px-4 py-3.5 text-sm leading-relaxed">{message}</p>
        </div>

        {student.parentPhone ? (
          <p className="text-sm text-ink-soft">
            Parent&apos;s phone: <span className="font-medium text-ink">{student.parentPhone}</span>
          </p>
        ) : (
          <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4">
            <p className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
              No parent&apos;s phone saved for {student.name || "this student"}. Add it once and it&apos;s remembered for next time.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveParentPhone()}
                placeholder="01XXXXXXXXX"
                aria-label="Parent's phone"
                className={adminInput}
              />
              <PrimaryButton onClick={saveParentPhone} loading={saving} className="shrink-0">
                Save
              </PrimaryButton>
            </div>
            <ErrorText message={error} />
          </div>
        )}
      </DrawerBody>
      <DrawerFooter>
        <GhostButton onClick={onDone}>{student.parentPhone ? "Skip" : "Done"}</GhostButton>
        {student.phone && (
          <a
            href={waLink(student.phone, message.replace("Dear Parent,", `Dear ${student.name.split(" ")[0] || "Student"},`))}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm transition-colors hover:border-ink"
          >
            <MessageCircle className="size-4" aria-hidden /> Send to student
          </a>
        )}
        {student.parentPhone && (
          <a
            href={waLink(student.parentPhone, message)}
            target="_blank"
            rel="noreferrer"
            onClick={() => setTimeout(onDone, 300)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-forest-ink transition-colors hover:bg-ink hover:text-paper"
          >
            <Send className="size-4" aria-hidden /> Send to parent on WhatsApp
          </a>
        )}
      </DrawerFooter>
    </div>
  );
}
