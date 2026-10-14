import { Suspense, type ReactNode } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BundlePopup } from "@/components/sections/bundle-popup";
import { getBooks } from "@/lib/data";
import { bundleBooks, bundleTiers } from "@/lib/pricing";

/** Public website chrome: navbar + footer. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <Suspense fallback={null}>
        <BundlePromo />
      </Suspense>
    </>
  );
}

async function BundlePromo() {
  const books = await getBooks();
  return <BundlePopup books={bundleBooks(books)} tiers={bundleTiers(books)} />;
}
