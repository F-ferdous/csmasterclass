import { RevisionManager } from "@/components/admin/revision-manager";

// Rendered only after an admin signs in (see app/admin/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function AdminRevisionPage() {
  return <RevisionManager />;
}
