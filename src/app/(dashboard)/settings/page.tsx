"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Globe2, Hash, Palette, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import {
  getTenantSettings,
  updateTenantIdentity,
  updateTenantSetting,
  type BrandingSettingsInput,
  type LocaleSettingsInput,
  type PatientCodeFormatInput,
  type TenantIdentity,
} from "@/lib/api/settings-service";
import {
  PATIENT_CODE_SEPARATORS,
  TENANT_DATE_FORMATS,
  TENANT_LANGUAGES,
  buildPatientCodeFormat,
  previewPatientCode,
  readBrandingSettings,
  readLocaleSettings,
  readPatientCodeSettings,
  type PatientCodeSettings,
} from "@/lib/settings/tenant-settings";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const permissions = useAuthStore(
    (state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS,
  );

  if (!permissions.includes("tenant:read")) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Administration" title="Settings" />
        <ErrorState title="You are not authorized to view hospital settings." />
      </PageContainer>
    );
  }

  return <SettingsContent canUpdate={permissions.includes("tenant:update")} />;
}

function SettingsContent({ canUpdate }: { canUpdate: boolean }) {
  const settings = useQuery({ queryKey: ["tenant-settings"], queryFn: getTenantSettings });

  if (settings.isLoading) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Administration" title="Settings" />
        <LoadingState label="Loading hospital settings..." />
      </PageContainer>
    );
  }

  if (settings.isError || !settings.data) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Administration" title="Settings" />
        <ErrorState
          title="Unable to load hospital settings"
          onRetry={() => void settings.refetch()}
        />
      </PageContainer>
    );
  }

  const { tenant, settings: values } = settings.data;
  const revision = JSON.stringify(values);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description={`Configuration for ${tenant.name}. These settings apply only to the selected hospital.`}
      />

      {Object.keys(values).length === 0 ? (
        <Alert className="mt-6">
          <ShieldCheck className="size-4" aria-hidden="true" />
          <AlertTitle>Using defaults</AlertTitle>
          <AlertDescription>
            No hospital preferences are saved yet. The defaults below apply until you save a group.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <IdentityCard
          key={`identity-${tenant.id}-${tenant.name}-${tenant.legalName}-${tenant.email}-${tenant.phone}-${revision}`}
          tenant={tenant}
          canUpdate={canUpdate}
        />
        <BrandingCard
          key={`branding-${tenant.id}-${revision}`}
          tenant={tenant}
          settings={values}
          canUpdate={canUpdate}
        />
        <LocaleCard
          key={`locale-${tenant.id}-${revision}`}
          tenant={tenant}
          settings={values}
          canUpdate={canUpdate}
        />
        <PatientCodeCard
          key={`patient-code-${tenant.id}-${revision}`}
          settings={values}
          canUpdate={canUpdate}
        />
      </div>
    </PageContainer>
  );
}

function useInvalidateSettings() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["tenant-settings"] });
}

function InlineError({ error }: { error: unknown }) {
  if (!error) return null;

  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>Changes could not be saved</AlertTitle>
      <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
    </Alert>
  );
}

