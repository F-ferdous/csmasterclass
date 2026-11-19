"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { defaultSettings, normalizeSettings, type SiteSettings } from "@/lib/settings";

/** Live Admin → Settings (built-in defaults until the document exists). `loaded` is false until the first read. */
export function useSiteSettings(): SiteSettings & { loaded: boolean; saved: boolean } {
  const [state, setState] = useState<{ settings: SiteSettings; loaded: boolean; saved: boolean }>({ settings: defaultSettings, loaded: false, saved: false });
  useEffect(
    () =>
      onSnapshot(
        doc(db(), "settings", "site"),
        (snap) => setState({ settings: normalizeSettings(snap.exists() ? snap.data() : null), loaded: true, saved: snap.exists() }),
        () => setState((s) => ({ ...s, loaded: true })),
      ),
    [],
  );
  return { ...state.settings, loaded: state.loaded, saved: state.saved };
}
