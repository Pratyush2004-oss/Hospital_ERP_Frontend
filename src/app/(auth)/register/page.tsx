import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterFlow } from "@/components/auth/register-flow";
import { LoadingState } from "@/components/shared/states";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Join HospitalOS"
      description="Create a hospital workspace or accept an invitation."
      widthClassName="max-w-2xl"
    >
      <Suspense fallback={<LoadingState label="Loading registration..." />}>
        <RegisterFlow />
      </Suspense>
    </AuthCard>
  );
}
