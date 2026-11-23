import { Suspense } from "react";
import { SchedulingManagement } from "@/components/management/scheduling-management";
import { LoadingState } from "@/components/shared/states";

export const instant = false;

export default function SchedulingPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading schedules..." />}>
      <SchedulingManagement />
    </Suspense>
  );
}
