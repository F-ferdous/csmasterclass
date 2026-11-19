"use client";

import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytesResumable, type UploadTask } from "firebase/storage";
import { AnimatePresence, motion } from "motion/react";
import { CirclePlay, CloudUpload, ExternalLink, Eye, EyeOff, FolderOpen, Link2, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { KindIcon, ResourceCard } from "@/components/dashboard/resource-card";
import { reaches } from "@/lib/announcements";
import { classLevels, normalizeBatch, normalizeLocation, sortBatches } from "@/lib/coaching";
import { db } from "@/lib/firebase";
import { storage } from "@/lib/firebase-client";
import { normalizeProfile } from "@/lib/normalize";
import {
  audienceKeysFor,
  byNewest,
  contentTypeOf,
  resourceFileAccept,
  fileKind,
  formatBytes,
  isAllowedResourceType,
  isWebUrl,
  kindLabels,
  kindPlural,
  linkHost,
  maxFileBytes,
  normalizeResource,
  resourceKinds,
  storageErrorMessage,
  youtubeId,
  type Resource,
  type ResourceKind,
  type ResourceSource,
} from "@/lib/resources";
import type { Batch, ClassLevel, Location, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { audienceError, AudiencePicker, audienceText, type Audience } from "./audience-picker";
import { notifyStudents } from "./notify";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, Field, GhostButton, PageHeader, PrimaryButton, Segmented, Spinner } from "./ui";

const blank: Resource = {
  id: "",
  title: "",
  description: "",
  kind: "pdf",
  url: "",
  file: null,
  audienceType: "all",
  audienceValues: [],
  visible: true,
  createdAt: null,
  updatedAt: null,
};

const sources: ResourceSource[] = ["file", "video", "link"];
const sourceLabels: Record<ResourceSource, string> = { file: "Upload a file", video: "Video link", link: "Other link" };

const formatDate = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Just now");

/** Opens an uploaded file (signed URL) or a link in a new tab. */
async function openResource(r: Resource) {
  if (!r.file) return window.open(r.url, "_blank", "noopener");
  const tab = window.open("", "_blank"); // open now, before the await, so pop-up blockers allow it
  try {
    const url = await getDownloadURL(storageRef(storage(), r.file.path));
    if (tab) tab.location.href = url;
  } catch (err) {
    tab?.close();
    window.alert(storageErrorMessage(err));
  }
}

export function ResourcesManager() {
  const [items, setItems] = useState<Resource[] | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [kind, setKind] = useState<ResourceKind | "all">("all");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<ClassLevel | "all">("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [hideEveryone, setHideEveryone] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);

  useEffect(() => {
    const d = db();
    const stops = [
      onSnapshot(
        collection(d, "resources"),
        (snap) => setItems(snap.docs.map((x) => normalizeResource(x.id, x.data())).sort(byNewest)),
        () => setItems([]),
      ),
      onSnapshot(collection(d, "batches"), (snap) => setBatches(sortBatches(snap.docs.map((x) => normalizeBatch(x.id, x.data()))))),
      onSnapshot(query(collection(d, "locations"), orderBy("order", "asc")), (snap) => setLocations(snap.docs.map((x) => normalizeLocation(x.id, x.data())))),
      onSnapshot(collection(d, "students"), (snap) => setStudents(snap.docs.map((x) => normalizeProfile(x.id, x.data())).filter((u) => u.role === "student"))),
    ];
    return () => stops.forEach((s) => s());
  }, []);

  const batchById = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches]);
  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const audienceLabel = (a: Audience) => audienceText(a, batchById, locationById);
  const reachCount = (a: Audience) => students.filter((s) => reaches(a, s)).length;

  const all = items ?? [];
  const q = search.trim().toLowerCase();

  // Class / batch / centre filters show what students there would see: one "profile" per batch in range
  // (plus the class or centre on its own), and a resource matches if it reaches any of them.
  const filterBatches = batches.filter(
    (b) =>
      (classFilter === "all" || b.classLevel === classFilter) &&
      (locationFilter === "all" || b.locationId === locationFilter) &&
      (batchFilter === "all" || b.id === batchFilter),
  );
  const audienceFiltered = classFilter !== "all" || batchFilter !== "all" || locationFilter !== "all";
  const profiles = [
    ...filterBatches.map((b) => ({ classLevel: b.classLevel, batchId: b.id, locationId: b.locationId })),
    ...(batchFilter === "all" ? [{ classLevel: classFilter === "all" ? "" : classFilter, batchId: "", locationId: locationFilter === "all" ? "" : locationFilter }] : []),
  ] as Pick<UserProfile, "classLevel" | "batchId" | "locationId">[];
  const inAudience = (r: Resource) =>
    (!hideEveryone || r.audienceType !== "all") && (!audienceFiltered || profiles.some((p) => reaches(r, p)));
  const filtersOn = audienceFiltered || hideEveryone || kind !== "all" || q !== "";
  function clearFilters() {
    setClassFilter("all");
    setBatchFilter("all");
    setLocationFilter("all");
    setHideEveryone(false);
    setKind("all");
    setSearch("");
  }

  const visible = all.filter(
    (r) =>
      (kind === "all" || r.kind === kind) &&
      inAudience(r) &&
      (!q || [r.title, r.description, r.file?.name ?? "", audienceLabel(r)].some((v) => v.toLowerCase().includes(q))),
  );
  const batchOptions = batches.filter(
    (b) => (classFilter === "all" || b.classLevel === classFilter) && (locationFilter === "all" || b.locationId === locationFilter),
  );
  const usedKinds = resourceKinds.filter((k) => all.some((r) => r.kind === k));

  async function toggleVisible(r: Resource) {
    const next = !r.visible;
    await updateDoc(doc(db(), "resources", r.id), { visible: next, audienceKeys: audienceKeysFor({ ...r, visible: next }), updatedAt: serverTimestamp() });
  }

  async function remove(r: Resource) {
    if (!window.confirm(`Delete “${r.title || "Untitled"}”? Students will no longer see it${r.file ? " and the file is deleted" : ""}.`)) return;
    await deleteDoc(doc(db(), "resources", r.id));
    if (r.file) await deleteObject(storageRef(storage(), r.file.path)).catch(() => {});
  }

  if (items === null) return <Spinner />;

  const newButton = (
    <PrimaryButton onClick={() => setEditing({ ...blank })}>
      <Plus className="size-4" /> Add resource
    </PrimaryButton>
  );

  return (
    <div>
      <PageHeader
        title="Resources"
        description="Notes, worksheets, past papers, images and video links. Share each one with everyone, or with chosen classes, batches or centres — students only see what's meant for them."
        actions={newButton}
      />

      {all.length > 0 && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...usedKinds] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", kind === k ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}
              >
                {k === "all" ? "All" : kindPlural[k]}
                <span className={cn("ml-1.5 text-xs", kind === k ? "opacity-70" : "text-ink-faint")}>{k === "all" ? all.length : all.filter((r) => r.kind === k).length}</span>
              </button>
            ))}
          </div>
          <label className="relative sm:w-72">
            <span className="sr-only">Search resources</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, file or audience" className={cn(adminInput, "pl-10")} />
          </label>
        </div>
      )}

      {all.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-center">
          <select
            aria-label="Class"
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value as ClassLevel | "all");
              setBatchFilter("all");
            }}
            className={adminInput}
          >
            <option value="all">All classes</option>
            {classLevels.map((c) => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>
          <select
            aria-label="Centre"
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setBatchFilter("all");
            }}
            className={adminInput}
          >
            <option value="all">All centres</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <select aria-label="Batch" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className={adminInput}>
            <option value="all">All batches</option>
            {batchOptions.map((b) => (
              <option key={b.id} value={b.id}>Class {b.classLevel} · {b.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2.5 rounded-xl border border-line px-3.5 py-2.5 text-sm">
            <input type="checkbox" checked={hideEveryone} onChange={(e) => setHideEveryone(e.target.checked)} className="size-4 accent-[var(--forest)]" />
            Hide &ldquo;Everyone&rdquo; items
          </label>
        </div>
      )}

      {all.length > 0 && filtersOn && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
          <span>
            Showing {visible.length} of {all.length}
            {audienceFiltered ? " — what students in this selection can see" : ""}
          </span>
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-ink underline-offset-4 hover:underline">
            <X className="size-3.5" aria-hidden /> Clear filters
          </button>
        </p>
      )}

      <div className="mt-5">
        {all.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="size-6" />}
            title="No resources yet"
            body="Upload a PDF, Word document or image, or add a YouTube or Google Drive link. Choose who gets it — a class, a batch or a centre."
            action={newButton}
          />
        ) : visible.length === 0 ? (
          <EmptyState icon={<FolderOpen className="size-6" />} title="No matches" body="Nothing is shared with this selection yet. Try other filters, or clear them." />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line">
            <AnimatePresence initial={false}>
              {visible.map((r) => {
                const reach = r.visible ? reachCount(r) : 0;
                return (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn("grid gap-3 border-b border-line px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] md:items-center md:gap-5", !r.visible && "bg-paper-2/40")}
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <KindIcon kind={r.kind} className={cn(!r.visible && "opacity-50")} />
                      <div className="min-w-0">
                        <p className={cn("truncate font-medium", !r.visible && "text-ink-soft")}>{r.title || "Untitled"}</p>
                        <p className="truncate text-xs text-ink-soft">
                          {kindLabels[r.kind]} · {r.file ? `${r.file.name} · ${formatBytes(r.file.size)}` : linkHost(r.url)} · {formatDate(r.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="min-w-0 text-sm">
                      <p className="truncate">{audienceLabel(r)}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
                        {r.visible ? (
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5" aria-hidden /> {reach} student{reach === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-paper-2 px-2 py-0.5">Hidden from students</span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-0.5 md:justify-end">
                      <IconAction label={r.file ? "Open file" : "Open link"} onClick={() => openResource(r)}>
                        <ExternalLink className="size-4" />
                      </IconAction>
                      <IconAction label="Edit" onClick={() => setEditing(r)}>
                        <Pencil className="size-4" />
                      </IconAction>
                      <IconAction label={r.visible ? "Hide from students" : "Show to students"} onClick={() => toggleVisible(r)}>
                        {r.visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </IconAction>
                      <IconAction label="Delete" danger onClick={() => remove(r)}>
                        <Trash2 className="size-4" />
                      </IconAction>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Drawer open={Boolean(editing)} title={editing?.id ? "Edit resource" : "Add resource"} onClose={() => setEditing(null)}>
        {editing && (
          <ResourceForm
            key={editing.id || "new"}
            resource={editing}
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

export function IconAction({ children, label, onClick, danger }: { children: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cn("grid size-9 place-items-center rounded-full hover:bg-paper-2", danger && "text-ember")}>
      {children}
    </button>
  );
}

export const safeFileName = (name: string) => name.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(-80);

function ResourceForm({
  resource,
  batches,
  locations,
  audienceLabel,
  reachCount,
  onDone,
}: {
  resource: Resource;
  batches: Batch[];
  locations: Location[];
  audienceLabel: (a: Audience) => string;
  reachCount: (a: Audience) => number;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(resource.title);
  const [description, setDescription] = useState(resource.description);
  const [source, setSource] = useState<ResourceSource>(resource.id ? (resource.file ? "file" : resource.kind === "video" ? "video" : "link") : "file");
  const [url, setUrl] = useState(resource.url);
  const [picked, setPicked] = useState<File | null>(null);
  const [audience, setAudience] = useState<Audience>({ audienceType: resource.audienceType, audienceValues: resource.audienceValues });
  const [visibleNow, setVisibleNow] = useState(resource.visible);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const task = useRef<UploadTask | null>(null);

  // Closing the drawer mid-upload cancels it.
  useEffect(() => () => void task.current?.cancel(), []);

  function pick(file: File | undefined) {
    if (!file) return;
    const type = contentTypeOf(file);
    if (!isAllowedResourceType(type)) return setError("Choose a PDF, Word/PowerPoint/Excel document, interactive HTML page, text file or image.");
    if (file.size > maxFileBytes) return setError(`That file is ${formatBytes(file.size)} — the limit is ${formatBytes(maxFileBytes)}. For bigger files, use a Google Drive link.`);
    setError("");
    setPicked(file);
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  }

  const existingFile = source === "file" && !picked ? resource.file : null;
  const yt = source === "video" ? youtubeId(url) : "";
  const previewKind: ResourceKind = source === "file" ? fileKind(picked ? contentTypeOf(picked) : (resource.file?.contentType ?? "application/pdf")) : source;

  async function save() {
    if (!title.trim()) return setError("Give the resource a title.");
    if (source === "file" && !picked && !resource.file) return setError("Choose a file to upload.");
    if (source !== "file" && !isWebUrl(url)) return setError("Paste the full link, starting with https://");
    if (audienceError(audience)) return setError(audienceError(audience));
    setSaving(true);
    setError("");

    const ref = resource.id ? doc(db(), "resources", resource.id) : doc(collection(db(), "resources"));
    try {
      let file = source === "file" ? resource.file : null;
      if (source === "file" && picked) {
        const contentType = contentTypeOf(picked);
        const path = `resources/${ref.id}/${Date.now()}-${safeFileName(picked.name)}`;
        setProgress(0);
        const upload = uploadBytesResumable(storageRef(storage(), path), picked, {
          contentType,
          contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(picked.name)}`,
        });
        task.current = upload;
        await new Promise<void>((resolve, reject) =>
          upload.on("state_changed", (s) => setProgress(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0), reject, () => resolve()),
        );
        task.current = null;
        file = { path, name: picked.name, size: picked.size, contentType };
      }

      const audienceType = audience.audienceType;
      const audienceValues = audienceType === "all" ? [] : audience.audienceValues;
      const data = {
        title: title.trim(),
        description: description.trim(),
        kind: source === "file" ? fileKind(file!.contentType) : source,
        url: source === "file" ? "" : url.trim(),
        file,
        audienceType,
        audienceValues,
        audienceKeys: audienceKeysFor({ audienceType, audienceValues, visible: visibleNow }),
        visible: visibleNow,
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, resource.id ? data : { ...data, createdAt: serverTimestamp() }, { merge: true });
      // New (or newly shown) material → let students know (in the background).
      if (visibleNow && (!resource.id || !resource.visible)) {
        notifyStudents({ audience: { audienceType, audienceValues } }, { title: `New study material: ${data.title}`, body: "Tap to open it.", url: "/dashboard/materials" }).catch(() => {});
      }

      // The old upload is no longer used (replaced, or switched to a link).
      if (resource.file && resource.file.path !== file?.path) await deleteObject(storageRef(storage(), resource.file.path)).catch(() => {});
      onDone();
    } catch (err) {
      task.current = null;
      setProgress(null);
      setError(storageErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className={drawerFormClass}>
      <DrawerBody>
        <Field label="What are you sharing?">
          <Segmented
            options={sources}
            value={source}
            onChange={(s) => {
              setSource(s);
              setError("");
            }}
            render={(s) => sourceLabels[s]}
          />
        </Field>

        {source === "file" ? (
          picked || existingFile ? (
            <div className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
              <KindIcon kind={previewKind} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{picked?.name ?? existingFile!.name}</p>
                <p className="text-xs text-ink-soft">
                  {formatBytes(picked?.size ?? existingFile!.size)}
                  {picked && resource.file ? " · replaces the current file" : ""}
                </p>
              </div>
              {!saving && (
                <label className="cursor-pointer text-sm underline underline-offset-4">
                  Change
                  <input type="file" accept={resourceFileAccept} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
                </label>
              )}
            </div>
          ) : (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                dragging ? "border-forest bg-forest/[0.06]" : "border-line hover:border-ink/50",
              )}
            >
              <motion.span animate={{ y: dragging ? -4 : 0 }} className="grid size-12 place-items-center rounded-2xl bg-paper-2 text-forest">
                <CloudUpload className="size-6" aria-hidden />
              </motion.span>
              <span className="text-sm font-medium">Drop a file here, or click to choose</span>
              <span className="text-xs text-ink-soft">PDF, Word, PowerPoint, Excel, HTML (interactive notes), text or image · up to {formatBytes(maxFileBytes)}</span>
              <input type="file" accept={resourceFileAccept} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
          )
        ) : (
          <Field label={source === "video" ? "Video link" : "Link"} hint={source === "video" ? "YouTube plays right on the student's page" : "Google Drive, Docs, a website…"}>
            <div className="relative">
              {source === "video" ? (
                <CirclePlay className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              ) : (
                <Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              )}
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={cn(adminInput, "pl-10")}
                placeholder={source === "video" ? "https://www.youtube.com/watch?v=…" : "https://drive.google.com/…"}
              />
            </div>
            {source === "video" && url && !yt && isWebUrl(url) && (
              <span className="mt-1.5 block text-xs text-ink-soft">Not a YouTube link — students will open it in a new tab.</span>
            )}
            {source === "link" && /drive\.google|docs\.google/.test(url) && (
              <span className="mt-1.5 block text-xs text-ink-soft">In Google Drive, set sharing to “Anyone with the link” so students can open it.</span>
            )}
          </Field>
        )}

        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={adminInput} placeholder="e.g. Chapter 4 — Algorithms worksheet" maxLength={140} />
        </Field>
        <Field label="Description" hint="Optional">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={adminInput} placeholder="What it covers, or what students should do with it" />
        </Field>

        <AudiencePicker value={audience} onChange={setAudience} batches={batches} locations={locations} reach={reachCount(audience)} />

        <label className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
          <span>
            <span className="flex items-center gap-2 text-sm font-medium">
              <Eye className="size-4" aria-hidden /> Show to students
            </span>
            <span className="mt-0.5 block text-xs text-ink-soft">Turn off to keep it hidden until you&apos;re ready.</span>
          </span>
          <input type="checkbox" checked={visibleNow} onChange={(e) => setVisibleNow(e.target.checked)} className="size-5 accent-[var(--forest)]" />
        </label>

        <div>
          <p className="mb-2 text-sm font-medium">Preview</p>
          <div className="max-w-sm">
            <ResourceCard
              preview
              audience={audienceLabel(audience)}
              resource={{
                title: title.trim(),
                description: description.trim(),
                kind: previewKind,
                url: source === "file" ? "" : url,
                file: source === "file" ? (picked ? { path: "", name: picked.name, size: picked.size, contentType: contentTypeOf(picked) } : resource.file) : null,
                createdAt: resource.createdAt ?? new Date(),
              }}
            />
          </div>
        </div>

        <ErrorText message={error} />
      </DrawerBody>
      <DrawerFooter>
        {progress !== null && (
          <div className="mr-auto flex min-w-40 flex-1 items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
              <motion.div className="h-full rounded-full bg-forest" animate={{ width: `${Math.round(progress * 100)}%` }} transition={{ ease: "easeOut" }} />
            </div>
            <span className="text-xs tabular-nums text-ink-soft">{Math.round(progress * 100)}%</span>
            <button type="button" onClick={() => task.current?.cancel()} aria-label="Cancel upload" className="grid size-8 place-items-center rounded-full hover:bg-paper-2">
              <X className="size-4" />
            </button>
          </div>
        )}
        {progress === null && (
          <GhostButton onClick={onDone} className="mr-auto">
            Cancel
          </GhostButton>
        )}
        <PrimaryButton onClick={save} loading={saving}>
          {progress !== null && progress < 1 ? "Uploading…" : resource.id ? "Save changes" : visibleNow ? "Share with students" : "Save hidden"}
        </PrimaryButton>
      </DrawerFooter>
    </div>
  );
}
