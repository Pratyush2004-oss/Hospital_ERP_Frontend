/**
 * Options for the guided hospital registration experience.
 *
 * Timezones come from the runtime's IANA database. Country, locale and
 * language lists are deliberately curated to values HospitalOS can display
 * and reason about in review. Only the timezone is part of the current
 * `POST /tenants/register` contract; the remaining regional values are shown
 * for confirmation rather than sent as unsupported fields.
 */

export type CountryOption = {
  code: string;
  name: string;
  defaultTimezone: string;
};

export type LocaleOption = {
  value: string;
  label: string;
  language: string;
};

export type LanguageOption = {
  value: string;
  label: string;
};

export const COUNTRY_OPTIONS: readonly CountryOption[] = [
  { code: "US", name: "United States", defaultTimezone: "America/New_York" },
  { code: "CA", name: "Canada", defaultTimezone: "America/Toronto" },
  { code: "GB", name: "United Kingdom", defaultTimezone: "Europe/London" },
  { code: "IE", name: "Ireland", defaultTimezone: "Europe/Dublin" },
  { code: "AU", name: "Australia", defaultTimezone: "Australia/Sydney" },
  { code: "NZ", name: "New Zealand", defaultTimezone: "Pacific/Auckland" },
  { code: "IN", name: "India", defaultTimezone: "Asia/Kolkata" },
  { code: "SG", name: "Singapore", defaultTimezone: "Asia/Singapore" },
  { code: "AE", name: "United Arab Emirates", defaultTimezone: "Asia/Dubai" },
  { code: "SA", name: "Saudi Arabia", defaultTimezone: "Asia/Riyadh" },
  { code: "ZA", name: "South Africa", defaultTimezone: "Africa/Johannesburg" },
  { code: "NG", name: "Nigeria", defaultTimezone: "Africa/Lagos" },
  { code: "KE", name: "Kenya", defaultTimezone: "Africa/Nairobi" },
  { code: "EG", name: "Egypt", defaultTimezone: "Africa/Cairo" },
  { code: "DE", name: "Germany", defaultTimezone: "Europe/Berlin" },
  { code: "FR", name: "France", defaultTimezone: "Europe/Paris" },
  { code: "ES", name: "Spain", defaultTimezone: "Europe/Madrid" },
  { code: "IT", name: "Italy", defaultTimezone: "Europe/Rome" },
  { code: "NL", name: "Netherlands", defaultTimezone: "Europe/Amsterdam" },
  { code: "BE", name: "Belgium", defaultTimezone: "Europe/Brussels" },
  { code: "CH", name: "Switzerland", defaultTimezone: "Europe/Zurich" },
  { code: "SE", name: "Sweden", defaultTimezone: "Europe/Stockholm" },
  { code: "NO", name: "Norway", defaultTimezone: "Europe/Oslo" },
  { code: "DK", name: "Denmark", defaultTimezone: "Europe/Copenhagen" },
  { code: "FI", name: "Finland", defaultTimezone: "Europe/Helsinki" },
  { code: "PL", name: "Poland", defaultTimezone: "Europe/Warsaw" },
  { code: "TR", name: "Türkiye", defaultTimezone: "Europe/Istanbul" },
  { code: "BR", name: "Brazil", defaultTimezone: "America/Sao_Paulo" },
  { code: "MX", name: "Mexico", defaultTimezone: "America/Mexico_City" },
  { code: "AR", name: "Argentina", defaultTimezone: "America/Argentina/Buenos_Aires" },
  { code: "CL", name: "Chile", defaultTimezone: "America/Santiago" },
  { code: "CO", name: "Colombia", defaultTimezone: "America/Bogota" },
  { code: "JP", name: "Japan", defaultTimezone: "Asia/Tokyo" },
  { code: "KR", name: "South Korea", defaultTimezone: "Asia/Seoul" },
  { code: "CN", name: "China", defaultTimezone: "Asia/Shanghai" },
  { code: "PH", name: "Philippines", defaultTimezone: "Asia/Manila" },
  { code: "ID", name: "Indonesia", defaultTimezone: "Asia/Jakarta" },
  { code: "MY", name: "Malaysia", defaultTimezone: "Asia/Kuala_Lumpur" },
  { code: "TH", name: "Thailand", defaultTimezone: "Asia/Bangkok" },
  { code: "VN", name: "Vietnam", defaultTimezone: "Asia/Ho_Chi_Minh" },
] as const;

