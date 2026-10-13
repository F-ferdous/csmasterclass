import { Overview } from "@/components/admin/overview";

// Rendered only after an admin signs in (see app/admin/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function AdminOverviewPage() {
  return <Overview />;
}