function IdentityCard({ tenant, canUpdate }: { tenant: TenantIdentity; canUpdate: boolean }) {
  const invalidate = useInvalidateSettings();
  const [name, setName] = useState(tenant.name);
  const [legalName, setLegalName] = useState(tenant.legalName ?? "");
  const [email, setEmail] = useState(tenant.email ?? "");
  const [phone, setPhone] = useState(tenant.phone ?? "");
  const save = useMutation({
    mutationFn: () =>
      updateTenantIdentity({
        name: name.trim(),
        legalName: legalName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
      }),
    onSuccess: () => {
      void invalidate();
      toast.success("Hospital identity saved.");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-5" aria-hidden="true" /> Identity
        </CardTitle>
        <CardDescription>Hospital name and contact information.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="identity-name">Hospital name</Label>
            <Input
              id="identity-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={200}
              required
              disabled={!canUpdate}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="identity-legal-name">Legal name</Label>
            <Input
              id="identity-legal-name"
              value={legalName}
              onChange={(event) => setLegalName(event.target.value)}
              maxLength={255}
              disabled={!canUpdate}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="identity-email">Contact email</Label>
              <Input
                id="identity-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="organization"
                disabled={!canUpdate}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="identity-phone">Contact phone</Label>
              <Input
                id="identity-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                disabled={!canUpdate}
              />
            </div>
          </div>
          <InlineError error={save.error} />
          {canUpdate ? (
            <Button type="submit" disabled={save.isPending || !name.trim()}>
              {save.isPending ? "Saving..." : "Save identity"}
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function BrandingCard({
  tenant,
  settings,
  canUpdate,
}: {
  tenant: TenantIdentity;
  settings: Record<string, unknown>;
  canUpdate: boolean;
}) {
  const invalidate = useInvalidateSettings();
  const initial = readBrandingSettings(settings, tenant.logoUrl);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor ?? "");
  const [portalName, setPortalName] = useState(initial.portalName ?? "");
  const save = useMutation({
    mutationFn: () => {
      if (logoUrl.trim()) {
        try {
          const url = new URL(logoUrl.trim());
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new Error("Logo URL must start with http:// or https://.");
          }
        } catch {
          throw new Error("Enter a valid logo URL.");
        }
      }

      if (primaryColor.trim() && !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(primaryColor.trim())) {
        throw new Error("Primary colour must be a hex value such as #0a7 or #00aa77.");
      }

      const value: BrandingSettingsInput = {
        logoUrl: logoUrl.trim() || null,
        primaryColor: primaryColor.trim() || null,
        portalName: portalName.trim() || null,
      };
      return updateTenantSetting("branding", value);
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Branding saved.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="size-5" aria-hidden="true" /> Branding
        </CardTitle>
        <CardDescription>Logo and portal branding preferences.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="branding-logo">Logo URL</Label>
            <Input
              id="branding-logo"
              type="url"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              disabled={!canUpdate}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="branding-color">Primary colour</Label>
              <Input
                id="branding-color"
                placeholder="#00aa77"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                disabled={!canUpdate}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="branding-name">Portal name</Label>
              <Input
                id="branding-name"
                value={portalName}
                onChange={(event) => setPortalName(event.target.value)}
                maxLength={80}
                disabled={!canUpdate}
              />
            </div>
          </div>
          <InlineError error={save.error} />
          {canUpdate ? (
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save branding"}
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function LocaleCard({
  tenant,
  settings,
  canUpdate,
}: {
  tenant: TenantIdentity;
  settings: Record<string, unknown>;
  canUpdate: boolean;
}) {
  const invalidate = useInvalidateSettings();
  const initial = readLocaleSettings(settings, tenant.timezone);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [language, setLanguage] = useState(initial.language);
  const [dateFormat, setDateFormat] = useState(initial.dateFormat);
  const save = useMutation({
    mutationFn: () => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: timezone.trim() });
      } catch {
        throw new Error("Enter a valid IANA timezone, for example America/New_York.");
      }

      const value: LocaleSettingsInput = {
        timezone: timezone.trim(),
        language,
        dateFormat,
      };
      return updateTenantSetting("locale", value);
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Locale saved.");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe2 className="size-5" aria-hidden="true" /> Locale
        </CardTitle>
        <CardDescription>
          Hospital timezone and display preferences. The timezone also becomes the scheduling default.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="locale-timezone">IANA timezone</Label>
            <Input
              id="locale-timezone"
              placeholder="America/New_York"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              required
              disabled={!canUpdate}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="locale-language">Language</Label>
              <Select
                value={language}
                onValueChange={(value) => {
                  if (value) setLanguage(value as typeof language);
                }}
                disabled={!canUpdate}
              >
                <SelectTrigger id="locale-language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TENANT_LANGUAGES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="locale-date-format">Date format</Label>
              <Select
                value={dateFormat}
                onValueChange={(value) => {
                  if (value) setDateFormat(value as typeof dateFormat);
                }}
                disabled={!canUpdate}
              >
                <SelectTrigger id="locale-date-format" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TENANT_DATE_FORMATS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <InlineError error={save.error} />
          {canUpdate ? (
            <Button type="submit" disabled={save.isPending || !timezone.trim()}>
              {save.isPending ? "Saving..." : "Save locale"}
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function PatientCodeCard({
  settings,
  canUpdate,
}: {
  settings: Record<string, unknown>;
  canUpdate: boolean;
}) {
  const invalidate = useInvalidateSettings();
  const initial = readPatientCodeSettings(settings);
  const [prefix, setPrefix] = useState(initial.prefix);
  const [separator, setSeparator] = useState(initial.separator);
  const [padding, setPadding] = useState(String(initial.padding));
  const [includeYear, setIncludeYear] = useState(initial.includeYear);
  const code: PatientCodeSettings = {
    prefix: prefix.trim().toUpperCase(),
    separator,
    padding: Number(padding),
    includeYear,
  };
  const save = useMutation({
    mutationFn: () => {
      if (!/^[A-Za-z0-9]{1,8}$/.test(prefix.trim())) {
        throw new Error("Prefix must be 1–8 letters or digits.");
      }
      if (!Number.isInteger(code.padding) || code.padding < 1 || code.padding > 12) {
        throw new Error("Padding must be a whole number between 1 and 12.");
      }

      const value: PatientCodeFormatInput = {
        prefix: code.prefix,
        separator,
        padding: code.padding,
        includeYear,
      };
      return updateTenantSetting("patient.code_format", value);
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Patient code format saved.");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="size-5" aria-hidden="true" /> Patient code format
        </CardTitle>
        <CardDescription>
          Controls new medical record numbers. Existing patient codes are not changed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="patient-code-prefix">Prefix</Label>
              <Input
                id="patient-code-prefix"
                value={prefix}
                onChange={(event) => setPrefix(event.target.value.toUpperCase())}
                maxLength={8}
                required
                disabled={!canUpdate}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="patient-code-separator">Separator</Label>
              <Select
                value={separator}
                onValueChange={(value) => {
                  if (value) setSeparator(value as typeof separator);
                }}
                disabled={!canUpdate}
              >
                <SelectTrigger id="patient-code-separator" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PATIENT_CODE_SEPARATORS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="patient-code-padding">Digits</Label>
              <Input
                id="patient-code-padding"
                type="number"
                min={1}
                max={12}
                value={padding}
                onChange={(event) => setPadding(event.target.value)}
                disabled={!canUpdate}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor="patient-code-year">Include year</Label>
              <p className="text-xs text-muted-foreground">
                Adds the current UTC year before the sequence.
              </p>
            </div>
            <Switch
              id="patient-code-year"
              checked={includeYear}
              onCheckedChange={setIncludeYear}
              disabled={!canUpdate}
            />
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm">
            <span className="text-muted-foreground">Preview</span>
            <p className="font-mono font-medium">{previewPatientCode(code)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Template: {buildPatientCodeFormat(code)}
            </p>
          </div>
          <InlineError error={save.error} />
          {canUpdate ? (
            <Button type="submit" disabled={save.isPending || !prefix.trim()}>
              {save.isPending ? "Saving..." : "Save patient code format"}
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
