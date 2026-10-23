"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bell, BellRing, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { removeAdminPush, saveAdminPush } from "@/app/push-actions";
import { useInstall } from "@/components/layout/use-install";
import { auth } from "@/lib/firebase-client";
import { vapidPublicKey } from "@/lib/push";
import { cn } from "@/lib/utils";

type State = "loading" | "unsupported" | "needs-install" | "blocked" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function detect(ios: boolean, standalone: boolean): Promise<State> {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && Boolean(vapidPublicKey);
  if (!supported) return ios && !standalone ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const sub = await (await navigator.serviceWorker.getRegistration("/"))?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

const token = async () => {
  const t = await auth().currentUser?.getIdToken();
  if (!t) throw new Error("Please sign in again.");
  return t;
};

/**
 * Bell in the admin top bar: turns on push notifications on this device for new registrations,
 * book orders and batch-change requests (sent by lib/server/webpush.ts notifyAdmins).
 */
export function AdminNotifyButton() {
  const { ios, standalone } = useInstall();
  const [state, setState] = useState<State>("loading");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    detect(ios, standalone).then(
      (s) => live && setState(s),
      () => live && setState("unsupported"),
    );
    return () => {
      live = false;
    };
  }, [ios, standalone]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function enable() {
    setBusy(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        setOpen(permission === "denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) }));
      const saved = await saveAdminPush(await token(), sub.toJSON(), navigator.userAgent);
      if (!saved.ok) throw new Error(saved.error);
      setState("on");
      setOpen(true);
    } catch (err) {
      setError((err as Error).message || "Couldn't turn on notifications on this device.");
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError("");
    try {
      const sub = await (await navigator.serviceWorker.getRegistration("/"))?.pushManager.getSubscription();
      if (sub) {
        const removed = await removeAdminPush(await token(), sub.endpoint);
        if (!removed.ok) throw new Error(removed.error);
        await sub.unsubscribe();
      }
      setState("off");
      setOpen(false);
    } catch (err) {
      setError((err as Error).message || "Couldn't turn notifications off — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;
  const on = state === "on";

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => (state === "off" ? enable() : setOpen((v) => !v))}
        disabled={busy}
        aria-expanded={state === "off" ? undefined : open}
        title={on ? "Notifications are on" : "Turn on notifications"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors disabled:opacity-60 sm:px-4",
          on ? "border-forest/40 bg-forest/10 text-forest hover:border-forest" : "border-line hover:border-ink",
        )}
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : on ? <BellRing className="size-4" aria-hidden /> : <Bell className="size-4" aria-hidden />}
        <span className="max-sm:sr-only">{on ? "Alerts on" : "Alerts"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            // Phones: full width under the top bar. Larger screens: under the button.
            className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-line bg-paper p-4 text-sm shadow-lift max-sm:fixed max-sm:inset-x-4 max-sm:top-[4.5rem] max-sm:mt-0 max-sm:w-auto"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">
                {on ? "Notifications are on" : state === "blocked" ? "Notifications are blocked" : state === "needs-install" ? "Install the app first" : "Notifications"}
              </p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="-mr-1 -mt-1 grid size-7 place-items-center rounded-full hover:bg-paper-2">
                <X className="size-3.5" />
              </button>
            </div>
            <p className="mt-1 text-ink-soft">
              {on
                ? "This device will be told about new registrations, book orders and batch-change requests."
                : state === "blocked"
                  ? "This browser is blocking notifications from this site. Allow them in the site settings (the icon left of the address), then try again."
                  : state === "needs-install"
                    ? "On iPhone and iPad, notifications work only in the installed app: tap Install app, open CS Admin from your home screen, then turn on alerts there."
                    : "Get notified about new registrations, book orders and batch-change requests."}
            </p>
            {error && <p className="mt-2 text-ember">{error}</p>}
            {on && (
              <button type="button" onClick={disable} disabled={busy} className="mt-3 rounded-full border border-line px-4 py-2 text-sm hover:border-ink disabled:opacity-60">
                {busy ? "Turning off…" : "Turn off on this device"}
              </button>
            )}
            {state === "off" && (
              <button type="button" onClick={enable} disabled={busy} className="mt-3 rounded-full bg-forest px-4 py-2 text-sm font-semibold text-forest-ink hover:bg-ink hover:text-paper disabled:opacity-60">
                {busy ? "Turning on…" : "Try again"}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
