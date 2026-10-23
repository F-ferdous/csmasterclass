"use client";

import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";
import { Check, CheckCircle2, ClipboardCheck, ListOrdered, Loader2, MessageCircle, Search, Send, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EnrollmentPicker } from "@/components/auth/enrollment-picker";
import { refreshCoaching } from "@/components/admin/refresh";
import { decideRegistration } from "@/app/student-actions";
import type { Enrollment } from "@/lib/auth";
import { classLevels, groupSessions, normalizeBatch, normalizeLocation, sortBatches } from "@/lib/coaching";
import {
  byNewest,
  decideEnrollment,
  enrollmentStatusLabels,
  enrollmentStatusStyles,
  isNewStudent,
  isRegistration,
  markBatchFull,
  markWelcomed,
  normalizeEnrollment,
  type EnrollmentRecord,
  type EnrollmentSource,
} from "@/lib/enrollments";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase-client";
import { waLink } from "@/lib/phone";
import { welcomeMessages } from "@/lib/welcome";
import type { Batch, ClassLevel, Location } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, Field, GhostButton, PageHeader, PrimaryButton, Spinner } from "./ui";

type Tab = "pending" | "confirmed" | "waitlisted" | "closed" | "all";

const tabs: { id: Tab; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "waitlisted", label: "Waitlisted" },
  { id: "closed", label: "Rejected & cancelled" },
  { id: "all", label: "All" },
];

const sourceLabels: Record<EnrollmentSource, string> = {
  signup: "Registered on the site",
  profile: "Changed batch",
  admin: "Placed by admin",
  sync: "Existing student",
};

const inTab = (r: EnrollmentRecord, tab: Tab) =>
  tab === "all" ? true : tab === "closed" ? r.status === "rejected" || r.status === "cancelled" : r.status === tab;

type Decision = "confirmed" | "waitlisted" | "rejected";
type Placement = { batchId?: string; locationId?: string; classLevel?: ClassLevel | ""; note?: string };

/** Registrations (no login yet) are decided on the server, which creates the login on confirm. */
async function decide(r: EnrollmentRecord, status: Decision, options: Placement = {}) {
  if (!isRegistration(r)) return decideEnrollment(r, status, options);
  const token = await auth().currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again.");
  const result = await decideRegistration(token, r.id, status, options);
  if (!result.ok) throw new Error(`${r.name || r.phone}: ${result.error}`);
}

const formatDate = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—");

