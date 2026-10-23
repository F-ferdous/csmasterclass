import type { MetadataRoute } from "next";
import { getBooks } from "@/lib/data";
import { site } from "@/lib/site";

/** Public pages, the course guides and every published book. The About page is listed once the owner's name is filled in. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const books = await getBooks();
  const pages = ["", "/teaching", "/o-level-computer-science", "/a-level-computer-science", "/books", "/success", "/contact", "/order", "/signup"];
  if (site.ownerName !== "Your Name") pages.push("/about");
  const priority = (path: string) => (path === "" ? 1 : path.endsWith("-computer-science") || path === "/teaching" ? 0.9 : 0.7);
  return [
    ...pages.map((path) => ({ url: `${site.url}${path}`, changeFrequency: "weekly" as const, priority: priority(path) })),
    ...books.map((b) => ({ url: `${site.url}/books/${b.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
