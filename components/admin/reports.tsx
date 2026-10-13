"use client";

import { collection, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { normalizeSession, type AttendanceSession, type Mark } from "@/lib/attendance";
import { classLevels, normalizeBatch, normalizeLocation, sortBatches } from "@/lib/coaching";
import { normalizeEnrollment, type EnrollmentRecord } from "@/lib/enrollments";
import { db } from "@/lib/firebase";
import { normalizeProfile } from "@/lib/normalize";
import { bdt, normalizePayment, paymentTypes, typeLabels, type Payment, type PaymentType } from "@/lib/payments";
import { rosterFor } from "@/lib/roster";
import type { Batch, ClassLevel, Location, UserProfile } from "@/lib/types";
import { adminInput, PageHeader, Spinner } from "./ui";
import { BarList, ChartCard, ColumnChart, compact, Legend, LineChart, StatTile, type Series } from "./charts";

type Range = 3 | 6 | 12;
type Student = UserProfile & { joined: Date | null };

/** Revenue types in fixed slot order (colour follows the type, never its rank). */
const revenueSeries: Series[] = paymentTypes.map((t, i) => ({ key: t, label: typeLabels[t], color: `var(--series-${i + 1})` }));

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** The last `n` months ending with the current one, plus the `n` before them for comparison. */
function monthWindow(n: number, now = new Date()) {
  const keys = (offset: number) =>
    Array.from({ length: n }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - (n - 1 - i) - offset, 1)));
  return { current: keys(0), previous: keys(n) };
}

function shortMonth(key: string, withYear: boolean) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-GB", withYear ? { month: "short", year: "2-digit" } : { month: "short" });
}

const attended = (marks: Mark[]) => {
  const counted = marks.filter((m) => m !== "excused");
  return { yes: counted.filter((m) => m === "present" || m === "late").length, total: counted.length };
};

const pct = (yes: number, total: number) => (total ? Math.round((yes / total) * 100) : null);

