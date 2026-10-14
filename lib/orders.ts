import type { Timestamp } from "firebase/firestore";
import { bundle } from "./content";
import { methodLabels, paymentMethods, type PaymentMethod } from "./payments";
import { priceLabels } from "./pricing";
import type { Book, PriceKind } from "./types";

export type OrderStatus = "new" | "confirmed" | "sent" | "delivered" | "cancelled";
export type OrderSource = "website" | "whatsapp" | "phone" | "in-person";
export type OrderPayment = "unpaid" | "paid";

/** One line of an order. `slug` is a book slug, or "bundle" for the Complete Bundle. Price is a snapshot in BDT. */
export type OrderItem = { slug: string; title: string; kind: PriceKind; price: number; qty: number };

/** orders/{id} — created from the website order form or by an admin. */
export type Order = {
  id: string;
  /** Short reference the customer can quote, e.g. CS-261014-7KQ3. */
  ref: string;
  /** Linked student account ("" for guests). */
  uid: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  status: OrderStatus;
  source: OrderSource;
  paymentStatus: OrderPayment;
  paymentMethod: PaymentMethod | "";
  paymentRef: string;
  /** YYYY-MM-DD */
  paidOn: string;
  /** payments/{id} written when the order was marked paid. */
  paymentId: string;
  adminNote: string;
  createdAt: Date | null;
};

export const orderStatuses: OrderStatus[] = ["new", "confirmed", "sent", "delivered", "cancelled"];
export const orderSources: OrderSource[] = ["website", "whatsapp", "phone", "in-person"];

export const statusLabels: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  sent: "Sent",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
export const statusStyles: Record<OrderStatus, string> = {
  new: "bg-ember/15 text-ember",
  confirmed: "bg-gold/20 text-gold",
  sent: "bg-sage/30 text-ink",
  delivered: "bg-forest/15 text-forest",
  cancelled: "bg-paper-2 text-ink-soft",
};
export const sourceLabels: Record<OrderSource, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  phone: "Phone",
  "in-person": "In person",
};

export const BUNDLE_SLUG = "bundle";

export const itemsSubtotal = (items: OrderItem[]) => items.reduce((s, i) => s + i.price * i.qty, 0);
export const orderTotal = (o: Pick<Order, "subtotal" | "deliveryFee" | "discount">) => Math.max(0, o.subtotal + o.deliveryFee - o.discount);
/** Printed books (or a printed bundle) need a delivery address. */
export const needsDelivery = (items: OrderItem[]) => items.some((i) => i.kind === "hard");

export const itemLabel = (i: OrderItem) => `${i.title} — ${priceLabels[i.kind]}${i.qty > 1 ? ` × ${i.qty}` : ""}`;
export const orderSummary = (items: OrderItem[]) => items.map(itemLabel).join(", ");

/** Book slugs the order covers — the bundle counts as each of its books. */
export const orderSlugs = (items: OrderItem[]) => [...new Set(items.flatMap((i) => (i.slug === BUNDLE_SLUG ? bundle.slugs : [i.slug])))];

/** Everything that can be ordered: each book edition, then the bundle options. */
export function orderOptions(books: Book[]): OrderItem[] {
  return [
    ...books
      .filter((b) => b.status === "published")
      .flatMap((b) => b.prices.map((p) => ({ slug: b.slug, title: b.title, kind: p.kind, price: p.bdt, qty: 1 }))),
    ...bundle.options.map((o) => ({ slug: BUNDLE_SLUG, title: bundle.title, kind: o.kind, price: o.bdt, qty: 1 })),
  ];
}

const REF_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newOrderRef(d = new Date()) {
  const date = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)), (n) => REF_CHARS[n % REF_CHARS.length]).join("");
  return `CS-${date}-${rand}`;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const kinds: PriceKind[] = ["soft", "hard", "chapter", "combined"];

export function normalizeOrder(id: string, raw: Record<string, unknown>): Order {
  const ts = raw.createdAt as Timestamp | undefined;
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === "object")
    .map((i) => ({
      slug: str(i.slug),
      title: str(i.title),
      kind: kinds.includes(i.kind as PriceKind) ? (i.kind as PriceKind) : "soft",
      price: num(i.price),
      qty: Math.max(1, Math.round(num(i.qty)) || 1),
    }));
  return {
    id,
    ref: str(raw.ref) || id.slice(0, 8).toUpperCase(),
    uid: str(raw.uid),
    name: str(raw.name),
    phone: str(raw.phone),
    email: str(raw.email),
    address: str(raw.address),
    note: str(raw.note),
    items,
    subtotal: typeof raw.subtotal === "number" ? raw.subtotal : itemsSubtotal(items),
    deliveryFee: num(raw.deliveryFee),
    discount: num(raw.discount),
    status: orderStatuses.includes(raw.status as OrderStatus) ? (raw.status as OrderStatus) : "new",
    source: orderSources.includes(raw.source as OrderSource) ? (raw.source as OrderSource) : "website",
    paymentStatus: raw.paymentStatus === "paid" ? "paid" : "unpaid",
    paymentMethod: paymentMethods.includes(raw.paymentMethod as PaymentMethod) ? (raw.paymentMethod as PaymentMethod) : "",
    paymentRef: str(raw.paymentRef),
    paidOn: str(raw.paidOn),
    paymentId: str(raw.paymentId),
    adminNote: str(raw.adminNote),
    createdAt: ts?.toDate ? ts.toDate() : null,
  };
}

const bdt = (n: number) => `${n.toLocaleString("en-US")} BDT`;
const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

function lines(o: Order) {
  const out = o.items.map((i) => `• ${itemLabel(i)} — ${bdt(i.price * i.qty)}`);
  if (o.deliveryFee) out.push(`Delivery: ${bdt(o.deliveryFee)}`);
  if (o.discount) out.push(`Discount: −${bdt(o.discount)}`);
  out.push(`Total: ${bdt(orderTotal(o))}`);
  return out;
}

/** WhatsApp message confirming an order with the customer. */
export function confirmMessage(o: Order) {
  const delivery = needsDelivery(o.items)
    ? `Printed books will be delivered to: ${o.address || "(please send your address)"}`
    : "Softcopies are sent as PDF once payment is received.";
  return [
    `Hello ${first(o.name)}, thank you for your order ${o.ref}!`,
    ``,
    ...lines(o),
    ``,
    delivery,
    o.paymentStatus === "paid" ? `Payment received — thank you.` : `Please reply to confirm and we'll share the payment details.`,
    ``,
    `— CS Masterclass`,
  ].join("\n");
}

/** WhatsApp message when the order has gone out. */
export function sentMessage(o: Order) {
  const hard = needsDelivery(o.items);
  return [
    `Hello ${first(o.name)}, your order ${o.ref} ${hard ? "is on its way" : "has been sent"}!`,
    ``,
    ...o.items.map((i) => `• ${itemLabel(i)}`),
    ``,
    hard ? `Delivery to: ${o.address}` : `Your PDF${o.items.length > 1 ? "s have" : " has"} been shared with you.`,
    `Happy studying!`,
    ``,
    `— CS Masterclass`,
  ].join("\n");
}

/** WhatsApp receipt once the order is paid. */
export function paidMessage(o: Order) {
  const method = o.paymentMethod ? [`Paid by: ${methodLabels[o.paymentMethod]}${o.paymentRef ? ` (Ref: ${o.paymentRef})` : ""}`] : [];
  return [`Hello ${first(o.name)}, we've received your payment for order ${o.ref}.`, ``, `Amount: ${bdt(orderTotal(o))}`, ...method, ``, `Thank you!`, `— CS Masterclass`].join("\n");
}
