"use client";

import { arrayUnion, collection, doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ChevronRight, Download, Globe, Link2, MessageCircle, Minus, PackageCheck, Phone, Plus, Search, ShoppingBag, Trash2, Truck, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useBooks } from "@/components/dashboard/use-books";
import { db } from "@/lib/firebase";
import { normalizeProfile } from "@/lib/normalize";
import {
  confirmMessage,
  itemLabel,
  itemsSubtotal,
  needsDelivery,
  newOrderRef,
  normalizeOrder,
  orderOptions,
  orderSlugs,
  orderSources,
  orderStatuses,
  orderSummary,
  orderTotal,
  paidMessage,
  sentMessage,
  sourceLabels,
  statusLabels,
  statusStyles,
  type Order,
  type OrderItem,
  type OrderPayment,
  type OrderSource,
  type OrderStatus,
} from "@/lib/orders";
import { bdt, methodLabels, paymentMethods, thisMonth, todayISO, type PaymentMethod } from "@/lib/payments";
import { phoneKey, waLink } from "@/lib/phone";
import { priceLabels } from "@/lib/pricing";
import type { Book, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, Field, GhostButton, PageHeader, PrimaryButton, Segmented, Spinner } from "./ui";

type Tab = "active" | OrderStatus | "all";
const tabs: Tab[] = ["active", "new", "confirmed", "sent", "delivered", "cancelled", "all"];
const tabLabels: Record<Tab, string> = { active: "Open", all: "All", ...statusLabels };
const isOpen = (o: Order) => o.status === "new" || o.status === "confirmed" || o.status === "sent";
const inTab = (o: Order, tab: Tab) => (tab === "all" ? true : tab === "active" ? isOpen(o) : o.status === tab);

const shortDate = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—");
const methods = paymentMethods.filter((m) => m !== "waived");