export function Reports() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [range, setRange] = useState<Range>(6);
  const [locationFilter, setLocationFilter] = useState("all");
  const [classFilter, setClassFilter] = useState<ClassLevel | "all">("all");

  useEffect(() => {
    const d = db();
    const stops = [
      onSnapshot(collection(d, "payments"), (s) => setPayments(s.docs.map((x) => normalizePayment(x.id, x.data()))), () => setPayments([])),
      onSnapshot(collection(d, "users"), (s) =>
        setStudents(
          s.docs.map((x) => {
            const raw = x.data();
            const ts = raw.createdAt as Timestamp | undefined;
            return { ...normalizeProfile(x.id, raw), joined: ts?.toDate ? ts.toDate() : null };
          }),
        ),
      ),
      onSnapshot(collection(d, "enrollments"), (s) => setEnrollments(s.docs.map((x) => normalizeEnrollment(x.id, x.data())))),
      onSnapshot(collection(d, "attendance"), (s) => setSessions(s.docs.map((x) => normalizeSession(x.id, x.data())))),
      onSnapshot(collection(d, "batches"), (s) => setBatches(sortBatches(s.docs.map((x) => normalizeBatch(x.id, x.data()))))),
      onSnapshot(query(collection(d, "locations"), orderBy("order", "asc")), (s) => setLocations(s.docs.map((x) => normalizeLocation(x.id, x.data())))),
    ];
    return () => stops.forEach((s) => s());
  }, []);

  const batchById = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches]);
  const locationName = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);

  if (payments === null) return <Spinner />;

  // ── Filters (scope everything below) ──
  const { current, previous } = monthWindow(range);
  const crossesYear = current[0].slice(0, 4) !== current.at(-1)!.slice(0, 4);
  const labels = current.map((k) => shortMonth(k, crossesYear));

  const batchOk = (b: Batch | undefined) =>
    Boolean(b) && (locationFilter === "all" || b!.locationId === locationFilter) && (classFilter === "all" || b!.classLevel === classFilter);
  const paymentOk = (p: Payment) =>
    (classFilter === "all" || p.classLevel === classFilter) && (locationFilter === "all" || batchById.get(p.batchId)?.locationId === locationFilter);
  const studentOk = (u: Student) =>
    u.role === "student" && (classFilter === "all" || u.classLevel === classFilter) && (locationFilter === "all" || u.locationId === locationFilter);
  const enrollmentOk = (e: EnrollmentRecord) =>
    (classFilter === "all" || e.classLevel === classFilter) && (locationFilter === "all" || e.locationId === locationFilter);
  const sessionOk = (s: AttendanceSession) => batchOk(batchById.get(s.batchId));

  const fPayments = payments.filter(paymentOk);
  const fStudents = students.filter(studentOk);
  const fEnrollments = enrollments.filter(enrollmentOk);
  const fSessions = sessions.filter(sessionOk);
  const fBatches = batches.filter((b) => b.status !== "closed" && batchOk(b));

  // ── Revenue by month & type ──
  const revenueByMonth = (keys: string[]) =>
    keys.map((k) => {
      const row: Record<PaymentType, number> = { tuition: 0, book: 0, admission: 0, other: 0 };
      fPayments.filter((p) => p.receivedOn.startsWith(k)).forEach((p) => (row[p.type] += p.amount));
      return row;
    });
  const revenue = revenueByMonth(current);
  const revenueTotal = revenue.reduce((s, r) => s + Object.values(r).reduce((a, b) => a + b, 0), 0);
  const prevRevenue = revenueByMonth(previous).reduce((s, r) => s + Object.values(r).reduce((a, b) => a + b, 0), 0);

  // ── New students by month ──
  const joinedIn = (k: string) => fStudents.filter((u) => u.joined && monthKey(u.joined) === k).length;
  const newStudents = current.map(joinedIn);
  const newTotal = newStudents.reduce((a, b) => a + b, 0);
  const prevNew = previous.map(joinedIn).reduce((a, b) => a + b, 0);

  // ── Enrollment requests by month ──
  const requestsIn = (k: string) => fEnrollments.filter((e) => e.createdAt && monthKey(e.createdAt) === k && e.source !== "sync").length;
  const requests = current.map(requestsIn);

  // ── Attendance rate by month ──
  const attendanceIn = (keys: string[]) =>
    keys.map((k) => attended(fSessions.filter((s) => s.date.startsWith(k)).flatMap((s) => Object.values(s.records))));
  const attendanceMonths = attendanceIn(current);
  const attendanceRates = attendanceMonths.map((a) => pct(a.yes, a.total));
  const sumAtt = (list: { yes: number; total: number }[]) => list.reduce((s, a) => ({ yes: s.yes + a.yes, total: s.total + a.total }), { yes: 0, total: 0 });
  const attNow = sumAtt(attendanceMonths);
  const attPrev = sumAtt(attendanceIn(previous));
  const attRate = pct(attNow.yes, attNow.total);
  const attPrevRate = pct(attPrev.yes, attPrev.total);

  // ── Seats by batch (current) ──
  const seatRows = fBatches.map((b) => ({
    label: `${b.name}`,
    sublabel: `Class ${b.classLevel} · ${locationName.get(b.locationId) ?? "—"}`,
    value: rosterFor(b, students, enrollments).length,
    capacity: b.seats || undefined,
  }));
  const seatsFilled = seatRows.reduce((s, r) => s + r.value, 0);
  const seatsTotal = fBatches.reduce((s, b) => s + b.seats, 0);

  // ── Book sales in range ──
  const inRange = (p: Payment) => current.some((k) => p.receivedOn.startsWith(k));
  const bookTotals = new Map<string, number>();
  fPayments
    .filter((p) => p.type === "book" && inRange(p))
    .forEach((p) => {
      const title = (p.description.split(" — ")[0] || "Other books").trim();
      bookTotals.set(title, (bookTotals.get(title) ?? 0) + p.amount);
    });
  const bookRows = [...bookTotals.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));

  const change = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 100) : null);
  const revenueDelta = change(revenueTotal, prevRevenue);
  const rangeLabel = `previous ${range} months`;

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" description="Revenue, enrollment and attendance trends across your coaching and publishing." />

      {/* Filters — one row, scoping everything below */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full border border-line p-1" role="group" aria-label="Time range">
          {([3, 6, 12] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={range === r ? "rounded-full bg-ink px-3.5 py-1.5 text-sm text-paper" : "rounded-full px-3.5 py-1.5 text-sm text-ink-soft hover:text-ink"}
            >
              Last {r} months
            </button>
          ))}
        </div>
        <select aria-label="Centre" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className={`${adminInput} w-auto`}>
          <option value="all">All centres</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select aria-label="Class" value={classFilter} onChange={(e) => setClassFilter(e.target.value as ClassLevel | "all")} className={`${adminInput} w-auto`}>
          <option value="all">All classes</option>
          {classLevels.map((c) => (
            <option key={c} value={c}>
              Class {c}
            </option>
          ))}
        </select>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={`Revenue · last ${range} months`}
          value={bdt(revenueTotal)}
          delta={revenueDelta}
          deltaLabel={revenueDelta === null ? "" : `${revenueDelta > 0 ? "+" : ""}${revenueDelta}% vs ${rangeLabel}`}
        />
        <StatTile
          label="New students"
          value={newTotal.toLocaleString("en-US")}
          delta={newTotal - prevNew}
          deltaLabel={`${newTotal - prevNew >= 0 ? "+" : ""}${newTotal - prevNew} vs ${rangeLabel}`}
        />
        <StatTile
          label="Attendance rate"
          value={attRate === null ? "—" : `${attRate}%`}
          delta={attRate === null || attPrevRate === null ? null : attRate - attPrevRate}
          deltaLabel={attRate === null || attPrevRate === null ? "" : `${attRate - attPrevRate >= 0 ? "+" : ""}${attRate - attPrevRate} pts vs ${rangeLabel}`}
        />
        <StatTile label="Seats filled now" value={seatsTotal ? `${seatsFilled} / ${seatsTotal}` : String(seatsFilled)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          title="Revenue by month"
          subtitle="All payments received, by type (BDT)"
          legend={<Legend series={revenueSeries} />}
          table={{
            head: ["Month", ...revenueSeries.map((s) => s.label), "Total"],
            rows: current.map((k, i) => [
              shortMonth(k, true),
              ...paymentTypes.map((t) => revenue[i][t].toLocaleString("en-US")),
              Object.values(revenue[i]).reduce((a, b) => a + b, 0).toLocaleString("en-US"),
            ]),
          }}
        >
          <ColumnChart labels={labels} series={revenueSeries} values={revenue} />
        </ChartCard>

        <ChartCard
          title="Attendance rate"
          subtitle="Present + late, excluding excused, across all registers"
          table={{ head: ["Month", "Rate", "Marks counted"], rows: current.map((k, i) => [shortMonth(k, true), attendanceRates[i] === null ? "—" : `${attendanceRates[i]}%`, attendanceMonths[i].total]) }}
        >
          <LineChart labels={labels} values={attendanceRates} label="Attendance" />
        </ChartCard>

        <ChartCard
          title="New students"
          subtitle="Accounts created each month"
          table={{ head: ["Month", "New students"], rows: current.map((k, i) => [shortMonth(k, true), newStudents[i]]) }}
        >
          <ColumnChart labels={labels} series={[{ key: "n", label: "New students", color: "var(--series-1)" }]} values={newStudents.map((n) => ({ n }))} />
        </ChartCard>

        <ChartCard
          title="Enrollment requests"
          subtitle="Seat requests from joining or changing batch"
          table={{ head: ["Month", "Requests"], rows: current.map((k, i) => [shortMonth(k, true), requests[i]]) }}
        >
          <ColumnChart labels={labels} series={[{ key: "n", label: "Requests", color: "var(--series-1)" }]} values={requests.map((n) => ({ n }))} />
        </ChartCard>

        <ChartCard
          title="Seats by batch"
          subtitle="Confirmed students against each batch's seats"
          table={{ head: ["Batch", "Students", "Seats"], rows: seatRows.map((r) => [`${r.label} (${r.sublabel})`, r.value, r.capacity ?? "—"]) }}
        >
          {seatRows.length ? <BarList rows={seatRows} /> : <p className="text-sm text-ink-soft">No batches match these filters.</p>}
        </ChartCard>

        <ChartCard
          title="Book sales"
          subtitle={`Revenue by title · last ${range} months (BDT)`}
          table={{ head: ["Book", "Revenue (BDT)"], rows: bookRows.map((r) => [r.label, r.value.toLocaleString("en-US")]) }}
        >
          {bookRows.length ? (
            <BarList rows={bookRows} color="var(--series-2)" format={compact} />
          ) : (
            <p className="text-sm text-ink-soft">No book payments recorded in this period.</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
