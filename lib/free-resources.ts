import type { Timestamp } from "firebase/firestore";
import { classLevels } from "./coaching";
import { resourceKinds, type ResourceFile, type ResourceKind } from "./resources";
import type { BookLevel, ClassLevel } from "./types";

/**
 * freeResources/{id} — free material anyone can open from /free-resources, filed by class.
 * Uploaded files live in Storage at free-resources/{id}/…; `fileUrl` is their public download link.
 */
export type FreeResource = {
  id: string;
  title: string;
  description: string;
  kind: ResourceKind;
  /** Link resources only. */
  url: string;
  file: ResourceFile | null;
  /** Download link for `file` (works for anyone who has it). */
  fileUrl: string;
  classes: ClassLevel[];
  /** Hidden items stay in the admin list but the public page doesn't show them. */
  visible: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

/** Which books a class is pointed to: Class 9–10 → O Level, 11–12 → AS & A Level. */
export const levelForClass = (c: ClassLevel): BookLevel => (c === "11" || c === "12" ? "a-level" : "o-level");

const str = (v: unknown) => (typeof v === "string" ? v : "");
const date = (v: unknown) => ((v as Timestamp | undefined)?.toDate ? (v as Timestamp).toDate() : null);

export function normalizeFreeResource(id: string, raw: Record<string, unknown>): FreeResource {
  const f = raw.file as Record<string, unknown> | null | undefined;
  return {
    id,
    title: str(raw.title),
    description: str(raw.description),
    kind: resourceKinds.includes(raw.kind as ResourceKind) ? (raw.kind as ResourceKind) : "link",
    url: str(raw.url),
    file: f && typeof f.path === "string" ? { path: f.path, name: str(f.name), size: typeof f.size === "number" ? f.size : 0, contentType: str(f.contentType) } : null,
    fileUrl: str(raw.fileUrl),
    classes: Array.isArray(raw.classes) ? classLevels.filter((c) => (raw.classes as unknown[]).includes(c)) : [],
    visible: raw.visible !== false,
    createdAt: date(raw.createdAt),
    updatedAt: date(raw.updatedAt),
  };
}

const when = (r: FreeResource) => r.createdAt?.getTime() ?? Date.now(); // just-added items have no server time yet
export const newestFirst = (a: FreeResource, b: FreeResource) => when(b) - when(a);
