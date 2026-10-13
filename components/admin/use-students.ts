"use client";

import { collection, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { normalizeBatch, normalizeLocation, sortBatches } from "@/lib/coaching";
import { db } from "@/lib/firebase";
import { normalizeProfile } from "@/lib/normalize";
import type { Batch, Location, UserProfile } from "@/lib/types";

export type StudentRow = UserProfile & { joined: Date | null };

/** Live users, centres and batches for the admin Students page. */
export function useStudentsData() {
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const d = db();
    const stops = [
      onSnapshot(
        query(collection(d, "users"), orderBy("createdAt", "desc")),
        (snap) =>
          setStudents(
            snap.docs.map((doc) => {
              const raw = doc.data();
              const created = raw.createdAt as Timestamp | undefined;
              return { ...normalizeProfile(doc.id, raw), joined: created?.toDate ? created.toDate() : null };
            }),
          ),
        (err) => {
          setError(err.message);
          setStudents([]);
        },
      ),
      onSnapshot(query(collection(d, "locations"), orderBy("order", "asc")), (snap) =>
        setLocations(snap.docs.map((x) => normalizeLocation(x.id, x.data()))),
      ),
      onSnapshot(collection(d, "batches"), (snap) => setBatches(sortBatches(snap.docs.map((x) => normalizeBatch(x.id, x.data()))))),
    ];
    return () => stops.forEach((stop) => stop());
  }, []);

  return { students, locations, batches, error };
}
