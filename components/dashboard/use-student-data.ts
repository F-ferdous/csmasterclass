"use client";

import { useEffect, useReducer } from "react";
import { useStudentSession } from "@/components/auth/student-session";

// Student data comes from Server Functions (app/student-data.ts), not live Firestore listeners.
// This small cache shares each result between components, refetches when the tab becomes visible
// again and every minute, and can be updated right after a save.

type Entry = { data?: unknown; at: number; loading?: Promise<void>; subs: Set<() => void> };
const store = new Map<string, Entry>();

const entry = (key: string) => {
  let e = store.get(key);
  if (!e) store.set(key, (e = { at: 0, subs: new Set() }));
  return e;
};

function load(key: string, fetcher: () => Promise<unknown>) {
  const e = entry(key);
  e.loading ??= fetcher()
    .then((data) => {
      e.data = data;
    })
    .catch(() => {
      // Keep what we had; a signed-out student is sent to the sign-in page by the dashboard shell.
    })
    .finally(() => {
      e.loading = undefined;
      e.at = Date.now();
      e.subs.forEach((notify) => notify());
    });
  return e.loading;
}

const fetchers = new Map<string, () => Promise<unknown>>();

/** Reload one piece of student data now (e.g. after saving). */
export function refreshStudentData(key: string) {
  const f = fetchers.get(key);
  return f ? load(key, f) : Promise.resolve();
}

/** Replace cached data immediately (optimistic update); the next refresh confirms it. */
export function setStudentData<T>(key: string, update: (current: T | undefined) => T) {
  const e = entry(key);
  e.data = update(e.data as T | undefined);
  e.subs.forEach((notify) => notify());
}

/** Forget everything — on sign-out, so the next student never sees the previous one's data. */
export function clearStudentCache() {
  store.clear();
}

/**
 * `null` while loading. `key` names the data (one fetcher per key); pass `null` to wait.
 * Fetchers are Server Functions, which are stable references.
 */
export function useStudentData<T>(requested: string | null, fetcher: () => Promise<T>, refreshMs = 60_000): T | null {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  // Ask the server only once a student is known to be signed in (signed-out visitors are being
  // sent to the sign-in page, and every student Server Function would refuse them anyway).
  const { student } = useStudentSession();
  const key = student ? requested : null;

  useEffect(() => {
    if (!key) return;
    fetchers.set(key, fetcher);
    const e = entry(key);
    e.subs.add(rerender);
    if (e.data === undefined || Date.now() - e.at > 15_000) load(key, fetcher);
    const timer = window.setInterval(() => load(key, fetcher), refreshMs);
    const onVisible = () => document.visibilityState === "visible" && load(key, fetcher);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      e.subs.delete(rerender);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [key, fetcher, refreshMs]);

  if (!key) return null;
  return (store.get(key)?.data as T | undefined) ?? null;
}
