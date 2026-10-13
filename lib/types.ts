export type BookStatus = "published" | "coming-soon" | "draft";

export type CoverMotif = "orbit" | "grid" | "stairs" | "wave" | "nodes" | "gate";

export type BuyLink = { label: string; url: string };

export type Praise = { quote: string; author: string };

export type Fact = { value: string; label: string };

/** soft/hard = whole book; chapter/combined = sold chapter-wise (e.g. Topical Notes). */
export type PriceKind = "soft" | "hard" | "chapter" | "combined";

/** A purchasable option. Prices are in BDT; USD is optional. */
export type Price = { kind: PriceKind; bdt: number; usd?: number };

export type Book = {
  /** Firestore document id — also used as the URL slug. */
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  longDescription: string;
  category: string;
  year: number;
  pages: number;
  prices: Price[];
  coverUrl?: string;
  /** Optional back-cover image — shown with a 3D flip on the book page. */
  backUrl?: string;
  /** Syllabus codes or series label, e.g. "0478 / 2210". */
  syllabus?: string;
  /** Headline numbers for the book, e.g. { value: "471", label: "Questions" }. */
  facts: Fact[];
  coverColor: string;
  coverAccent: string;
  motif: CoverMotif;
  highlights: string[];
  buyLinks: BuyLink[];
  praise: Praise[];
  featured: boolean;
  status: BookStatus;
  order: number;
};

/* ───────────── Accounts & coaching ───────────── */

export type Role = "student" | "admin";

export type ClassLevel = "9" | "10" | "11" | "12";

/** users/{uid} — created on sign-up. `role` can only be changed by an admin. */
export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  /** Parent's / guardian's mobile — payment receipts go here on WhatsApp. */
  parentPhone: string;
  classLevel: ClassLevel | "";
  locationId: string;
  batchId: string;
  photoURL: string;
  role: Role;
};

/** locations/{id} — a coaching centre. */
export type Location = {
  id: string;
  name: string;
  area: string;
  address: string;
  mapUrl: string;
  phone: string;
  active: boolean;
  order: number;
};

export type Weekday = "Sat" | "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri";

export type Board = "Cambridge" | "Edexcel" | "Both";

export type BatchStatus = "open" | "few-seats" | "full" | "closed";

/** One class meeting: a weekday with its own start and end time ("16:00"). */
export type Session = { day: Weekday; start: string; end: string };

/** batches/{id} — a class-wise batch at one location. */
export type Batch = {
  id: string;
  classLevel: ClassLevel;
  locationId: string;
  name: string;
  board: Board;
  /** One entry per class day — each day can have a different time. */
  sessions: Session[];
  seats: number; // 0 = not shown
  /** Monthly tuition fee in BDT (0 = not set). */
  fee: number;
  status: BatchStatus;
  notes: string;
};
