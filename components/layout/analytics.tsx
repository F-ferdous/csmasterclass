"use client";

import { useEffect } from "react";
import { firebaseApp, isFirebaseConfigured } from "@/lib/firebase";

/** Starts Firebase Analytics in the browser when a measurement ID is configured. */
export function Analytics() {
  useEffect(() => {
    if (!isFirebaseConfigured || !process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) return;
    import("firebase/analytics").then(async ({ getAnalytics, isSupported }) => {
      if (await isSupported()) getAnalytics(firebaseApp());
    });
  }, []);
  return null;
}
