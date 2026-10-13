import { ButtonLink } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="container-x grid min-h-[70vh] place-items-center pt-28 text-center">
          <div>
            <p className="font-mono text-sm text-ember">404 · page_not_found</p>
            <h1 className="mt-4 font-display text-5xl sm:text-7xl">
              This page took a <em className="text-ember">wrong turn.</em>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-ink-soft">
              Even the best algorithms hit a dead end sometimes. Let&apos;s get you back on track.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <ButtonLink href="/">Back home</ButtonLink>
              <ButtonLink href="/books" variant="ghost" arrow={false}>
                Browse books
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
