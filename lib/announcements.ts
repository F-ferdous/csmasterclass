import type { Timestamp } from "firebase/firestore";
import type { ClassLevel, UserProfile } from "./types";

export type AnnouncementCategory = "general" | "schedule" | "exam" | "result" | "holiday" | "event";
export type AnnouncementPriority = "normal" | "important" | "urgent";
export type AudienceType = "all" | "class" | "batch" | "location";
export type AnnouncementStatus = "draft" | "published";

/** announcements/{id} */
export type Announcement = {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  audienceType: AudienceType;
  /** Class levels, batch ids or location ids, depending on audienceType. */
  audienceValues: string[];
  pinned: boolean;
  status: AnnouncementStatus;
  /** Optional last day it's shown to students (YYYY-MM-DD, inclusive). */
  expiresOn: string;
  createdAt: Date | null;
  publishedAt: Date | null;
  updatedAt: Date | null;
};

export const categories: AnnouncementCategory[] = ["general", "schedule", "exam", "result", "holiday", "event"];
export const priorities: AnnouncementPriority[] = ["normal", "important", "urgent"];

export const categoryLabels: Record<AnnouncementCategory, string> = {
  general: "General",
  schedule: "Schedule change",
  exam: "Exam",
  result: "Result",
  holiday: "Holiday / closure",
  event: "Event",
};

export const categoryStyles: Record<AnnouncementCategory, string> = {
  general: "bg-paper-2 text-ink-soft",
  schedule: "bg-gold/20 text-gold",
  exam: "bg-ember/15 text-ember",
  result: "bg-forest/15 text-forest",
  holiday: "bg-ink/10 text-ink",
  event: "bg-sage/30 text-ink",
};

export const priorityLabels: Record<AnnouncementPriority, string> = {
  normal: "Normal",
  important: "Important",
  urgent: "Urgent",
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const date = (v: unknown) => ((v as Timestamp | undefined)?.toDate ? (v as Timestamp).toDate() : null);

export function normalizeAnnouncement(id: string, raw: Record<string, unknown>): Announcement {
  const audienceType = (["all", "class", "batch", "location"] as AudienceType[]).includes(raw.audienceType as AudienceType)
    ? (raw.audienceType as AudienceType)
    : "all";
  return {
    id,
    title: str(raw.title),
    body: str(raw.body),
    category: categories.includes(raw.category as AnnouncementCategory) ? (raw.category as AnnouncementCategory) : "general",
    priority: priorities.includes(raw.priority as AnnouncementPriority) ? (raw.priority as AnnouncementPriority) : "normal",
    audienceType,
    audienceValues: Array.isArray(raw.audienceValues) ? (raw.audienceValues as unknown[]).filter((v): v is string => typeof v === "string") : [],
    pinned: Boolean(raw.pinned),
    status: raw.status === "published" ? "published" : "draft",
    expiresOn: str(raw.expiresOn),
    createdAt: date(raw.createdAt),
    publishedAt: date(raw.publishedAt),
    updatedAt: date(raw.updatedAt),
  };
}

/** Local calendar date as YYYY-MM-DD. */
export const todayString = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const isExpired = (a: Announcement, today = todayString()) => Boolean(a.expiresOn) && a.expiresOn < today;

/** Does this announcement apply to this student? */
export function reaches(a: Announcement, profile: Pick<UserProfile, "classLevel" | "batchId" | "locationId">) {
  switch (a.audienceType) {
    case "all":
      return true;
    case "class":
      return Boolean(profile.classLevel) && a.audienceValues.includes(profile.classLevel as ClassLevel);
    case "batch":
      return Boolean(profile.batchId) && a.audienceValues.includes(profile.batchId);
    case "location":
      return Boolean(profile.locationId) && a.audienceValues.includes(profile.locationId);
  }
}

/** Pinned first, then urgent → normal, then newest. */
export function sortAnnouncements(list: Announcement[]) {
  const rank: Record<AnnouncementPriority, number> = { urgent: 0, important: 1, normal: 2 };
  const when = (a: Announcement) => (a.publishedAt ?? a.createdAt)?.getTime() ?? 0;
  return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || rank[a.priority] - rank[b.priority] || when(b) - when(a));
}

export const formatWhen = (d: Date | null) =>
  d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
