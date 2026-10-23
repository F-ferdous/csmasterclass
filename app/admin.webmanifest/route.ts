import type { MetadataRoute } from "next";

/**
 * The admin app ("CS Masterclass Admin"): installed from the admin dashboard, it opens straight to /admin
 * (which sends signed-out visitors to /admin-login). Separate id from the student app (app/manifest.ts), so
 * both can be installed on the same device. Linked from the admin layout and /admin-login via `metadata.manifest`.
 */
const manifest: MetadataRoute.Manifest = {
  name: "CS Masterclass Admin",
  short_name: "CS Admin",
  description: "Manage batches, students, attendance, payments and orders.",
  id: "/admin",
  start_url: "/admin",
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

export function GET() {
  return Response.json(manifest, { headers: { "Content-Type": "application/manifest+json" } });
}
