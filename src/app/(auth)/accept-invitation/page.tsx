import { AuthCard } from "@/components/auth/auth-card";
import { InvitationUnavailable } from "@/components/auth/invitation-unavailable";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthCard
      title="Accept an invitation"
      description="Join an existing hospital workspace."
    >
      <InvitationUnavailable hasToken={Boolean(params.token)} />
    </AuthCard>
  );
}
