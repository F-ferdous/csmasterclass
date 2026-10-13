"use client";

import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from "firebase/firestore";
import { AnimatePresence } from "motion/react";
import { BookPlus, Loader2, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { normalizeBook } from "@/lib/normalize";
import { formatBdt, lowestPrice } from "@/lib/pricing";
import { seedBooks } from "@/lib/seed-books";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";
import { refreshBooks } from "@/app/actions";
import { BookCover } from "@/components/books/book-cover";
import { BookEditor } from "./book-editor";
import { EmptyState, GhostButton, PageHeader, PrimaryButton, Spinner } from "./ui";

export function BooksManager() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [editing, setEditing] = useState<Book | "new" | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(
    () =>
      onSnapshot(
        query(collection(db(), "books"), orderBy("order", "asc")),
        (snap) => setBooks(snap.docs.map((d) => normalizeBook(d.id, d.data()))),
        () => setBooks([]),
      ),
    [],
  );

  async function importBuiltIn() {
    setSeeding(true);
    const batch = writeBatch(db());
    for (const { slug, ...rest } of seedBooks) {
      // Firestore rejects `undefined`, so drop empty optional fields first.
      const clean = JSON.parse(JSON.stringify(rest)) as typeof rest;
      batch.set(doc(db(), "books", slug), { ...clean, updatedAt: serverTimestamp() });
    }
    await batch.commit();
    await refreshBooks();
    setSeeding(false);
  }

  return (
    <div>
      <PageHeader
        title="Books"
        description="Publish and edit books — covers, prices, key numbers and what's inside."
        actions={books && books.length > 0 && <PrimaryButton onClick={() => setEditing("new")}><Plus className="size-4" /> New book</PrimaryButton>}
      />

      <div className="mt-8">
        {books === null ? (
          <Spinner />
        ) : books.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="size-6" />}
            title="No books in Firestore yet"
            body="The public site shows the five built-in books until Firestore has its own. Import them to edit prices, covers and order — or start a new one."
            action={
              <>
                <PrimaryButton onClick={importBuiltIn} loading={seeding}>Import the built-in books</PrimaryButton>
                <GhostButton onClick={() => setEditing("new")}><BookPlus className="size-4" /> New book</GhostButton>
              </>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="grid aspect-[1/1.414] place-items-center rounded-xl border-2 border-dashed border-line text-ink-soft transition-colors hover:border-ember hover:text-ember"
            >
              <span className="flex flex-col items-center gap-2 text-sm font-medium">
                <Plus className="size-6" aria-hidden /> New book
              </span>
            </button>
            {books.map((b) => {
              const from = lowestPrice(b);
              return (
                <button key={b.slug} type="button" onClick={() => setEditing(b)} className="group text-left">
                  <div className="transition-transform duration-500 group-hover:-translate-y-1.5">
                    <BookCover book={b} sizes="200px" />
                  </div>
                  <p className="mt-3 truncate font-medium">{b.title}</p>
                  <p className={cn("text-xs", b.status === "draft" ? "text-ember" : "text-ink-soft")}>
                    {b.status.replace("-", " ")}
                    {from ? ` · from ${formatBdt(from.bdt)}` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}
        {seeding && <Loader2 className="mt-4 size-5 animate-spin text-ink-soft" />}
      </div>

      <AnimatePresence>
        {editing && (
          <BookEditor
            key={editing === "new" ? "new" : editing.slug}
            book={editing === "new" ? undefined : editing}
            nextOrder={(books?.at(-1)?.order ?? 0) + 1}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
