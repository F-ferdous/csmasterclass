import { testimonials as defaultTestimonials } from "./content";
import { site } from "./site";
import type { ClassLevel } from "./types";

// settings/site — one document the owner edits in Admin → Settings. Public read (nothing secret in it),
// admin write. Until it's saved for the first time, the built-in values below are used.

export type SocialLink = { label: string; href: string };
export type Testimonial = { quote: string; name: string; detail: string };
export type PaymentInfo = { bkash: string; nagad: string; rocket: string; bank: string; note: string };

export type SiteSettings = {
  socials: SocialLink[];
  testimonials: Testimonial[];
  payment: PaymentInfo;
  /** Default monthly tuition per class (BDT), used by the fee sheet and the overdue list. */
  fees: Record<ClassLevel, number>;
};

export const socialPresets = ["Facebook", "YouTube", "Instagram", "LinkedIn", "TikTok", "X (Twitter)", "Website"];

export const defaultSettings: SiteSettings = {
  socials: site.socials.map((s) => ({ ...s })),
  testimonials: defaultTestimonials.map((t) => ({ ...t })),
  payment: { bkash: "", nagad: "", rocket: "", bank: "", note: "" },
  fees: { "9": 3500, "10": 3500, "11": 4500, "12": 4500 },
};

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]).filter((x) => x && typeof x === "object") : null);

export function normalizeSettings(raw: Record<string, unknown> | undefined | null): SiteSettings {
  if (!raw) return defaultSettings;
  const socials = list(raw.socials);
  const testimonials = list(raw.testimonials);
  const p = (raw.payment ?? {}) as Record<string, unknown>;
  const f = (raw.fees ?? {}) as Record<string, unknown>;
  const fee = (c: ClassLevel) => (typeof f[c] === "number" && (f[c] as number) > 0 ? (f[c] as number) : defaultSettings.fees[c]);
  return {
    socials: socials
      ? socials.map((s) => ({ label: str(s.label, 40), href: str(s.href, 500) })).filter((s) => s.label && isLink(s.href))
      : defaultSettings.socials,
    testimonials: testimonials
      ? testimonials.map((t) => ({ quote: str(t.quote, 600), name: str(t.name, 80), detail: str(t.detail, 120) })).filter((t) => t.quote && t.name)
      : defaultSettings.testimonials,
    payment: { bkash: str(p.bkash, 80), nagad: str(p.nagad, 80), rocket: str(p.rocket, 80), bank: str(p.bank, 300), note: str(p.note, 500) },
    fees: { "9": fee("9"), "10": fee("10"), "11": fee("11"), "12": fee("12") },
  };
}

export const isLink = (href: string) => /^https:\/\/[^\s/]+\.[^\s]+/i.test(href);

/** A real profile link — not a bare placeholder like https://youtube.com. */
export const isProfileLink = (href: string) => {
  try {
    return new URL(href).pathname.length > 1;
  } catch {
    return false;
  }
};

/** "How to pay" lines for WhatsApp messages and the order page. Empty when nothing is filled in. */
export function paymentLines(p: PaymentInfo): string[] {
  const rows = [
    p.bkash && `bKash: ${p.bkash}`,
    p.nagad && `Nagad: ${p.nagad}`,
    p.rocket && `Rocket: ${p.rocket}`,
    p.bank && `Bank: ${p.bank}`,
  ].filter(Boolean) as string[];
  if (!rows.length && !p.note) return [];
  return ["How to pay:", ...rows, ...(p.note ? [p.note] : [])];
}

export const monthlyFee = (s: Pick<SiteSettings, "fees">, classLevel: ClassLevel | "") => (classLevel ? s.fees[classLevel] : s.fees["9"]);
