import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ComingSoon } from "@/components/dashboard/coming-soon";
import { studentSoonItems } from "@/components/dashboard/student-nav";

// Rendered only after sign-in (see app/dashboard/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export function generateStaticParams() {
  return studentSoonItems.map((i) => ({ section: i.href.split("/").pop()! }));
}

type Params = { params: Promise<{ section: string }> };

async function Section({ params }: Params) {
  const { section } = await params;
  const item = studentSoonItems.find((i) => i.href === `/dashboard/${section}`);
  if (!item) notFound();
  return <ComingSoon area="student" href={item.href} />;
}

/** Placeholder pages for student dashboard sections that are planned but not built yet. */
export default function StudentSectionPage(props: Params) {
  return (
    <Suspense>
      <Section params={props.params} />
    </Suspense>
  );
}
