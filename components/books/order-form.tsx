"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, MessageCircle, Minus, Plus, ShoppingBag, Sparkles, Truck, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { placeMyOrder } from "@/app/student-data";
import { notifyNewWebOrder } from "@/app/push-actions";
import { useStudentSession } from "@/components/auth/student-session";
import { BookCover } from "@/components/books/book-cover";
import { ease } from "@/components/motion/reveal";
import { bookLevelLabels, bookLevels } from "@/lib/books";
import { bundle } from "@/lib/content";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { BUNDLE_SLUG, itemLabel, itemsSubtotal, needsDelivery, newOrderRef, type OrderItem } from "@/lib/orders";
import { phoneKey, waLink } from "@/lib/phone";
import { bundleTiers, formatBdt, priceLabels } from "@/lib/pricing";
import { site } from "@/lib/site";
import type { Book, PriceKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-2xl border border-line bg-paper px-4 py-3.5 text-base outline-none transition-colors placeholder:text-ink-faint focus:border-ink";

type Contact = { name: string; phone: string; email: string; address: string; note: string };

/** Chosen edition per book (or the bundle): slug → { kind, qty }. One edition per title. */
type Picks = Record<string, { kind: PriceKind; qty: number }>;

const countable = (kind: PriceKind) => kind === "hard" || kind === "chapter";

export function OrderForm({ books }: { books: Book[] }) {
  const params = useSearchParams();
  const { student: profile } = useStudentSession();
  const tiers = useMemo(() => bundleTiers(books), [books]);
  const [picks, setPicks] = useState<Picks>(() => initialPicks(books, params));
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<{ ref: string; phone: string; items: OrderItem[]; subtotal: number } | null>(null);
  // Fields the visitor has typed in; untouched ones fall back to a signed-in student's profile.
  const [typed, setTyped] = useState<Partial<Contact>>({});
  const contact: Contact = {
    name: typed.name ?? profile?.name ?? "",
    phone: typed.phone ?? profile?.phone ?? "",
    email: typed.email ?? profile?.email ?? "",
    address: typed.address ?? "",
    note: typed.note ?? "",
  };
  const setContact = (next: Contact) => setTyped(next);

  const items: OrderItem[] = Object.entries(picks).flatMap(([slug, { kind, qty }]) => {
    if (slug === BUNDLE_SLUG) {
      const t = tiers.find((x) => x.kind === kind);
      return t ? [{ slug, title: bundle.title, kind, price: t.bdt, qty }] : [];
    }
    const b = books.find((x) => x.slug === slug);
    const p = b?.prices.find((x) => x.kind === kind);
    return b && p ? [{ slug, title: b.title, kind, price: p.bdt, qty }] : [];
  });
  const subtotal = itemsSubtotal(items);
  const delivery = needsDelivery(items);

  function choose(slug: string, kind: PriceKind) {
    setPicks((p) => {
      const next = { ...p };
      if (next[slug]?.kind === kind) delete next[slug];
      else next[slug] = { kind, qty: 1 };
      return next;
    });
  }
  const setQty = (slug: string, qty: number) => setPicks((p) => ({ ...p, [slug]: { ...p[slug], qty: Math.min(99, Math.max(1, qty)) } }));
  const remove = (slug: string) =>
    setPicks((p) => {
      const next = { ...p };
      delete next[slug];
      return next;
    });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (items.length === 0) return fail("Choose at least one book.");
    if (!contact.name.trim()) return fail("Please enter your name.");
    if (!phoneKey(contact.phone)) return fail("Enter a Bangladeshi mobile number, e.g. 01712345678.");
    if (delivery && contact.address.trim().length < 8) return fail("Add the delivery address for printed books.");
    setState("sending");
    setError("");
    const ref = newOrderRef();
    const order = {
      ref,
      uid: "",
      name: contact.name.trim().slice(0, 100),
      phone: contact.phone.trim().slice(0, 20),
      email: contact.email.trim().slice(0, 200),
      address: delivery ? contact.address.trim().slice(0, 500) : "",
      note: contact.note.trim().slice(0, 1000),
      items,
      subtotal,
      deliveryFee: 0,
      discount: 0,
      status: "new",
      source: "website",
      paymentStatus: "unpaid",
    };
    try {
      // Signed-in students order through the server, which links the order to their account.
      if (profile) {
        const result = await placeMyOrder({ items, address: order.address, note: order.note, email: order.email });
        if (!result.ok) return fail(result.error);
        setPlaced({ ref: result.ref, phone: profile.phone, items, subtotal });
        window.scrollTo({ top: 0 });
        return;
      }
      if (isFirebaseConfigured) {
        const saved = await addDoc(collection(db(), "orders"), { ...order, createdAt: serverTimestamp() });
        notifyNewWebOrder(saved.id).catch(() => {}); // admin notification — never blocks the order
      }
      setPlaced({ ref, phone: order.phone, items, subtotal });
      window.scrollTo({ top: 0 });
    } catch (err) {
      console.error(err);
      fail("Something went wrong placing your order. Please try again in a moment.");
    }
  }

  function fail(message: string) {
    setError(message);
    setState("error");
  }

  if (placed) return <Placed {...placed} />;

  return (
    <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1.25fr_0.9fr] lg:items-start lg:gap-14">
      {/* Choose */}
      <div className="space-y-10">
        {tiers.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 font-display text-2xl">
              <Sparkles className="size-5 text-ember" aria-hidden /> Best value
            </h2>
            <div className="rounded-3xl bg-band p-5 text-band-ink sm:p-6">
              <p className="font-display text-2xl">{bundle.title}</p>
              <p className="mt-1 text-sm opacity-75">All five O Level / IGCSE books (0478 / 2210) together.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {tiers.map((t) => (
                  <Edition
                    key={t.kind}
                    dark
                    active={picks[BUNDLE_SLUG]?.kind === t.kind}
                    onClick={() => choose(BUNDLE_SLUG, t.kind)}
                    label={priceLabels[t.kind]}
                    price={t.bdt}
                    note={t.percent ? `save ${t.percent}%` : undefined}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {bookLevels.map((level) => {
          const list = books.filter((b) => b.level === level && b.status === "published");
          if (list.length === 0) return null;
          return (
            <section key={level}>
              <h2 className="mb-4 font-display text-2xl">{bookLevelLabels[level]}</h2>
              <ul className="divide-y divide-line rounded-3xl border border-line">
                {list.map((b) => (
                  <li key={b.slug} className="flex gap-4 p-4 sm:p-5">
                    <Link href={`/books/${b.slug}`} className="w-16 shrink-0 sm:w-20" aria-label={b.title}>
                      <BookCover book={b} sizes="80px" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xl leading-tight">{b.title}</p>
                      <p className="mt-0.5 text-sm text-ink-soft">{b.syllabus}</p>
                      {b.prices.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {b.prices.map((p) => (
                            <Edition key={p.kind} active={picks[b.slug]?.kind === p.kind} onClick={() => choose(b.slug, p.kind)} label={priceLabels[p.kind]} price={p.bdt} />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-ink-soft">
                          Price coming soon —{" "}
                          <Link href="/contact" className="underline underline-offset-4">
                            ask us
                          </Link>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Summary + details */}
      <div id="order-summary" className="scroll-mt-24 space-y-5 lg:sticky lg:top-28">
        <section className="rounded-[2rem] border border-line bg-paper-2/50 p-5 sm:p-7">
          <h2 className="flex items-center gap-2 font-display text-2xl">
            <ShoppingBag className="size-5 text-ember" aria-hidden /> Your order
          </h2>
          {items.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">Choose an edition to add a book.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              <AnimatePresence initial={false}>
                {items.map((i) => (
                  <motion.li
                    key={i.slug}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, ease }}
                    className="flex items-start gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{i.title}</p>
                      <p className="text-xs text-ink-soft">
                        {priceLabels[i.kind]} · {formatBdt(i.price)}
                        {i.kind === "chapter" ? " each" : ""}
                      </p>
                      {countable(i.kind) && (
                        <div className="mt-1.5 inline-flex items-center rounded-full border border-line">
                          <button type="button" aria-label="Fewer" onClick={() => setQty(i.slug, i.qty - 1)} className="grid size-7 place-items-center">
                            <Minus className="size-3.5" />
                          </button>
                          <span className="min-w-6 text-center text-sm tabular-nums">{i.qty}</span>
                          <button type="button" aria-label="More" onClick={() => setQty(i.slug, i.qty + 1)} className="grid size-7 place-items-center">
                            <Plus className="size-3.5" />
                          </button>
                          <span className="pr-3 text-xs text-ink-soft">{i.kind === "chapter" ? "chapters" : "copies"}</span>
                        </div>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{formatBdt(i.price * i.qty)}</p>
                    <button type="button" aria-label={`Remove ${i.title}`} onClick={() => remove(i.slug)} className="grid size-7 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-paper-2">
                      <X className="size-3.5" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-sm text-ink-soft">Total</span>
            <span className="font-display text-3xl tabular-nums">{formatBdt(subtotal)}</span>
          </div>
          {delivery && (
            <p className="mt-2 flex items-start gap-2 text-xs text-ink-soft">
              <Truck className="mt-0.5 size-3.5 shrink-0" aria-hidden /> Printed books are delivered — any delivery charge is confirmed when we call you.
            </p>
          )}
        </section>

        <section className="space-y-4 rounded-[2rem] border border-line p-5 sm:p-7">
          <h2 className="font-display text-2xl">Your details</h2>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Name</span>
            <input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={field} autoComplete="name" required maxLength={100} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Mobile number</span>
            <input
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              className={field}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              required
              maxLength={20}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex justify-between text-sm font-medium">
              Email <span className="font-normal text-ink-faint">Optional — for softcopies</span>
            </span>
            <input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={field} type="email" autoComplete="email" maxLength={200} />
          </label>
          <AnimatePresence initial={false}>
            {delivery && (
              <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="block overflow-hidden">
                <span className="mb-1.5 block text-sm font-medium">Delivery address</span>
                <textarea
                  value={contact.address}
                  onChange={(e) => setContact({ ...contact, address: e.target.value })}
                  className={field}
                  rows={3}
                  autoComplete="street-address"
                  placeholder="House, road, area, city"
                  maxLength={500}
                />
              </motion.label>
            )}
          </AnimatePresence>
          <label className="block">
            <span className="mb-1.5 flex justify-between text-sm font-medium">
              Note <span className="font-normal text-ink-faint">Optional</span>
            </span>
            <textarea
              value={contact.note}
              onChange={(e) => setContact({ ...contact, note: e.target.value })}
              className={field}
              rows={2}
              placeholder={items.some((i) => i.kind === "chapter") ? "Which chapters would you like?" : "Anything we should know?"}
              maxLength={1000}
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-ember">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={state === "sending"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest px-6 py-4 text-base font-semibold text-forest-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
          >
            {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBag className="size-4" aria-hidden />}
            Place order{items.length > 0 ? ` · ${formatBdt(subtotal)}` : ""}
          </button>
          <p className="text-center text-xs text-ink-soft">No payment now — we&apos;ll call or WhatsApp you to confirm and share how to pay.</p>
        </section>
      </div>

      {/* Phones: the summary sits below a long list, so keep the total and a jump to it in view. */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ duration: 0.35, ease }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur lg:hidden"
          >
            <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
              <p className="text-sm">
                <span className="block text-xs text-ink-soft">
                  {items.length} item{items.length === 1 ? "" : "s"}
                </span>
                <span className="font-display text-xl tabular-nums">{formatBdt(subtotal)}</span>
              </p>
              <button
                type="button"
                onClick={() => document.getElementById("order-summary")?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-forest-ink"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function Edition({ label, price, note, active, onClick, dark }: { label: string; price: number; note?: string; active: boolean; onClick: () => void; dark?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
        dark
          ? active
            ? "border-band-accent bg-band-accent text-band"
            : "border-band-ink/25 hover:border-band-accent"
          : active
            ? "border-forest bg-forest text-forest-ink"
            : "border-line hover:border-ink",
      )}
    >
      {active && <Check className="size-3.5" aria-hidden />}
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{formatBdt(price)}</span>
      {note && <span className={cn("text-xs", active ? "opacity-80" : "opacity-60")}>{note}</span>}
    </button>
  );
}

/** ?book=slug&kind=hard or ?bundle=soft preselects an edition (from the "Order now" buttons). */
function initialPicks(books: Book[], params: { get(name: string): string | null }): Picks {
  const picks: Picks = {};
  const bundleKind = params.get("bundle");
  if (bundleKind === "soft" || bundleKind === "hard") picks[BUNDLE_SLUG] = { kind: bundleKind, qty: 1 };
  const book = books.find((b) => b.slug === params.get("book"));
  if (book) {
    const kind = book.prices.find((p) => p.kind === params.get("kind"))?.kind ?? book.prices[0]?.kind;
    if (kind) picks[book.slug] = { kind, qty: 1 };
  }
  return picks;
}

function Placed({ ref, phone, items, subtotal }: { ref: string; phone: string; items: OrderItem[]; subtotal: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl rounded-[2rem] border border-line bg-paper-2/50 p-6 text-center sm:p-12" role="status">
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
        className="mx-auto grid size-16 place-items-center rounded-full bg-forest text-forest-ink"
      >
        <Check className="size-7" aria-hidden />
      </motion.span>
      <h2 className="mt-6 font-display text-3xl sm:text-4xl">Order placed — thank you!</h2>
      <p className="mt-3 text-ink-soft">
        Your order number is <strong className="font-mono font-semibold text-ink">{ref}</strong>. We&apos;ll contact you on{" "}
        <strong className="font-medium text-ink">{phone}</strong> to confirm it and share how to pay.
      </p>
      <ul className="mx-auto mt-8 max-w-md space-y-2 text-left text-sm">
        {items.map((i) => (
          <li key={i.slug} className="flex justify-between gap-4 border-b border-line pb-2">
            <span>{itemLabel(i)}</span>
            <span className="shrink-0 tabular-nums">{formatBdt(i.price * i.qty)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-4 pt-1 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatBdt(subtotal)}</span>
        </li>
      </ul>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {site.whatsapp && (
          <a
            href={waLink(site.whatsapp, `Hello! I've just placed order ${ref} on the website.`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-forest-ink"
          >
            <MessageCircle className="size-4" aria-hidden /> Message us on WhatsApp
          </a>
        )}
        <Link href="/books" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm hover:border-ink">
          Back to the books
        </Link>
      </div>
    </motion.div>
  );
}
