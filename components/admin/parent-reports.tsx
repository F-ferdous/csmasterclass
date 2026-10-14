"use client";

import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, type Timestamp } from "firebase/firestore";
import { motion } from "motion/react";
import { AlertTriangle, Check, CheckCircle2, ChevronRight, Copy, FileText, Search, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { normalizeSession, type AttendanceSession } from "@/lib/attendance";
import { classLevels, normalizeBatch, normalizeLocation, sortBatches } from "@/lib/coaching";
import { normalizeEnrollment, type EnrollmentRecord } from "@/lib/enrollments";
import { db } from "@/lib/firebase";
import { normalizeProfile } from "@/lib/normalize";
import { attendanceSummary, monthlyReportMessage, type ReportData } from "@/lib/parent-report";
import { normalizePayment, monthLabel, thisMonth, tuitionStatus, type Payment } from "@/lib/payments";
import { phoneKey, waLink } from "@/lib/phone";
import { rosterFor } from "@/lib/roster";
import { normalizeTest, percent, testStats, type Test } from "@/lib/tests";
import type { Batch, ClassLevel, Location, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, GhostButton, PageHeader, PrimaryButton, Spinner } from "./ui";

type Sent = { sentAt: Date | null; comment: string };
type Row = { user: UserProfile; batch: Batch; data: ReportData };

/** Early in the month you're usually reporting on the month that just ended. */
function defaultMonth() {
  const now = new Date();
  return now.getDate() <= 10 ? thisMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)) : thisMonth(now);
}

const reportId = (month: string, uid: string) => `${month}_${uid}`;

