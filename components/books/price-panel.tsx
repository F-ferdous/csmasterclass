import Link from "next/link";
import { ArrowUpRight, FileText, Layers, MessageCircle, Package, Puzzle } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { formatUsd, orderHref, orderMessage, priceDetails, priceLabels } from "@/lib/pricing";
import { site } from "@/lib/site";
import type { Book, PriceKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const icons: Record<PriceKind, typeof FileText> = { soft: FileText, hard: Package, chapter: Puzzle, combined: Layers };

/** Pricing options for one book, each with its own order button. */
export function PricePanel({ book }: { book: Book }) {
  if (book.prices.length === 0) return null;
  const chapterWise = book.prices.some((p) => p.kind === "chapter");

  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl">Choose your edition</h2>
        {chapterWise && <p className="text-sm text-ink-soft">Sold chapter-wise</p>}
      </div>

      <Stagger className="mt-5 grid gap-4 sm:grid-cols-2">
        {book.prices.map((price, i) => {
          const Icon = icons[price.kind];
          const order = orderHref(orderMessage(book.title, price));
          const featured = i === book.prices.length - 1;
          return (
            <StaggerItem key={price.kind}>
              <div
                className={cn(
                  "group relative flex h-full flex-col rounded-3xl border p-6 transition-[transform,box-shadow] duration-500 hover:-translate-y-1.5 hover:shadow-soft",
                  featured ? "border-ink bg-paper" : "border-line bg-paper-2/50",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 font-medium">
                    <span className="grid size-9 place-items-center rounded-xl bg-forest text-forest-ink">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    {priceLabels[price.kind]}
                  </span>
                  {price.kind === "chapter" && <span className="text-xs text-ink-soft">each</span>}
                </div>
                <p className="mt-5 whitespace-nowrap font-display text-4xl tracking-tight">
                  {price.bdt.toLocaleString("en-US")}
                  <span className="ml-1.5 text-base font-normal tracking-normal text-ink-soft">BDT</span>
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {price.usd ? `${formatUsd(price.usd)} USD · ` : ""}
                  {priceDetails[price.kind]}
                </p>
                <Link
                  href={order.href}
                  {...(order.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className={cn(
                    "mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-colors",
                    featured ? "bg-forest text-forest-ink hover:bg-ink hover:text-paper" : "border border-line hover:border-ink",
                  )}
                >
                  {order.external ? <MessageCircle className="size-4" aria-hidden /> : null}
                  {price.kind === "chapter" ? "Choose chapters" : "Order now"}
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>

      {chapterWise && (
        <p className="mt-4 flex items-start gap-2 text-sm text-ink-soft">
          <MessageCircle className="mt-0.5 size-4 shrink-0 text-ember" aria-hidden />
          Message on WhatsApp{site.whatsapp ? "" : " (via the contact page)"} to pick the chapters you need — or get every chapter combined.
        </p>
      )}
    </div>
  );
}
