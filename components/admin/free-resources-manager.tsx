"use client";

import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytesResumable, type UploadTask } from "firebase/storage";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CirclePlay, CloudUpload, ExternalLink, Eye, EyeOff, Gift, Globe, Link2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { KindIcon, ResourceCard } from "@/components/dashboard/resource-card";
import { classLabels, classLevels } from "@/lib/coaching";
import { db } from "@/lib/firebase";
import { storage } from "@/lib/firebase-client";
import { newestFirst, normalizeFreeResource, type FreeResource } from "@/lib/free-resources";
import {
  contentTypeOf,
  fileKind,
  formatBytes,
  isAllowedResourceType,
  isHtmlType,
  isWebUrl,
  kindLabels,
  linkHost,
  maxFileBytes,
  resourceFileAccept,
  storageErrorMessage,
  youtubeId,
  type ResourceKind,
  type ResourceSource,
} from "@/lib/resources";
import type { ClassLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { refreshFreeResources } from "./refresh";
import { IconAction, safeFileName } from "./resources-manager";
import { adminInput, Drawer, DrawerBody, DrawerFooter, drawerFormClass, EmptyState, ErrorText, Field, GhostButton, PageHeader, PrimaryButton, Segmented, Spinner } from "./ui";

const blank: FreeResource = {
  id: "",
  title: "",
  description: "",
  kind: "pdf",
  url: "",
  file: null,
  fileUrl: "",
  classes: [],
  visible: true,
  createdAt: null,
  updatedAt: null,
};

const sources: ResourceSource[] = ["file", "video", "link"];
const sourceLabels: Record<ResourceSource, string> = { file: "Upload a file", video: "Video link", link: "Other link" };

const formatDate = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Just now");
const classText = (classes: ClassLevel[]) => (classes.length ? classes.map((c) => `Class ${c}`).join(", ") : "No class chosen");

export function FreeResourcesManager() {
  const [items, setItems] = useState<FreeResource[] | null>(null);
  const [cls, setCls] = useState<ClassLevel | "all">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<FreeResource | null>(null);

  useEffect(
    () =>
      onSnapshot(
        collection(db(), "freeResources"),
        (snap) => setItems(snap.docs.map((x) => normalizeFreeResource(x.id, x.data())).sort(newestFirst)),
        () => setItems([]),
      ),
    [],
  );

  const all = items ?? [];
  const q = search.trim().toLowerCase();
  const shown = all.filter((r) => (cls === "all" || r.classes.includes(cls)) && (!q || [r.title, r.description, r.file?.name ?? ""].some((v) => v.toLowerCase().includes(q))));

  async function toggleVisible(r: FreeResource) {
    await updateDoc(doc(db(), "freeResources", r.id), { visible: !r.visible, updatedAt: serverTimestamp() });
    refreshFreeResources();
  }

  // HTML pages have no saved download link (visitors open them through the site's viewer), so ask Storage for one.
  async function openItem(r: FreeResource) {
    if (!r.file || r.fileUrl) return window.open(r.file ? r.fileUrl : r.url, "_blank", "noopener");
    const tab = window.open("", "_blank");
    try {
      const url = await getDownloadURL(storageRef(storage(), r.file.path));
      if (tab) tab.location.href = url;
    } catch (err) {
      tab?.close();
      window.alert(storageErrorMessage(err));
    }
  }

  async function remove(r: FreeResource) {
    if (!window.confirm(`Delete “${r.title || "Untitled"}”? It disappears from the Free Resources page${r.file ? " and the file is deleted" : ""}.`)) return;
    await deleteDoc(doc(db(), "freeResources", r.id));
    if (r.file) await deleteObject(storageRef(storage(), r.file.path)).catch(() => {});
    refreshFreeResources();
  }

  if (items === null) return <Spinner />;

  const newButton = (
    <PrimaryButton onClick={() => setEditing({ ...blank, classes: cls === "all" ? [] : [cls] })}>
      <Plus className="size-4" /> Add free resource
    </PrimaryButton>
  );

  return (
    <div>
      <PageHeader
        title="Free resources"
        description="Free notes, worksheets, past papers and videos for anyone visiting the website. Visitors pick their class on the Free Resources page and see what you've filed under it."
        actions={
          <>
            <Link href="/free-resources" target="_blank" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm hover:border-ink">
              <Globe className="size-4" aria-hidden /> View page
            </Link>
            {newButton}
          </>
        }
      />

      {all.length > 0 && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...classLevels] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCls(c)}
                className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", cls === c ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}
              >
                {c === "all" ? "All" : `Class ${c}`}
                <span className={cn("ml-1.5 text-xs", cls === c ? "opacity-70" : "text-ink-faint")}>{c === "all" ? all.length : all.filter((r) => r.classes.includes(c)).length}</span>
              </button>
            ))}
          </div>
          <label className="relative sm:w-72">
            <span className="sr-only">Search free resources</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or file" className={cn(adminInput, "pl-10")} />
          </label>
        </div>
      )}

      <div className="mt-5">
        {all.length === 0 ? (
          <EmptyState
            icon={<Gift className="size-6" />}
            title="No free resources yet"
            body="Upload a PDF, Word document, image or interactive HTML page, or add a YouTube or Google Drive link, and choose which classes it's for. It appears on the website's Free Resources page straight away."
            action={newButton}
          />
        ) : shown.length === 0 ? (
          <EmptyState icon={<Gift className="size-6" />} title="Nothing here" body={cls === "all" ? "Try another search." : `No free resources for Class ${cls} yet.`} action={cls === "all" ? undefined : newButton} />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line">
            <AnimatePresence initial={false}>
              {shown.map((r) => (
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
                    <p className="truncate">{classText(r.classes)}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {r.visible ? <span className="text-forest">On the website</span> : <span className="rounded-full bg-paper-2 px-2 py-0.5">Hidden</span>}
                    </p>
                  </div>
                  <div className="flex gap-0.5 md:justify-end">
                    <IconAction label={r.file ? "Open file" : "Open link"} onClick={() => openItem(r)}>
                      <ExternalLink className="size-4" />
                    </IconAction>
                    <IconAction label="Edit" onClick={() => setEditing(r)}>
                      <Pencil className="size-4" />
                    </IconAction>
                    <IconAction label={r.visible ? "Hide from the website" : "Show on the website"} onClick={() => toggleVisible(r)}>
                      {r.visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </IconAction>
                    <IconAction label="Delete" danger onClick={() => remove(r)}>
                      <Trash2 className="size-4" />
                    </IconAction>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Drawer open={Boolean(editing)} title={editing?.id ? "Edit free resource" : "Add free resource"} onClose={() => setEditing(null)}>
        {editing && <FreeResourceForm key={editing.id || "new"} resource={editing} onDone={() => setEditing(null)} />}
      </Drawer>
    </div>
  );
}

function FreeResourceForm({ resource, onDone }: { resource: FreeResource; onDone: () => void }) {
  const [title, setTitle] = useState(resource.title);
  const [description, setDescription] = useState(resource.description);
  const [source, setSource] = useState<ResourceSource>(resource.id ? (resource.file ? "file" : resource.kind === "video" ? "video" : "link") : "file");
  const [url, setUrl] = useState(resource.url);
  const [picked, setPicked] = useState<File | null>(null);
  const [classes, setClasses] = useState<ClassLevel[]>(resource.classes);
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
    if (!isAllowedResourceType(type)) return setError("Choose a PDF, Word/PowerPoint/Excel document, text file, image or HTML page.");
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

  const toggleClass = (c: ClassLevel) => setClasses((now) => (now.includes(c) ? now.filter((x) => x !== c) : classLevels.filter((x) => x === c || now.includes(x))));

  const existingFile = source === "file" && !picked ? resource.file : null;
  const yt = source === "video" ? youtubeId(url) : "";
  const previewKind: ResourceKind = source === "file" ? fileKind(picked ? contentTypeOf(picked) : (resource.file?.contentType ?? "application/pdf")) : source;

  async function save() {
    if (!title.trim()) return setError("Give the resource a title.");
    if (source === "file" && !picked && !resource.file) return setError("Choose a file to upload.");
    if (source !== "file" && !isWebUrl(url)) return setError("Paste the full link, starting with https://");
    if (!classes.length) return setError("Choose at least one class.");
    setSaving(true);
    setError("");

    const ref = resource.id ? doc(db(), "freeResources", resource.id) : doc(collection(db(), "freeResources"));
    try {
      let file = source === "file" ? resource.file : null;
      let fileUrl = source === "file" ? resource.fileUrl : "";
      if (source === "file" && picked) {
        const contentType = contentTypeOf(picked);
        const path = `free-resources/${ref.id}/${Date.now()}-${safeFileName(picked.name)}`;
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
        fileUrl = isHtmlType(contentType) ? "" : await getDownloadURL(storageRef(storage(), path));
      }

      const data = {
        title: title.trim(),
        description: description.trim(),
        kind: source === "file" ? fileKind(file!.contentType) : source,
        url: source === "file" ? "" : url.trim(),
        file,
        fileUrl,
        classes,
        visible: visibleNow,
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, resource.id ? data : { ...data, createdAt: serverTimestamp() }, { merge: true });

      // The old upload is no longer used (replaced, or switched to a link).
      if (resource.file && resource.file.path !== file?.path) await deleteObject(storageRef(storage(), resource.file.path)).catch(() => {});
      refreshFreeResources();
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
              <span className="text-xs text-ink-soft">PDF, Word, PowerPoint, Excel, text, image or HTML · up to {formatBytes(maxFileBytes)}</span>
              <input type="file" accept={resourceFileAccept} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
          )
        ) : (
          <Field label={source === "video" ? "Video link" : "Link"} hint={source === "video" ? "YouTube plays right on the page" : "Google Drive, Docs, a website…"}>
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
            {source === "video" && url && !yt && isWebUrl(url) && <span className="mt-1.5 block text-xs text-ink-soft">Not a YouTube link — visitors will open it in a new tab.</span>}
            {source === "link" && /drive\.google|docs\.google/.test(url) && (
              <span className="mt-1.5 block text-xs text-ink-soft">In Google Drive, set sharing to “Anyone with the link” so visitors can open it.</span>
            )}
          </Field>
        )}

        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={adminInput} placeholder="e.g. Chapter 1 — Data representation notes" maxLength={140} />
        </Field>
        <Field label="Description" hint="Optional">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={adminInput} placeholder="What it covers" />
        </Field>

        <Field label="Which classes is it for?">
          <div className="flex flex-wrap gap-1.5">
            {classLevels.map((c) => {
              const on = classes.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleClass(c)}
                  className={cn("rounded-xl border px-3 py-2 text-left text-sm transition-colors", on ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}
                >
                  Class {c}
                  <span className={cn("block text-[11px]", on ? "opacity-70" : "text-ink-faint")}>{classLabels[c]}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <label className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
          <span>
            <span className="flex items-center gap-2 text-sm font-medium">
              <Eye className="size-4" aria-hidden /> Show on the website
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
              audience={classText(classes)}
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
          {progress !== null && progress < 1 ? "Uploading…" : resource.id ? "Save changes" : visibleNow ? "Publish" : "Save hidden"}
        </PrimaryButton>
      </DrawerFooter>
    </div>
  );
}
