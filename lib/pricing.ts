import { bundle } from "./content";
import { site } from "./site";
import type { Book, Price, PriceKind } from "./types";

export const priceLabels: Record<PriceKind, string> = {
  soft: "Softcopy",
  hard: "Hardcopy",
  chapter: "Per chapter",
  combined: "All chapters",
};

export const priceDetails: Record<PriceKind, string> = {
  soft: "Digital PDF edition",
  hard: "Printed book",
  chapter: "Choose any chapter",
  combined: "Every chapter, combined",
};

export const formatBdt = (n: number) => `${n.toLocaleString("en-US")} BDT`;
export const formatUsd = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(1)}`;

/** Cheapest option, for "From …" labels. */
export function lowestPrice(book: Pick<Book, "prices">): Price | undefined {
  return [...book.prices].sort((a, b) => a.bdt - b.bdt)[0];
}

/** Price of the whole book in a given format — chapter-wise books fall back to their combined price. */
export function wholeBookPrice(book: Pick<Book, "prices">, format: "soft" | "hard"): number | undefined {
  return (book.prices.find((p) => p.kind === format) ?? book.prices.find((p) => p.kind === "combined"))?.bdt;
}

/** WhatsApp order link with a pre-filled message, or the contact page while no number is set. */
export function orderHref(message: string): { href: string; external: boolean } {
  if (!site.whatsapp) return { href: "/contact", external: false };
  return { href: `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`, external: true };
}

export function orderMessage(bookTitle: string, price?: Price) {
  return price
    ? `Hello! I'd like to order "${bookTitle}" — ${priceLabels[price.kind]} (${formatBdt(price.bdt)}).`
    : `Hello! I'd like to order "${bookTitle}".`;
}

/** The bundle's books, in the order given. */
export const bundleBooks = (books: Book[]) => books.filter((b) => b.status !== "draft" && bundle.slugs.includes(b.slug));

/** Each bundle option with what the same books cost separately and the saving. */
export function bundleTiers(books: Book[]) {
  const included = bundleBooks(books);
  return bundle.options.map((option) => {
    const parts = included.map((b) => wholeBookPrice(b, option.kind));
    const separate = parts.length && parts.every((p) => p !== undefined) ? parts.reduce<number>((sum, p) => sum + (p ?? 0), 0) : undefined;
    const saving = separate && separate > option.bdt ? separate - option.bdt : undefined;
    const percent = saving && separate ? Math.round((saving / separate) * 100) : undefined;
    return { ...option, separate, saving, percent };
  });
}
