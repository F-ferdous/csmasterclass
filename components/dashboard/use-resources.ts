"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { db } from "@/lib/firebase";
import { byNewest, normalizeResource, studentAudienceKeys, type Resource } from "@/lib/resources";

/**
 * Study materials for the signed-in student (live). The query asks only for the student's own
 * audience keys — firestore.rules refuses anything broader.
 */
export function useMyResources() {
  const { user, profile } = useAuth();
  const keys = profile ? studentAudienceKeys(profile).join("|") : "";
  const [state, setState] = useState<{ keys: string; list: Resource[] } | null>(null);

  useEffect(() => {
    if (!user || !keys) return;
    return onSnapshot(
      query(collection(db(), "resources"), where("audienceKeys", "array-contains-any", keys.split("|"))),
      (snap) => setState({ keys, list: snap.docs.map((d) => normalizeResource(d.id, d.data())).sort(byNewest) }),
      () => setState({ keys, list: [] }),
    );
  }, [user, keys]);

  return state?.keys === keys ? state.list : null;
}
