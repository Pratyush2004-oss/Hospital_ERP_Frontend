"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, ShieldCheck, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import {
  getPatientLinkingPanel,
  revokePatientLinkInvitation,
  sendPatientLinkInvitation,
} from "@/lib/api/patient-linking-service";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import type { PatientLinkInvitationStatus } from "@/types/patient-linking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/shared/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState, LoadingState } from "@/components/shared/states";

function statusBadge(status: PatientLinkInvitationStatus) {
  const variant =
    status === "ACCEPTED" ? "default" : status === "INVITED" ? "secondary" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PatientAccountLinking({
  patientId,
  canUpdate,
  linked,
}: {
  patientId: string;
  canUpdate: boolean;
  linked: boolean;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string>("");
  const panel = useQuery({
    queryKey: ["patient-linking", patientId],
    queryFn: () => getPatientLinkingPanel(patientId),
    retry: false,
  });

  const selectedEmail =
    email || panel.data?.invitationEmails[0] || "";

  const send = useMutation({
    mutationFn: () =>
      sendPatientLinkInvitation(patientId, selectedEmail || undefined),
    onSuccess: async () => {
      toast.success("Linking invitation sent.", {
        description: "The previous invitation, if any, is now invalid.",
      });
      await queryClient.invalidateQueries({ queryKey: ["patient-linking", patientId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const revoke = useMutation({
    mutationFn: (invitationId: string) =>
      revokePatientLinkInvitation(patientId, invitationId),
    onSuccess: async () => {
      toast.success("Invitation revoked.");
      await queryClient.invalidateQueries({ queryKey: ["patient-linking", patientId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRoundCheck className="size-5" aria-hidden="true" />
          Portal account linking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {panel.isLoading ? <LoadingState label="Loading account linking..." /> : null}
        {panel.isError ? (
          <ErrorState
            title={getApiErrorMessage(panel.error, "Account linking status could not be loaded.")}
            onRetry={() => void panel.refetch()}
          />
        ) : null}

        {panel.data ? (
          <>
            {linked || panel.data.accountLinked ? (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                  This patient profile is linked to a portal account. Account linking
                  cannot be reassigned from the portal; an unlink is a separate
                  authorized action.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Send a single-use invitation to an email already recorded on this
                  patient profile. The patient must sign in with that verified email
                  before the record is linked.
                </p>

                {panel.data.invitationEmails.length === 0 ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Add an email address to this patient&apos;s contact information
                    before sending a linking invitation.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <FormField id="patient-linking-email" label="Send invitation to" required className="flex-1">
                      <Select
                        value={selectedEmail}
                        onValueChange={(value) => setEmail(value ?? "")}
                        disabled={!canUpdate || send.isPending}
                      >
                        <SelectTrigger id="patient-linking-email" className="w-full">
                          <SelectValue placeholder="Choose an email on file" />
                        </SelectTrigger>
                        <SelectContent>
                          {panel.data.invitationEmails.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <Button
                      onClick={() => send.mutate()}
                      disabled={!canUpdate || !selectedEmail || send.isPending}
                    >
                      <Mail className="size-4" aria-hidden="true" />
                      {send.isPending ? "Sending..." : "Send linking invitation"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-medium">Invitation history</h3>
              {panel.data.invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No linking invitations sent yet.</p>
              ) : (
                <div className="space-y-2">
                  {panel.data.invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{invitation.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Sent {formatDate(invitation.createdAt)} · Expires{" "}
                          {formatDate(invitation.expiresAt)}
                          {invitation.invitedByName
                            ? ` · ${invitation.invitedByName}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(invitation.status)}
                        {canUpdate && invitation.status === "INVITED" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revoke.mutate(invitation.id)}
                            disabled={revoke.isPending}
                          >
                            Revoke
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
