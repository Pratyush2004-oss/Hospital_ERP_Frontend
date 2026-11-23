import { z } from "zod";
import type { RegisterTenantInput } from "@/types/management";

/**
 * Public hospital registration validation.
 *
 * Mirrors the backend contracts verified before wiring the form:
 * - `POST /auth/register` (`registerSchema`): fullName 2-200, valid email,
 *   optional phone, password 12-128 characters and at most 72 UTF-8 bytes.
 * - `POST /tenants/register` (`registerTenantSchema`): name 2-200, optional
 *   lowercase kebab-case slug, optional legal name/email/phone, optional
 *   IANA timezone (the backend defaults to UTC).
 *
 * The client never collects a role or a tenant id. The backend always assigns
 * the creator's `hospital_admin` membership from the verified session.
 */

const MAX_PASSWORD_BYTES = 72;

const optionalEmailSchema = z
  .string()
  .trim()
  .max(320, "Email must be at most 320 characters")
  .refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "Enter a valid email address",
  );

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(32, "Phone must be at most 32 characters")
  .refine(
    (value) => value === "" || /^\+?[0-9][0-9\s().-]{5,30}$/.test(value),
    "Enter a valid phone number",
  );

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be at most 128 characters")
  .refine(
    (value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES,
    `Password must be at most ${MAX_PASSWORD_BYTES} bytes`,
  );

export const registrationAccountSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(200, "Full name must be at most 200 characters"),
    email: z
      .string()
      .trim()
      .min(3, "Email is required")
      .max(320, "Email must be at most 320 characters")
      .pipe(z.email("Enter a valid email address")),
    phone: optionalPhoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const hospitalRegistrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Hospital name must be at least 2 characters")
    .max(200, "Hospital name must be at most 200 characters"),
  slug: z
    .string()
    .trim()
    .max(100, "Slug must be at most 100 characters")
    .refine(
      (value) => value === "" || value.length >= 3,
      "Slug must be at least 3 characters",
    )
    .refine(
      (value) => value === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
      "Use lowercase letters, numbers and hyphens",
    ),
  legalName: z
    .string()
    .trim()
    .max(255, "Legal name must be at most 255 characters"),
  email: optionalEmailSchema,
  phone: optionalPhoneSchema,
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required")
    .max(64, "Timezone must be at most 64 characters"),
});

/**
 * Hospital registration plus the regional preferences shown in the guided
 * wizard. Country, locale and language are review context only: the current
 * `POST /tenants/register` contract persists the timezone, but has no fields
 * for the other regional values, so they are never sent as hidden payload.
 */
export const hospitalProfileSchema = hospitalRegistrationSchema.extend({
  country: z.string().trim().regex(/^[A-Z]{2}$/, "Choose a country"),
  locale: z.string().trim().min(2, "Choose a locale").max(35, "Locale is too long"),
  language: z.string().trim().regex(/^[a-z]{2,3}$/, "Choose a language"),
});

export type RegistrationAccountValues = z.infer<typeof registrationAccountSchema>;
export type HospitalRegistrationValues = z.infer<typeof hospitalRegistrationSchema>;
export type HospitalProfileValues = z.infer<typeof hospitalProfileSchema>;

/** Omits blank optional fields so the backend receives only supplied values. */
export function toHospitalRegistrationPayload(
  values: HospitalRegistrationValues,
): RegisterTenantInput {
  const payload: RegisterTenantInput = { name: values.name.trim() };

  if (values.slug.trim() !== "") payload.slug = values.slug.trim();
  if (values.legalName.trim() !== "") payload.legalName = values.legalName.trim();
  if (values.email.trim() !== "") payload.email = values.email.trim().toLowerCase();
  if (values.phone.trim() !== "") payload.phone = values.phone.trim();
  if (values.timezone.trim() !== "") payload.timezone = values.timezone.trim();

  return payload;
}

/** Blank optional phone is omitted rather than sent as an empty string. */
export function toRegisterAccountPayload(values: RegistrationAccountValues) {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim().toLowerCase(),
    ...(values.phone.trim() === "" ? {} : { phone: values.phone.trim() }),
    password: values.password,
  };
}