export function EnrollmentsManager() {
  const [records, setRecords] = useState<EnrollmentRecord[] | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<ClassLevel | "all">("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState<EnrollmentRecord | null>(null);
  /** New students just confirmed (or reopened) — the welcome drawer offers their WhatsApp messages. */
  const [welcoming, setWelcoming] = useState<string[]>([]);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    const d = db();
    const stops = [
      onSnapshot(
        collection(d, "enrollments"),
        (snap) => setRecords(snap.docs.map((x) => normalizeEnrollment(x.id, x.data())).sort(byNewest)),
        () => setRecords([]),
      ),
      onSnapshot(collection(d, "batches"), (snap) => setBatches(sortBatches(snap.docs.map((x) => normalizeBatch(x.id, x.data()))))),
      onSnapshot(query(collection(d, "locations"), orderBy("order", "asc")), (snap) =>
        setLocations(snap.docs.map((x) => normalizeLocation(x.id, x.data()))),
      ),
    ];
    return () => stops.forEach((s) => s());
  }, []);

  const batchById = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches]);
  const locationName = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);
  const all = records ?? [];

  const confirmedIn = (batchId: string) => all.filter((r) => r.batchId === batchId && r.status === "confirmed").length;
  const pendingIn = (batchId: string) => all.filter((r) => r.batchId === batchId && r.status === "pending").length;

  const q = search.trim().toLowerCase();
  const filtered = all.filter(
    (r) =>
      (classFilter === "all" || r.classLevel === classFilter) &&
      (batchFilter === "all" || r.batchId === batchFilter) &&
      (!q || [r.name, r.email, r.phone].some((v) => v.toLowerCase().includes(q))),
  );
  const visible = filtered.filter((r) => inTab(r, tab));
  const selectable = visible.filter((r) => r.status === "pending" || r.status === "waitlisted");
  const selectedRecords = selectable.filter((r) => selected.has(r.id));

  /** Confirms with seat checks; offers to mark a batch Full once it fills up. */
  async function confirmRecords(list: EnrollmentRecord[], options?: { batchId?: string; locationId?: string; classLevel?: ClassLevel | ""; note?: string }) {
    const target = (r: EnrollmentRecord) => options?.batchId ?? r.batchId;
    const perBatch = new Map<string, number>();
    list.forEach((r) => perBatch.set(target(r), (perBatch.get(target(r)) ?? 0) + 1));

    for (const [batchId, adding] of perBatch) {
      const b = batchById.get(batchId);
      if (b && b.seats > 0 && confirmedIn(batchId) + adding > b.seats) {
        const ok = window.confirm(
          `${b.name} (Class ${b.classLevel}) has ${confirmedIn(batchId)} of ${b.seats} seats confirmed. Confirming ${adding} more goes over capacity. Continue?`,
        );
        if (!ok) return false;
      }
    }

    for (const r of list) await decide(r, "confirmed", options);

    for (const [batchId, adding] of perBatch) {
      const b = batchById.get(batchId);
      if (b && b.seats > 0 && b.status !== "full" && confirmedIn(batchId) + adding >= b.seats) {
        if (window.confirm(`${b.name} is now full (${b.seats} seats). Mark it as "Batch full" on the website?`)) {
          await markBatchFull(batchId);
          await refreshCoaching();
        }
      }
    }
    return true;
  }

  /** Confirms, then offers the WhatsApp welcome for any new students among them. */
  async function confirmAndWelcome(list: EnrollmentRecord[], options?: Placement) {
    const ok = await confirmRecords(list, options);
    const ids = list.filter((r) => r.source === "signup").map((r) => r.id);
    if (ok && ids.length) setWelcoming(ids);
    return ok;
  }

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
      setSelected(new Set());
    } catch (err) {
      window.alert((err as Error).message);
    }
    setBusy("");
  }

  const quickReject = (r: EnrollmentRecord) => {
    const note = window.prompt(`Reason for not accepting ${r.name || r.email} (optional — the student sees this):`, "");
    if (note === null) return;
    run(`reject-${r.id}`, () => decide(r, "rejected", { note }));
  };

  if (records === null) return <Spinner />;

  const counts = Object.fromEntries(tabs.map((t) => [t.id, filtered.filter((r) => inTab(r, t.id)).length])) as Record<Tab, number>;
  const capacityBatches = batches.filter((b) => b.status !== "closed" && (classFilter === "all" || b.classLevel === classFilter));

  return (
    <div>
      <PageHeader
        title="Enrollments"
        description="New registrations and batch-change requests. Confirming a new student creates their login and puts them in the batch — until then they can't sign in. Confirmed seats count towards each batch's capacity."
      />

      {/* Capacity */}
      {capacityBatches.length > 0 && (
        <div className="mt-8 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]" data-lenis-prevent>
          {capacityBatches.map((b) => {
            const used = confirmedIn(b.id);
            const pct = b.seats > 0 ? Math.min(100, Math.round((used / b.seats) * 100)) : 0;
            const active = batchFilter === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setBatchFilter(active ? "all" : b.id)}
                aria-pressed={active}
                className={cn(
                  "w-56 shrink-0 rounded-2xl border p-4 text-left transition-colors",
                  active ? "border-ink bg-paper-2" : "border-line hover:border-ink",
                )}
              >
                <p className="text-xs text-ink-faint">
                  Class {b.classLevel} · {locationName.get(b.locationId) ?? "—"}
                </p>
                <p className="mt-0.5 truncate font-medium">{b.name}</p>
                <p className="mt-3 flex items-baseline justify-between text-sm">
                  <span>
                    <strong className="font-display text-xl">{used}</strong>
                    <span className="text-ink-soft">{b.seats > 0 ? ` / ${b.seats} seats` : " confirmed"}</span>
                  </span>
                  {pendingIn(b.id) > 0 && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs text-gold">{pendingIn(b.id)} pending</span>}
                </p>
                {b.seats > 0 && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-3">
                    <motion.div
                      className={cn("h-full rounded-full", pct >= 100 ? "bg-ember" : pct >= 80 ? "bg-gold" : "bg-forest")}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-full border border-line p-1 sm:w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setSelected(new Set());
            }}
            className={cn("relative shrink-0 rounded-full px-4 py-2 text-sm", tab === t.id ? "text-paper" : "text-ink-soft hover:text-ink")}
          >
            {tab === t.id && <motion.span layoutId="enrollment-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
            <span className="relative">
              {t.label}
              <span className={cn("ml-1.5 text-xs", tab === t.id ? "opacity-70" : "text-ink-faint")}>{counts[t.id]}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr]">
        <label className="relative">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone" className={cn(adminInput, "pl-10")} />
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
            .filter((b) => classFilter === "all" || b.classLevel === classFilter)
            .map((b) => (
              <option key={b.id} value={b.id}>
                Class {b.classLevel} · {b.name} · {locationName.get(b.locationId) ?? ""}
              </option>
            ))}
        </select>
      </div>

      {/* Bulk actions */}
      <AnimatePresence>
        {selectedRecords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-paper"
          >
            <p className="text-sm">{selectedRecords.length} selected</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelected(new Set())} className="rounded-full px-3 py-1.5 text-sm opacity-80 hover:opacity-100">
                Clear
              </button>
              {tab !== "waitlisted" && (
                <button
                  type="button"
                  onClick={() => run("bulk-wait", () => Promise.all(selectedRecords.map((r) => decide(r, "waitlisted"))))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-paper/30 px-3.5 py-1.5 text-sm"
                >
                  <ListOrdered className="size-4" aria-hidden /> Waitlist
                </button>
              )}
              <button
                type="button"
                onClick={() => run("bulk-confirm", () => confirmAndWelcome(selectedRecords))}
                className="inline-flex items-center gap-1.5 rounded-full bg-paper px-4 py-1.5 text-sm font-semibold text-ink"
              >
                {busy === "bulk-confirm" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" aria-hidden />} Confirm {selectedRecords.length}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      <div className="mt-4">
        {all.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="size-6" />}
            title="No enrollment requests yet"
            body="When students register or ask to change batch, their requests appear here for you to confirm."
          />
        ) : visible.length === 0 ? (
          <EmptyState icon={<ClipboardCheck className="size-6" />} title={tab === "pending" ? "All caught up" : "Nothing here"} body="No requests match this view." />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line">
            {selectable.length > 0 && (
              <label className="flex items-center gap-3 border-b border-line bg-paper-2/50 px-5 py-2.5 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--forest)]"
                  checked={selectedRecords.length === selectable.length}
                  onChange={(e) => setSelected(e.target.checked ? new Set(selectable.map((r) => r.id)) : new Set())}
                />
                Select all {selectable.length}
              </label>
            )}
            <AnimatePresence initial={false}>
              {visible.map((r) => {
                const b = batchById.get(r.batchId);
                const canSelect = r.status === "pending" || r.status === "waitlisted";
                return (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid gap-3 border-b border-line px-5 py-4 last:border-b-0 lg:grid-cols-[auto_1.3fr_1.5fr_auto] lg:items-center lg:gap-5"
                  >
                    <div className="hidden lg:block">
                      {canSelect ? (
                        <input
                          type="checkbox"
                          aria-label={`Select ${r.name}`}
                          className="size-4 accent-[var(--forest)]"
                          checked={selected.has(r.id)}
                          onChange={(e) =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(r.id);
                              else next.delete(r.id);
                              return next;
                            })
                          }
                        />
                      ) : (
                        <span className="block size-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.name || "Unnamed"}</p>
                      <p className="truncate text-xs text-ink-soft">{[r.phone, r.email].filter(Boolean).join(" · ")}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-faint">
                        {isRegistration(r) && r.status !== "rejected" && r.status !== "cancelled" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-series-3/15 px-2 py-0.5 font-medium text-series-3">
                            <UserPlus className="size-3" aria-hidden /> New student · no login yet
                          </span>
                        )}
                        {sourceLabels[r.source]} · {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <div className="min-w-0 text-sm">
                      <p className="font-medium">
                        Class {r.classLevel || "?"} · {b?.name ?? "Deleted batch"}
                        <span className="font-normal text-ink-soft"> · {locationName.get(r.locationId) ?? "—"}</span>
                      </p>
                      {b && (
                        <p className="mt-0.5 truncate text-xs text-ink-soft">{groupSessions(b.sessions).map((g) => `${g.days} ${g.time}`).join(" · ")}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs", enrollmentStatusStyles[r.status])}>{enrollmentStatusLabels[r.status]}</span>
                        {b && b.seats > 0 && (
                          <span className="text-xs text-ink-faint">
                            {confirmedIn(b.id)}/{b.seats} seats taken
                          </span>
                        )}
                        {r.note && <span className="truncate text-xs italic text-ink-soft">“{r.note}”</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 lg:justify-end">
                      {(r.status === "pending" || r.status === "waitlisted") && (
                        <>
                          <ActionButton primary loading={busy === `confirm-${r.id}`} onClick={() => run(`confirm-${r.id}`, () => confirmAndWelcome([r]))}>
                            <Check className="size-4" aria-hidden /> Confirm
                          </ActionButton>
                          {r.status === "pending" && (
                            <ActionButton loading={busy === `wait-${r.id}`} onClick={() => run(`wait-${r.id}`, () => decide(r, "waitlisted"))}>
                              Waitlist
                            </ActionButton>
                          )}
                          <ActionButton danger loading={busy === `reject-${r.id}`} onClick={() => quickReject(r)}>
                            <X className="size-4" aria-hidden />
                          </ActionButton>
                        </>
                      )}
                      {isNewStudent(r) && (
                        <ActionButton onClick={() => setWelcoming([r.id])}>
                          {r.welcomedStudentAt && r.welcomedParentAt ? (
                            <CheckCircle2 className="size-4 text-forest" aria-hidden />
                          ) : (
                            <MessageCircle className="size-4" aria-hidden />
                          )}
                          Welcome
                        </ActionButton>
                      )}
                      <ActionButton onClick={() => setReviewing(r)}>Review</ActionButton>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Drawer open={Boolean(reviewing)} title="Enrollment request" onClose={() => setReviewing(null)}>
        {reviewing && (
          <ReviewForm
            key={reviewing.id}
            record={reviewing}
            batches={batches}
            locations={locations}
            confirmedIn={confirmedIn}
            onConfirm={(options) => confirmAndWelcome([reviewing], options)}
            onDone={() => setReviewing(null)}
          />
        )}
      </Drawer>

      <Drawer open={welcoming.length > 0} title={welcoming.length > 1 ? `Welcome ${welcoming.length} students` : "Send welcome"} onClose={() => setWelcoming([])}>
        <div className={drawerFormClass}>
          <DrawerBody>
            <p className="text-sm text-ink-soft">
              Each button opens WhatsApp with the message written for you — check it, then press send. Sent messages are ticked here.
            </p>
            {welcoming.map((id) => {
              const r = all.find((x) => x.id === id);
              if (!r) return null;
              const batch = batchById.get(r.batchId);
              return <WelcomeCard key={id} record={r} batch={batch} location={locations.find((l) => l.id === (batch?.locationId ?? r.locationId))} />;
            })}
          </DrawerBody>
          <DrawerFooter>
            <PrimaryButton onClick={() => setWelcoming([])}>Done</PrimaryButton>
          </DrawerFooter>
        </div>
      </Drawer>
    </div>
  );
}

/** One new student's welcome: preview, and a WhatsApp button each for the student and the parent. */
function WelcomeCard({ record, batch, location }: { record: EnrollmentRecord; batch?: Batch; location?: Location }) {
  const [show, setShow] = useState<"student" | "parent">("student");
  // Numbers fixed later in Admin → Students win over the ones typed at registration.
  const [current, setCurrent] = useState<{ phone: string; parentPhone: string } | null>(null);
  useEffect(() => {
    if (!record.uid) return;
    return onSnapshot(doc(db(), "students", record.uid), (snap) => {
      const d = snap.data();
      if (d) setCurrent({ phone: typeof d.phone === "string" ? d.phone : "", parentPhone: typeof d.parentPhone === "string" ? d.parentPhone : "" });
    });
  }, [record.uid]);
  const phone = current?.phone || record.phone;
  const parentPhone = current?.parentPhone || record.parentPhone;

  const messages = welcomeMessages({ name: record.name, phone, note: record.note, batch, location });
  const targets = [
    { who: "student" as const, label: "Student", phone, sentAt: record.welcomedStudentAt },
    { who: "parent" as const, label: "Parent", phone: parentPhone, sentAt: record.welcomedParentAt },
  ];

  return (
    <article className="rounded-3xl border border-line p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-xl">{record.name || "Unnamed student"}</p>
        <p className="text-xs text-ink-soft">
          Class {batch?.classLevel ?? record.classLevel} · {batch?.name ?? "—"}
        </p>
      </div>

      <div className="mt-4 flex gap-1 rounded-full border border-line p-1 text-sm sm:w-fit" role="tablist" aria-label="Preview message for">
        {targets.map((t) => (
          <button
            key={t.who}
            type="button"
            role="tab"
            aria-selected={show === t.who}
            onClick={() => setShow(t.who)}
            className={cn("flex-1 rounded-full px-4 py-1.5", show === t.who ? "bg-ink text-paper" : "text-ink-soft hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-line bg-paper-2/50 px-4 py-3.5 text-sm leading-relaxed" data-lenis-prevent>
        {messages[show]}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {targets.map((t) =>
          t.phone ? (
            <a
              key={t.who}
              href={waLink(t.phone, messages[t.who])}
              target="_blank"
              rel="noreferrer"
              onClick={() => void markWelcomed(record.id, t.who).catch(() => {})}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
                t.sentAt ? "border border-line font-normal hover:border-ink" : "bg-forest text-forest-ink hover:bg-ink hover:text-paper",
              )}
            >
              {t.sentAt ? <CheckCircle2 className="size-4 text-forest" aria-hidden /> : <Send className="size-4" aria-hidden />}
              {t.sentAt ? `Sent to ${t.label.toLowerCase()} · again` : `WhatsApp ${t.label.toLowerCase()}`}
            </a>
          ) : (
            <p key={t.who} className="rounded-full border border-dashed border-line px-4 py-2.5 text-center text-xs text-ink-soft">
              No {t.label.toLowerCase()} phone — add it in Students
            </p>
          ),
        )}
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        {[phone && `Student ${phone}`, parentPhone && `Parent ${parentPhone}`].filter(Boolean).join(" · ")}
      </p>
    </article>
  );
}

function ActionButton({
  children,
  onClick,
  primary,
  danger,
  loading,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-colors disabled:opacity-60",
        primary
          ? "bg-forest font-semibold text-forest-ink hover:bg-ink hover:text-paper"
          : danger
            ? "border border-line text-ember hover:border-ember"
            : "border border-line hover:border-ink",
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}

function ReviewForm({
  record,
  batches,
  locations,
  confirmedIn,
  onConfirm,
  onDone,
}: {
  record: EnrollmentRecord;
  batches: Batch[];
  locations: Location[];
  confirmedIn: (batchId: string) => number;
  onConfirm: (options: { batchId: string; locationId: string; classLevel: ClassLevel | ""; note: string }) => Promise<boolean>;
  onDone: () => void;
}) {
  const [placement, setPlacement] = useState<Enrollment>({ classLevel: record.classLevel, locationId: record.locationId, batchId: record.batchId });
  const [note, setNote] = useState(record.note);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const batch = batches.find((b) => b.id === placement.batchId);
  const decided = record.status === "rejected" || record.status === "cancelled";

  async function act(kind: "confirmed" | "waitlisted" | "rejected") {
    if (!placement.batchId) return setError("Choose a batch.");
    setBusy(kind);
    setError("");
    try {
      if (kind === "confirmed") {
        const ok = await onConfirm({ ...placement, note });
        if (!ok) return setBusy("");
      } else {
        await decide(record, kind, { ...placement, note });
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy("");
    }
  }

  return (
    <div className={drawerFormClass}>
      <DrawerBody>
        <div>
          <p className="font-display text-2xl">{record.name || "Unnamed student"}</p>
          <p className="text-sm text-ink-soft">{[record.phone, record.email].filter(Boolean).join(" · ")}</p>
          {record.parentPhone && <p className="text-sm text-ink-soft">Parent: {record.parentPhone}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("rounded-full px-2.5 py-1", enrollmentStatusStyles[record.status])}>{enrollmentStatusLabels[record.status]}</span>
            <span className="text-ink-faint">
              {sourceLabels[record.source]} · {record.createdAt ? record.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—"}
            </span>
          </div>
        </div>

        <div className="border-t border-line pt-5">
          <p className="mb-3 text-sm text-ink-soft">
            Confirm the requested batch, or move the student to another one.
            {isRegistration(record) && " Confirming creates their login — they sign in with their mobile number (or email) and the password they chose."}
          </p>
          <EnrollmentPicker value={placement} onChange={setPlacement} locations={locations} batches={batches} loading={false} allowFull />
          {batch && batch.seats > 0 && (
            <p className={cn("mt-3 text-sm", confirmedIn(batch.id) >= batch.seats ? "text-ember" : "text-ink-soft")}>
              {confirmedIn(batch.id)} of {batch.seats} seats confirmed in {batch.name}.
            </p>
          )}
        </div>

        <Field label="Note to the student" hint="Optional — shown on their dashboard">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={adminInput} placeholder="e.g. Classes start on 1 November. Please bring your Paper 1 notes." />
        </Field>

        <ErrorText message={error} />
      </DrawerBody>
      <DrawerFooter>
        {!decided && (
          <GhostButton onClick={() => act("rejected")} className="mr-auto text-ember hover:border-ember">
            {busy === "rejected" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />} Decline
          </GhostButton>
        )}
        <GhostButton onClick={() => act("waitlisted")}>{busy === "waitlisted" ? <Loader2 className="size-4 animate-spin" /> : <ListOrdered className="size-4" />} Waitlist</GhostButton>
        <PrimaryButton onClick={() => act("confirmed")} loading={busy === "confirmed"}>
          <Check className="size-4" /> Confirm seat
        </PrimaryButton>
      </DrawerFooter>
    </div>
  );
}
