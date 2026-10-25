"use client";

import * as actions from "@/app/actions";
import { auth } from "@/lib/firebase-client";

// Refreshes the public pages' cached books / batches after an admin edit. A failed refresh only
// means the public pages update within a few minutes instead of straight away.
const withToken = async (run: (token: string) => Promise<void>) => {
  const token = await auth().currentUser?.getIdToken();
  if (token) await run(token).catch((err) => console.warn("[refresh]", err));
};

export const refreshBooks = () => withToken(actions.refreshBooks);
export const refreshCoaching = () => withToken(actions.refreshCoaching);
export const refreshFreeResources = () => withToken(actions.refreshFreeResources);
