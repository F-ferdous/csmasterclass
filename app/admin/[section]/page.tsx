import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ComingSoon } from "@/components/dashboard/coming-soon";
import { soonItems } from "@/components/admin/nav";

// Rendered only after an admin signs in (see app/admin/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export function generateStaticParams() {
  return soonItems.map((i) => ({ section: i.href.split("/").pop()! }));
}

type Params = { params: Promise<{ section: string }> };

async function Section({ params }: Params) {
  const { section } = await params;
  const item = soonItems.find((i) => i.href === `/admin/${section}`);
  if (!item) notFound();
  return <ComingSoon area="admin" href={item.href} />;
}

/** Placeholder pages for dashboard sections that are planned but not built yet. */
export default function AdminSectionPage(props: Params) {
  return (
    <Suspense>
      <Section params={props.params} />
    </Suspense>
  );
}
