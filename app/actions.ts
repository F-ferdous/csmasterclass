"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/server/require-admin";

// Admin only (Server Functions are reachable by direct POST) — otherwise anyone could keep
// emptying the public pages' cache. Called through components/admin/refresh.ts.

/** Called by /admin after a book is saved so the public pages show it immediately. */
export async function refreshBooks(idToken: string) {
  await requireAdmin(idToken);
  updateTag("books");
}

/** Called by /admin after a free resource is added, changed, hidden or deleted. */
export async function refreshFreeResources(idToken: string) {
  await requireAdmin(idToken);
  updateTag("free-resources");
}

/** Called by /admin after batches or locations change. */
export async function refreshCoaching(idToken: string) {
  await requireAdmin(idToken);
  updateTag("coaching");
}