export const LOCALE_OPTIONS: readonly LocaleOption[] = [
  { value: "en-US", label: "English (United States)", language: "en" },
  { value: "en-GB", label: "English (United Kingdom)", language: "en" },
  { value: "en-CA", label: "English (Canada)", language: "en" },
  { value: "en-AU", label: "English (Australia)", language: "en" },
  { value: "en-IN", label: "English (India)", language: "en" },
  { value: "en-SG", label: "English (Singapore)", language: "en" },
  { value: "en-ZA", label: "English (South Africa)", language: "en" },
  { value: "es-ES", label: "Español (España)", language: "es" },
  { value: "es-MX", label: "Español (México)", language: "es" },
  { value: "fr-FR", label: "Français (France)", language: "fr" },
  { value: "fr-CA", label: "Français (Canada)", language: "fr" },
  { value: "de-DE", label: "Deutsch (Deutschland)", language: "de" },
  { value: "it-IT", label: "Italiano (Italia)", language: "it" },
  { value: "nl-NL", label: "Nederlands (Nederland)", language: "nl" },
  { value: "pt-BR", label: "Português (Brasil)", language: "pt" },
  { value: "pt-PT", label: "Português (Portugal)", language: "pt" },
  { value: "ar-AE", label: "العربية (الإمارات)", language: "ar" },
  { value: "ar-SA", label: "العربية (السعودية)", language: "ar" },
  { value: "hi-IN", label: "हिन्दी (भारत)", language: "hi" },
  { value: "ja-JP", label: "日本語 (日本)", language: "ja" },
  { value: "ko-KR", label: "한국어 (대한민국)", language: "ko" },
  { value: "zh-CN", label: "中文 (中国)", language: "zh" },
  { value: "id-ID", label: "Bahasa Indonesia (Indonesia)", language: "id" },
  { value: "ms-MY", label: "Bahasa Melayu (Malaysia)", language: "ms" },
  { value: "th-TH", label: "ไทย (ประเทศไทย)", language: "th" },
  { value: "vi-VN", label: "Tiếng Việt (Việt Nam)", language: "vi" },
  { value: "tr-TR", label: "Türkçe (Türkiye)", language: "tr" },
  { value: "pl-PL", label: "Polski (Polska)", language: "pl" },
  { value: "sv-SE", label: "Svenska (Sverige)", language: "sv" },
] as const;

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "nl", label: "Nederlands" },
  { value: "pt", label: "Português" },
  { value: "ar", label: "العربية" },
  { value: "hi", label: "हिन्दी" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "zh", label: "中文" },
  { value: "id", label: "Bahasa Indonesia" },
  { value: "ms", label: "Bahasa Melayu" },
  { value: "th", label: "ไทย" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "tr", label: "Türkçe" },
  { value: "pl", label: "Polski" },
  { value: "sv", label: "Svenska" },
] as const;

const FALLBACK_TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
] as const;

export function resolvedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function getSupportedTimezones(): string[] {
  const intl = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  };

  try {
    const supported = intl.supportedValuesOf?.("timeZone") ?? [];
    return [...new Set([resolvedTimezone(), ...supported, ...FALLBACK_TIMEZONES, "UTC"])].sort();
  } catch {
    return [...new Set([resolvedTimezone(), ...FALLBACK_TIMEZONES, "UTC"])].sort();
  }
}

/** Mirrors the backend slugifier so the preview matches what is stored. */
export function previewHospitalSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2019]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 100)
    .replace(/-+$/g, "");
}

export function countryFromLocale(locale: string): string {
  try {
    const region = new Intl.Locale(locale).region;
    if (region && COUNTRY_OPTIONS.some((country) => country.code === region)) {
      return region;
    }
  } catch {
    // Fall through to the default supported country.
  }

  return "US";
}

export function resolvedLocale(): string {
  if (typeof navigator === "undefined") return "en-US";
  const language = navigator.language || "en-US";
  return LOCALE_OPTIONS.some((locale) => locale.value.toLowerCase() === language.toLowerCase())
    ? LOCALE_OPTIONS.find((locale) => locale.value.toLowerCase() === language.toLowerCase())!.value
    : "en-US";
}

export function languageForLocale(locale: string): string {
  return LOCALE_OPTIONS.find((option) => option.value === locale)?.language ?? "en";
}

export function countryOption(code: string): CountryOption | undefined {
  return COUNTRY_OPTIONS.find((country) => country.code === code);
}
