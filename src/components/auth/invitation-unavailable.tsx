import Link from "next/link";
import { MailQuestion } from "lucide-react";
import { INVITATION_ACCEPTANCE } from "@/lib/onboarding/registration-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Invitation entry point.
 *
 * The backend currently has no invitation token or acceptance endpoint, so this
 * view explains the limitation instead of collecting credentials that could not
 * be activated. It is the stable place to wire the real flow later.
 */
export function InvitationUnavailable({ hasToken }: { hasToken: boolean }) {
  return (
    <div className="space-y-5">
      <Alert>
        <MailQuestion className="size-4 text-primary" />
        <AlertTitle>Invitation acceptance is not available yet</AlertTitle>
        <AlertDescription className="space-y-2">
          {hasToken ? (
            <p>
              An invitation link was detected, but this build cannot activate it.
              For safety, no password or token is submitted.
            </p>
          ) : null}
          <p>{INVITATION_ACCEPTANCE.reason}</p>
          <p>{INVITATION_ACCEPTANCE.guidance}</p>
        </AlertDescription>
      </Alert>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button nativeButton={false} render={<Link href="/register" />}>
          Create a hospital instead
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
          Back to sign in
        </Button>
      </div>
    </div>
  );
}
