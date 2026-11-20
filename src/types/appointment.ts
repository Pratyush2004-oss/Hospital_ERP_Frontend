export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "RESCHEDULED";
export type AppointmentSource = "ONLINE" | "RECEPTIONIST" | "WALK_IN" | "VOICE_AGENT";
export type AppointmentType = "CONSULTATION" | "FOLLOW_UP" | "PROCEDURE" | "EMERGENCY";

export type AppointmentSummary = {
  id: string; appointmentCode: string; patientId: string; patientCode: string; patientName: string;
  doctorId: string; doctorCode: string; doctorName: string; branchId: string; branchName: string;
  departmentId: string | null; appointmentType: AppointmentType; appointmentStatus: AppointmentStatus;
  appointmentSource: AppointmentSource; startAt: string; endAt: string; durationMinutes: number;
  reason: string | null; createdAt: string; updatedAt: string;
};
export type Appointment = AppointmentSummary & {
  consultationFee: string; currency: string; branchTimezone: string; rescheduledFromAppointmentId: string | null;
  cancelledBy: string | null; cancellationReason: string | null; checkedInAt: string | null;
  consultationStartedAt: string | null; completedAt: string | null; noShowAt: string | null;
  createdBy: string; replayed?: boolean;
};
export type AvailabilitySlot = { startAt: string; endAt: string; durationMinutes: number };
export type Availability = { doctorId: string; branchId: string; branchTimezone: string; fromDate: string; toDate: string; consultationFee: string; currency: string; days: Array<{ date: string; slots: AvailabilitySlot[] }> };
export type Schedule = { id: string; doctorId: string; branchId: string; dayOfWeek: number; startTime: string; endTime: string; slotDurationMinutes: number; bufferMinutes: number; effectiveFrom: string; effectiveUntil: string | null; isActive: boolean; doctor: { fullName: string; doctorCode: string }; branch: { name: string; branchCode: string; timezone: string } };
export type DoctorLeave = { id: string; doctorId: string; branchId: string | null; isAllBranches: boolean; startAt: string; endAt: string; reason: string | null; status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"; doctor: { fullName: string; doctorCode: string }; branch: { name: string; timezone: string } | null };
export type DoctorBreak = { id: string; scheduleId: string; startTime: string; endTime: string; reason: string | null; schedule: { doctorFullName: string; branchName: string; timezone: string } };
