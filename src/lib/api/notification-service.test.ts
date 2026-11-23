import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification-service";

vi.mock("@/lib/api/client", () => ({ apiRequest: vi.fn() }));
const mockedApiRequest = vi.mocked(apiRequest);

const notification = {
  id: "notification-1",
  event: "APPOINTMENT_CONFIRMED" as const,
  channel: "IN_APP" as const,
  status: "SENT" as const,
  subject: "Appointment confirmed",
  body: "Your appointment is confirmed.",
  payload: {},
  readAt: null,
  sentAt: "2026-11-22T09:00:00.000Z",
  createdAt: "2026-11-22T09:00:00.000Z",
};

describe("notification service", () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it("lists recipient notifications with paging and unread filter", async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: { notifications: [notification] },
      meta: {
        pagination: { page: 2, pageSize: 20, total: 21, totalPages: 2 },
      },
    });

    const result = await listNotifications({ page: 2, limit: 20, unreadOnly: true });

    expect(result.notifications).toHaveLength(1);
    expect(result.pagination).toEqual({ page: 2, pageSize: 20, total: 21, totalPages: 2 });
    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "GET",
      url: "/notifications",
      params: { page: 2, limit: 20, unreadOnly: true },
    });
  });

  it("reads the unread count from the existing endpoint", async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: { unread: 4 } });
    await expect(getUnreadNotificationCount()).resolves.toBe(4);
    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "GET",
      url: "/notifications/unread-count",
    });
  });

  it("marks one or all notifications as read", async () => {
    mockedApiRequest
      .mockResolvedValueOnce({ data: { notification: { ...notification, readAt: "2026-11-22T10:00:00.000Z" }, applied: true } })
      .mockResolvedValueOnce({ data: { updated: 3 } });

    await expect(markNotificationRead("notification-1")).resolves.toMatchObject({
      id: "notification-1",
      readAt: "2026-11-22T10:00:00.000Z",
    });
    await expect(markAllNotificationsRead()).resolves.toBe(3);

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, {
      method: "POST",
      url: "/notifications/notification-1/read",
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, {
      method: "POST",
      url: "/notifications/read-all",
    });
  });
});
