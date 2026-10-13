"use client";

import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { normalizeBook } from "@/lib/normalize";
import { seedBooks } from "@/lib/seed-books";
import type { Book } from "@/lib/types";

/** Published books (Firestore when it has any, otherwise the built-in five). */
export function useBooks() {
  const [books, setBooks] = useState<Book[]>(seedBooks);
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    getDocs(query(collection(db(), "books"), orderBy("order", "asc")))
      .then((snap) => {
        const list = snap.docs.map((d) => normalizeBook(d.id, d.data())).filter((b) => b.status !== "draft");
        if (list.length) setBooks(list);
      })
      .catch(() => {});
  }, []);
  return books;
}
