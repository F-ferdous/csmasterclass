"use client";

import Link from "next/link";
import { addDoc, collection, deleteDoc, deleteField, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, Clock, Copy, CopyCheck, MapPin, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { db } from "@/lib/firebase";
import {
  boards,
  classLabels,
  classLevels,
  groupSessions,
  normalizeBatch,
  normalizeLocation,
  sortBatches,
  sortSessions,
  statusLabels,
  weekdays,
} from "@/lib/coaching";
import type { Batch, BatchStatus, Board, ClassLevel, Location, Session, Weekday } from "@/lib/types";
import { cn } from "@/lib/utils";
import { refreshCoaching } from "@/app/actions";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, Field, GhostButton, PageHeader, PrimaryButton, Segmented, Spinner } from "./ui";

const statusStyles: Record<BatchStatus, string> = {
  open: "bg-forest/15 text-forest",
  "few-seats": "bg-gold/20 text-gold",
  full: "bg-ember/15 text-ember",
  closed: "bg-paper-2 text-ink-soft",
};

const statuses: BatchStatus[] = ["open", "few-seats", "full", "closed"];

const fullDay: Record<Weekday, string> = {
  Sat: "Saturday",
  Sun: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
};

export function BatchesManager() {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [classFilter, setClassFilter] = useState<ClassLevel | "all">("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Batch | null>(null);
  const [enrolled, setEnrolled] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const stopB = onSnapshot(
      collection(db(), "batches"),
      (snap) => setBatches(sortBatches(snap.docs.map((d) => normalizeBatch(d.id, d.data())))),
      () => setBatches([]),
    );
    const stopL = onSnapshot(
      query(collection(db(), "locations"), orderBy("order", "asc")),
      (snap) => setLocations(snap.docs.map((d) => normalizeLocation(d.id, d.data()))),
      () => setLocations([]),
    );
    // How many students are in each batch.
    const stopU = onSnapshot(collection(db(), "users"), (snap) => {
      const counts = new Map<string, number>();
      snap.docs.forEach((d) => {
        const id = d.data().batchId as string | undefined;
        if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
      });
      setEnrolled(counts);
    });
    return () => {
      stopB();
      stopL();
      stopU();
    };
  }, []);

  const locationName = useMemo(() => new Map((locations ?? []).map((l) => [l.id, l.name])), [locations]);

  const visible = (batches ?? []).filter(
    (b) => (classFilter === "all" || b.classLevel === classFilter) && (locationFilter === "all" || b.locationId === locationFilter),
  );

  const newBatch = (): Batch => ({
    id: "",
    classLevel: classFilter === "all" ? "9" : classFilter,
    locationId: locationFilter !== "all" ? locationFilter : locations?.[0]?.id ?? "",
    name: "",
    board: "Both",
    sessions: [],
    seats: 0,
    fee: 0,
    status: "open",
    notes: "",
  });

  async function remove(b: Batch) {
    if (!window.confirm(`Delete "${b.name}" (Class ${b.classLevel})? This cannot be undone.`)) return;
    await deleteDoc(doc(db(), "batches", b.id));
    await refreshCoaching();
  }

  if (batches === null || locations === null) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Batches"
        description="Set class-wise batches at each location. Open batches appear on the Teaching page with a Join button."
        actions={
          locations.length > 0 && (
            <PrimaryButton onClick={() => setEditing(newBatch())}>
              <Plus className="size-4" /> New batch
            </PrimaryButton>
          )
        }
      />

      {locations.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<MapPin className="size-6" />}
            title="Add a location first"
            body="Every batch runs at a coaching centre. Add Mirpur Academia and Uttara QED (or any centre), then come back to create batches."
            action={
              <Link href="/admin/locations" className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-forest-ink">
                Go to Locations
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {/* Summary by class */}
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {classLevels.map((c) => {
              const list = batches.filter((b) => b.classLevel === c);
              const open = list.filter((b) => b.status === "open" || b.status === "few-seats").length;
              const active = classFilter === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClassFilter(active ? "all" : c)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-[background,border-color,transform] hover:-translate-y-0.5",
                    active ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
                  )}
                >
                  <p className={cn("text-xs", active ? "opacity-70" : "text-ink-soft")}>{classLabels[c]}</p>
                  <p className="mt-1 font-display text-3xl">Class {c}</p>
                  <p className={cn("mt-2 text-sm", active ? "opacity-80" : "text-ink-soft")}>
                    {list.length} batch{list.length === 1 ? "" : "es"} · {open} open
                  </p>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-ink-soft">Location</span>
            {[{ id: "all", name: "All" }, ...locations].map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLocationFilter(l.id)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  locationFilter === l.id ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
                )}
              >
                {l.name}
              </button>
            ))}
            {classFilter !== "all" && (
              <button type="button" onClick={() => setClassFilter("all")} className="ml-auto text-sm text-ink-soft underline underline-offset-4">
                Show all classes
              </button>
            )}
          </div>

          {/* List */}
          <div className="mt-6">
            {visible.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="size-6" />}
                title={batches.length === 0 ? "No batches yet" : "No batches match these filters"}
                body={batches.length === 0 ? "Create your first batch — choose the class, centre, days and time." : "Try another class or location."}
                action={<PrimaryButton onClick={() => setEditing(newBatch())}><Plus className="size-4" /> New batch</PrimaryButton>}
              />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-line">
                <AnimatePresence initial={false}>
                  {visible.map((b) => (
                    <motion.div
                      key={b.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid gap-3 border-b border-line p-4 last:border-b-0 sm:grid-cols-[88px_1fr_auto] sm:items-center sm:gap-5 sm:p-5"
                    >
                      <div className="flex items-center gap-3 sm:block">
                        <span className="grid size-14 place-items-center rounded-2xl bg-paper-2 text-center leading-none">
                          <span>
                            <span className="block text-[10px] uppercase tracking-wider text-ink-faint">Class</span>
                            <span className="font-display text-2xl">{b.classLevel}</span>
                          </span>
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{b.name}</p>
                          <span className={cn("rounded-full px-2.5 py-0.5 text-xs", statusStyles[b.status])}>{statusLabels[b.status]}</span>
                          <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft">{b.board === "Both" ? "Cambridge & Edexcel" : b.board}</span>
                        </div>
                        <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="size-3.5" aria-hidden /> {locationName.get(b.locationId) ?? "Unknown location"}
                          </span>
                          {b.sessions.length === 0 ? (
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarClock className="size-3.5" aria-hidden /> No days set
                            </span>
                          ) : (
                            groupSessions(b.sessions).map((g) => (
                              <span key={g.days} className="inline-flex items-center gap-1.5">
                                <Clock className="size-3.5" aria-hidden /> <span className="text-ink">{g.days}</span> {g.time}
                              </span>
                            ))
                          )}
                          <Link
                            href={`/admin/students?batch=${b.id}`}
                            className="inline-flex items-center gap-1.5 text-ink underline-offset-4 hover:underline"
                          >
                            <Users className="size-3.5" aria-hidden /> {enrolled.get(b.id) ?? 0}
                            {b.seats > 0 ? ` / ${b.seats}` : ""} student{(enrolled.get(b.id) ?? 0) === 1 ? "" : "s"}
                          </Link>
                          {b.fee > 0 && <span>{b.fee.toLocaleString("en-US")} BDT / month</span>}
                        </p>
                        {b.notes && <p className="mt-1 text-xs text-ink-faint">{b.notes}</p>}
                      </div>
                      <div className="flex gap-1 sm:justify-end">
                        <IconButton label={`Edit ${b.name}`} onClick={() => setEditing(b)}>
                          <Pencil className="size-4" />
                        </IconButton>
                        <IconButton label={`Duplicate ${b.name}`} onClick={() => setEditing({ ...b, id: "", name: `${b.name} (copy)` })}>
                          <Copy className="size-4" />
                        </IconButton>
                        <IconButton label={`Delete ${b.name}`} onClick={() => remove(b)} danger>
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </>
      )}

      <Drawer open={Boolean(editing)} title={editing?.id ? "Edit batch" : "New batch"} onClose={() => setEditing(null)}>
        {editing && <BatchForm key={editing.id || `new-${editing.name}`} batch={editing} locations={locations} onDone={() => setEditing(null)} />}
      </Drawer>
    </div>
  );
}

