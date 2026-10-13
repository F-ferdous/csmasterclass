import type { Timestamp } from "firebase/firestore";
import type { ClassLevel } from "./types";

export type PaymentType = "tuition" | "book" | "admission" | "other";
export type PaymentMethod = "cash" | "bkash" | "nagad" | "rocket" | "bank" | "card" | "waived";

export const paymentTypes: PaymentType[] = ["tuition", "book", "admission", "other"];
export const paymentMethods: PaymentMethod[] = ["cash", "bkash", "nagad", "rocket", "bank", "card", "waived"];

export const typeLabels: Record<PaymentType, string> = {
  tuition: "Tuition",
  book: "Book",
  admission: "Admission",
  other: "Other",
};

export const methodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  bank: "Bank",
  card: "Card",
  waived: "Waived",
};

/** payments/{id} — one money-in record, entered by an admin. */
export type Payment = {
  id: string;
  uid: string;
  studentName: string;
  email: string;
  batchId: string;
  classLevel: ClassLevel | "";
  type: PaymentType;
  /** Tuition month, YYYY-MM (tuition only). */
  month: string;
  description: string;
  amount: number; // BDT
  method: PaymentMethod;
  reference: string;
  /** Date received, YYYY-MM-DD. */
  receivedOn: string;
  note: string;
  createdAt: Date | null;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

export function normalizePayment(id: string, raw: Record<string, unknown>): Payment {
  const ts = raw.createdAt as Timestamp | undefined;
  return {
    id,
    uid: str(raw.uid),
    studentName: str(raw.studentName),
    email: str(raw.email),
    batchId: str(raw.batchId),
    classLevel: ["9", "10", "11", "12"].includes(raw.classLevel as string) ? (raw.classLevel as ClassLevel) : "",
    type: paymentTypes.includes(raw.type as PaymentType) ? (raw.type as PaymentType) : "other",
    month: str(raw.month),
    description: str(raw.description),
    amount: typeof raw.amount === "number" ? raw.amount : 0,
    method: paymentMethods.includes(raw.method as PaymentMethod) ? (raw.method as PaymentMethod) : "cash",
    reference: str(raw.reference),
    receivedOn: str(raw.receivedOn),
    note: str(raw.note),
    createdAt: ts?.toDate ? ts.toDate() : null,
  };
}

export const thisMonth = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const todayISO = (d = new Date()) => `${thisMonth(d)}-${String(d.getDate()).padStart(2, "0")}`;

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export const bdt = (n: number) => `${n.toLocaleString("en-US")} BDT`;

export type DueStatus = "paid" | "partial" | "unpaid" | "waived";

export const dueLabels: Record<DueStatus, string> = { paid: "Paid", partial: "Partly paid", unpaid: "Unpaid", waived: "Waived" };
export const dueStyles: Record<DueStatus, string> = {
  paid: "bg-forest/15 text-forest",
  partial: "bg-gold/20 text-gold",
  unpaid: "bg-ember/15 text-ember",
  waived: "bg-paper-2 text-ink-soft",
};

/** Tuition status for one student and month, from their tuition payments for that month. */
export function tuitionStatus(fee: number, monthPayments: Payment[]): { status: DueStatus; paid: number; remaining: number } {
  const paid = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  if (monthPayments.some((p) => p.method === "waived")) return { status: "waived", paid, remaining: 0 };
  if (fee > 0 && paid >= fee) return { status: "paid", paid, remaining: 0 };
  if (paid > 0) return { status: "partial", paid, remaining: Math.max(0, fee - paid) };
  return { status: "unpaid", paid: 0, remaining: fee };
}
