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

export function dateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return y ? new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : iso;
}

type ReceiptPayment = Pick<Payment, "studentName" | "type" | "month" | "description" | "amount" | "method" | "reference" | "receivedOn">;

/**
 * WhatsApp receipt for a parent. `batch` adds the class/batch line; `tuition` (that month's
 * status after this payment) adds whether the month is now fully paid.
 */
export function receiptMessage(
  p: ReceiptPayment,
  { batch, tuition }: { batch?: { classLevel: string; name: string }; tuition?: { status: DueStatus; remaining: number } } = {},
) {
  const student = `${p.studentName || "your child"}${batch ? ` (Class ${batch.classLevel} · ${batch.name})` : ""}`;
  const what = p.description || (p.type === "tuition" ? `Tuition — ${monthLabel(p.month)}` : typeLabels[p.type]);

  if (p.method === "waived") {
    return [`Dear Parent,`, ``, `This is to confirm that the following fee has been waived for ${student}:`, what, ``, `— CS Masterclass`].join("\n");
  }

  const lines = [
    `Dear Parent,`,
    ``,
    `We have received a payment for ${student}.`,
    ``,
    `Payment: ${what}`,
    `Amount: ${bdt(p.amount)}`,
    `Paid by: ${methodLabels[p.method]}${p.reference ? ` (Ref: ${p.reference})` : ""}`,
    `Date: ${dateLabel(p.receivedOn)}`,
  ];
  if (p.type === "tuition" && tuition) {
    if (tuition.status === "paid") lines.push(``, `Tuition for ${monthLabel(p.month)} is now fully paid.`);
    else if (tuition.status === "partial" && tuition.remaining > 0) lines.push(``, `Remaining for ${monthLabel(p.month)}: ${bdt(tuition.remaining)}.`);
  }
  lines.push(``, `Thank you.`, `— CS Masterclass`);
  return lines.join("\n");
}

/**
 * Default monthly tuition on the fee sheet: from Admin → Settings when given, else Class 9–10 (O Level)
 * 3,500 BDT, Class 11–12 (AS & A Level) 4,500 BDT.
 */
export function defaultMonthlyFee(classLevel: ClassLevel | "", fees?: Partial<Record<ClassLevel, number>>) {
  const set = classLevel ? fees?.[classLevel] : undefined;
  if (set && set > 0) return set;
  return classLevel === "11" || classLevel === "12" ? 4500 : 3500;
}

/** payments/{id} written by the fee sheet's Paid switch — one per student and month, so the switch can undo it. */
export const sheetPaymentId = (month: string, uid: string) => `tuition-${month}-${uid}`;

/** WhatsApp text for a parent from the fee sheet: a receipt when paid, otherwise a reminder. */
export function feeMessage({
  studentName,
  batch,
  month,
  amount,
  paid,
  payment = [],
}: {
  studentName: string;
  batch?: { classLevel: string; name: string };
  month: string;
  amount: number;
  paid: boolean;
  /** "How to pay" lines from Admin → Settings (reminders only). */
  payment?: string[];
}) {
  const student = `${studentName || "your child"}${batch ? ` (Class ${batch.classLevel} · ${batch.name})` : ""}`;
  const lines = paid
    ? [
        `Dear Parent,`,
        ``,
        `We have received the tuition fee for ${student} for ${monthLabel(month)}.`,
        ``,
        `Amount: ${bdt(amount)}`,
        ``,
        `Thank you.`,
        `— CS Masterclass`,
      ]
    : [
        `Dear Parent,`,
        ``,
        `This is a friendly reminder that the tuition fee for ${student} for ${monthLabel(month)} is due.`,
        ``,
        `Amount: ${bdt(amount)}`,
        ...(payment.length ? [``, ...payment] : []),
        ``,
        `Please ignore this message if you have already paid. Thank you.`,
        `— CS Masterclass`,
      ];
  return lines.join("\n");
}

/** Months from `from` to `to` inclusive (YYYY-MM), oldest first. Capped at 24. */
export function monthsBetween(from: string, to: string) {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  if (!y || !ty) return out;
  while ((y < ty || (y === ty && m <= tm)) && out.length < 24) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** The month `n` months before `month` (YYYY-MM). */
export function monthsBefore(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 - n, 1);
  return thisMonth(d);
}

/** WhatsApp reminder for several unpaid months (Payments → Overdue). */
export function overdueMessage({
  studentName,
  batch,
  months,
  payment = [],
}: {
  studentName: string;
  batch?: { classLevel: string; name: string };
  months: { month: string; remaining: number }[];
  payment?: string[];
}) {
  const student = `${studentName || "your child"}${batch ? ` (Class ${batch.classLevel} · ${batch.name})` : ""}`;
  const total = months.reduce((s, m) => s + m.remaining, 0);
  return [
    `Dear Parent,`,
    ``,
    `This is a friendly reminder that the following tuition fees for ${student} are still due:`,
    ``,
    ...months.map((m) => `• ${monthLabel(m.month)}: ${bdt(m.remaining)}`),
    ``,
    `Total due: ${bdt(total)}`,
    ...(payment.length ? [``, ...payment] : []),
    ``,
    `Please ignore this message if you have already paid. Thank you.`,
    `— CS Masterclass`,
  ].join("\n");
}