export function ParentReports() {
  const [month, setMonth] = useState(defaultMonth);
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [sent, setSent] = useState<Record<string, Sent>>({});
  const [classFilter, setClassFilter] = useState<ClassLevel | "all">("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [show, setShow] = useState<"all" | "unsent">("all");
  const [search, setSearch] = useState("");
  const [openUid, setOpenUid] = useState("");

  useEffect(() => {
    const d = db();
    const stops = [
      onSnapshot(collection(d, "batches"), (snap) => setBatches(sortBatches(snap.docs.map((x) => normalizeBatch(x.id, x.data())))), () => setBatches([])),
      onSnapshot(query(collection(d, "locations"), orderBy("order", "asc")), (snap) => setLocations(snap.docs.map((x) => normalizeLocation(x.id, x.data())))),
      onSnapshot(collection(d, "users"), (snap) => setUsers(snap.docs.map((x) => normalizeProfile(x.id, x.data())))),
      onSnapshot(collection(d, "enrollments"), (snap) => setEnrollments(snap.docs.map((x) => normalizeEnrollment(x.id, x.data())))),
      onSnapshot(query(collection(d, "tests"), where("published", "==", true)), (snap) => setTests(snap.docs.map((x) => normalizeTest(x.id, x.data())))),
      onSnapshot(collection(d, "payments"), (snap) => setPayments(snap.docs.map((x) => normalizePayment(x.id, x.data())))),
    ];
    return () => stops.forEach((s) => s());
  }, []);

  // This month's registers and the "sent" log.
  useEffect(() => {
    const d = db();
    const stops = [
      onSnapshot(query(collection(d, "attendance"), where("date", ">=", `${month}-01`), where("date", "<=", `${month}-31`)), (snap) =>
        setSessions(snap.docs.map((x) => normalizeSession(x.id, x.data()))),
      ),
      onSnapshot(query(collection(d, "parentReports"), where("month", "==", month)), (snap) =>
        setSent(
          Object.fromEntries(
            snap.docs.map((x) => [x.get("uid") as string, { sentAt: (x.get("sentAt") as Timestamp | null)?.toDate?.() ?? null, comment: (x.get("comment") as string) ?? "" }]),
          ),
        ),
      ),
    ];
    return () => stops.forEach((s) => s());
  }, [month]);

  const locationName = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);

  const rows: Row[] = useMemo(() => {
    if (!batches) return [];
    const monthTests = tests.filter((t) => t.date.startsWith(month));
    return batches
      .filter((b) => b.status !== "closed")
      .flatMap((batch) =>
        rosterFor(batch, users, enrollments).map((user) => {
          const attendance = sessions
            .filter((s) => s.records[user.uid])
            .map((s) => ({ date: s.date, mark: s.records[user.uid] }))
            .sort((a, b) => b.date.localeCompare(a.date));
          const stats = new Map(monthTests.map((t) => [t.id, testStats(t)]));
          const reportTests = monthTests
            .filter((t) => user.uid in t.marks)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((t) => ({
              title: t.title,
              paper: t.paper,
              date: t.date,
              max: t.maxMarks,
              score: t.marks[user.uid] === "absent" ? null : (t.marks[user.uid] as number),
              classAverage: stats.get(t.id)?.average ?? null,
            }));
          const tuition =
            batch.fee > 0 ? tuitionStatus(batch.fee, payments.filter((p) => p.uid === user.uid && p.type === "tuition" && p.month === month)) : null;
          const data: ReportData = {
            name: user.name || "your child",
            batchLine: `Class ${batch.classLevel} · ${batch.name}, ${locationName.get(batch.locationId) ?? ""}`.replace(/, $/, ""),
            month,
            attendance,
            tests: reportTests,
            tuition,
            comment: sent[user.uid]?.comment ?? "",
          };
          return { user, batch, data };
        }),
      );
  }, [batches, users, enrollments, sessions, tests, payments, month, locationName, sent]);

  if (batches === null) return <Spinner />;

  const q = search.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (classFilter === "all" || r.batch.classLevel === classFilter) &&
      (batchFilter === "all" || r.batch.id === batchFilter) &&
      (show === "all" || !sent[r.user.uid]?.sentAt) &&
      (!q || [r.user.name, r.user.phone, r.user.parentPhone].some((v) => v.toLowerCase().includes(q))),
  );
  const sentCount = rows.filter((r) => sent[r.user.uid]?.sentAt).length;
  const open = rows.find((r) => r.user.uid === openUid);
  const nextUnsent = (after: string) => {
    const i = visible.findIndex((r) => r.user.uid === after);
    return [...visible.slice(i + 1), ...visible.slice(0, Math.max(0, i))].find((r) => !sent[r.user.uid]?.sentAt && r.user.uid !== after);
  };

  return (
    <div>
      <PageHeader
        title="Parent reports"
        description="A monthly summary for each student's parent — attendance, test results and tuition — ready to send on WhatsApp. Add a personal comment if you like."
      />

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Month</span>
          <input type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className={cn(adminInput, "w-auto")} />
        </label>
        <div className="text-right">
          <p className="font-display text-2xl tabular-nums">
            {sentCount} / {rows.length}
          </p>
          <p className="text-xs text-ink-soft">reports sent for {monthLabel(month)}</p>
        </div>
      </div>
      {rows.length > 0 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-2">
          <motion.div className="h-full rounded-full bg-forest" animate={{ width: `${Math.round((sentCount / rows.length) * 100)}%` }} transition={{ duration: 0.6 }} />
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
        <label className="relative">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student" className={cn(adminInput, "pl-10")} />
        </label>
        <select aria-label="Class" value={classFilter} onChange={(e) => { setClassFilter(e.target.value as ClassLevel | "all"); setBatchFilter("all"); }} className={adminInput}>
          <option value="all">All classes</option>
          {classLevels.map((c) => (
            <option key={c} value={c}>Class {c}</option>
          ))}
        </select>
        <select aria-label="Batch" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className={adminInput}>
          <option value="all">All batches</option>
          {batches
            .filter((b) => b.status !== "closed" && (classFilter === "all" || b.classLevel === classFilter))
            .map((b) => (
              <option key={b.id} value={b.id}>
                Class {b.classLevel} · {b.name} · {locationName.get(b.locationId) ?? ""}
              </option>
            ))}
        </select>
        <select aria-label="Show" value={show} onChange={(e) => setShow(e.target.value as "all" | "unsent")} className={adminInput}>
          <option value="all">All students</option>
          <option value="unsent">Not sent yet</option>
        </select>
      </div>

      <div className="mt-4">
        {rows.length === 0 ? (
          <EmptyState icon={<FileText className="size-6" />} title="No students yet" body="Reports appear here for every confirmed student in a running batch." />
        ) : visible.length === 0 ? (
          <EmptyState icon={<FileText className="size-6" />} title={show === "unsent" ? "All reports sent" : "No matches"} body={show === "unsent" ? `Every parent has their ${monthLabel(month)} report.` : "Try other filters."} />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line">
            {visible.map((r) => {
              const a = attendanceSummary(r.data.attendance);
              const scored = r.data.tests.filter((t) => t.score !== null);
              const avg = scored.length ? Math.round(scored.reduce((s, t) => s + percent(t.score!, t.max), 0) / scored.length) : null;
              const s = sent[r.user.uid];
              return (
                <button
                  key={`${r.user.uid}-${r.batch.id}`}
                  type="button"
                  onClick={() => setOpenUid(r.user.uid)}
                  className="grid w-full gap-2 border-b border-line px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-paper-2/60 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.user.name || "Unnamed"}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      Class {r.batch.classLevel} · {r.batch.name}
                      {!r.user.parentPhone && <span className="text-gold"> · no parent phone</span>}
                    </span>
                  </span>
                  <span className="text-sm">
                    {r.data.attendance.length ? `${a.attended}/${a.held} classes${a.rate === null ? "" : ` · ${a.rate}%`}` : <span className="text-ink-faint">No registers</span>}
                    <span className="block text-xs text-ink-soft">{r.data.tests.length ? `${r.data.tests.length} test${r.data.tests.length === 1 ? "" : "s"}${avg !== null ? ` · avg ${avg}%` : ""}` : "No tests"}</span>
                  </span>
                  <span className="text-sm">
                    {r.data.tuition ? (
                      <span className={cn(r.data.tuition.status === "paid" || r.data.tuition.status === "waived" ? "text-forest" : "text-ember")}>
                        {r.data.tuition.status === "paid" ? "Fee paid" : r.data.tuition.status === "waived" ? "Fee waived" : r.data.tuition.status === "partial" ? "Fee part-paid" : "Fee unpaid"}
                      </span>
                    ) : (
                      <span className="text-ink-faint">No fee set</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 md:justify-end">
                    {s?.sentAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-forest/15 px-2.5 py-1 text-xs text-forest">
                        <Check className="size-3.5" aria-hidden /> Sent {s.sentAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    ) : (
                      <span className="rounded-full bg-paper-2 px-2.5 py-1 text-xs text-ink-soft">Not sent</span>
                    )}
                    <ChevronRight className="size-4 text-ink-faint" aria-hidden />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Drawer open={Boolean(open)} title="Monthly report" onClose={() => setOpenUid("")}>
        {open && (
          <ReportPreview
            key={`${open.user.uid}-${month}`}
            row={open}
            month={month}
            sentAt={sent[open.user.uid]?.sentAt ?? null}
            next={nextUnsent(open.user.uid)}
            onNext={(uid) => setOpenUid(uid)}
          />
        )}
      </Drawer>
    </div>
  );
}

function ReportPreview({ row, month, sentAt, next, onNext }: { row: Row; month: string; sentAt: Date | null; next?: Row; onNext: (uid: string) => void }) {
  const [comment, setComment] = useState(row.data.comment);
  const [parentPhone, setParentPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const message = monthlyReportMessage({ ...row.data, comment });
  const phone = row.user.parentPhone;

  const log = (extra: Record<string, unknown>) =>
    setDoc(doc(db(), "parentReports", reportId(month, row.user.uid)), { month, uid: row.user.uid, comment: comment.trim(), updatedAt: serverTimestamp(), ...extra }, { merge: true });

  async function savePhone() {
    if (!phoneKey(parentPhone)) return setError("Enter the parent's mobile number, e.g. 01712345678.");
    setSavingPhone(true);
    setError("");
    try {
      await updateDoc(doc(db(), "users", row.user.uid), { parentPhone: parentPhone.trim(), updatedAt: serverTimestamp() });
    } catch (err) {
      setError((err as Error).message);
    }
    setSavingPhone(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select the text and copy it instead.");
    }
  }

  return (
    <div className={drawerFormClass}>
      <DrawerBody>
        <div>
          <p className="font-display text-2xl">{row.user.name || "Unnamed student"}</p>
          <p className="text-sm text-ink-soft">
            {row.data.batchLine} · {monthLabel(month)}
          </p>
          {sentAt && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-forest/15 px-3 py-1 text-xs text-forest">
              <CheckCircle2 className="size-3.5" aria-hidden /> Sent on {sentAt.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
            </p>
          )}
        </div>

        <label className="block">
          <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium">
            Your comment <span className="text-xs font-normal text-ink-soft">Optional — added to the report</span>
          </span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => comment !== row.data.comment && log({}).catch(() => {})}
            rows={3}
            className={adminInput}
            placeholder="e.g. Rahim is doing well with algorithms — needs more practice on logic gates."
          />
        </label>

        <div>
          <p className="mb-1.5 text-sm font-medium">Message preview</p>
          <p className="whitespace-pre-wrap rounded-2xl border border-line bg-paper-2/50 px-4 py-3.5 text-sm leading-relaxed">{message}</p>
        </div>

        {!phone && (
          <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4">
            <p className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
              No parent&apos;s phone saved for {row.user.name || "this student"}. Add it once and it&apos;s remembered.
            </p>
            <div className="mt-3 flex gap-2">
              <input type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="01XXXXXXXXX" aria-label="Parent's phone" className={adminInput} />
              <PrimaryButton onClick={savePhone} loading={savingPhone} className="shrink-0">
                Save
              </PrimaryButton>
            </div>
          </div>
        )}
        <ErrorText message={error} />
      </DrawerBody>
      <DrawerFooter>
        <GhostButton onClick={copy} className="mr-auto">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
        </GhostButton>
        {sentAt && next && (
          <GhostButton onClick={() => onNext(next.user.uid)}>
            Next: {next.user.name.split(" ")[0] || "student"} <ChevronRight className="size-4" />
          </GhostButton>
        )}
        {phone && (
          <a
            href={waLink(phone, message)}
            target="_blank"
            rel="noreferrer"
            onClick={() => log({ sentAt: serverTimestamp() }).catch(() => {})}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-forest-ink transition-colors hover:bg-ink hover:text-paper"
          >
            <Send className="size-4" aria-hidden /> {sentAt ? "Send again" : "Send on WhatsApp"}
          </a>
        )}
      </DrawerFooter>
    </div>
  );
}
