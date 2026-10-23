import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/lib/site";

/** The App Hosting address. Visitors there are sent to the custom domain (one address for Google, cookies and links). */
const oldHost = "csmasterclass--cs-masterclass.us-east4.hosted.app";

export function proxy(request: NextRequest) {
  // Behind App Hosting the original address can arrive in Host, X-Forwarded-Host or Forwarded — check them all,
  // and never redirect a request that mentions the custom domain (that would loop).
  const seen = ["host", "x-forwarded-host", "forwarded"].map((h) => request.headers.get(h) ?? "").join(" ");
  const domain = new URL(site.url).host;

  if (seen.includes(oldHost) && !seen.includes(domain)) {
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(new URL(pathname + search, site.url), 308);
  }

  // TEMPORARY: shows which host headers reach the server on App Hosting. Remove once the redirect is confirmed.
  const res = NextResponse.next();
  res.headers.set("x-debug-host", seen.slice(0, 300));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
