"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ChevronRight, Download, GraduationCap, Mail, MessageCircle, Phone, Search, ShieldCheck, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { EnrollmentPicker } from "@/components/auth/enrollment-picker";
import { isAdminEmail } from "@/lib/admins";
import type { Enrollment } from "@/lib/auth";
import { placeStudent } from "@/lib/enrollments";
import { classLevels, groupSessions } from "@/lib/coaching";
import { db } from "@/lib/firebase";
import type { Batch, ClassLevel, Location } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, Field, GhostButton, PageHeader, PrimaryButton, Spinner } from "./ui";
import { useStudentsData, type StudentRow } from "./use-students";

type RoleFilter = "student" | "admin" | "all";

const formatDate = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** Bangladesh numbers like 01712345678 → 8801712345678 for wa.me links. */
const whatsappNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  return digits;
};

export function StudentsManager() {
  const router = useRouter();
  const params = useSearchParams();
  const { students, locations, batches, error } = useStudentsData();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("student");
  const [classFilter, setClassFilter] = useState<ClassLevel | "all">(
    classLevels.includes(params.get("class") as ClassLevel) ? (params.get("class") as ClassLevel) : "all",
  );
  const [locationFilter, setLocationFilter] = useState(params.get("location") ?? "all");
  const [batchFilter, setBatchFilter] = useState(params.get("batch") ?? "all"); // "all" | "none" | batch id
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const locationName = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);
  const batchById = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches]);

  const roleMatches = (s: StudentRow) => role === "all" || (role === "admin" ? s.role === "admin" || isAdminEmail(s.email) : s.role === "student" && !isAdminEmail(s.email));

  const pool = (students ?? []).filter(roleMatches);
  const q = search.trim().toLowerCase();
  const visible = pool.filter(
    (s) =>
      (classFilter === "all" || s.classLevel === classFilter) &&
      (locationFilter === "all" || s.locationId === locationFilter) &&
      (batchFilter === "all" || (batchFilter === "none" ? !batchById.has(s.batchId) : s.batchId === batchFilter)) &&
      (!q || [s.name, s.email, s.phone].some((v) => v.toLowerCase().includes(q))),
  );

  const batchOptions = batches.filter(
    (b) => (classFilter === "all" || b.classLevel === classFilter) && (locationFilter === "all" || b.locationId === locationFilter),
  );
  const noBatchCount = pool.filter((s) => !batchById.has(s.batchId)).length;
  const selected = students?.find((s) => s.uid === selectedId) ?? null;
  const filtersActive = classFilter !== "all" || locationFilter !== "all" || batchFilter !== "all" || q !== "";

  function clearFilters() {
    setSearch("");
    setClassFilter("all");
    setLocationFilter("all");
    setBatchFilter("all");
    router.replace("/admin/students");
  }

  function exportCsv() {
    const rows = [
      ["Name", "Email", "Phone", "Class", "Centre", "Batch", "Role", "Joined"],
      ...visible.map((s) => [
        s.name,
        s.email,
        s.phone,
        s.classLevel,
        locationName.get(s.locationId) ?? "",
        batchById.get(s.batchId)?.name ?? "",
        s.role,
        s.joined ? s.joined.toISOString().slice(0, 10) : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (students === null) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Students"
        description="Everyone who has joined — search, filter by class, centre and batch, and update their details."
        actions={
          <GhostButton onClick={exportCsv}>
            <Download className="size-4" /> Export CSV
          </GhostButton>
        }
      />

      {error && (
        <p className="mt-6 rounded-2xl border border-ember/30 bg-ember/[0.08] px-4 py-3 text-sm text-ember">
          Couldn&apos;t load students: {error}
        </p>
      )}

      {/* Summary */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Total" value={pool.length} active={classFilter === "all" && batchFilter !== "none"} onClick={() => { setClassFilter("all"); setBatchFilter("all"); }} />
        {classLevels.map((c) => (
          <SummaryCard
            key={c}
            label={`Class ${c}`}
            value={pool.filter((s) => s.classLevel === c).length}
            active={classFilter === c}
            onClick={() => {
              setClassFilter(classFilter === c ? "all" : c);
              setBatchFilter("all");
            }}
          />
        ))}
        <SummaryCard
          label="Needs a batch"
          value={noBatchCount}
          warn={noBatchCount > 0}
          active={batchFilter === "none"}
          onClick={() => setBatchFilter(batchFilter === "none" ? "all" : "none")}
        />
      </div>

      {/* Toolbar */}
      <div className="mt-6 grid gap-3 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
        <label className="relative">
          <span className="sr-only">Search students</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone" className={cn(adminInput, "pl-10")} />
        </label>
        <select aria-label="Class" value={classFilter} onChange={(e) => { setClassFilter(e.target.value as ClassLevel | "all"); setBatchFilter("all"); }} className={adminInput}>
          <option value="all">All classes</option>
          {classLevels.map((c) => (
            <option key={c} value={c}>Class {c}</option>
          ))}
        </select>
        <select aria-label="Centre" value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setBatchFilter("all"); }} className={adminInput}>
          <option value="all">All centres</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select aria-label="Batch" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className={adminInput}>
          <option value="all">All batches</option>
          <option value="none">No batch</option>
          {batchOptions.map((b) => (
            <option key={b.id} value={b.id}>
              Class {b.classLevel} · {b.name}
            </option>
          ))}
        </select>
        <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as RoleFilter)} className={adminInput}>
          <option value="student">Students</option>
          <option value="admin">Admins</option>
          <option value="all">Everyone</option>
        </select>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
        <p>
          Showing <strong className="font-semibold text-ink">{visible.length}</strong> of {pool.length}
        </p>
        {filtersActive && (
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
            <X className="size-3.5" aria-hidden /> Clear filters
          </button>
        )}
      </div>

      {/* List */}
      <div className="mt-4">
        {pool.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="size-6" />}
            title="No students yet"
            body="When students join from the website, they'll appear here with their class, centre and batch."
          />
        ) : visible.length === 0 ? (
          <EmptyState icon={<Search className="size-6" />} title="No matches" body="Try a different search or clear the filters." action={<GhostButton onClick={clearFilters}>Clear filters</GhostButton>} />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line">
            {/* Desktop header */}
            <div className="hidden grid-cols-[1.6fr_0.6fr_1fr_1fr_0.8fr_24px] gap-4 border-b border-line bg-paper-2/50 px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-ink-faint md:grid">
              <span>Student</span>
              <span>Class</span>
              <span>Centre</span>
              <span>Batch</span>
              <span>Joined</span>
              <span />
            </div>
            <AnimatePresence initial={false}>
              {visible.map((s) => {
                const batch = batchById.get(s.batchId);
                return (
                  <motion.button
                    key={s.uid}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    type="button"
                    onClick={() => setSelectedId(s.uid)}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-paper-2/50 md:grid-cols-[1.6fr_0.6fr_1fr_1fr_0.8fr_24px] md:gap-4"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={s.name || s.email} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 truncate font-medium">
                          {s.name || "Unnamed"}
                          {(s.role === "admin" || isAdminEmail(s.email)) && <ShieldCheck className="size-3.5 shrink-0 text-forest" aria-label="Admin" />}
                        </span>
                        <span className="block truncate text-xs text-ink-soft">{s.email}</span>
                        {/* Mobile summary */}
                        <span className="mt-1 block text-xs text-ink-soft md:hidden">
                          {s.classLevel ? `Class ${s.classLevel}` : "No class"} · {locationName.get(s.locationId) ?? "No centre"} · {batch?.name ?? "No batch"}
                        </span>
                      </span>
                    </span>
                    <span className="hidden text-sm md:block">{s.classLevel ? `Class ${s.classLevel}` : "—"}</span>
                    <span className="hidden truncate text-sm md:block">{locationName.get(s.locationId) ?? "—"}</span>
                    <span className="hidden truncate text-sm md:block">
                      {batch ? batch.name : <span className="inline-flex items-center gap-1 text-ember"><AlertTriangle className="size-3.5" aria-hidden /> None</span>}
                    </span>
                    <span className="hidden text-sm text-ink-soft md:block">{formatDate(s.joined)}</span>
                    <ChevronRight className="size-4 text-ink-faint" aria-hidden />
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Drawer open={Boolean(selected)} title="Student" onClose={() => setSelectedId(null)}>
        {selected && (
          <StudentForm key={selected.uid} student={selected} locations={locations} batches={batches} onDone={() => setSelectedId(null)} />
        )}
      </Drawer>
    </div>
  );
}

function SummaryCard({ label, value, active, warn, onClick }: { label: string; value: number; active: boolean; warn?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-2xl border p-4 text-left transition-[background,border-color,transform] hover:-translate-y-0.5",
        active ? "border-ink bg-ink text-paper" : warn ? "border-ember/40 bg-ember/[0.05] hover:border-ember" : "border-line hover:border-ink",
      )}
    >
      <p className={cn("text-xs", active ? "opacity-70" : warn ? "text-ember" : "text-ink-soft")}>{label}</p>
      <p className="mt-1 font-display text-3xl tabular-nums">{value}</p>
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(/[\s@]/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return <span className="grid size-10 shrink-0 place-items-center rounded-full bg-forest text-xs font-semibold text-forest-ink">{initials || "?"}</span>;
}

function StudentForm({ student, locations, batches, onDone }: { student: StudentRow; locations: Location[]; batches: Batch[]; onDone: () => void }) {
  const [enrollment, setEnrollment] = useState<Enrollment>({
    classLevel: student.classLevel,
    locationId: student.locationId,
    batchId: student.batchId,
  });
  const [makeAdmin, setMakeAdmin] = useState(student.role === "admin");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const ownerAdmin = isAdminEmail(student.email);
  const batch = batches.find((b) => b.id === enrollment.batchId);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newRole = makeAdmin ? "admin" : "student";
    if (newRole !== student.role && newRole === "admin" && !window.confirm(`Give ${student.name || student.email} full admin access to this dashboard?`)) return;
    setSaving(true);
    setError("");
    try {
      const name = String(f.get("name")).trim();
      const phone = String(f.get("phone")).trim();
      await updateDoc(doc(db(), "users", student.uid), { name, phone, ...enrollment, role: newRole, updatedAt: serverTimestamp() });
      // Moving a student yourself counts as a confirmed seat (and closes their old request).
      if (enrollment.batchId && enrollment.batchId !== student.batchId) {
        await placeStudent({ uid: student.uid, name, email: student.email, phone, ...enrollment }, "admin");
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={drawerFormClass}>
      <DrawerBody>
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-forest text-lg font-semibold text-forest-ink">
            {(student.name || student.email).split(/[\s@]/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-2xl">{student.name || "Unnamed student"}</p>
            <p className="text-sm text-ink-soft">Joined {formatDate(student.joined)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={`mailto:${student.email}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm hover:border-ink">
            <Mail className="size-4" aria-hidden /> Email
          </a>
          {student.phone && (
            <>
              <a href={`tel:${student.phone}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm hover:border-ink">
                <Phone className="size-4" aria-hidden /> Call
              </a>
              <a
                href={`https://wa.me/${whatsappNumber(student.phone)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm hover:border-ink"
              >
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            </>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name">
            <input name="name" defaultValue={student.name} className={adminInput} required />
          </Field>
          <Field label="Phone">
            <input name="phone" type="tel" defaultValue={student.phone} className={adminInput} placeholder="01XXXXXXXXX" />
          </Field>
        </div>
        <Field label="Email" hint="Can't be changed here">
          <input value={student.email} readOnly className={cn(adminInput, "bg-paper-2 text-ink-soft")} />
        </Field>

        <div className="border-t border-line pt-5">
          <EnrollmentPicker value={enrollment} onChange={setEnrollment} locations={locations.filter((l) => l.active || l.id === enrollment.locationId)} batches={batches} loading={false} allowFull />
          {batch && batch.sessions.length > 0 && (
            <p className="mt-3 text-xs text-ink-soft">
              {groupSessions(batch.sessions).map((g) => `${g.days} ${g.time}`).join(" · ")}
            </p>
          )}
        </div>

        <div className="border-t border-line pt-5">
          <label className="flex items-start justify-between gap-4 rounded-2xl border border-line px-4 py-3.5">
            <span>
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <ShieldCheck className="size-4 text-forest" aria-hidden /> Admin access
              </span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                {ownerAdmin ? "This is the owner account — it's always an admin." : "Admins can manage batches, books, students and messages."}
              </span>
            </span>
            <input
              type="checkbox"
              checked={makeAdmin || ownerAdmin}
              disabled={ownerAdmin}
              onChange={(e) => setMakeAdmin(e.target.checked)}
              className="mt-1 size-5 accent-[var(--forest)]"
            />
          </label>
        </div>

        <ErrorText message={error} />
      </DrawerBody>
      <DrawerFooter>
        <GhostButton onClick={onDone}>Cancel</GhostButton>
        <PrimaryButton type="submit" loading={saving}>
          Save changes
        </PrimaryButton>
      </DrawerFooter>
    </form>
  );
}
