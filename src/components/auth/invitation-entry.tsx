import Link from "next/link";
import { MailQuestion } from "lucide-react";
import { INVITATION_ACCEPTANCE } from "@/lib/onboarding/registration-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Entry point used by `?intent=invitation` before a token is available. */
export function InvitationEntry({ token }: { token: string | null }) {
  return (
    <div className="space-y-5">
      <Alert>
        <MailQuestion className="size-4 text-primary" />
        <AlertTitle>Use your invitation link</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{INVITATION_ACCEPTANCE.reason}</p>
          <p>{INVITATION_ACCEPTANCE.guidance}</p>
        </AlertDescription>
      </Alert>

      <div className="grid gap-2 sm:grid-cols-2">
        {token ? (
          <Button
            nativeButton={false}
            render={
              <Link
                href={`${INVITATION_ACCEPTANCE.path}?token=${encodeURIComponent(token)}`}
              />
            }
          >
            Review invitation
          </Button>
        ) : (
          <Button nativeButton={false} render={<Link href="/login" />}>
            Sign in
          </Button>
        )}
        <Button variant="outline" nativeButton={false} render={<Link href="/register" />}>
          Create a hospital instead
        </Button>
      </div>
    </div>
  );
}
