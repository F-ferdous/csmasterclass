import { cacheLife, cacheTag } from "next/cache";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { normalizeBook } from "./normalize";
import { defaultLocations, normalizeBatch, normalizeLocation, sortBatches } from "./coaching";
import { seedBooks } from "./seed-books";
import type { Batch, Book, Location } from "./types";

/** All public books (drafts excluded). Cached and tagged so /admin can refresh it. */
export async function getBooks(): Promise<Book[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("books");

  if (!isFirebaseConfigured) return seedBooks;

  try {
    const snap = await getDocs(query(collection(db(), "books"), orderBy("order", "asc")));
    const books = snap.docs
      .map((d) => normalizeBook(d.id, d.data()))
      .filter((b) => b.status !== "draft");
    return books.length ? books : seedBooks;
  } catch (err) {
    console.error("[books] Firestore read failed, using sample books:", err);
    return seedBooks;
  }
}

export async function getBook(slug: string): Promise<Book | undefined> {
  const books = await getBooks();
  return books.find((b) => b.slug === slug);
}

/**
 * Coaching centres and batches managed in /admin. Falls back to the default
 * centres (and no batches) until the dashboard has data.
 */
export async function getCoaching(): Promise<{ locations: Location[]; batches: Batch[] }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("coaching");

  if (!isFirebaseConfigured) return { locations: defaultLocations, batches: [] };

  try {
    const [locSnap, batchSnap] = await Promise.all([
      getDocs(query(collection(db(), "locations"), orderBy("order", "asc"))),
      getDocs(collection(db(), "batches")),
    ]);
    const locations = locSnap.docs.map((d) => normalizeLocation(d.id, d.data())).filter((l) => l.active);
    const ids = new Set(locations.map((l) => l.id));
    const batches = sortBatches(
      batchSnap.docs.map((d) => normalizeBatch(d.id, d.data())).filter((b) => b.status !== "closed" && ids.has(b.locationId)),
    );
    return { locations: locations.length ? locations : defaultLocations, batches };
  } catch (err) {
    console.error("[coaching] Firestore read failed, using defaults:", err);
    return { locations: defaultLocations, batches: [] };
  }
}