export function OrdersManager() {
  const books = useBooks();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tab, setTab] = useState<Tab>("active");
  const [pay, setPay] = useState<OrderPayment | "all">("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | "new" | null>(null);

  useEffect(() => {
    const d = db();
    const stops = [
      onSnapshot(
        query(collection(d, "orders"), orderBy("createdAt", "desc")),
        (snap) => setOrders(snap.docs.map((x) => normalizeOrder(x.id, x.data()))),
        () => setOrders([]),
      ),
      onSnapshot(collection(d, "students"), (snap) => setUsers(snap.docs.map((x) => normalizeProfile(x.id, x.data())).filter((u) => u.role === "student"))),
    ];
    return () => stops.forEach((s) => s());
  }, []);

  const all = useMemo(() => orders ?? [], [orders]);
  const q = search.trim().toLowerCase();
  const visible = all.filter(
    (o) =>
      inTab(o, tab) &&
      (pay === "all" || o.paymentStatus === pay) &&
      (!q || [o.ref, o.name, o.phone, o.email].some((v) => v.toLowerCase().includes(q))),
  );

  const month = thisMonth();
  const live = all.filter((o) => o.status !== "cancelled");
  const unpaid = live.filter((o) => o.paymentStatus === "unpaid");
  const stats = {
    fresh: all.filter((o) => o.status === "new").length,
    unpaidTotal: unpaid.reduce((s, o) => s + orderTotal(o), 0),
    toSend: all.filter((o) => o.status === "confirmed").length,
    sales: live.filter((o) => o.paymentStatus === "paid" && o.paidOn.startsWith(month)).reduce((s, o) => s + orderTotal(o), 0),
  };

  function exportCsv() {
    const rows = [
      ["Order", "Date", "Name", "Phone", "Email", "Address", "Items", "Subtotal", "Delivery", "Discount", "Total", "Status", "Payment", "Method", "Paid on", "Source"],
      ...visible.map((o) => [
        o.ref,
        o.createdAt ? o.createdAt.toISOString().slice(0, 10) : "",
        o.name,
        o.phone,
        o.email,
        o.address,
        orderSummary(o.items),
        o.subtotal,
        o.deliveryFee,
        o.discount,
        orderTotal(o),
        statusLabels[o.status],
        o.paymentStatus === "paid" ? "Paid" : "Unpaid",
        o.paymentMethod ? methodLabels[o.paymentMethod] : "",
        o.paidOn,
        sourceLabels[o.source],
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (orders === null) return <Spinner />;
  const open = openId === "new" ? null : all.find((o) => o.id === openId) ?? null;

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Book orders from the website, WhatsApp and class — confirm, take payment, send and deliver."
        actions={
          <>
            <GhostButton onClick={exportCsv}>
              <Download className="size-4" /> Export
            </GhostButton>
            <PrimaryButton onClick={() => setOpenId("new")}>
              <Plus className="size-4" /> New order
            </PrimaryButton>
          </>
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={ShoppingBag} label="New orders" value={String(stats.fresh)} note="Waiting to be confirmed" warn={stats.fresh > 0} onClick={() => setTab("new")} />
        <StatCard icon={Wallet} label="Awaiting payment" value={bdt(stats.unpaidTotal)} note={`${unpaid.length} order${unpaid.length === 1 ? "" : "s"}`} onClick={() => { setTab("active"); setPay("unpaid"); }} />
        <StatCard icon={Truck} label="To send" value={String(stats.toSend)} note="Confirmed, not sent yet" onClick={() => setTab("confirmed")} />
        <StatCard icon={PackageCheck} label="Sales this month" value={bdt(stats.sales)} note="Paid orders" />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-full border border-line p-1 [scrollbar-width:none] sm:w-fit" role="tablist" aria-label="Order status">
        {tabs.map((t) => {
          const count = all.filter((o) => inTab(o, t)).length;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn("relative shrink-0 rounded-full px-4 py-2 text-sm", tab === t ? "text-paper" : "text-ink-soft hover:text-ink")}
            >
              {tab === t && <motion.span layoutId="orders-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className="relative">
                {tabLabels[t]}
                <span className="ml-1.5 text-xs opacity-60">{count}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="relative">
          <span className="sr-only">Search orders</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order no., name or phone" className={cn(adminInput, "pl-10")} />
        </label>
        <select aria-label="Payment" value={pay} onChange={(e) => setPay(e.target.value as OrderPayment | "all")} className={adminInput}>
          <option value="all">Paid and unpaid</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div className="mt-4">
        {all.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="size-6" />}
            title="No orders yet"
            body="Orders placed on the website's order page appear here. You can also add WhatsApp, phone or in-class orders yourself."
            action={<PrimaryButton onClick={() => setOpenId("new")}><Plus className="size-4" /> New order</PrimaryButton>}
          />
        ) : visible.length === 0 ? (
          <EmptyState icon={<Search className="size-6" />} title="No matches" body="Try another tab, payment filter or search." />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line">
            <AnimatePresence initial={false}>
              {visible.map((o) => (
                <motion.button
                  key={o.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  type="button"
                  onClick={() => setOpenId(o.id)}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-line px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-paper-2/50 md:grid-cols-[130px_1.6fr_0.9fr_110px_20px]"
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-xs font-semibold">{o.ref}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
                      {shortDate(o.createdAt)} · {o.source === "website" ? <Globe className="size-3" aria-label="Website" /> : sourceLabels[o.source]}
                    </span>
                  </span>
                  <span className="col-span-2 min-w-0 md:col-span-1">
                    <span className="block truncate font-medium">{o.name || "No name"}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      {o.phone} · {orderSummary(o.items)}
                    </span>
                  </span>
                  <span className="text-sm md:text-right">
                    <span className="block font-display text-lg tabular-nums">{bdt(orderTotal(o))}</span>
                    <span className={cn("text-xs", o.paymentStatus === "paid" ? "text-forest" : "text-ember")}>{o.paymentStatus === "paid" ? "Paid" : "Unpaid"}</span>
                  </span>
                  <span className="justify-self-end md:justify-self-start">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statusStyles[o.status])}>{statusLabels[o.status]}</span>
                  </span>
                  <ChevronRight className="block max-md:hidden size-4 text-ink-faint" aria-hidden />
                </motion.button>
              ))}
            </AnimatePresence>
            <div className="flex justify-between bg-paper-2/50 px-5 py-3 text-sm">
              <span className="text-ink-soft">
                {visible.length} order{visible.length === 1 ? "" : "s"}
              </span>
              <span className="font-semibold">{bdt(visible.filter((o) => o.status !== "cancelled").reduce((s, o) => s + orderTotal(o), 0))}</span>
            </div>
          </div>
        )}
      </div>

      <Drawer open={openId !== null} title={openId === "new" ? "New order" : open ? `Order ${open.ref}` : "Order"} onClose={() => setOpenId(null)}>
        {(openId === "new" || open) && (
          <OrderEditor key={open?.id ?? "new"} initial={open} users={users} books={books} onDone={() => setOpenId(null)} />
        )}
      </Drawer>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, note, warn, onClick }: { icon: typeof Wallet; label: string; value: string; note: string; warn?: boolean; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn("rounded-2xl border p-4 text-left transition-colors", warn ? "border-ember/40 bg-ember/[0.04]" : "border-line", onClick && "hover:border-ink")}
    >
      <p className={cn("flex items-center gap-1.5 text-xs", warn ? "text-ember" : "text-ink-soft")}>
        <Icon className="size-3.5" aria-hidden /> {label}
      </p>
      <p className="mt-1.5 font-display text-2xl tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{note}</p>
    </Tag>
  );
}

/* ───────────── Edit / create ───────────── */

function OrderEditor({ initial, users, books, onDone }: { initial: Order | null; users: UserProfile[]; books: Book[]; onDone: () => void }) {
  const [ref] = useState(() => initial?.ref ?? newOrderRef());
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [items, setItems] = useState<OrderItem[]>(initial?.items ?? []);
  const [deliveryFee, setDeliveryFee] = useState(String(initial?.deliveryFee ?? 0));
  const [discount, setDiscount] = useState(String(initial?.discount ?? 0));
  const [status, setStatus] = useState<OrderStatus>(initial?.status ?? "confirmed");
  const [source, setSource] = useState<OrderSource>(initial?.source ?? "whatsapp");
  const [paymentStatus, setPaymentStatus] = useState<OrderPayment>(initial?.paymentStatus ?? "unpaid");
  const [method, setMethod] = useState<PaymentMethod>(initial?.paymentMethod || "bkash");
  const [paymentRef, setPaymentRef] = useState(initial?.paymentRef ?? "");
  const [paidOn, setPaidOn] = useState(initial?.paidOn || todayISO());
  const [uid, setUid] = useState(initial?.uid ?? "");
  const [adminNote, setAdminNote] = useState(initial?.adminNote ?? "");
  const [busy, setBusy] = useState<"" | "save" | "delete">("");
  const [error, setError] = useState("");

  const options = orderOptions(books);
  const subtotal = itemsSubtotal(items);
  const fee = Math.max(0, Number(deliveryFee) || 0);
  const off = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, subtotal + fee - off);
  const student = users.find((u) => u.uid === uid);
  const key = phoneKey(phone);
  const suggested = !uid && key ? users.find((u) => phoneKey(u.phone) === key) : undefined;

  // The order as it stands in the form — used for the WhatsApp messages.
  const draft: Order = {
    id: initial?.id ?? "",
    ref,
    uid,
    name,
    phone,
    email,
    address,
    note,
    items,
    subtotal,
    deliveryFee: fee,
    discount: off,
    status,
    source,
    paymentStatus,
    paymentMethod: paymentStatus === "paid" ? method : "",
    paymentRef,
    paidOn,
    paymentId: initial?.paymentId ?? "",
    adminNote,
    createdAt: initial?.createdAt ?? null,
  };

  function addItem(value: string) {
    const opt = options.find((o) => `${o.slug}|${o.kind}` === value);
    if (!opt) return;
    setItems((list) => {
      const i = list.findIndex((x) => x.slug === opt.slug && x.kind === opt.kind);
      if (i === -1) return [...list, opt];
      return list.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x));
    });
  }
  const setQty = (i: number, qty: number) => setItems((list) => list.map((x, j) => (j === i ? { ...x, qty: Math.min(99, Math.max(1, qty)) } : x)));

  async function save() {
    if (!name.trim()) return setError("Add the customer's name.");
    if (!phone.trim()) return setError("Add the customer's phone number.");
    if (items.length === 0) return setError("Add at least one book.");
    if (initial?.paymentId && paymentStatus === "unpaid" && !window.confirm("Mark as unpaid? This also removes the payment from Payments.")) return;
    setBusy("save");
    setError("");
    const d = db();
    const batch = writeBatch(d);
    const orderDoc = initial ? doc(d, "orders", initial.id) : doc(collection(d, "orders"));

    // Paid orders keep one matching book payment in Payments, so the ledger and reports include them.
    let paymentId = initial?.paymentId ?? "";
    if (paymentStatus === "paid") {
      const payDoc = paymentId ? doc(d, "payments", paymentId) : doc(collection(d, "payments"));
      batch.set(
        payDoc,
        {
          uid,
          studentName: name.trim(),
          email: email.trim(),
          batchId: student?.batchId ?? "",
          classLevel: student?.classLevel ?? "",
          type: "book",
          month: "",
          description: `Order ${ref} — ${orderSummary(items)}`.slice(0, 300),
          amount: total,
          method,
          reference: paymentRef.trim(),
          receivedOn: paidOn,
          note: "",
          orderId: orderDoc.id,
          updatedAt: serverTimestamp(),
          ...(paymentId ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true },
      );
      paymentId = payDoc.id;
    } else if (paymentId) {
      batch.delete(doc(d, "payments", paymentId));
      paymentId = "";
    }

    batch.set(
      orderDoc,
      {
        ref,
        uid,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        note: note.trim(),
        items,
        subtotal,
        deliveryFee: fee,
        discount: off,
        status,
        source,
        paymentStatus,
        paymentMethod: paymentStatus === "paid" ? method : "",
        paymentRef: paymentStatus === "paid" ? paymentRef.trim() : "",
        paidOn: paymentStatus === "paid" ? paidOn : "",
        paymentId,
        adminNote: adminNote.trim(),
        updatedAt: serverTimestamp(),
        ...(initial ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true },
    );

    // Delivered to a student → tick the books in their "Books bought".
    if (status === "delivered" && initial?.status !== "delivered" && uid) {
      batch.update(doc(d, "students", uid), { booksOwned: arrayUnion(...orderSlugs(items)), updatedAt: serverTimestamp() });
    }

    try {
      await batch.commit();
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy("");
    }
  }

  async function remove() {
    if (!initial) return;
    if (!window.confirm(`Delete order ${initial.ref}${initial.paymentId ? " and its payment record" : ""}? This can't be undone.`)) return;
    setBusy("delete");
    const d = db();
    const batch = writeBatch(d);
    batch.delete(doc(d, "orders", initial.id));
    if (initial.paymentId) batch.delete(doc(d, "payments", initial.paymentId));
    try {
      await batch.commit();
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy("");
    }
  }

  const messages = [
    { label: "Confirm order", text: confirmMessage(draft), show: true },
    { label: "Payment received", text: paidMessage(draft), show: paymentStatus === "paid" },
    { label: needsDelivery(items) ? "On its way" : "Books sent", text: sentMessage(draft), show: status === "sent" || status === "delivered" },
  ].filter((m) => m.show);

  return (
    <div className={drawerFormClass}>
      <DrawerBody>
        {initial && (
          <p className="text-xs text-ink-soft">
            Placed {initial.createdAt ? initial.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : ""} ·{" "}
            {sourceLabels[initial.source]}
          </p>
        )}

        <Block title="Status">
          <Segmented options={orderStatuses} value={status} onChange={setStatus} render={(s) => statusLabels[s]} />
          {status === "delivered" && initial?.status !== "delivered" && (
            <p className="mt-2 text-xs text-ink-soft">
              {uid ? "Saving ticks these books in the student's “Books bought”." : "Link a student below to tick these books in their “Books bought”."}
            </p>
          )}
        </Block>

        {/* Customer */}
        <Block title="Customer">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} className={adminInput} />
            </Field>
            <Field label="Phone">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className={adminInput} placeholder="01XXXXXXXXX" />
            </Field>
          </div>
          <Field label="Email" hint="Optional" className="mt-4">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={adminInput} />
          </Field>
          <Field label="Delivery address" hint={needsDelivery(items) ? "Needed for printed books" : "Only for printed books"} className="mt-4">
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={adminInput} />
          </Field>
          <Field label="Customer's note" hint="Optional" className="mt-4">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={adminInput} />
          </Field>
          {phone && (
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm hover:border-ink">
                <Phone className="size-4" aria-hidden /> Call
              </a>
              <a href={waLink(phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm hover:border-ink">
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            </div>
          )}
          {!initial && (
            <Field label="Order came in by" className="mt-4">
              <Segmented options={orderSources} value={source} onChange={setSource} render={(s) => sourceLabels[s]} />
            </Field>
          )}
        </Block>

        <Block title="Student">
          <StudentLink users={users} uid={uid} onChange={setUid} suggested={suggested} />
        </Block>

        {/* Items */}
        <Block title="Books">
          {items.length > 0 && (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {items.map((i, idx) => (
                <li key={`${i.slug}|${i.kind}`} className="flex items-center gap-3 px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.title}</p>
                    <p className="text-xs text-ink-soft">
                      {priceLabels[i.kind]} · {bdt(i.price)}
                    </p>
                  </div>
                  <div className="inline-flex items-center rounded-full border border-line">
                    <button type="button" aria-label="Fewer" onClick={() => setQty(idx, i.qty - 1)} className="grid size-7 place-items-center">
                      <Minus className="size-3.5" />
                    </button>
                    <span className="min-w-6 text-center text-sm tabular-nums">{i.qty}</span>
                    <button type="button" aria-label="More" onClick={() => setQty(idx, i.qty + 1)} className="grid size-7 place-items-center">
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <p className="w-24 text-right text-sm font-semibold tabular-nums">{bdt(i.price * i.qty)}</p>
                  <button type="button" aria-label={`Remove ${itemLabel(i)}`} onClick={() => setItems((l) => l.filter((_, j) => j !== idx))} className="grid size-7 place-items-center rounded-full text-ink-soft hover:bg-paper-2">
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <select value="" onChange={(e) => addItem(e.target.value)} className={cn(adminInput, items.length > 0 && "mt-3")} aria-label="Add a book">
            <option value="">+ Add a book…</option>
            {options.map((o) => (
              <option key={`${o.slug}|${o.kind}`} value={`${o.slug}|${o.kind}`}>
                {o.title} — {priceLabels[o.kind]} ({bdt(o.price)})
              </option>
            ))}
          </select>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Delivery charge (BDT)">
              <input type="number" min={0} value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className={adminInput} />
            </Field>
            <Field label="Discount (BDT)">
              <input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} className={adminInput} />
            </Field>
          </div>
          <div className="mt-4 space-y-1 rounded-2xl bg-paper-2/60 px-4 py-3 text-sm">
            <p className="flex justify-between"><span className="text-ink-soft">Books</span><span className="tabular-nums">{bdt(subtotal)}</span></p>
            {fee > 0 && <p className="flex justify-between"><span className="text-ink-soft">Delivery</span><span className="tabular-nums">{bdt(fee)}</span></p>}
            {off > 0 && <p className="flex justify-between"><span className="text-ink-soft">Discount</span><span className="tabular-nums">−{bdt(off)}</span></p>}
            <p className="flex justify-between border-t border-line pt-1.5 font-semibold"><span>Total</span><span className="font-display text-lg tabular-nums">{bdt(total)}</span></p>
          </div>
        </Block>

        {/* Payment */}
        <Block title="Payment">
          <Segmented options={["unpaid", "paid"] as const} value={paymentStatus} onChange={setPaymentStatus} render={(p) => (p === "paid" ? "Paid" : "Unpaid")} />
          {paymentStatus === "paid" && (
            <div className="mt-4 space-y-4">
              <Segmented options={methods} value={method} onChange={setMethod} render={(m) => methodLabels[m]} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Received on">
                  <input type="date" value={paidOn} max={todayISO()} onChange={(e) => setPaidOn(e.target.value)} className={adminInput} />
                </Field>
                {method !== "cash" && (
                  <Field label="Transaction ID" hint="Optional">
                    <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className={adminInput} placeholder="e.g. 9A1B2C3D" />
                  </Field>
                )}
              </div>
              <p className="text-xs text-ink-soft">Saved as a book payment in Payments{initial?.paymentId ? " (kept in step with this order)" : ""}.</p>
            </div>
          )}
        </Block>

        {/* WhatsApp */}
        {phone && (
          <Block title="Message the customer">
            <div className="flex flex-wrap gap-2">
              {messages.map((m) => (
                <a
                  key={m.label}
                  href={waLink(phone, m.text)}
                  target="_blank"
                  rel="noreferrer"
                  title={m.text}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm hover:border-ink"
                >
                  <MessageCircle className="size-4 text-forest" aria-hidden /> {m.label}
                </a>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-soft">Opens WhatsApp with the message written for you — check it, then press send.</p>
          </Block>
        )}

        <Field label="Private note" hint="Only admins see this">
          <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} className={adminInput} />
        </Field>

        <ErrorText message={error} />
      </DrawerBody>
      <DrawerFooter>
        {initial && (
          <button type="button" onClick={remove} disabled={!!busy} className="mr-auto inline-flex items-center gap-1.5 text-sm text-ember">
            <Trash2 className="size-4" aria-hidden /> Delete
          </button>
        )}
        <GhostButton onClick={onDone}>Cancel</GhostButton>
        <PrimaryButton onClick={save} loading={busy === "save"}>
          {initial ? "Save changes" : "Create order"}
        </PrimaryButton>
      </DrawerFooter>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <p className="mb-3 text-sm font-medium">{title}</p>
      {children}
    </section>
  );
}

/** Link the order to a student account — suggested automatically when the phone matches. */
function StudentLink({ users, uid, onChange, suggested }: { users: UserProfile[]; uid: string; onChange: (uid: string) => void; suggested?: UserProfile }) {
  const [search, setSearch] = useState("");
  const [picking, setPicking] = useState(false);
  const linked = users.find((u) => u.uid === uid);
  const q = search.trim().toLowerCase();
  const matches = users
    .filter((u) => !q || [u.name, u.phone, u.email].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 30);

  if (linked) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
        <p className="min-w-0 text-sm">
          <span className="block truncate font-medium">{linked.name || "Unnamed"}</span>
          <span className="block truncate text-xs text-ink-soft">
            {linked.classLevel ? `Class ${linked.classLevel} · ` : ""}
            {linked.phone || linked.email}
          </span>
        </p>
        <button type="button" onClick={() => onChange("")} className="text-sm underline underline-offset-4">
          Unlink
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {suggested && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3">
          <p className="flex min-w-0 items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
            <span className="min-w-0">
              Same phone as <strong className="font-medium">{suggested.name}</strong>
              {suggested.classLevel ? ` (Class ${suggested.classLevel})` : ""}.
            </span>
          </p>
          <button type="button" onClick={() => onChange(suggested.uid)} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-forest-ink">
            <Link2 className="size-3.5" aria-hidden /> Link
          </button>
        </div>
      )}
      {picking ? (
        <div className="rounded-2xl border border-line">
          <label className="relative block border-b border-line">
            <span className="sr-only">Search students</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone" className="w-full rounded-t-2xl bg-transparent py-3 pl-10 pr-3 text-sm outline-none" />
          </label>
          <ul className="max-h-48 overflow-y-auto" data-lenis-prevent>
            {matches.length === 0 && <li className="px-4 py-3 text-sm text-ink-soft">No students found.</li>}
            {matches.map((u) => (
              <li key={u.uid}>
                <button type="button" onClick={() => onChange(u.uid)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-paper-2">
                  <span className="min-w-0 truncate">{u.name || "Unnamed"}</span>
                  <span className="shrink-0 text-xs text-ink-faint">{u.classLevel ? `Class ${u.classLevel}` : u.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">
          Not linked to a student.{" "}
          <button type="button" onClick={() => setPicking(true)} className="text-ink underline underline-offset-4">
            Choose a student
          </button>
        </p>
      )}
    </div>
  );
}
