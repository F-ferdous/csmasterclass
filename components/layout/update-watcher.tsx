"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

// A tab left open across a deploy still runs the old build, and its forms then fail ("Network error") because the new
// server doesn't know the old Server Functions. When the tab comes back into view (or a form says it failed), compare
// the build it started on with the live one: reload straight away if nothing has been typed yet, otherwise offer a button.

const CHECK_EVENT = "cs:check-update";
const MIN_GAP_MS = 60_000;

/** Ask the watcher to check now — call after a Server Function call fails. */
export function checkForUpdate() {
  window.dispatchEvent(new Event(CHECK_EVENT));
}

async function liveBuild(): Promise<string> {
  const res = await fetch("/api/version", { cache: "no-store" });
  if (!res.ok) return "";
  return String(((await res.json()) as { build?: string }).build ?? "");
}

export function UpdateWatcher() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let started = "";
    let lastCheck = 0;
    let typed = false;
    let done = false;

    const onInput = () => (typed = true);

    async function check(force = false) {
      if (done || (!force && Date.now() - lastCheck < MIN_GAP_MS)) return;
      lastCheck = Date.now();
      const live = await liveBuild().catch(() => "");
      if (!live) return;
      if (!started) return void (started = live);
      if (live === started) return;
      done = true;
      // Reload at most once per build, so a mismatch can never turn into a reload loop.
      let reloadedFor = "";
      try {
        reloadedFor = sessionStorage.getItem("cs-reloaded-for") ?? "";
        sessionStorage.setItem("cs-reloaded-for", live);
      } catch {}
      if (!typed && reloadedFor !== live) window.location.reload();
      else setStale(true);
    }

    const onVisible = () => document.visibilityState === "visible" && check();
    const onCheck = () => check(true);

    check(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("input", onInput, true);
    window.addEventListener(CHECK_EVENT, onCheck);
    const timer = window.setInterval(onVisible, 10 * 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("input", onInput, true);
      window.removeEventListener(CHECK_EVENT, onCheck);
      window.clearInterval(timer);
    };
  }, []);

  if (!stale) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink shadow-lg"
    >
      <span className="flex-1">The website was just updated. Refresh the page to keep going — anything you typed may need re-entering.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 font-medium text-paper"
      >
        <RefreshCw className="size-3.5" aria-hidden />
        Refresh
      </button>
    </div>
  );
}
