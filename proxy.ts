import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/lib/site";

/** The App Hosting address. Visitors there are sent to the custom domain (one address for Google, cookies and links). */
const oldHost = "csmasterclass--cs-masterclass.us-east4.hosted.app";

export function proxy(request: NextRequest) {
  // On App Hosting, Host is the internal Cloud Run name (csmasterclass-….run.app) and the address the visitor typed
  // arrives in X-Forwarded-Host (checked 2026-10-23). Never redirect a request that mentions the custom domain (loop).
  const seen = ["host", "x-forwarded-host", "forwarded"].map((h) => request.headers.get(h) ?? "").join(" ");
  const domain = new URL(site.url).host;

  if (seen.includes(oldHost) && !seen.includes(domain)) {
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(new URL(pathname + search, site.url), 308);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
