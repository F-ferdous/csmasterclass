import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Search engines may crawl the public site, but not the dashboards or the student file API. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/api/"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
