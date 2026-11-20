import { apiRequest } from "@/lib/api/client";

export type TenantSetting = { key: string; value: unknown; updatedAt?: string };

export async function getTenantSettings(): Promise<TenantSetting[]> {
  const response = await apiRequest<{ settings: TenantSetting[] }>({ method: "GET", url: "/tenants/settings" });
  return response.data.settings;
}

export async function updateTenantSetting(key: string, value: unknown): Promise<TenantSetting> {
  const response = await apiRequest<{ setting: TenantSetting }>({ method: "PUT", url: `/tenants/settings/${key}`, data: { value } });
  return response.data.setting;
}
