"use client";

import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { defaultLocations, normalizeBatch, normalizeLocation, sortBatches } from "@/lib/coaching";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { Batch, Location } from "@/lib/types";

/** Active coaching centres for pickers (falls back to the default two). */
export function useLocations() {
  return useCoaching().locations;
}

/** Active centres + batches (excluding closed ones), loaded once in the browser. */
export function useCoaching() {
  const [state, setState] = useState<{ locations: Location[]; batches: Batch[]; loading: boolean }>({
    locations: defaultLocations,
    batches: [],
    loading: isFirebaseConfigured,
  });

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    Promise.all([getDocs(query(collection(db(), "locations"), orderBy("order", "asc"))), getDocs(collection(db(), "batches"))])
      .then(([locSnap, batchSnap]) => {
        const locations = locSnap.docs.map((d) => normalizeLocation(d.id, d.data())).filter((l) => l.active);
        const batches = sortBatches(batchSnap.docs.map((d) => normalizeBatch(d.id, d.data())).filter((b) => b.status !== "closed"));
        setState({ locations: locations.length ? locations : defaultLocations, batches, loading: false });
      })
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, []);

  return state;
}
