import type { MetadataRoute } from "next";
import { getBooks } from "@/lib/data";
import { site } from "@/lib/site";

/** Public pages and every published book. The About page is listed once the owner's name is filled in. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const books = await getBooks();
  const pages = ["", "/teaching", "/success", "/books", "/contact", "/order", "/signup"];
  if (site.ownerName !== "Your Name") pages.push("/about");
  return [
    ...pages.map((path) => ({ url: `${site.url}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.7 })),
    ...books.map((b) => ({ url: `${site.url}/books/${b.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
