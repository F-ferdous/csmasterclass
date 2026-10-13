"use client";

import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { motion } from "motion/react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { db } from "@/lib/firebase";
import { storage } from "@/lib/firebase-client";
import type { Book, BookStatus, CoverMotif, Price, PriceKind } from "@/lib/types";
import { cn, slugify } from "@/lib/utils";
import { refreshBooks } from "@/app/actions";
import { BookCover } from "@/components/books/book-cover";
import { ease } from "@/components/motion/reveal";

const motifs: CoverMotif[] = ["orbit", "grid", "stairs", "wave", "nodes", "gate"];
const palettes = [
  ["#1E3B33", "#E9C77B"],
  ["#B4532F", "#F7E3C8"],
  ["#22304A", "#9EC1E0"],
  ["#4A2C3D", "#EBC0B0"],
  ["#4F5631", "#E6E1B5"],
  ["#2A2826", "#E58A5C"],
];

const blank = (order: number): Book => ({
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  longDescription: "",
  category: "Programming",
  year: 2026,
  pages: 0,
  prices: [],
  coverColor: palettes[0][0],
  coverAccent: palettes[0][1],
  motif: "orbit",
  syllabus: "Cambridge IGCSE / O Level · 0478 / 2210",
  facts: [],
  highlights: [],
  buyLinks: [],
  praise: [],
  featured: false,
  status: "draft",
  order,
});

const priceKinds: PriceKind[] = ["soft", "hard", "chapter", "combined"];

// Prices are edited as "kind | BDT | USD (optional)", e.g. "soft | 499 | 5".
const toPriceLines = (prices: Price[]) => prices.map((p) => [p.kind, p.bdt, p.usd ?? ""].join(" | ").replace(/ \| $/, "")).join("\n");
const fromPriceLines = (text: string): Price[] =>
  text
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter(([kind, bdt]) => priceKinds.includes(kind as PriceKind) && Number(bdt) > 0)
    .map(([kind, bdt, usd]) => ({ kind: kind as PriceKind, bdt: Number(bdt), ...(Number(usd) > 0 ? { usd: Number(usd) } : {}) }));

// Lists are edited as plain text: one item per line, "a | b" for pairs.
const toLines = (items: string[]) => items.join("\n");
const fromLines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);
const toPairs = (items: { a: string; b: string }[]) => items.map((p) => `${p.a} | ${p.b}`).join("\n");
const fromPairs = (text: string) =>
  fromLines(text).map((l) => {
    const [a, ...rest] = l.split("|");
    return { a: a.trim(), b: rest.join("|").trim() };
  });

