import { classLevels } from "./coaching";
import { seedBooks } from "./seed-books";
import type { Book, BookNeed, ClassLevel, CoverMotif, Price, PriceKind, UserProfile } from "./types";

const motifs: CoverMotif[] = ["orbit", "grid", "stairs", "wave", "nodes", "gate"];
const priceKinds: PriceKind[] = ["soft", "hard", "chapter", "combined"];

function normalizePrices(v: unknown): Price[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object")
    .filter((p) => priceKinds.includes(p.kind as PriceKind) && typeof p.bdt === "number" && p.bdt > 0)
    .map((p) => ({
      kind: p.kind as PriceKind,
      bdt: p.bdt as number,
      ...(typeof p.usd === "number" && p.usd > 0 ? { usd: p.usd } : {}),
    }));
}

/** `{ "9": "must", "10": "optional" }` — books saved before this existed use the built-in plan. */
function normalizeForClasses(id: string, v: unknown): Book["forClasses"] {
  if (!v || typeof v !== "object") return seedBooks.find((b) => b.slug === id)?.forClasses ?? {};
  const raw = v as Record<string, unknown>;
  const out: Book["forClasses"] = {};
  for (const c of classLevels) if (raw[c] === "must" || raw[c] === "optional") out[c] = raw[c] as BookNeed;
  return out;
}

/** Turns a raw Firestore document into a plain, fully-populated Book. */
export function normalizeBook(id: string, raw: Record<string, unknown>): Book {
  const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
  const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const motif = str(raw.motif) as CoverMotif;

  return {
    slug: id,
    title: str(raw.title, "Untitled"),
    subtitle: str(raw.subtitle),
    description: str(raw.description),
    longDescription: str(raw.longDescription),
    category: str(raw.category, "General"),
    year: num(raw.year, 2026),
    pages: num(raw.pages),
    prices: normalizePrices(raw.prices),
    coverUrl: str(raw.coverUrl) || undefined,
    backUrl: str(raw.backUrl) || undefined,
    syllabus: str(raw.syllabus) || undefined,
    facts: arr<{ value: string; label: string }>(raw.facts).filter((f) => f && f.value),
    coverColor: str(raw.coverColor, "#1E3B33"),
    coverAccent: str(raw.coverAccent, "#E9C77B"),
    motif: motifs.includes(motif) ? motif : "orbit",
    highlights: arr<string>(raw.highlights).filter((h) => typeof h === "string"),
    buyLinks: arr<{ label: string; url: string }>(raw.buyLinks).filter((l) => l && l.url),
    praise: arr<{ quote: string; author: string }>(raw.praise).filter((p) => p && p.quote),
    featured: Boolean(raw.featured),
    status: raw.status === "coming-soon" || raw.status === "draft" ? raw.status : "published",
    order: num(raw.order, 99),
    forClasses: normalizeForClasses(id, raw.forClasses),
    level: raw.level === "a-level" || raw.level === "o-level" ? raw.level : (seedBooks.find((b) => b.slug === id)?.level ?? "o-level"),
  };
}

export function normalizeProfile(uid: string, raw: Record<string, unknown>): UserProfile {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const classLevel = classLevels.includes(raw.classLevel as ClassLevel) ? (raw.classLevel as ClassLevel) : "";
  return {
    uid,
    name: str(raw.name),
    email: str(raw.email),
    phone: str(raw.phone),
    parentPhone: str(raw.parentPhone),
    classLevel,
    locationId: str(raw.locationId),
    batchId: str(raw.batchId),
    photoURL: str(raw.photoURL),
    role: raw.role === "admin" ? "admin" : "student",
    booksOwned: Array.isArray(raw.booksOwned) ? raw.booksOwned.filter((s): s is string => typeof s === "string") : [],
  };
}
