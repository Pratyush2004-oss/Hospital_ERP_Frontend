"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notification-service";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Notification, NotificationEvent } from "@/types/notification";

const EVENT_LABELS: Record<NotificationEvent, string> = {
  PATIENT_REGISTERED: "Patient registered",
  APPOINTMENT_BOOKED: "Appointment booked",
  APPOINTMENT_CONFIRMED: "Appointment confirmed",
  APPOINTMENT_RESCHEDULED: "Appointment rescheduled",
  APPOINTMENT_CANCELLED: "Appointment cancelled",
  APPOINTMENT_REMINDER: "Appointment reminder",
  DOCTOR_SCHEDULE_CHANGED: "Doctor schedule changed",
  PATIENT_ADMIN_UPDATED: "Patient record updated",
  INVOICE_ISSUED: "Invoice issued",
  INVOICE_DUE_SOON: "Invoice due soon",
  INVOICE_OVERDUE: "Invoice overdue",
  PAYMENT_RECEIVED: "Payment received",
  PAYMENT_FAILED: "Payment failed",
  REFUND_PROCESSED: "Refund processed",
  REFUND_FAILED: "Refund failed",
  SYSTEM_ANNOUNCEMENT: "System announcement",
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function NotificationsInbox() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const notifications = useQuery({
    queryKey: ["notifications", "list", page, unreadOnly],
    queryFn: () => listNotifications({ page, limit: 20, unreadOnly }),
  });
  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: getUnreadNotificationCount,
  });

  function refreshInbox() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] }),
    ]);
  }

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await refreshInbox();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Unable to mark the notification as read.")),
  });
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async (updated) => {
      await refreshInbox();
      toast.success(updated > 0 ? `${updated} notification${updated === 1 ? "" : "s"} marked as read.` : "No unread notifications.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Unable to mark notifications as read.")),
  });

  const unreadCount = unread.data ?? 0;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Communication"
        title="Notifications"
        description="Messages and reminders delivered to your account in the selected hospital."
        actions={
          <Button
            variant="outline"
            disabled={markAll.isPending || unreadCount === 0}
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            {markAll.isPending ? "Marking..." : "Mark all as read"}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={unreadOnly ? "outline" : "default"}
          onClick={() => {
            setUnreadOnly(false);
            setPage(1);
          }}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={unreadOnly ? "default" : "outline"}
          onClick={() => {
            setUnreadOnly(true);
            setPage(1);
          }}
        >
          Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </Button>
      </div>

      {notifications.isLoading ? <LoadingState label="Loading notifications..." /> : null}
      {notifications.isError ? (
        <ErrorState
          title="Unable to load notifications"
          onRetry={() => void notifications.refetch()}
        />
      ) : null}
      {notifications.data && notifications.data.notifications.length === 0 ? (
        <EmptyState
          title={unreadOnly ? "No unread notifications" : "No notifications yet"}
          description="Appointment and billing events sent to your account will appear here."
        />
      ) : null}

      {notifications.data && notifications.data.notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.data.notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              marking={markRead.isPending && markRead.variables === notification.id}
              onMarkRead={() => markRead.mutate(notification.id)}
            />
          ))}
          <div className="flex items-center justify-between gap-4 border-t pt-4 text-sm text-muted-foreground">
            <span>
              Page {notifications.data.pagination.page} of{" "}
              {Math.max(notifications.data.pagination.totalPages, 1)}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || notifications.isFetching}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  page >= notifications.data.pagination.totalPages || notifications.isFetching
                }
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}

function NotificationRow({
  notification,
  marking,
  onMarkRead,
}: {
  notification: Notification;
  marking: boolean;
  onMarkRead: () => void;
}) {
  const unread = notification.readAt === null && notification.channel === "IN_APP";

  return (
    <Card className={cn(unread && "border-primary/40 bg-primary/5")}>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn("font-medium", unread && "text-primary")}>
              {notification.subject ?? EVENT_LABELS[notification.event]}
            </p>
            {unread ? <Badge>Unread</Badge> : null}
            <Badge variant="outline">{notification.channel.replaceAll("_", " ")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{notification.body}</p>
          <p className="text-xs text-muted-foreground">
            {EVENT_LABELS[notification.event]} · {formatCreatedAt(notification.createdAt)}
          </p>
        </div>
        {unread ? (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            disabled={marking}
            onClick={onMarkRead}
          >
            <Bell className="size-4" aria-hidden="true" />
            {marking ? "Marking..." : "Mark as read"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
