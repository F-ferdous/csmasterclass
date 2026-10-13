"use server";

import { updateTag } from "next/cache";

/** Called by /admin after a book is saved so the public pages show it immediately. */
export async function refreshBooks() {
  updateTag("books");
}

/** Called by /admin after batches or locations change. */
export async function refreshCoaching() {
  updateTag("coaching");
}
