import { AuthCard } from "@/components/auth/auth-card";
import { InvitationAcceptance } from "@/components/auth/invitation-acceptance";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;

  return (
    <AuthCard
      title="Accept an invitation"
      description="Join an existing hospital workspace."
      widthClassName="max-w-xl"
    >
      <InvitationAcceptance token={token} />
    </AuthCard>
  );
}
