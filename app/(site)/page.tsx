import { Hero } from "@/components/sections/hero";
import { PromoVideo } from "@/components/sections/promo-video";
import { TopicMarquee } from "@/components/sections/marquee";
import { StatsBand } from "@/components/sections/stats";
import { Approach } from "@/components/sections/approach";
import { BatchesLocations } from "@/components/sections/batches-locations";
import { BookShowcase } from "@/components/sections/book-showcase";
import { BundleOffer } from "@/components/sections/bundle-offer";
import { SuccessPreview } from "@/components/sections/success-preview";
import { Newsletter } from "@/components/sections/newsletter";
import { FaqSection } from "@/components/sections/faq";
import { JsonLd } from "@/components/seo/json-ld";
import { getBooks, getCoaching } from "@/lib/data";
import { faqs } from "@/lib/content";
import { organizationLd, pageMetadata, websiteLd } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: `O Level & A Level Computer Science in ${site.city} | ${site.brand}`,
  absoluteTitle: true,
  description:
    "Cambridge O Level, IGCSE (0478 / 2210) and AS & A Level (9618) Computer Science classes in Mirpur and Uttara, Dhaka — plus handbooks, topical notes, question banks and mock papers.",
  path: "/",
});

export default async function HomePage() {
  const [books, { locations }] = await Promise.all([getBooks(), getCoaching()]);
  const byFeature = [...books].sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order);

  return (
    <>
      <JsonLd data={[organizationLd(locations), websiteLd()]} />
      <Hero />
      <PromoVideo />
      <TopicMarquee />
      <StatsBand />
      <BookShowcase books={byFeature} />
      <BundleOffer books={byFeature} />
      <BatchesLocations />
      <Approach />
      <SuccessPreview />
      <FaqSection
        faqs={faqs}
        intro="Classes, centres, books and how to join — the short answers. Anything else, just send a message."
      />
      <Newsletter />
    </>
  );
}
