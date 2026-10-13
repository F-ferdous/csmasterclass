import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Check, ShoppingBag } from "lucide-react";
import { FlipBook } from "@/components/books/flip-book";
import { PricePanel } from "@/components/books/price-panel";
import { BundleOffer } from "@/components/sections/bundle-offer";
import { BookCard } from "@/components/books/book-card";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { getBook, getBooks } from "@/lib/data";

export async function generateStaticParams() {
  const books = await getBooks();
  return books.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps<"/books/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book) return { title: "Book not found" };
  return {
    title: book.title,
    description: book.description,
    openGraph: { title: book.title, description: book.description, images: book.coverUrl ? [book.coverUrl] : undefined },
  };
}

export default function BookPage(props: PageProps<"/books/[slug]">) {
  return (
    <Suspense fallback={<BookSkeleton />}>
      <BookDetails params={props.params} />
    </Suspense>
  );
}

async function BookDetails({ params }: Pick<PageProps<"/books/[slug]">, "params">) {
  const { slug } = await params;
  const [book, all] = await Promise.all([getBook(slug), getBooks()]);
  if (!book) notFound();
  const more = all.filter((b) => b.slug !== book.slug).slice(0, 3);
  const comingSoon = book.status === "coming-soon";

  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-28 sm:pt-36">
        <div aria-hidden className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_20%_30%,black,transparent_60%)]" />
        <div className="container-x relative">
          <Link href="/books" className="group inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" aria-hidden />
            All books
          </Link>

          <div className="mt-10 grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Reveal>
                <div
                  className="relative grid place-items-center overflow-hidden rounded-[2rem] px-[12%] py-[12%]"
                  style={{ background: `radial-gradient(circle at 50% 40%, ${book.coverAccent}66, transparent 70%), var(--paper-2)` }}
                >
                  <FlipBook book={book} />
                </div>
              </Reveal>
            </div>

            <div>
              <Reveal>
                <p className="eyebrow flex flex-wrap items-center gap-3">
                  <span className="h-px w-8 bg-ember" />
                  {book.syllabus ?? book.category}
                  {comingSoon && <span className="rounded-full bg-ember px-2.5 py-1 text-paper">Coming soon</span>}
                </p>
              </Reveal>
              <SplitHeading as="h1" immediate segments={[book.title]} className="mt-6 text-5xl leading-[1.02] sm:text-6xl" />
              {book.subtitle && (
                <Reveal delay={0.2}>
                  <p className="mt-4 font-display text-2xl italic text-ember">{book.subtitle}</p>
                </Reveal>
              )}

              <Reveal delay={0.3}>
                <p className="mt-8 text-lg leading-relaxed text-pretty">{book.description}</p>
                {book.longDescription && <p className="mt-5 leading-relaxed text-ink-soft text-pretty">{book.longDescription}</p>}

<dl className="mt-10 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line">
                  {(book.facts.length
                    ? book.facts.slice(0, 3)
                    : [
                        { value: book.pages ? String(book.pages) : "—", label: "Pages" },
                        { value: String(book.year), label: "Year" },
                        { value: book.category, label: "Type" },
                      ]
                  ).map((f) => (
                    <div key={f.label} className="p-4 sm:p-5">
                      <dt className="text-xs text-ink-faint">{f.label}</dt>
                      <dd className="mt-1 font-display text-2xl sm:text-3xl">{f.value}</dd>
                    </div>
                  ))}
                </dl>
                {comingSoon ? (
                  <div className="mt-8">
                    <ButtonLink href="/contact">Notify me at launch</ButtonLink>
                  </div>
                ) : (
                  <>
                    <PricePanel book={book} />
                    {book.buyLinks.length > 0 && (
                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <span className="text-sm text-ink-soft">Also available at</span>
                        {book.buyLinks.map((l) => (
                          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className={buttonClass("ghost", "py-2.5")}>
                            <ShoppingBag className="size-4" aria-hidden />
                            {l.label}
                          </a>
                        ))}
                      </div>
                    )}
                    {book.prices.length === 0 && book.buyLinks.length === 0 && (
                      <div className="mt-8">
                        <ButtonLink href="/contact">Enquire to order</ButtonLink>
                      </div>
                    )}
                  </>
                )}
              </Reveal>

              {book.highlights.length > 0 && (
                <div className="mt-14">
                  <Reveal>
                    <h2 className="font-display text-3xl">Inside the book</h2>
                  </Reveal>
                  <Stagger className="mt-6 grid gap-3 sm:grid-cols-2">
                    {book.highlights.map((h) => (
                      <StaggerItem key={h}>
                        <div className="flex h-full items-start gap-3 rounded-2xl bg-paper-2/70 p-4">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-forest text-forest-ink">
                            <Check className="size-3.5" aria-hidden />
                          </span>
                          <span className="text-sm leading-relaxed">{h}</span>
                        </div>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </div>
              )}

              {book.praise.length > 0 && (
                <div className="mt-14 space-y-5">
                  {book.praise.map((p) => (
                    <Reveal key={p.quote}>
                      <figure className="border-l-2 border-ember pl-6">
                        <blockquote className="font-display text-2xl leading-snug text-pretty">“{p.quote}”</blockquote>
                        <figcaption className="mt-3 text-sm text-ink-soft">— {p.author}</figcaption>
                      </figure>
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <BundleOffer books={all} />

      {more.length > 0 && (
        <section className="container-x border-t border-line pt-16">
          <Reveal>
            <h2 className="font-display text-4xl">
              More from the <em className="text-ember">library</em>
            </h2>
          </Reveal>
          <Stagger className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((b) => (
              <StaggerItem key={b.slug}>
                <BookCard book={b} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}
    </>
  );
}

function BookSkeleton() {
  return (
    <div className="container-x grid animate-pulse gap-12 pb-16 pt-40 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
      <div className="aspect-[4/5] rounded-[2rem] bg-paper-2" />
      <div className="space-y-5">
        <div className="h-4 w-32 rounded bg-paper-2" />
        <div className="h-16 w-3/4 rounded bg-paper-2" />
        <div className="h-6 w-1/2 rounded bg-paper-2" />
        <div className="h-32 rounded bg-paper-2" />
      </div>
    </div>
  );
}
