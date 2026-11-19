"use client";

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ArrowDown, ArrowUp, Check, Plus, Quote, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { classLevels } from "@/lib/coaching";
import { db } from "@/lib/firebase";
import { bdt } from "@/lib/payments";
import { isLink, isProfileLink, paymentLines, socialPresets, type PaymentInfo, type SiteSettings, type SocialLink, type Testimonial } from "@/lib/settings";
import type { ClassLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { refreshSettings } from "./refresh";
import { useSiteSettings } from "./use-settings";
import { adminInput, ErrorText, Field, PageHeader, PrimaryButton, Spinner } from "./ui";

export function SettingsManager() {
  const live = useSiteSettings();
  if (!live.loaded) return <Spinner />;
  // The form keeps its own copy from the first load; saving writes exactly what's in it.
  return <SettingsForm initial={live} saved={live.saved} />;
}

function SettingsForm({ initial, saved }: { initial: SiteSettings; saved: boolean }) {
  const [payment, setPayment] = useState<PaymentInfo>(initial.payment);
  const [fees, setFees] = useState<Record<ClassLevel, string>>({
    "9": String(initial.fees["9"]),
    "10": String(initial.fees["10"]),
    "11": String(initial.fees["11"]),
    "12": String(initial.fees["12"]),
  });
  const [socials, setSocials] = useState<SocialLink[]>(initial.socials);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initial.testimonials);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    setDone(false);
    set(v);
  };

  async function save() {
    setError("");
    const feeNumbers = {} as Record<ClassLevel, number>;
    for (const c of classLevels) {
      const n = Number(fees[c]);
      if (!Number.isFinite(n) || n <= 0) return setError(`Enter the monthly fee for Class ${c}.`);
      feeNumbers[c] = Math.round(n);
    }
    const cleanSocials = socials.map((s) => ({ label: s.label.trim(), href: s.href.trim() })).filter((s) => s.label || s.href);
    const badSocial = cleanSocials.find((s) => !s.label || !isLink(s.href));
    if (badSocial) return setError(`Check the social link “${badSocial.label || badSocial.href}” — it needs a name and a full link starting with https://`);
    const cleanTestimonials = testimonials
      .map((t) => ({ quote: t.quote.trim(), name: t.name.trim(), detail: t.detail.trim() }))
      .filter((t) => t.quote || t.name || t.detail);
    const badTestimonial = cleanTestimonials.findIndex((t) => !t.quote || !t.name);
    if (badTestimonial >= 0) return setError(`Testimonial ${badTestimonial + 1} needs both the words and a name.`);

    setBusy(true);
    try {
      await setDoc(doc(db(), "settings", "site"), {
        payment: Object.fromEntries(Object.entries(payment).map(([k, v]) => [k, v.trim()])),
        fees: feeNumbers,
        socials: cleanSocials,
        testimonials: cleanTestimonials,
        updatedAt: serverTimestamp(),
      });
      setSocials(cleanSocials);
      setTestimonials(cleanTestimonials);
      await refreshSettings();
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const preview = paymentLines(payment);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Payment details, monthly fees, social links and testimonials. Changes show on the website within a moment of saving."
      />
      {!saved && (
        <p className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
          These are the website&apos;s current built-in values. Edit anything and press <strong>Save settings</strong> to take control of them here.
        </p>
      )}

      <Section title="Payment details" body="Shown on the order page after an order is placed, and added to order-confirm and fee-reminder WhatsApp messages. Leave a box empty to leave it out.">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="bKash" hint="Number and type">
            <input value={payment.bkash} onChange={(e) => touch(setPayment)({ ...payment, bkash: e.target.value })} className={adminInput} placeholder="017XXXXXXXX (Personal)" maxLength={80} />
          </Field>
          <Field label="Nagad">
            <input value={payment.nagad} onChange={(e) => touch(setPayment)({ ...payment, nagad: e.target.value })} className={adminInput} placeholder="018XXXXXXXX (Personal)" maxLength={80} />
          </Field>
          <Field label="Rocket">
            <input value={payment.rocket} onChange={(e) => touch(setPayment)({ ...payment, rocket: e.target.value })} className={adminInput} maxLength={80} />
          </Field>
        </div>
        <Field label="Bank account" hint="Optional" className="mt-5">
          <input value={payment.bank} onChange={(e) => touch(setPayment)({ ...payment, bank: e.target.value })} className={adminInput} placeholder="Bank, branch, account name and number" maxLength={300} />
        </Field>
        <Field label="Note" hint="Optional" className="mt-5">
          <textarea value={payment.note} onChange={(e) => touch(setPayment)({ ...payment, note: e.target.value })} rows={2} className={cn(adminInput, "resize-y")} placeholder="e.g. Use “Send Money” and write your order number in the reference." maxLength={500} />
        </Field>
        <div className="mt-5 rounded-2xl bg-paper-2/60 p-4 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Preview</p>
          {preview.length ? (
            <p className="mt-2 whitespace-pre-line">{preview.join("\n")}</p>
          ) : (
            <p className="mt-2 text-ink-soft">Nothing filled in — messages will say &ldquo;we&apos;ll share the payment details&rdquo;.</p>
          )}
        </div>
      </Section>

      <Section title="Monthly tuition fee" body="The starting fee on Payments → Fee sheet and the overdue list. You can still change it for one student on the sheet.">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {classLevels.map((c) => (
            <Field key={c} label={`Class ${c}`} hint={Number(fees[c]) > 0 ? bdt(Number(fees[c])) : ""}>
              <input type="number" min={1} inputMode="numeric" value={fees[c]} onChange={(e) => touch(setFees)({ ...fees, [c]: e.target.value })} className={adminInput} />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Social links" body="Shown in the website footer and given to Google as your official profiles. Paste the full link to your page, e.g. https://facebook.com/yourpage.">
        <datalist id="social-presets">
          {socialPresets.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <div className="space-y-3">
          {socials.map((s, i) => (
            <div key={i} className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] sm:items-center">
              <input aria-label="Name" list="social-presets" value={s.label} onChange={(e) => touch(setSocials)(replace(socials, i, { ...s, label: e.target.value }))} className={adminInput} placeholder="Facebook" maxLength={40} />
              <div className="min-w-0">
                <input aria-label="Link" type="url" value={s.href} onChange={(e) => touch(setSocials)(replace(socials, i, { ...s, href: e.target.value }))} className={adminInput} placeholder="https://facebook.com/yourpage" maxLength={500} />
                {isLink(s.href) && !isProfileLink(s.href) && <p className="mt-1 text-xs text-ember">This is the site&apos;s home page, not your profile — paste the link to your own page.</p>}
              </div>
              <RowActions index={i} count={socials.length} onMove={(to) => touch(setSocials)(move(socials, i, to))} onRemove={() => touch(setSocials)(socials.filter((_, j) => j !== i))} />
            </div>
          ))}
        </div>
        <AddButton onClick={() => touch(setSocials)([...socials, { label: "", href: "" }])}>Add a link</AddButton>
      </Section>

      <Section title="Testimonials" body="Shown on the Home page (carousel) and the Success page. Add real words from students and parents — first name and initial is enough.">
        <div className="space-y-4">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-2xl border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Quote className="size-4 text-ember" aria-hidden /> Testimonial {i + 1}
                </span>
                <RowActions index={i} count={testimonials.length} onMove={(to) => touch(setTestimonials)(move(testimonials, i, to))} onRemove={() => touch(setTestimonials)(testimonials.filter((_, j) => j !== i))} />
              </div>
              <Field label="What they said" className="mt-3">
                <textarea value={t.quote} onChange={(e) => touch(setTestimonials)(replace(testimonials, i, { ...t, quote: e.target.value }))} rows={3} className={cn(adminInput, "resize-y")} maxLength={600} />
              </Field>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <input value={t.name} onChange={(e) => touch(setTestimonials)(replace(testimonials, i, { ...t, name: e.target.value }))} className={adminInput} placeholder="Ayesha R." maxLength={80} />
                </Field>
                <Field label="Detail" hint="Optional">
                  <input value={t.detail} onChange={(e) => touch(setTestimonials)(replace(testimonials, i, { ...t, detail: e.target.value }))} className={adminInput} placeholder="A* in O Level Computer Science, 2026" maxLength={120} />
                </Field>
              </div>
            </div>
          ))}
          {testimonials.length === 0 && <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-ink-soft">No testimonials — the website hides the testimonial sections until you add one.</p>}
        </div>
        <AddButton onClick={() => touch(setTestimonials)([...testimonials, { quote: "", name: "", detail: "" }])}>Add a testimonial</AddButton>
      </Section>

      <div className="sticky bottom-3 z-20 mt-8">
        <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-line bg-paper/90 px-4 py-3 shadow-soft backdrop-blur">
          {error && <ErrorText message={error} />}
          {done && !error && (
            <span className="inline-flex items-center gap-1.5 text-sm text-forest">
              <Check className="size-4" aria-hidden /> Saved
            </span>
          )}
          <PrimaryButton onClick={save} loading={busy}>
            Save settings
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

const replace = <T,>(list: T[], i: number, v: T) => list.map((x, j) => (j === i ? v : x));
function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

function Section({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <section className="mt-8 rounded-3xl border border-line p-5 sm:p-7">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">{body}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function RowActions({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (to: number) => void; onRemove: () => void }) {
  const btn = "grid size-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink disabled:opacity-30";
  return (
    <div className="flex shrink-0 justify-end gap-0.5">
      <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(index - 1)} className={btn}>
        <ArrowUp className="size-4" />
      </button>
      <button type="button" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(index + 1)} className={btn}>
        <ArrowDown className="size-4" />
      </button>
      <button type="button" aria-label="Remove" onClick={onRemove} className={cn(btn, "hover:bg-ember/10 hover:text-ember")}>
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-line px-4 py-2 text-sm transition-colors hover:border-ink">
      <Plus className="size-4" aria-hidden /> {children}
    </button>
  );
}
