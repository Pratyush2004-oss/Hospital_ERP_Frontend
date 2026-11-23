import { notFound } from "next/navigation";
import { NotificationsInbox } from "@/components/notifications/notifications-inbox";
import { featureFlags } from "@/config/features";

export const instant = false;

export default function NotificationsPage() {
  if (!featureFlags.notifications) notFound();
  return <NotificationsInbox />;
}