export function BookEditor({ book, nextOrder, onClose }: { book?: Book; nextOrder: number; onClose: () => void }) {
  const isNew = !book;
  const [b, setB] = useState<Book>(book ?? blank(nextOrder));
  const [highlights, setHighlights] = useState(toLines(b.highlights));
  const [buyLinks, setBuyLinks] = useState(toPairs(b.buyLinks.map((l) => ({ a: l.label, b: l.url }))));
  const [praise, setPraise] = useState(toPairs(b.praise.map((p) => ({ a: p.quote, b: p.author }))));
  const [facts, setFacts] = useState(toPairs(b.facts.map((f) => ({ a: f.value, b: f.label }))));
  const [prices, setPrices] = useState(toPriceLines(b.prices));
  const [busy, setBusy] = useState<"" | "save" | "upload" | "delete">("");
  const [error, setError] = useState("");

  const set = <K extends keyof Book>(key: K, value: Book[K]) => setB((prev) => ({ ...prev, [key]: value }));
  const slug = isNew ? slugify(b.slug || b.title) : b.slug;

  async function upload(file: File, field: "coverUrl" | "backUrl" = "coverUrl") {
    if (!slug) return setError("Add a title before uploading a cover.");
    setBusy("upload");
    setError("");
    try {
      const r = ref(storage(), `covers/${slug}-${file.lastModified}-${file.name.replace(/[^\w.]/g, "")}`);
      await uploadBytes(r, file, { contentType: file.type });
      set(field, await getDownloadURL(r));
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy("");
  }

  async function save() {
    if (!b.title.trim() || !slug) return setError("A title is required.");
    setBusy("save");
    setError("");
    try {
      const target = doc(db(), "books", slug);
      if (isNew && (await getDoc(target)).exists()) throw new Error(`A book with the URL “${slug}” already exists.`);
      const { slug: _omit, ...data } = b;
      void _omit;
      await setDoc(target, {
        ...data,
        prices: fromPriceLines(prices),
        coverUrl: b.coverUrl || "",
        backUrl: b.backUrl || "",
        syllabus: b.syllabus || "",
        facts: fromPairs(facts).filter((p) => p.a).map((p) => ({ value: p.a, label: p.b })),
        highlights: fromLines(highlights),
        buyLinks: fromPairs(buyLinks).filter((p) => p.b).map((p) => ({ label: p.a || "Buy now", url: p.b })),
        praise: fromPairs(praise).map((p) => ({ quote: p.a, author: p.b })),
        updatedAt: serverTimestamp(),
      });
      await refreshBooks();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }

  async function remove() {
    if (!book || !window.confirm(`Delete “${book.title}”? This cannot be undone.`)) return;
    setBusy("delete");
    try {
      await deleteDoc(doc(db(), "books", book.slug));
      await refreshBooks();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }

  return (
    <motion.div className="fixed inset-0 z-[55] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" aria-label="Close editor" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? "New book" : `Edit ${book.title}`}
        className="relative flex h-full w-full max-w-5xl flex-col bg-paper shadow-lift"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.5, ease }}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-8">
          <h2 className="font-display text-2xl">{isNew ? "New book" : "Edit book"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-full border border-line">
            <X className="size-4" />
          </button>
        </header>

        <div className="grid flex-1 gap-8 overflow-y-auto p-5 sm:p-8 lg:grid-cols-[1fr_260px]">
          <div className="space-y-5">
            <Field label="Title">
              <input className={input} value={b.title} onChange={(e) => set("title", e.target.value)} placeholder="Thinking in Algorithms" />
            </Field>
            {isNew && (
              <Field label="URL" hint={`/books/${slug || "…"}`}>
                <input className={input} value={b.slug} onChange={(e) => set("slug", e.target.value)} placeholder="Generated from the title" />
              </Field>
            )}
            <Field label="Subtitle">
              <input className={input} value={b.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
            </Field>
            <Field label="Syllabus / series" hint="Shown above the title on the book page.">
              <input className={input} value={b.syllabus ?? ""} onChange={(e) => set("syllabus", e.target.value)} />
            </Field>
            <Field label="Short description" hint="Shown on cards and the featured panel.">
              <textarea className={input} rows={3} value={b.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Full description">
              <textarea className={input} rows={5} value={b.longDescription} onChange={(e) => set("longDescription", e.target.value)} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Category">
                <input className={input} value={b.category} onChange={(e) => set("category", e.target.value)} />
              </Field>
              <Field label="Year">
                <input className={input} type="number" value={b.year} onChange={(e) => set("year", Number(e.target.value))} />
              </Field>
              <Field label="Pages">
                <input className={input} type="number" value={b.pages} onChange={(e) => set("pages", Number(e.target.value))} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Status">
                <select className={input} value={b.status} onChange={(e) => set("status", e.target.value as BookStatus)}>
                  <option value="draft">Draft (hidden)</option>
                  <option value="published">Published</option>
                  <option value="coming-soon">Coming soon</option>
                </select>
              </Field>
              <Field label="Display order">
                <input className={input} type="number" value={b.order} onChange={(e) => set("order", Number(e.target.value))} />
              </Field>
              <label className="flex items-center gap-3 self-end rounded-2xl border border-line px-4 py-3.5 text-sm">
                <input type="checkbox" checked={b.featured} onChange={(e) => set("featured", e.target.checked)} className="size-4 accent-[var(--ember)]" />
                Feature on home page
              </label>
            </div>

            <Field label="Prices" hint="kind | BDT | USD — kinds: soft, hard, chapter, combined">
              <textarea
                className={cn(input, "font-mono text-sm")}
                rows={3}
                value={prices}
                onChange={(e) => setPrices(e.target.value)}
                placeholder={"soft | 499 | 5\nhard | 1499 | 15"}
              />
            </Field>
            <Field label="Key numbers" hint="One per line: 471 | Questions">
              <textarea className={cn(input, "font-mono text-sm")} rows={3} value={facts} onChange={(e) => setFacts(e.target.value)} placeholder={"50 | Papers\n3,750 | Marks"} />
            </Field>
            <Field label="Highlights" hint="One per line.">
              <textarea className={input} rows={4} value={highlights} onChange={(e) => setHighlights(e.target.value)} />
            </Field>
            <Field label="Buy links" hint="One per line: Store name | https://link">
              <textarea className={cn(input, "font-mono text-sm")} rows={3} value={buyLinks} onChange={(e) => setBuyLinks(e.target.value)} placeholder="Amazon | https://amazon.com/…" />
            </Field>
            <Field label="Praise" hint="One per line: Quote | Who said it">
              <textarea className={input} rows={3} value={praise} onChange={(e) => setPraise(e.target.value)} />
            </Field>
          </div>

          {/* Cover + live preview */}
          <div className="space-y-5 lg:sticky lg:top-0 lg:self-start">
            <BookCover book={b} sizes="260px" />
            <label className={cn("flex cursor-pointer items-center justify-center gap-2 rounded-full border border-line px-4 py-3 text-sm hover:border-ink", busy === "upload" && "opacity-60")}>
              {busy === "upload" ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" aria-hidden />}
              {b.coverUrl ? "Replace cover image" : "Upload cover image"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            {b.coverUrl && (
              <button type="button" onClick={() => set("coverUrl", undefined)} className="w-full text-xs text-ink-soft underline">
                Use designed cover instead
              </button>
            )}
            <label className={cn("flex cursor-pointer items-center justify-center gap-2 rounded-full border border-line px-4 py-3 text-sm hover:border-ink", busy === "upload" && "opacity-60")}>
              <ImagePlus className="size-4" aria-hidden />
              {b.backUrl ? "Replace back cover" : "Upload back cover"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "backUrl")} />
            </label>
            {b.backUrl && (
              <button type="button" onClick={() => set("backUrl", undefined)} className="w-full text-xs text-ink-soft underline">
                Remove back cover
              </button>
            )}
            {!b.coverUrl && (
              <>
                <div>
                  <p className="mb-2 text-xs font-medium text-ink-soft">Colours</p>
                  <div className="flex flex-wrap gap-2">
                    {palettes.map(([c, a]) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Palette ${c}`}
                        onClick={() => setB((p) => ({ ...p, coverColor: c, coverAccent: a }))}
                        className={cn("size-8 rounded-full ring-offset-2 ring-offset-paper", b.coverColor === c && "ring-2 ring-ink")}
                        style={{ background: `linear-gradient(135deg, ${c} 55%, ${a} 55%)` }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-ink-soft">Pattern</p>
                  <div className="flex flex-wrap gap-1.5">
                    {motifs.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => set("motif", m)}
                        className={cn("rounded-full border px-3 py-1 text-xs capitalize", b.motif === m ? "border-ink bg-ink text-paper" : "border-line")}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-8">
          {!isNew ? (
            <button type="button" onClick={remove} disabled={!!busy} className="inline-flex items-center gap-2 text-sm text-ember">
              {busy === "delete" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" aria-hidden />} Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {error && <p className="max-w-xs text-sm text-ember" role="alert">{error}</p>}
            <button type="button" onClick={onClose} className="rounded-full border border-line px-5 py-3 text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!!busy}
              className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-forest-ink hover:bg-ink hover:text-paper disabled:opacity-60"
            >
              {busy === "save" && <Loader2 className="size-4 animate-spin" />}
              {b.status === "draft" ? "Save draft" : "Publish"}
            </button>
          </div>
        </footer>
      </motion.aside>
    </motion.div>
  );
}

const input =
  "w-full rounded-2xl border border-line bg-paper px-4 py-3 text-base outline-none transition-colors focus:border-ink";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3 text-sm font-medium">
        {label}
        {hint && <span className="truncate font-mono text-[11px] font-normal text-ink-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
