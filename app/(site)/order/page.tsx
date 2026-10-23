import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderForm } from "@/components/books/order-form";
import { PageHero } from "@/components/ui/page-hero";
import { getBooks } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Order Computer Science Books",
  description:
    "Order O Level / IGCSE 0478 / 2210 and AS 9618 Computer Science books — softcopy or printed, one title or the complete bundle. Pay after we confirm by phone or WhatsApp.",
  path: "/order",
});

export default function OrderPage() {
  return (
    <>
      <PageHero
        eyebrow="Order books"
        title={["Pick your books, ", { em: "we'll do the rest." }]}
        intro="Choose the titles and editions you want. No payment now — we'll call or WhatsApp you to confirm the order and share how to pay."
      />
      <section className="container-x pb-24">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-[2rem] bg-paper-2" />}>
          <Order />
        </Suspense>
      </section>
    </>
  );
}

async function Order() {
  const books = await getBooks();
  return <OrderForm books={books} />;
}
