import { apiRequest } from "@/lib/api/client";
import type {
  Notification,
  NotificationPage,
  NotificationPagination,
} from "@/types/notification";

type ListNotificationOptions = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
};

function readPagination(meta: Record<string, unknown> | undefined, count: number): NotificationPagination {
  const value = meta?.pagination;
  if (typeof value === "object" && value !== null) {
    const pagination = value as Partial<NotificationPagination>;
    if (
      typeof pagination.page === "number" &&
      typeof pagination.pageSize === "number" &&
      typeof pagination.total === "number" &&
      typeof pagination.totalPages === "number"
    ) {
      return {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: pagination.totalPages,
      };
    }
  }
  return { page: 1, pageSize: count, total: count, totalPages: count > 0 ? 1 : 0 };
}

export async function listNotifications(
  options: ListNotificationOptions = {},
): Promise<NotificationPage> {
  const response = await apiRequest<{ notifications: Notification[] }>({
    method: "GET",
    url: "/notifications",
    params: {
      page: options.page ?? 1,
      limit: options.limit ?? 20,
      ...(options.unreadOnly ? { unreadOnly: true } : {}),
    },
  });

  return {
    notifications: response.data.notifications,
    pagination: readPagination(response.meta, response.data.notifications.length),
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiRequest<{ unread: number }>({
    method: "GET",
    url: "/notifications/unread-count",
  });
  return response.data.unread;
}

export async function markNotificationRead(notificationId: string): Promise<Notification> {
  const response = await apiRequest<{ notification: Notification; applied: boolean }>({
    method: "POST",
    url: `/notifications/${notificationId}/read`,
  });
  return response.data.notification;
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await apiRequest<{ updated: number }>({
    method: "POST",
    url: "/notifications/read-all",
  });
  return response.data.updated;
}
