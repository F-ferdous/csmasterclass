import type { Metadata } from "next";
import { site } from "./site";
import { bookLevelLabels } from "./books";
import { orderLink, priceLabels } from "./pricing";
import type { Batch, Book, Location } from "./types";

/**
 * Search-engine helpers: page metadata (title, description, canonical link, share cards)
 * and schema.org structured data (JSON-LD). The owner's name is never used here —
 * structured data appears on the Home page.
 */

export const absoluteUrl = (path: string) => new URL(path, site.url).toString();

/** Words people type into Google — used as meta keywords and to keep page copy on topic. */
export const seoKeywords = [
  "O Level Computer Science",
  "IGCSE Computer Science",
  "Computer Science 0478",
  "Computer Science 2210",
  "A Level Computer Science 9618",
  "AS Level Computer Science",
  "Computer Science coaching Dhaka",
  "O Level Computer Science teacher Dhaka",
  "Computer Science tuition Mirpur",
  "Computer Science tuition Uttara",
  "Cambridge Computer Science",
  "Edexcel Computer Science",
  "O Level Computer Science books",
  "0478 past papers",
  "2210 topical questions",
  "Computer Science mock exam",
];

type PageMeta = {
  /** Shown before " · CS Masterclass" unless `absoluteTitle`. */
  title: string;
  description: string;
  /** Path of the page, e.g. "/books" — becomes the canonical link. */
  path: string;
  absoluteTitle?: boolean;
  /** Share image(s); pages without one use app/opengraph-image.tsx. */
  images?: string[];
  noindex?: boolean;
};

/** Metadata for a public page: title, description, canonical link and share card. */
export function pageMetadata({ title, description, path, absoluteTitle, images, noindex }: PageMeta): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: site.brand,
      locale: "en_BD",
      url: path,
      title: absoluteTitle ? title : `${title} · ${site.brand}`,
      description,
      // Setting openGraph here drops the app/opengraph-image.tsx card, so name it explicitly.
      images: images?.length ? images : [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${site.brand} — O Level & A Level Computer Science` }],
    },
    twitter: { card: "summary_large_image" },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/* ───────────── Structured data (schema.org JSON-LD) ───────────── */

const orgId = `${site.url}/#organization`;

/** Real profile links only (the placeholders point at bare domains like https://youtube.com). */
const sameAs = () => site.socials.map((s) => s.href).filter((href) => new URL(href).pathname.length > 1);
const contactEmail = () => (site.email.endsWith("@example.com") ? undefined : site.email);

const place = (l: Location) => ({
  "@type": "Place",
  name: l.name,
  address: {
    "@type": "PostalAddress",
    ...(l.address ? { streetAddress: l.address } : {}),
    addressLocality: l.area || site.city,
    addressRegion: site.city,
    addressCountry: "BD",
  },
  ...(l.mapUrl ? { hasMap: l.mapUrl } : {}),
  ...(l.phone ? { telephone: l.phone } : {}),
});

/** The teaching brand, its coaching centres and what it teaches. */
export function organizationLd(locations: Location[]) {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": orgId,
    name: site.brand,
    url: site.url,
    logo: absoluteUrl("/icons/icon-512.png"),
    image: absoluteUrl("/opengraph-image"),
    description:
      "Cambridge IGCSE / O Level (0478 / 2210) and AS & A Level (9618) Computer Science coaching in Dhaka, with study books, topical notes, question banks and mock exam papers.",
    ...(contactEmail() ? { email: contactEmail() } : {}),
    ...(site.whatsapp ? { telephone: `+${site.whatsapp}` } : {}),
    ...(sameAs().length ? { sameAs: sameAs() } : {}),
    address: { "@type": "PostalAddress", addressLocality: site.city, addressCountry: "BD" },
    areaServed: { "@type": "City", name: site.city },
    location: locations.map(place),
    knowsAbout: [
      "Computer Science",
      "Cambridge IGCSE Computer Science 0478",
      "Cambridge O Level Computer Science 2210",
      "Cambridge International AS & A Level Computer Science 9618",
      "Pearson Edexcel Computer Science",
      "Programming",
      "Pseudocode",
      "Algorithms",
    ],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.brand,
    url: site.url,
    inLanguage: "en",
    publisher: { "@id": orgId },
  };
}

export type Faq = { q: string; a: string };

export function faqLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: absoluteUrl(item.path) })),
  };
}

/** A book with its editions as offers (Product rich results need at least one price). */
export function bookLd(book: Book) {
  const url = absoluteUrl(`/books/${book.slug}`);
  const prices = book.prices.filter((p) => p.bdt > 0);
  const images = [book.coverUrl, book.backUrl].filter((u): u is string => !!u).map(absoluteUrl);
  return {
    "@context": "https://schema.org",
    "@type": prices.length ? ["Book", "Product"] : "Book",
    "@id": `${url}#book`,
    name: book.title,
    ...(book.subtitle ? { alternateName: book.subtitle } : {}),
    description: [book.description, book.longDescription].filter(Boolean).join(" "),
    url,
    ...(images.length ? { image: images } : {}),
    inLanguage: "en",
    ...(book.pages ? { numberOfPages: book.pages } : {}),
    ...(book.year ? { datePublished: String(book.year) } : {}),
    genre: "Computer Science",
    educationalLevel: book.syllabus ?? bookLevelLabels[book.level],
    about: book.syllabus ? `Computer Science ${book.syllabus}` : "Computer Science",
    author: { "@id": orgId },
    publisher: { "@id": orgId },
    ...(prices.length
      ? {
          brand: { "@type": "Brand", name: site.brand },
          sku: book.slug,
          offers: prices.map((p) => ({
            "@type": "Offer",
            name: priceLabels[p.kind],
            price: p.bdt,
            priceCurrency: "BDT",
            availability: book.status === "coming-soon" ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            url: absoluteUrl(orderLink({ book: book.slug, kind: p.kind })),
            seller: { "@id": orgId },
          })),
        }
      : {}),
  };
}

/** The book catalogue as a list (lets Google understand the Books page). */
export function bookListLd(books: Book[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${site.brand} Computer Science books`,
    itemListElement: books.map((b, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/books/${b.slug}`), name: b.title })),
  };
}

/** A coaching course taught in person at the centres, with the lowest monthly fee when batches have one. */
export function courseLd(course: {
  name: string;
  description: string;
  path: string;
  code: string;
  level: string;
  teaches: string[];
  locations: Location[];
  batches: Batch[];
}) {
  const fees = course.batches.map((b) => b.fee).filter((f) => f > 0);
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.name,
    description: course.description,
    url: absoluteUrl(course.path),
    courseCode: course.code,
    educationalLevel: course.level,
    inLanguage: "en",
    teaches: course.teaches,
    provider: { "@type": "EducationalOrganization", "@id": orgId, name: site.brand, url: site.url },
    hasCourseInstance: course.locations.map((l) => ({ "@type": "CourseInstance", courseMode: "Onsite", location: place(l) })),
    offers: {
      "@type": "Offer",
      category: "Paid",
      ...(fees.length ? { price: Math.min(...fees), priceCurrency: "BDT" } : {}),
      url: absoluteUrl("/signup"),
    },
  };
}