function IconButton({ children, label, onClick, danger }: { children: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("grid size-9 place-items-center rounded-full hover:bg-paper-2", danger && "text-ember")}
    >
      {children}
    </button>
  );
}

function BatchForm({ batch, locations, onDone }: { batch: Batch; locations: Location[]; onDone: () => void }) {
  const [classLevel, setClassLevel] = useState<ClassLevel>(batch.classLevel);
  const [board, setBoard] = useState<Board>(batch.board);
  const [sessions, setSessions] = useState<Session[]>(batch.sessions);
  const [status, setStatus] = useState<BatchStatus>(batch.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const hasDay = (d: Weekday) => sessions.some((s) => s.day === d);

  // A newly ticked day starts with the same time as the most recent one, so equal times need no retyping.
  const toggleDay = (d: Weekday) =>
    setSessions((prev) => {
      if (prev.some((s) => s.day === d)) return prev.filter((s) => s.day !== d);
      const template = prev.at(-1) ?? { start: "16:00", end: "17:30" };
      return [...prev, { day: d, start: template.start, end: template.end }];
    });

  const updateSession = (d: Weekday, patch: Partial<Session>) =>
    setSessions((prev) => prev.map((s) => (s.day === d ? { ...s, ...patch } : s)));

  const copyToAll = (from: Session) => setSessions((prev) => prev.map((s) => ({ ...s, start: from.start, end: from.end })));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ordered = sortSessions(sessions);
    const data = {
      classLevel,
      board,
      status,
      sessions: ordered,
      days: ordered.map((x) => x.day), // kept alongside for simple filtering/queries
      locationId: String(f.get("locationId")),
      name: String(f.get("name")).trim(),
      seats: Math.max(0, Number(f.get("seats")) || 0),
      fee: Math.max(0, Number(f.get("fee")) || 0),
      notes: String(f.get("notes")).trim(),
      updatedAt: serverTimestamp(),
    };
    if (!data.name) return setError("Give the batch a name, e.g. “Batch A” or “Saturday Evening”.");
    if (!data.locationId) return setError("Choose a location.");
    if (ordered.length === 0) return setError("Pick at least one day.");
    const bad = ordered.find((x) => !x.start || !x.end || x.end <= x.start);
    if (bad) return setError(`Check ${fullDay[bad.day]}: the end time must be after the start time.`);

    setSaving(true);
    setError("");
    try {
      // Remove the old single-time fields when an older batch is re-saved.
      if (batch.id) await setDoc(doc(db(), "batches", batch.id), { ...data, startTime: deleteField(), endTime: deleteField() }, { merge: true });
      else await addDoc(collection(db(), "batches"), { ...data, createdAt: serverTimestamp() });
      await refreshCoaching();
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={drawerFormClass}>
      <DrawerBody>
        <Field label="Class">
          <div className="grid grid-cols-4 gap-2">
            {classLevels.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={classLevel === c}
                onClick={() => setClassLevel(c)}
                className={cn(
                  "rounded-2xl border px-2 py-3 text-center transition-colors",
                  classLevel === c ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
                )}
              >
                <span className="block font-display text-2xl leading-none">{c}</span>
                <span className={cn("mt-1 block text-[10px]", classLevel === c ? "opacity-70" : "text-ink-soft")}>{classLabels[c].split(" / ")[0]}</span>
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Location">
            <select name="locationId" defaultValue={batch.locationId} className={adminInput} required>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.active ? "" : " (hidden)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Batch name">
            <input name="name" defaultValue={batch.name} className={adminInput} placeholder="Batch A" required />
          </Field>
        </div>

        <Field label="Board">
          <Segmented options={boards} value={board} onChange={setBoard} render={(b) => (b === "Both" ? "Cambridge & Edexcel" : b)} />
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Days &amp; times</legend>
          <p className="mb-3 text-xs text-ink-faint">Pick the class days, then set the time for each day.</p>
          <div className="flex flex-wrap gap-1.5">
            {weekdays.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={hasDay(d)}
                onClick={() => toggleDay(d)}
                className={cn(
                  "w-14 rounded-xl border py-2 text-sm transition-colors",
                  hasDay(d) ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
                )}
              >
                {d}
              </button>
            ))}
          </div>

          {sessions.length > 0 && (
            <ul className="mt-4 overflow-hidden rounded-2xl border border-line">
              <AnimatePresence initial={false}>
                {sortSessions(sessions).map((s) => (
                  <motion.li
                    key={s.day}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-b border-line last:border-b-0"
                  >
                    <div className="flex flex-wrap items-center gap-2 p-3 sm:flex-nowrap">
                      <span className="w-24 shrink-0 text-sm font-medium">{fullDay[s.day]}</span>
                      <input
                        type="time"
                        aria-label={`${fullDay[s.day]} start time`}
                        value={s.start}
                        onChange={(e) => updateSession(s.day, { start: e.target.value })}
                        className={cn(adminInput, "w-auto flex-1 py-2")}
                        required
                      />
                      <span className="text-sm text-ink-faint">to</span>
                      <input
                        type="time"
                        aria-label={`${fullDay[s.day]} end time`}
                        value={s.end}
                        onChange={(e) => updateSession(s.day, { end: e.target.value })}
                        className={cn(
                          adminInput,
                          "w-auto flex-1 py-2",
                          s.start && s.end && s.end <= s.start && "border-ember",
                        )}
                        required
                      />
                      <div className="flex shrink-0">
                        {sessions.length > 1 && (
                          <IconButton label={`Use ${fullDay[s.day]}'s time for all days`} onClick={() => copyToAll(s)}>
                            <CopyCheck className="size-4" />
                          </IconButton>
                        )}
                        <IconButton label={`Remove ${fullDay[s.day]}`} onClick={() => toggleDay(s.day)}>
                          <X className="size-4" />
                        </IconButton>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </fieldset>

        <div className="grid grid-cols-2 gap-5">
          <Field label="Seats" hint="0 = hide">
            <input name="seats" type="number" min={0} defaultValue={batch.seats} className={adminInput} />
          </Field>
          <Field label="Monthly fee" hint="BDT · 0 = not set">
            <input name="fee" type="number" min={0} step={50} defaultValue={batch.fee || ""} className={adminInput} placeholder="e.g. 3000" />
          </Field>
        </div>

        <div>
          <Field label="Status">
            <Segmented options={statuses} value={status} onChange={setStatus} render={(s) => statusLabels[s]} />
          </Field>
        </div>

        <Field label="Notes" hint="Optional — shown on the website">
          <textarea name="notes" rows={2} defaultValue={batch.notes} className={adminInput} placeholder="e.g. Starts 1 November · Paper 2 focus" />
        </Field>

        <ErrorText message={error} />
      </DrawerBody>
      <DrawerFooter>
        <GhostButton onClick={onDone}>Cancel</GhostButton>
        <PrimaryButton type="submit" loading={saving}>
          {batch.id ? "Save batch" : "Create batch"}
        </PrimaryButton>
      </DrawerFooter>
    </form>
  );
}
