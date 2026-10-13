import type { Timestamp } from "firebase/firestore";
import type { AudienceType } from "./announcements";
import type { UserProfile } from "./types";

export type ResourceKind = "pdf" | "doc" | "image" | "video" | "link";
export type ResourceSource = "file" | "video" | "link";

export type ResourceFile = { path: string; name: string; size: number; contentType: string };

/** resources/{id} — a study material: an uploaded file or a link, for chosen classes/batches/centres. */
export type Resource = {
  id: string;
  title: string;
  description: string;
  kind: ResourceKind;
  /** Link resources only. */
  url: string;
  /** Uploaded-file resources only (Firebase Storage, resources/{id}/…). */
  file: ResourceFile | null;
  audienceType: AudienceType;
  audienceValues: string[];
  /** Hidden items stay in the admin list but students can't see them. */
  visible: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export const resourceKinds: ResourceKind[] = ["pdf", "doc", "image", "video", "link"];

export const kindLabels: Record<ResourceKind, string> = {
  pdf: "PDF",
  doc: "Document",
  image: "Image",
  video: "Video",
  link: "Link",
};

export const kindPlural: Record<ResourceKind, string> = {
  pdf: "PDFs",
  doc: "Documents",
  image: "Images",
  video: "Videos",
  link: "Links",
};

export const kindStyles: Record<ResourceKind, string> = {
  pdf: "bg-ember/15 text-ember",
  doc: "bg-series-3/15 text-series-3",
  image: "bg-gold/20 text-gold",
  video: "bg-forest/15 text-forest",
  link: "bg-paper-2 text-ink-soft",
};

/** What the file picker accepts, and the most an upload may be (matches storage.rules). */
export const fileAccept = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*";
export const maxFileBytes = 50 * 1024 * 1024;

const typeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
};

/** Browsers sometimes leave File.type empty (e.g. .doc on some systems), so fall back to the extension. */
export function contentTypeOf(file: File) {
  if (file.type) return file.type;
  return typeByExtension[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "";
}

export function isAllowedType(contentType: string) {
  return (
    contentType.startsWith("image/") ||
    contentType === "text/plain" ||
    /^application\/(pdf|msword|vnd\.openxmlformats-officedocument\..*|vnd\.ms-.*)$/.test(contentType)
  );
}

export function fileKind(contentType: string): ResourceKind {
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("image/")) return "image";
  return "doc";
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** YouTube video id from watch, youtu.be, shorts or embed links. */
export function youtubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m?.[1] ?? "";
}

export function linkHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export const isWebUrl = (url: string) => /^https?:\/\/\S+\.\S+/.test(url.trim());

/**
 * The keys a student must match (see firestore.rules → resources). Hidden items get none,
 * so no student can read them.
 */
export function audienceKeysFor(r: Pick<Resource, "audienceType" | "audienceValues" | "visible">) {
  if (!r.visible) return [];
  return r.audienceType === "all" ? ["all"] : r.audienceValues.map((v) => `${r.audienceType}:${v}`);
}

/** A student's own keys — the query must ask for exactly these, or the rules refuse it. */
export function studentAudienceKeys(p: Pick<UserProfile, "classLevel" | "batchId" | "locationId">) {
  return ["all", `class:${p.classLevel}`, `batch:${p.batchId}`, `location:${p.locationId}`];
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const date = (v: unknown) => ((v as Timestamp | undefined)?.toDate ? (v as Timestamp).toDate() : null);

export function normalizeResource(id: string, raw: Record<string, unknown>): Resource {
  const f = raw.file as Record<string, unknown> | null | undefined;
  const audienceTypes: AudienceType[] = ["all", "class", "batch", "location"];
  return {
    id,
    title: str(raw.title),
    description: str(raw.description),
    kind: resourceKinds.includes(raw.kind as ResourceKind) ? (raw.kind as ResourceKind) : "link",
    url: str(raw.url),
    file: f && typeof f.path === "string" ? { path: f.path, name: str(f.name), size: typeof f.size === "number" ? f.size : 0, contentType: str(f.contentType) } : null,
    audienceType: audienceTypes.includes(raw.audienceType as AudienceType) ? (raw.audienceType as AudienceType) : "all",
    audienceValues: Array.isArray(raw.audienceValues) ? (raw.audienceValues as unknown[]).filter((v): v is string => typeof v === "string") : [],
    visible: raw.visible !== false,
    createdAt: date(raw.createdAt),
    updatedAt: date(raw.updatedAt),
  };
}

const when = (r: Resource) => r.createdAt?.getTime() ?? Date.now(); // just-added items have no server time yet
export const byNewest = (a: Resource, b: Resource) => when(b) - when(a);

/** Friendly message for Firebase Storage upload/download errors. */
export function storageErrorMessage(err: unknown) {
  const code = (err as { code?: string })?.code ?? "";
  if (["storage/unknown", "storage/bucket-not-found", "storage/project-not-found", "storage/unauthorized", "storage/retry-limit-exceeded"].includes(code)) {
    return "File uploads aren't switched on yet (Firebase Storage). For now, put the file in Google Drive and add it as a link.";
  }
  if (code === "storage/canceled") return "Upload cancelled.";
  if (code === "storage/object-not-found") return "This file is missing — ask your teacher to upload it again.";
  return (err as Error)?.message || "Something went wrong with the file.";
}
