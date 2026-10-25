import Link from "next/link";
import { waLink } from "@/lib/phone";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-band text-band-ink">
      <div className="container-x grid gap-12 py-16 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:py-20">
        <div>
          <p className="font-display text-3xl leading-tight sm:text-4xl text-balance">
            Clear teaching. <em className="text-band-accent">Lasting understanding.</em>
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed opacity-70">{site.description}</p>
        </div>

        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] opacity-60">Explore</p>
          <ul className="space-y-2.5">
            {[...site.nav, { label: "Contact", href: "/contact" }].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="link-underline text-sm opacity-90 hover:opacity-100">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] opacity-60">Courses</p>
          <ul className="space-y-2.5">
            {[
              { label: "O Level & IGCSE CS (0478 / 2210)", href: "/o-level-computer-science" },
              { label: "AS & A Level CS (9618)", href: "/a-level-computer-science" },
              { label: "Batch timings", href: "/teaching#schedule" },
              { label: "Register for a batch", href: "/signup" },
              { label: "Order books", href: "/order" },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="link-underline text-sm opacity-90 hover:opacity-100">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] opacity-60">Connect</p>
          <ul className="space-y-2.5">
            {site.whatsapp && (
              <li>
                <a href={waLink(site.whatsapp)} target="_blank" rel="noreferrer" className="link-underline text-sm opacity-90 hover:opacity-100">
                  WhatsApp {site.phone}
                </a>
              </li>
            )}
            <li>
              <a href={`mailto:${site.email}`} className="link-underline text-sm opacity-90 hover:opacity-100">
                {site.email}
              </a>
            </li>
            {site.socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noreferrer" className="link-underline text-sm opacity-90 hover:opacity-100">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container-x flex flex-col gap-2 border-t border-current/15 py-6 text-xs opacity-60 sm:flex-row sm:items-center sm:justify-between">
        <p>© {site.brand}. All rights reserved.</p>
        <p className="font-mono">while (curious) {"{ learn(); }"}</p>
      </div>

      <p
        aria-hidden
        className="pointer-events-none select-none whitespace-nowrap text-center font-display text-[18vw] leading-[0.8] tracking-tighter opacity-[0.06]"
      >
        {site.brand}
      </p>
    </footer>
  );
}
