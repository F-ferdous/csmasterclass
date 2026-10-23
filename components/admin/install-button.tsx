"use client";

import { AnimatePresence, motion } from "motion/react";
import { Download, Share, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useInstall } from "@/components/layout/use-install";

/**
 * "Install app" in the admin top bar — installs the separate "CS Masterclass Admin" app (app/admin.webmanifest).
 * Uses the browser's own install prompt when it offers one; otherwise shows how to do it (iPhone, Safari, etc.).
 * Hidden when the dashboard is already running as an installed app.
 */
export function AdminInstallButton() {
  const { canPrompt, standalone, ios, install } = useInstall();
  const [help, setHelp] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!help) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setHelp(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [help]);

  if (standalone) return null;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => (canPrompt ? install() : setHelp((v) => !v))}
        aria-expanded={canPrompt ? undefined : help}
        title="Install the admin app"
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm hover:border-ink sm:px-4"
      >
        <Download className="size-4" aria-hidden />
        <span className="max-sm:sr-only">Install app</span>
      </button>

      <AnimatePresence>
        {help && (
          <motion.div
            role="dialog"
            aria-label="Install the admin app"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            // Phones: full width under the top bar (the button isn't at the screen edge). Larger screens: under the button.
            className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-line bg-paper p-4 text-sm shadow-lift max-sm:fixed max-sm:inset-x-4 max-sm:top-[4.5rem] max-sm:mt-0 max-sm:w-auto"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">Install “CS Masterclass Admin”</p>
              <button type="button" onClick={() => setHelp(false)} aria-label="Close" className="-mr-1 -mt-1 grid size-7 place-items-center rounded-full hover:bg-paper-2">
                <X className="size-3.5" />
              </button>
            </div>
            <p className="mt-1 text-ink-soft">It opens straight to this dashboard, separate from the student app.</p>
            {ios ? (
              <p className="mt-3 flex flex-wrap items-center gap-1.5">
                In Safari, tap <Share className="size-4" aria-label="Share" /> then <strong className="font-semibold">Add to Home Screen</strong>.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-ink-soft">
                <li>
                  <strong className="font-medium text-ink">Chrome or Edge:</strong> click the install icon at the right of the address bar, or the
                  ⋮ menu → <em>Cast, save and share</em> → <em>Install page as app</em>.
                </li>
                <li>
                  <strong className="font-medium text-ink">Android:</strong> ⋮ menu → <em>Add to Home screen</em> → <em>Install</em>.
                </li>
                <li>
                  <strong className="font-medium text-ink">Safari on Mac:</strong> <em>File</em> → <em>Add to Dock</em>.
                </li>
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
