import type { Book, BookNeed, ClassLevel } from "./types";

const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "cs-masterclass.firebasestorage.app";

/** Public URL of a cover image in Firebase Storage (`covers/` is world-readable in storage.rules). */
export const coverImage = (file: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(`covers/${file}`)}?alt=media`;

export const bookNeedLabels: Record<BookNeed, string> = { must: "Must have", optional: "Optional" };

/**
 * What a student of `classLevel` should see: books they still need (must-have, then optional)
 * and the ones an admin has ticked as bought.
 */
export function suggestBooks(books: Book[], classLevel: ClassLevel | "", owned: string[]) {
  const have = new Set(owned);
  const need = (b: Book) => (classLevel ? b.forClasses[classLevel] : undefined);
  const live = books.filter((b) => b.status !== "draft");
  return {
    must: live.filter((b) => need(b) === "must" && !have.has(b.slug)),
    optional: live.filter((b) => need(b) === "optional" && !have.has(b.slug)),
    owned: live.filter((b) => have.has(b.slug)),
    other: live.filter((b) => !need(b) && !have.has(b.slug)),
    /** True when this class has any suggested books at all. */
    planned: live.some((b) => need(b)),
  };
}
