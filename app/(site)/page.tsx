import { Hero } from "@/components/sections/hero";
import { TopicMarquee } from "@/components/sections/marquee";
import { StatsBand } from "@/components/sections/stats";
import { Approach } from "@/components/sections/approach";
import { BookShowcase } from "@/components/sections/book-showcase";
import { BundleOffer } from "@/components/sections/bundle-offer";
import { SuccessPreview } from "@/components/sections/success-preview";
import { Newsletter } from "@/components/sections/newsletter";
import { getBooks } from "@/lib/data";

export default async function HomePage() {
  const books = await getBooks();
  const byFeature = [...books].sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order);

  return (
    <>
      <Hero />
      <TopicMarquee />
      <StatsBand />
      <BookShowcase books={byFeature} />
      <BundleOffer books={byFeature} />
      <Approach />
      <SuccessPreview />
      <Newsletter />
    </>
  );
}
