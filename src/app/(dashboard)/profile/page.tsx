"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { changePassword, getApiErrorMessage, listSessions } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/stores/auth-store";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
  const session = useAuthStore((state) => state.session);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const sessions = useQuery({ queryKey: ["auth-sessions"], queryFn: listSessions });
  const password = useMutation({ mutationFn: () => changePassword({ currentPassword, newPassword }), onSuccess: (message) => { toast.success(message); setCurrentPassword(""); setNewPassword(""); }, onError: (error) => toast.error(getApiErrorMessage(error)) });
  if (!session) return <PageContainer><ErrorState title="Your session is unavailable." /></PageContainer>;
  const user = session.user;
  return <PageContainer><PageHeader eyebrow="Account" title="Profile" description="Your identity and access context are managed by the backend." /><div className="mt-6 grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Profile information</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div><span className="text-muted-foreground">Name</span><p className="font-medium">{user.fullName}</p></div><div><span className="text-muted-foreground">Email</span><p className="font-medium">{user.email}</p></div><div><span className="text-muted-foreground">Phone</span><p>{user.phone ?? "Not provided"}</p></div><div><span className="text-muted-foreground">Roles</span><p>{session.activeTenant?.roles.join(", ") ?? "No active hospital role"}</p></div><div><span className="text-muted-foreground">Tenant</span><p>{session.activeTenant?.slug ?? "No active hospital"}</p></div><p className="rounded-lg bg-muted/50 p-3 text-muted-foreground">Profile editing, role changes, tenant access, and avatar uploads are not exposed by the current backend contract.</p></CardContent></Card><Card><CardHeader><CardTitle>Change password</CardTitle></CardHeader><CardContent className="space-y-3"><Input type="password" placeholder="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><Input type="password" placeholder="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><Button disabled={password.isPending || !currentPassword || !newPassword} onClick={() => password.mutate()}>Update password</Button></CardContent></Card></div><Card className="mt-4"><CardHeader><CardTitle>Active sessions</CardTitle></CardHeader><CardContent>{sessions.isLoading ? <LoadingState label="Loading sessions..." /> : sessions.data?.length ? <div className="space-y-2 text-sm">{sessions.data.map((item) => <div className="border-b py-2" key={item.id}><div>{item.userAgent ?? "Unknown device"} {item.current ? "· Current session" : ""}</div><div className="text-muted-foreground">{item.ipAddress ?? "Unknown network"} · {item.lastUsedAt?.split("T")[0] ?? item.createdAt}</div></div>)}</div> : <p className="text-sm text-muted-foreground">No session information available.</p>}</CardContent></Card></PageContainer>;
}
