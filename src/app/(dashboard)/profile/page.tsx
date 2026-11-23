"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  changePassword,
  deactivateAccount,
  getApiErrorMessage,
  listSessions,
  requestEmailChange,
  revokeSession,
  updateOwnProfile,
} from "@/lib/auth/auth-service";
import { useAuthStore } from "@/stores/auth-store";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const session = useAuthStore((state) => state.session);
  const client = useQueryClient();
  const sessions = useQuery({ queryKey: ["auth-sessions"], queryFn: listSessions });
  const revoke = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["auth-sessions"] });
      toast.success("Session revoked.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (!session) {
    return (
      <PageContainer>
        <ErrorState title="Your session is unavailable." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Account"
        title="My Profile"
        description="Manage your identity, sign-in email and account status. Hospital roles and memberships remain administrator-controlled."
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ProfileInformation />
        <EmailChangeCard />
        <ChangePasswordCard />
        <DeactivateAccountCard />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.isLoading ? <LoadingState label="Loading sessions..." /> : null}
          {sessions.isError ? (
            <ErrorState
              title="Unable to load sessions"
              onRetry={() => void sessions.refetch()}
            />
          ) : null}
          {sessions.data?.length ? (
            <div className="space-y-2 text-sm">
              {sessions.data.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">{item.userAgent ?? "Unknown device"}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.ipAddress ?? "Unknown IP"} · Last used{" "}
                      {new Date(item.lastUsedAt ?? item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {item.isCurrent ? (
                    <Badge variant="secondary">Current</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={revoke.isPending && revoke.variables === item.id}
                      onClick={() => revoke.mutate(item.id)}
                    >
                      {revoke.isPending && revoke.variables === item.id
                        ? "Revoking..."
                        : "Revoke"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : sessions.isSuccess ? (
            <p className="text-sm text-muted-foreground">No active sessions.</p>
          ) : null}
          {revoke.isError ? (
            <Alert variant="destructive" role="alert" className="mt-3">
              <AlertTitle>Session could not be revoked</AlertTitle>
              <AlertDescription>{getApiErrorMessage(revoke.error)}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function ProfileInformation() {
  const session = useAuthStore((state) => state.session);
  const [fullName, setFullName] = useState(session?.user.fullName ?? "");
  const [phone, setPhone] = useState(session?.user.phone ?? "");
  const update = useMutation({
    mutationFn: () =>
      updateOwnProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
      }),
    onSuccess: (user) => {
      const current = useAuthStore.getState().session;
      if (current) {
        useAuthStore.setState({ session: { ...current, user } });
      }
      toast.success("Profile updated.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (!session) return null;
  const user = session.user;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-5" aria-hidden="true" /> Profile information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            update.mutate();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="profile-full-name">Full name</Label>
            <Input
              id="profile-full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              minLength={2}
              maxLength={200}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-phone">Phone</Label>
            <Input
              id="profile-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              placeholder="Optional"
            />
            <p className="text-xs text-muted-foreground">
              Changing your phone marks it unverified until the number is verified again.
            </p>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Sign-in email</span>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Email status</span>
              <p className="font-medium">
                {user.emailVerifiedAt ? (
                  <Badge variant="secondary">Verified</Badge>
                ) : (
                  <Badge variant="outline">Unverified</Badge>
                )}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Roles</span>
              <p>{session.activeTenant?.roles.join(", ") ?? "No active hospital role"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Hospital</span>
              <p>{session.activeTenant?.slug ?? "No active hospital"}</p>
            </div>
          </div>
          <Button type="submit" disabled={update.isPending || !fullName.trim()}>
            {update.isPending ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EmailChangeCard() {
  const session = useAuthStore((state) => state.session);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const change = useMutation({
    mutationFn: requestEmailChange,
    onSuccess: () => {
      setSent(
        "Verification sent. Open the link in the email sent to your new address. Your current email stays active until then.",
      );
      setNewEmail("");
      setCurrentPassword("");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5" aria-hidden="true" /> Change email
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSent(null);
            change.mutate({ newEmail, currentPassword });
          }}
        >
          <p className="text-sm text-muted-foreground">
            Current email: <strong>{session?.user.email}</strong>. The new address must be
            verified before it replaces this sign-in email.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="profile-new-email">New email</Label>
            <Input
              id="profile-new-email"
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-email-password">Current password</Label>
            <Input
              id="profile-email-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {sent ? (
            <Alert>
              <Mail className="size-4" aria-hidden="true" />
              <AlertTitle>Verification required</AlertTitle>
              <AlertDescription>{sent}</AlertDescription>
            </Alert>
          ) : null}
          {change.isError ? (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Email change could not be requested</AlertTitle>
              <AlertDescription>{getApiErrorMessage(change.error)}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="submit"
            disabled={change.isPending || !newEmail.trim() || !currentPassword}
          >
            {change.isPending ? "Sending..." : "Send verification email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const password = useMutation({
    mutationFn: () => changePassword({ currentPassword, newPassword }),
    onSuccess: (message) => {
      toast.success(message);
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-5" aria-hidden="true" /> Change password
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="password"
          placeholder="Current password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <Input
          type="password"
          placeholder="New password (minimum 12 characters)"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Changing your password signs out every session, including this one.
        </p>
        <Button
          disabled={password.isPending || !currentPassword || newPassword.length < 12}
          onClick={() => password.mutate()}
        >
          {password.isPending ? "Updating..." : "Update password"}
        </Button>
      </CardContent>
    </Card>
  );
}

function DeactivateAccountCard() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [deactivated, setDeactivated] = useState(false);
  const deactivate = useMutation({
    mutationFn: () => deactivateAccount(currentPassword),
    onSuccess: () => {
      setDeactivated(true);
      setOpen(false);
      setCurrentPassword("");
    },
  });

  if (deactivated) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" aria-hidden="true" /> Account deactivated
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Your sessions have been revoked. Hospital records and memberships are preserved.
            You can reactivate this account with your email or phone and password.
          </p>
          <Button nativeButton={false} render={<Link href="/reactivate" />}>
            Reactivate account
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-destructive" aria-hidden="true" /> Deactivate account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Deactivation blocks sign-in and revokes every session. Hospital memberships, audit
          history and business records are preserved. The last active hospital administrator
          cannot deactivate their account.
        </p>
        {open ? (
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Current password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            {deactivate.isError ? (
              <Alert variant="destructive" role="alert">
                <AlertTitle>Account could not be deactivated</AlertTitle>
                <AlertDescription>{getApiErrorMessage(deactivate.error)}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                disabled={deactivate.isPending || !currentPassword}
                onClick={() => deactivate.mutate()}
              >
                {deactivate.isPending ? "Deactivating..." : "Deactivate account"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setOpen(true)}>
            Deactivate account
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
