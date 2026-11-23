export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP";

export type NotificationStatus = "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "SKIPPED";

export type NotificationEvent =
  | "PATIENT_REGISTERED"
  | "APPOINTMENT_BOOKED"
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_RESCHEDULED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_REMINDER"
  | "DOCTOR_SCHEDULE_CHANGED"
  | "PATIENT_ADMIN_UPDATED"
  | "INVOICE_ISSUED"
  | "INVOICE_DUE_SOON"
  | "INVOICE_OVERDUE"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_FAILED"
  | "REFUND_PROCESSED"
  | "REFUND_FAILED"
  | "SYSTEM_ANNOUNCEMENT";

export type Notification = {
  id: string;
  event: NotificationEvent;
  channel: NotificationChannel;
  status: NotificationStatus;
  subject: string | null;
  body: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type NotificationPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type NotificationPage = {
  notifications: Notification[];
  pagination: NotificationPagination;
};
