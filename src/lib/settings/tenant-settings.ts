export const TENANT_DATE_FORMATS = [
  "YYYY-MM-DD",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "D MMM YYYY",
] as const;

export const TENANT_LANGUAGES = ["en", "en-US", "en-GB", "es", "fr", "ar"] as const;

export const PATIENT_CODE_SEPARATORS = ["-", "/", ".", "_"] as const;

export type TenantDateFormat = (typeof TENANT_DATE_FORMATS)[number];
export type TenantLanguage = (typeof TENANT_LANGUAGES)[number];
export type PatientCodeSeparator = (typeof PATIENT_CODE_SEPARATORS)[number];

export type BrandingSettings = {
  logoUrl: string | null;
  primaryColor: string | null;
  portalName: string | null;
};

export type LocaleSettings = {
  timezone: string;
  language: TenantLanguage;
  dateFormat: TenantDateFormat;
};

export type PatientCodeSettings = {
  prefix: string;
  separator: PatientCodeSeparator;
  padding: number;
  includeYear: boolean;
};

export const DEFAULT_DATE_FORMAT: TenantDateFormat = "D MMM YYYY";
export const DEFAULT_LANGUAGE: TenantLanguage = "en";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function readBrandingSettings(
  settings: Record<string, unknown>,
  tenantLogoUrl: string | null,
): BrandingSettings {
  const raw = settings.branding;
  const branding = isRecord(raw) ? raw : {};

  return {
    logoUrl:
      typeof branding.logoUrl === "string" && branding.logoUrl.trim()
        ? branding.logoUrl
        : tenantLogoUrl,
    primaryColor:
      typeof branding.primaryColor === "string" ? branding.primaryColor : null,
    portalName: typeof branding.portalName === "string" ? branding.portalName : null,
  };
}

export function readLocaleSettings(
  settings: Record<string, unknown>,
  tenantTimezone: string,
): LocaleSettings {
  const raw = settings.locale;
  const locale = isRecord(raw) ? raw : {};

  const language = TENANT_LANGUAGES.includes(locale.language as TenantLanguage)
    ? (locale.language as TenantLanguage)
    : DEFAULT_LANGUAGE;
  const dateFormat = TENANT_DATE_FORMATS.includes(locale.dateFormat as TenantDateFormat)
    ? (locale.dateFormat as TenantDateFormat)
    : DEFAULT_DATE_FORMAT;

  return {
    timezone:
      typeof locale.timezone === "string" && locale.timezone.trim()
        ? locale.timezone
        : tenantTimezone || "UTC",
    language,
    dateFormat,
  };
}

const PATIENT_CODE_PATTERN =
  /^([A-Za-z0-9]+)([-/._])(?:\{year\}\2)?\{seq:(\d{1,2})\}$/;

export function readPatientCodeSettings(
  settings: Record<string, unknown>,
): PatientCodeSettings {
  const raw = settings["patient.code_format"];

  if (typeof raw === "string") {
    const match = PATIENT_CODE_PATTERN.exec(raw.trim());

    if (match) {
      const padding = Number(match[3]);

      if (Number.isInteger(padding) && padding >= 1 && padding <= 12) {
        return {
          prefix: match[1]!.toUpperCase(),
          separator: match[2] as PatientCodeSeparator,
          padding,
          includeYear: raw.includes("{year}"),
        };
      }
    }
  }

  return {
    prefix: "P",
    separator: "-",
    padding: 6,
    includeYear: false,
  };
}

export function buildPatientCodeFormat(input: PatientCodeSettings): string {
  const year = input.includeYear ? `{year}${input.separator}` : "";
  return `${input.prefix.toUpperCase()}${input.separator}${year}{seq:${input.padding}}`;
}

export function previewPatientCode(input: PatientCodeSettings, now = new Date()): string {
  const year = now.getUTCFullYear();
  const date = input.includeYear ? `${year}${input.separator}` : "";
  return `${input.prefix.toUpperCase()}${input.separator}${date}${String(1).padStart(input.padding, "0")}`;
}
