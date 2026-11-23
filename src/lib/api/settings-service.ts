import { apiRequest } from "@/lib/api/client";

export type TenantIdentity = {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  timezone: string;
  status: string;
};

export type TenantSettingsResponse = {
  tenant: TenantIdentity;
  settings: Record<string, unknown>;
};

export type TenantSetting = {
  key: string;
  value: unknown;
  auditId: string | null;
};

export type TenantIdentityInput = {
  name?: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type BrandingSettingsInput = {
  logoUrl?: string | null;
  primaryColor?: string | null;
  portalName?: string | null;
};

export type LocaleSettingsInput = {
  timezone: string;
  language: string;
  dateFormat: string;
};

export type PatientCodeFormatInput = {
  prefix: string;
  separator: string;
  padding: number;
  includeYear: boolean;
};

export async function getTenantSettings(): Promise<TenantSettingsResponse> {
  const response = await apiRequest<TenantSettingsResponse>({
    method: "GET",
    url: "/tenants/settings",
  });

  return response.data;
}

export async function updateTenantSetting(
  key: string,
  value: unknown,
): Promise<TenantSetting> {
  const response = await apiRequest<{ setting: TenantSetting }>({
    method: "PUT",
    url: `/tenants/settings/${key}`,
    data: { value },
  });

  return response.data.setting;
}

export async function updateTenantIdentity(
  input: TenantIdentityInput,
): Promise<{ tenant: TenantIdentity; auditId: string | null }> {
  const response = await apiRequest<{ tenant: TenantIdentity; auditId: string | null }>({
    method: "PATCH",
    url: "/tenants/settings/identity",
    data: input,
  });

  return response.data;
}
