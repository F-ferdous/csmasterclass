"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bell, BellOff, Download, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/app/student-data";
import { useStudentSession } from "@/components/auth/student-session";
import { vapidPublicKey } from "@/lib/push";
import { cn } from "@/lib/utils";
import { useInstall } from "@/components/layout/use-install";

export { useAppSetup } from "@/components/layout/use-install";

/* ───────────── Push notifications ───────────── */

type PushState = "loading" | "unsupported" | "needs-install" | "blocked" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function detectPush(ios: boolean, standalone: boolean): Promise<PushState> {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && Boolean(vapidPublicKey);
  if (!supported) return ios && !standalone ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function usePush() {
  const { student: user } = useStudentSession();
  const { standalone, ios } = useInstall();
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    detectPush(ios, standalone).then(
      (s) => live && setState(s),
      () => live && setState("unsupported"),
    );
    return () => {
      live = false;
    };
  }, [ios, standalone]);

  async function enable() {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const saved = await savePushSubscription(json, navigator.userAgent);
      if (!saved.ok) throw new Error(saved.error);
      setState("on");
    } catch {
      setError("Couldn't turn on notifications on this device. Try again, or check your browser settings.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setError("Couldn't turn notifications off — try again.");
    } finally {
      setBusy(false);
    }
  }

  return { state, busy, error, enable, disable };
}

/* ───────────── UI ───────────── */

const DISMISS_KEY = "app-card-dismissed";

/** Overview card: install the app and turn on notifications. Hides once both are done (or dismissed). */
export function GetTheAppCard() {
  const { canPrompt, standalone, ios, install } = useInstall();
  const push = usePush();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const needsInstall = !standalone && (canPrompt || ios);
  const needsPush = push.state === "off" || push.state === "needs-install";
  if (dismissed || push.state === "loading" || (!needsInstall && !needsPush)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="relative overflow-hidden rounded-3xl bg-band p-5 text-band-ink sm:p-6"
      >
        <button type="button" onClick={dismiss} aria-label="Hide" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full opacity-70 hover:bg-band-ink/10 hover:opacity-100">
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-4 pr-8">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-band-accent text-band">
            <Smartphone className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl">Get CS Masterclass on your phone</h2>
            <p className="mt-1 text-sm opacity-80">
              {needsInstall ? "Add it to your home screen — it opens like an app. " : ""}
              {needsPush ? "Turn on notifications for new homework, results and notices." : ""}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {needsInstall && canPrompt && (
                <button type="button" onClick={install} className="inline-flex items-center gap-2 rounded-full bg-band-accent px-4 py-2.5 text-sm font-semibold text-band">
                  <Download className="size-4" aria-hidden /> Install app
                </button>
              )}
              {needsInstall && ios && !canPrompt && (
                <p className="flex items-center gap-1.5 rounded-full border border-band-ink/20 px-3.5 py-2 text-sm">
                  Tap <Share className="size-4" aria-label="Share" /> then <strong className="font-semibold">Add to Home Screen</strong>
                </p>
              )}
              {push.state === "off" && (
                <button
                  type="button"
                  onClick={push.enable}
                  disabled={push.busy}
                  className="inline-flex items-center gap-2 rounded-full border border-band-ink/30 px-4 py-2.5 text-sm font-medium hover:bg-band-ink/10 disabled:opacity-60"
                >
                  <Bell className="size-4" aria-hidden /> {push.busy ? "Turning on…" : "Turn on notifications"}
                </button>
              )}
            </div>
            {push.error && <p className="mt-2 text-sm text-band-accent">{push.error}</p>}
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}

/** Profile settings: app install status and a notifications on/off switch. */
export function AppSettings() {
  const { canPrompt, standalone, ios, install } = useInstall();
  const push = usePush();

  const pushText: Record<PushState, string> = {
    loading: "Checking…",
    unsupported: "This browser doesn't support notifications.",
    "needs-install": "On iPhone, add the app to your home screen first — then turn notifications on from there.",
    blocked: "Notifications are blocked for this site. Allow them in your browser or phone settings, then come back.",
    off: "Get a notification for new homework, published results, materials and notices.",
    on: "You'll get notifications on this device.",
  };

  return (
    <section className="space-y-4 rounded-[2rem] border border-line p-6 sm:p-8">
      <h2 className="font-display text-2xl">App &amp; notifications</h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm">
          <Smartphone className="size-4 text-ink-soft" aria-hidden />
          {standalone ? "You're using the installed app." : ios ? "Add to your home screen: tap Share, then “Add to Home Screen”." : canPrompt ? "Install the app on this device." : "Open this site in Chrome or Safari on your phone to install it."}
        </p>
        {!standalone && canPrompt && (
          <button type="button" onClick={install} className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-forest-ink hover:bg-ink hover:text-paper">
            <Download className="size-4" aria-hidden /> Install
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="flex items-start gap-2 text-sm">
          {push.state === "on" ? <Bell className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden /> : <BellOff className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden />}
          {pushText[push.state]}
        </p>
        {(push.state === "off" || push.state === "on") && (
          <button
            type="button"
            onClick={push.state === "on" ? push.disable : push.enable}
            disabled={push.busy}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-60",
              push.state === "on" ? "border border-line hover:border-ink" : "bg-forest text-forest-ink hover:bg-ink hover:text-paper",
            )}
          >
            {push.busy ? "…" : push.state === "on" ? "Turn off" : "Turn on"}
          </button>
        )}
      </div>
      {push.error && <p className="text-sm text-ember">{push.error}</p>}
    </section>
  );
}
