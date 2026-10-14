import type { MetadataRoute } from "next";

/** Makes the site installable ("Add to Home Screen"); students land on their dashboard. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CS Masterclass",
    short_name: "CS Masterclass",
    description: "Your classes, homework, results and study materials.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f7f3ec",
    theme_color: "#1e3b33",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
