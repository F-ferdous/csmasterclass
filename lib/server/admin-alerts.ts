import type { DocumentData } from "firebase-admin/firestore";
import type { PushPayload } from "./webpush";

// What admins are told (lib/server/webpush.ts notifyAdmins). Tapping a notification opens `url`.

const bdt = (n: number) => `${Math.round(n).toLocaleString("en-US")} BDT`;

export function registrationPayload(r: { name: string; classLevel: string; batchName?: string; centre?: string }): PushPayload {
  const where = [r.batchName, r.centre].filter(Boolean).join(", ");
  return {
    title: `New registration from ${r.name.split(" ")[0] || "a student"}`,
    body: `${r.name} · Class ${r.classLevel}${where ? ` · ${where}` : ""}. Tap to confirm their seat.`,
    url: "/admin/enrollments",
    tag: "registration",
  };
}

export function batchChangePayload(r: { name: string; classLevel: string; batchName?: string }): PushPayload {
  return {
    title: "Batch change request",
    body: `${r.name} wants to move to Class ${r.classLevel}${r.batchName ? ` · ${r.batchName}` : ""}.`,
    url: "/admin/enrollments",
    tag: "batch-change",
  };
}

export function orderPayload(o: DocumentData): PushPayload {
  const items = Array.isArray(o.items) ? (o.items as { qty?: number }[]) : [];
  const count = items.reduce((n, i) => n + (Number(i.qty) || 1), 0);
  const total = (Number(o.subtotal) || 0) + (Number(o.deliveryFee) || 0) - (Number(o.discount) || 0);
  return {
    title: "New book order",
    body: `${String(o.name || "Someone")} · ${count} book${count === 1 ? "" : "s"} · ${bdt(total)}${o.ref ? ` · ${o.ref}` : ""}`,
    url: "/admin/orders",
    tag: "order",
  };
}
