import type { Metadata } from "next";
import { FreeResources } from "@/components/sections/free-resources";
import { PageHero } from "@/components/ui/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { getBooks, getFreeResources } from "@/lib/data";
import { bundleTiers } from "@/lib/pricing";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free O Level, IGCSE & A Level Computer Science Resources",
  description:
    "Free Computer Science notes, worksheets, past papers and videos for Class 9, 10, 11 and 12 — Cambridge IGCSE / O Level 0478 / 2210 and AS & A Level 9618. Pick your class, no sign-up needed.",
  path: "/free-resources",
});

export default async function FreeResourcesPage() {
  const [resources, books] = await Promise.all([getFreeResources(), getBooks()]);
  const soft = bundleTiers(books).find((t) => t.kind === "soft");
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Free Resources", path: "/free-resources" }])} />
      <PageHero
        eyebrow="Free resources"
        title={["Free notes & practice, ", { em: "class by class." }]}
        intro="Pick your class to open free notes, worksheets, past papers and videos — no sign-up needed."
      />
      <section className="container-x pb-12">
        <FreeResources resources={resources} books={books} bundleTier={soft} />
      </section>
    </>
  );
}
