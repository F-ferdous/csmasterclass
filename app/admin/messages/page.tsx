import { InboxList } from "@/components/admin/inbox-list";
import { PageHeader } from "@/components/admin/ui";

// Rendered only after an admin signs in (see app/admin/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export default function AdminMessagesPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Messages" description="Enquiries sent through the contact form, newest first." />
      <InboxList kind="messages" />
    </div>
  );
}
