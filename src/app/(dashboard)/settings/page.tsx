"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { getTenantSettings, updateTenantSetting } from "@/lib/api/settings-service";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const permissions = useAuthStore((state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS);
  const client = useQueryClient();
  const settings = useQuery({ queryKey: ["tenant-settings"], enabled: permissions.includes("tenant:read"), queryFn: getTenantSettings });
  const update = useMutation({ mutationFn: ({ key, value }: { key: string; value: unknown }) => updateTenantSetting(key, value), onSuccess: () => { void client.invalidateQueries({ queryKey: ["tenant-settings"] }); toast.success("Setting updated."); }, onError: (error) => toast.error(getApiErrorMessage(error)) });
  if (!permissions.includes("tenant:read")) return <PageContainer><PageHeader eyebrow="Administration" title="Settings" /><ErrorState title="You are not authorized to view hospital settings." /></PageContainer>;
  return <PageContainer><PageHeader eyebrow="Administration" title="Settings" description="Only backend-defined tenant settings are displayed." /><Card className="mt-6"><CardHeader><CardTitle>Hospital settings</CardTitle></CardHeader><CardContent>{settings.isLoading ? <LoadingState label="Loading settings..." /> : settings.data?.length ? <div className="space-y-3">{settings.data.map((setting) => <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-sm" key={setting.key}><div><div className="font-medium">{setting.key}</div><div className="text-muted-foreground">{JSON.stringify(setting.value)}</div></div>{permissions.includes("tenant:update") ? <Button size="sm" variant="outline" onClick={() => toast.info("This setting requires a typed backend-specific editor.")} disabled={update.isPending}>Edit</Button> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">No tenant settings are configured.</p>}</CardContent></Card></PageContainer>;
}
