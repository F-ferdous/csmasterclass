"use client";

import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Eye, EyeOff, Megaphone, Pencil, Pin, PinOff, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnnouncementCard } from "@/components/dashboard/announcement-card";
import {
  categories,
  categoryLabels,
  isExpired,
  normalizeAnnouncement,
  priorities,
  priorityLabels,
  reaches,
  sortAnnouncements,
  type Announcement,
} from "@/lib/announcements";
import { normalizeBatch, normalizeLocation, sortBatches } from "@/lib/coaching";
import { db } from "@/lib/firebase";
import { normalizeProfile } from "@/lib/normalize";
import type { Batch, Location, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { audienceError, AudiencePicker, audienceText, type Audience } from "./audience-picker";
import { notifyStudents } from "./notify";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, Field, GhostButton, PageHeader, PrimaryButton, Segmented, Spinner } from "./ui";

type Tab = "published" | "draft" | "expired" | "all";

const blank: Announcement = {
  id: "",
  title: "",
  body: "",
  category: "general",
  priority: "normal",
  audienceType: "all",
  audienceValues: [],
  pinned: false,
  status: "draft",
  expiresOn: "",
  createdAt: null,
  publishedAt: null,
  updatedAt: null,
};

export function AnnouncementsManager() {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [tab, setTab] = useState<Tab>("published");
  const [editing, setEditing] = useState<Announcement | null>(null);

  useEffect(() => {
    const d = db();
    const stops = [
      onSnapshot(
        collection(d, "announcements"),
        (snap) => setItems(sortAnnouncements(snap.docs.map((x) => normalizeAnnouncement(x.id, x.data())))),
        () => setItems([]),
      ),
      onSnapshot(collection(d, "batches"), (snap) => setBatches(sortBatches(snap.docs.map((x) => normalizeBatch(x.id, x.data()))))),
      onSnapshot(query(collection(d, "locations"), orderBy("order", "asc")), (snap) =>
        setLocations(snap.docs.map((x) => normalizeLocation(x.id, x.data()))),
      ),
      onSnapshot(collection(d, "users"), (snap) =>
        setStudents(snap.docs.map((x) => normalizeProfile(x.id, x.data())).filter((u) => u.role === "student")),
      ),
    ];
    return () => stops.forEach((s) => s());
  }, []);

  const batchById = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches]);
  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);

  const audienceLabel = (a: Audience) => audienceText(a, batchById, locationById);
  const reachCount = (a: Audience) => students.filter((s) => reaches(a, s)).length;

  const all = items ?? [];
  const inTab = (a: Announcement) =>
    tab === "all" ? true : tab === "draft" ? a.status === "draft" : tab === "expired" ? a.status === "published" && isExpired(a) : a.status === "published" && !isExpired(a);
  const counts: Record<Tab, number> = {
    published: all.filter((a) => a.status === "published" && !isExpired(a)).length,
    draft: all.filter((a) => a.status === "draft").length,
    expired: all.filter((a) => a.status === "published" && isExpired(a)).length,
    all: all.length,
  };
  const visible = all.filter(inTab);

  const update = (a: Announcement, data: Record<string, unknown>) => updateDoc(doc(db(), "announcements", a.id), { ...data, updatedAt: serverTimestamp() });

  async function remove(a: Announcement) {
    if (!window.confirm(`Delete “${a.title || "Untitled"}”? Students will no longer see it.`)) return;
    await deleteDoc(doc(db(), "announcements", a.id));
  }

  if (items === null) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Notices for students — schedule changes, exams and results. Target everyone, or specific classes, batches or centres."
        actions={
          <PrimaryButton onClick={() => setEditing({ ...blank })}>
            <Plus className="size-4" /> New announcement
          </PrimaryButton>
        }
      />

      <div className="mt-8 flex gap-1 overflow-x-auto rounded-full border border-line p-1 sm:w-fit">
        {(
          [
            ["published", "Live"],
            ["draft", "Drafts"],
            ["expired", "Expired"],
            ["all", "All"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn("relative shrink-0 rounded-full px-4 py-2 text-sm", tab === id ? "text-paper" : "text-ink-soft hover:text-ink")}
          >
            {tab === id && <motion.span layoutId="announcement-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
            <span className="relative">
              {label}
              <span className={cn("ml-1.5 text-xs", tab === id ? "opacity-70" : "text-ink-faint")}>{counts[id]}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {all.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="size-6" />}
            title="No announcements yet"
            body="Post your first notice — it appears on students' dashboards straight away."
            action={
              <PrimaryButton onClick={() => setEditing({ ...blank })}>
                <Plus className="size-4" /> New announcement
              </PrimaryButton>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState icon={<Megaphone className="size-6" />} title="Nothing here" body="No announcements in this view." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <AnimatePresence initial={false}>
              {visible.map((a) => (
                <motion.div key={a.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="flex flex-col">
                  <div className={cn("flex-1", a.status === "draft" && "opacity-70")}>
                    <AnnouncementCard announcement={a} audience={audienceLabel(a)} compact />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
                    <p className="flex items-center gap-3 text-xs text-ink-soft">
                      <span className={cn("rounded-full px-2 py-0.5", a.status === "draft" ? "bg-paper-2" : isExpired(a) ? "bg-paper-2" : "bg-forest/15 text-forest")}>
                        {a.status === "draft" ? "Draft" : isExpired(a) ? "Expired" : "Live"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" aria-hidden /> {reachCount(a)} student{reachCount(a) === 1 ? "" : "s"}
                      </span>
                    </p>
                    <div className="flex gap-0.5">
                      <IconAction label="Edit" onClick={() => setEditing(a)}>
                        <Pencil className="size-4" />
                      </IconAction>
                      <IconAction label={a.pinned ? "Unpin" : "Pin to top"} onClick={() => update(a, { pinned: !a.pinned })}>
                        {a.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                      </IconAction>
                      <IconAction
                        label={a.status === "published" ? "Unpublish" : "Publish"}
                        onClick={() =>
                          update(a, a.status === "published" ? { status: "draft" } : { status: "published", publishedAt: serverTimestamp() })
                        }
                      >
                        {a.status === "published" ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </IconAction>
                      <IconAction label="Duplicate" onClick={() => setEditing({ ...a, id: "", title: `${a.title} (copy)`, status: "draft", pinned: false })}>
                        <Copy className="size-4" />
                      </IconAction>
                      <IconAction label="Delete" danger onClick={() => remove(a)}>
                        <Trash2 className="size-4" />
                      </IconAction>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Drawer open={Boolean(editing)} title={editing?.id ? "Edit announcement" : "New announcement"} onClose={() => setEditing(null)}>
        {editing && (
          <AnnouncementForm
            key={editing.id || `new-${editing.title}`}
            announcement={editing}
            batches={batches}
            locations={locations}
            audienceLabel={audienceLabel}
            reachCount={reachCount}
            onDone={() => setEditing(null)}
          />
        )}
      </Drawer>
    </div>
  );
}

function IconAction({ children, label, onClick, danger }: { children: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cn("grid size-9 place-items-center rounded-full hover:bg-paper-2", danger && "text-ember")}>
      {children}
    </button>
  );
}

function AnnouncementForm({
  announcement,
  batches,
  locations,
  audienceLabel,
  reachCount,
  onDone,
}: {
  announcement: Announcement;
  batches: Batch[];
  locations: Location[];
  audienceLabel: (a: Audience) => string;
  reachCount: (a: Audience) => number;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<Announcement>(announcement);
  const [saving, setSaving] = useState<"" | "draft" | "published">("");
  const [error, setError] = useState("");
  const set = <K extends keyof Announcement>(key: K, value: Announcement[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function save(status: "draft" | "published") {
    if (!draft.title.trim()) return setError("Give the announcement a title.");
    if (audienceError(draft)) return setError(audienceError(draft));
    setSaving(status);
    setError("");
    const data = {
      title: draft.title.trim(),
      body: draft.body.trim(),
      category: draft.category,
      priority: draft.priority,
      audienceType: draft.audienceType,
      audienceValues: draft.audienceType === "all" ? [] : draft.audienceValues,
      pinned: draft.pinned,
      status,
      expiresOn: draft.expiresOn,
      updatedAt: serverTimestamp(),
      // First publish stamps the date students see.
      ...(status === "published" && (announcement.status !== "published" || !announcement.id) ? { publishedAt: serverTimestamp() } : {}),
    };
    try {
      if (announcement.id) await setDoc(doc(db(), "announcements", announcement.id), data, { merge: true });
      else await addDoc(collection(db(), "announcements"), { ...data, createdAt: serverTimestamp() });
      // Newly published → let students know (in the background).
      if (status === "published" && (announcement.status !== "published" || !announcement.id)) {
        notifyStudents({ audience: draft }, { title: data.title, body: data.body.slice(0, 140) || "New announcement from your teacher.", url: "/dashboard/announcements" }).catch(() => {});
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSaving("");
    }
  }

  const reach = reachCount(draft);

  return (
    <div className={drawerFormClass}>
      <DrawerBody>
        <Field label="Title">
          <input value={draft.title} onChange={(e) => set("title", e.target.value)} className={adminInput} placeholder="e.g. Class 10 mock exam on Saturday" maxLength={140} />
        </Field>
        <Field label="Message" hint="Line breaks are kept">
          <textarea
            value={draft.body}
            onChange={(e) => set("body", e.target.value)}
            rows={5}
            className={adminInput}
            placeholder="Details students need — time, place, what to bring…"
          />
        </Field>

        <Field label="Category">
          <Segmented options={categories} value={draft.category} onChange={(v) => set("category", v)} render={(c) => categoryLabels[c]} />
        </Field>
        <Field label="Priority">
          <Segmented options={priorities} value={draft.priority} onChange={(v) => set("priority", v)} render={(p) => priorityLabels[p]} />
        </Field>

        <AudiencePicker
          value={draft}
          onChange={(a) => setDraft((d) => ({ ...d, ...a }))}
          batches={batches}
          locations={locations}
          reach={reach}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Show until" hint="Optional">
            <input type="date" value={draft.expiresOn} onChange={(e) => set("expiresOn", e.target.value)} className={adminInput} />
          </Field>
          <label className="flex items-center justify-between gap-3 self-end rounded-2xl border border-line px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Pin className="size-4" aria-hidden /> Pin to top
            </span>
            <input type="checkbox" checked={draft.pinned} onChange={(e) => set("pinned", e.target.checked)} className="size-5 accent-[var(--forest)]" />
          </label>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Preview</p>
          <AnnouncementCard announcement={{ ...draft, publishedAt: draft.publishedAt ?? new Date() }} audience={audienceLabel(draft)} />
        </div>

        <ErrorText message={error} />
      </DrawerBody>
      <DrawerFooter>
        <GhostButton onClick={onDone} className="mr-auto">
          Cancel
        </GhostButton>
        <GhostButton onClick={() => save("draft")}>{saving === "draft" ? "Saving…" : announcement.status === "published" ? "Move to drafts" : "Save draft"}</GhostButton>
        <PrimaryButton onClick={() => save("published")} loading={saving === "published"}>
          <Megaphone className="size-4" /> {announcement.status === "published" ? "Update" : "Publish"}
        </PrimaryButton>
      </DrawerFooter>
    </div>
  );
}
