import type { Metadata } from "next";
import { BookGrid } from "@/components/books/book-grid";
import { PageHero } from "@/components/ui/page-hero";
import { Newsletter } from "@/components/sections/newsletter";
import { BundleOffer } from "@/components/sections/bundle-offer";
import { JsonLd } from "@/components/seo/json-ld";
import { getBooks } from "@/lib/data";
import { bookListLd, breadcrumbLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "O Level, IGCSE & A Level Computer Science Books (0478, 2210, 9618)",
  description:
    "Computer Science books for Cambridge IGCSE / O Level 0478 / 2210 and AS Level 9618 — handbook, topical notes, topical question bank, past paper booklet and mock exams. Softcopy or print.",
  path: "/books",
});

export default async function BooksPage() {
  const books = await getBooks();
  return (
    <>
      <JsonLd data={[bookListLd(books), breadcrumbLd([{ name: "Home", path: "/" }, { name: "Books", path: "/books" }])]} />
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
