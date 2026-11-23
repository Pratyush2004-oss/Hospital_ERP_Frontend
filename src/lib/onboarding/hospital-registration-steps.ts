import { z } from "zod";
import {
  countryFromLocale,
  languageForLocale,
  resolvedLocale,
  resolvedTimezone,
} from "./hospital-registration-options";
import {
  hospitalProfileSchema,
  type HospitalProfileValues,
} from "@/lib/validations/onboarding";

export const HOSPITAL_REGISTRATION_STEPS = [
  {
    label: "Hospital identity",
    shortLabel: "Identity",
    description: "Name the hospital and choose its workspace URL.",
  },
  {
    label: "Contact & legal",
    shortLabel: "Contact",
    description: "Tell us who to contact about this registration.",
  },
  {
    label: "Timezone & region",
    shortLabel: "Region",
    description: "Set the hospital's timezone and regional preferences.",
  },
  {
    label: "Review & submit",
    shortLabel: "Review",
    description: "Confirm the details before sending the registration for approval.",
  },
] as const;

export type HospitalStepIndex = 0 | 1 | 2 | 3;

export const HOSPITAL_STEP_FIELDS: Record<
  HospitalStepIndex,
  readonly (keyof HospitalProfileValues)[]
> = {
  0: ["name", "slug"],
  1: ["legalName", "email", "phone"],
  2: ["timezone", "country", "locale", "language"],
  3: [],
};

export const HOSPITAL_STEP_COUNT = HOSPITAL_REGISTRATION_STEPS.length;

export function hospitalProfileDefaults(
  initialValues?: Partial<HospitalProfileValues>,
): HospitalProfileValues {
  const locale = resolvedLocale();
  const country = countryFromLocale(locale);

  return {
    name: "",
    slug: "",
    legalName: "",
    email: "",
    phone: "",
    timezone: resolvedTimezone(),
    country,
    locale,
    language: languageForLocale(locale),
    ...initialValues,
  };
}

/**
 * Validates only the fields owned by a step, so each Continue button can
 * reject incomplete input without exposing errors from later steps.
 */
export function validateHospitalStep(
  step: HospitalStepIndex,
  values: Partial<HospitalProfileValues>,
) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of HOSPITAL_STEP_FIELDS[step]) {
    shape[field] = hospitalProfileSchema.shape[field];
  }

  return z.object(shape).safeParse(values);
}

/** The first step that would block final submission. */
export function firstIncompleteHospitalStep(
  values: Partial<HospitalProfileValues>,
): HospitalStepIndex | undefined {
  return ([0, 1, 2, 3] as const).find(
    (step) => !validateHospitalStep(step, values).success,
  );
}
