import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";

export const instant = false;

export default function NotificationsPage() {
  return <PageContainer><PageHeader eyebrow="Communication" title="Notifications" description="Billing notification delivery is managed by the backend worker." /><ErrorState title="Notification history is not available in the registered API." /></PageContainer>;
}
