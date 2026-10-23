import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Dev logs would otherwise print server-action arguments — including sign-in and registration passwords.
  logging: { serverFunctions: false },
  // Students' homework files (up to 25 MB) are uploaded through a Server Function.
  experimental: { serverActions: { bodySizeLimit: "26mb" } },
  images: {
    // Book covers uploaded through /admin live in Firebase Storage.
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
  },
  async headers() {
    // The service worker must never be cached, so updates reach students straight away.
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  async redirects() {
    // My account moved into the student dashboard. (The old App Hosting address → custom domain redirect is in proxy.ts.)
    return [{ source: "/account", destination: "/dashboard/profile", permanent: true }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
