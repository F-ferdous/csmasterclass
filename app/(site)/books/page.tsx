import type { Metadata } from "next";
import { BookGrid } from "@/components/books/book-grid";
import { PageHero } from "@/components/ui/page-hero";
import { Newsletter } from "@/components/sections/newsletter";
import { BundleOffer } from "@/components/sections/bundle-offer";
import { getBooks } from "@/lib/data";

export const metadata: Metadata = {
  title: "Books",
  description: "Classroom-tested computer science books — clear, visual and written to be enjoyed.",
};

export default async function BooksPage() {
  const books = await getBooks();
  return (
    <>
      <PageHero
        eyebrow={`The library · ${books.length} titles`}
        title={["Books that teach ", { em: "like a great lesson."}]}
        intro="Every title began as a set of lessons refined over years in the classroom. Pick the one that meets you where you are."
      />
      <BundleOffer books={books} />
      <section className="container-x pb-12 pt-10">
        <BookGrid books={books} />
      </section>
      <Newsletter />
    </>
  );
}
