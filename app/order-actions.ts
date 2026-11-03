"use server";

import { FieldValue } from "firebase-admin/firestore";
import { after } from "next/server";
import { bundle } from "@/lib/content";
import { getBooks } from "@/lib/data";
import { BUNDLE_SLUG, itemsSubtotal, needsDelivery, newOrderRef, type OrderItem } from "@/lib/orders";
import { phoneKey } from "@/lib/phone";
import { bundleTiers } from "@/lib/pricing";
import { orderPayload } from "@/lib/server/admin-alerts";
import { adminDb, isCredentialError } from "@/lib/server/firebase-admin";
import { currentStudent } from "@/lib/server/students";
import { notifyAdmins } from "@/lib/server/webpush";

// The order form sends every order here (guests and signed-in students alike). Going through the server means a
// dropped connection ends in a clear error instead of a write the browser keeps waiting on, and the form's attempt id
// makes "Place order" safe to press again: a retry of an order that did get through returns that same order.

export type PlaceOrderInput = {
  /** Made by the browser for this attempt; the same id again means "the same order" (a retry). */
  attemptId: string;
  items: Pick<OrderItem, "slug" | "kind" | "qty">[];
  name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
};

export type PlaceOrderResult = { ok: true; ref: string; items: OrderItem[]; subtotal: number } | { ok: false; error: string };

const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const attemptId = String(input?.attemptId ?? "");
  if (!/^[A-Za-z0-9]{16,40}$/.test(attemptId)) return { ok: false, error: "Something went wrong — please reload the page and try again." };

  try {
    // Prices come from the catalogue, not the browser.
    const books = await getBooks();
    const tiers = bundleTiers(books);
    const items: OrderItem[] = (Array.isArray(input.items) ? input.items : []).slice(0, 20).flatMap((i) => {
      const qty = Math.max(1, Math.min(99, Math.round(Number(i?.qty) || 1)));
      if (i?.slug === BUNDLE_SLUG) {
        const t = tiers.find((x) => x.kind === i.kind);
        return t ? [{ slug: BUNDLE_SLUG, title: bundle.title, kind: t.kind, price: t.bdt, qty }] : [];
      }
      const b = books.find((x) => x.slug === i?.slug && x.status === "published");
      const p = b?.prices.find((x) => x.kind === i.kind);
      return b && p ? [{ slug: b.slug, title: b.title, kind: p.kind, price: p.bdt, qty }] : [];
    });
    if (!items.length) return { ok: false, error: "Choose at least one book." };

    // A signed-in student's order is linked to their account and uses their name and number.
    const me = await currentStudent();
    const name = me?.name || clip(input.name, 100);
    const phone = me?.phone || clip(input.phone, 20);
    const address = needsDelivery(items) ? clip(input.address, 500) : "";
    if (!name) return { ok: false, error: "Please enter your name." };
    if (!phoneKey(phone)) return { ok: false, error: "Enter a Bangladeshi mobile number, e.g. 01712345678." };
    if (needsDelivery(items) && address.length < 8) return { ok: false, error: "Add the delivery address for printed books." };

    const order = {
      ref: newOrderRef(),
      uid: me?.uid ?? "",
      name,
      phone,
      email: clip(input.email, 200) || me?.email || "",
      address,
      note: clip(input.note, 1000),
      items,
      subtotal: itemsSubtotal(items),
      deliveryFee: 0,
      discount: 0,
      status: "new",
      source: "website",
      paymentStatus: "unpaid",
    };
    const doc = adminDb().doc(`orders/${attemptId}`);
    const saved = await adminDb().runTransaction(async (t) => {
      const snap = await t.get(doc);
      if (snap.exists) return null;
      t.create(doc, { ...order, createdAt: FieldValue.serverTimestamp(), adminNotifiedAt: FieldValue.serverTimestamp() });
      return order;
    });
    if (!saved) {
      // Already placed by an earlier try whose answer never reached the browser.
      const d = (await doc.get()).data() ?? {};
      return { ok: true, ref: String(d.ref ?? ""), items: (d.items as OrderItem[]) ?? items, subtotal: Number(d.subtotal) || 0 };
    }
    after(() => notifyAdmins(orderPayload(saved)));
    return { ok: true, ref: saved.ref, items, subtotal: saved.subtotal };
  } catch (err) {
    if (!isCredentialError(err)) console.error("[order-actions] placeOrder", (err as Error).message);
    return { ok: false, error: "We couldn't place your order just now. Please try again in a moment." };
  }
}
