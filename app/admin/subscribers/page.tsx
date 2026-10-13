import { InboxList } from "@/components/admin/inbox-list";
import { PageHeader } from "@/components/admin/ui";

// Rendered only after an admin signs in (see app/admin/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function AdminSubscribersPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Subscribers" description="People who joined the reading list for new books and offers." />
      <InboxList kind="subscribers" />
    </div>
  );
}
