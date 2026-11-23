"use client";

import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronsUpDown,
  ClipboardCheck,
  Globe2,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { checkTenantSlugAvailability } from "@/lib/api/management-service";
import {
  COUNTRY_OPTIONS,
  LANGUAGE_OPTIONS,
  LOCALE_OPTIONS,
  countryFromLocale,
  countryOption,
  getSupportedTimezones,
  languageForLocale,
  previewHospitalSlug,
} from "@/lib/onboarding/hospital-registration-options";
import {
  HOSPITAL_REGISTRATION_STEPS as STEPS,
  HOSPITAL_STEP_COUNT,
  HOSPITAL_STEP_FIELDS,
  firstIncompleteHospitalStep,
  hospitalProfileDefaults,
  type HospitalStepIndex,
} from "@/lib/onboarding/hospital-registration-steps";
import {
  hospitalProfileSchema,
  type HospitalProfileValues,
} from "@/lib/validations/onboarding";
import { FormField } from "@/components/shared/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type HospitalRegistrationWizardProps = {
  initialValues?: Partial<HospitalProfileValues>;
  submitting?: boolean;
  error?: string | null;
  duplicateSlug?: boolean;
  onSubmit: (values: HospitalProfileValues) => void | Promise<void>;
  onDraftChange?: (values: HospitalProfileValues) => void;
  onBackToAccount?: () => void;
};

export function HospitalRegistrationWizard({
  initialValues,
  submitting = false,
  error,
  duplicateSlug = false,
  onSubmit,
  onDraftChange,
  onBackToAccount,
}: HospitalRegistrationWizardProps) {
  const [step, setStep] = useState<HospitalStepIndex>(0);
  const [timezoneOpen, setTimezoneOpen] = useState(false);

  const defaultValues = useMemo<HospitalProfileValues>(
    () => hospitalProfileDefaults(initialValues),
    [initialValues],
  );

  const form = useForm<HospitalProfileValues>({
    resolver: zodResolver(hospitalProfileSchema),
    defaultValues,
  });
  const {
    register,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = form;

  const values = useWatch({ control: form.control });
  const name = values.name ?? "";
  const slugInput = (values.slug ?? "").trim();
  const timezone = values.timezone ?? defaultValues.timezone;
  const country = values.country ?? defaultValues.country;
  const locale = values.locale ?? defaultValues.locale;
  const language = values.language ?? defaultValues.language;

  const previewSlug = previewHospitalSlug(name);
  const displayedSlug = slugInput || previewSlug;
  const explicitSlugValid = slugInput.length >= 3 && SLUG_PATTERN.test(slugInput);
  const deferredSlug = useDeferredValue(slugInput);

  const slugAvailability = useQuery({
    queryKey: ["tenant-slug-availability", deferredSlug],
    queryFn: () => checkTenantSlugAvailability(deferredSlug),
    enabled: explicitSlugValid && deferredSlug === slugInput,
    retry: false,
    staleTime: 15_000,
  });

  const timezones = useMemo(() => getSupportedTimezones(), []);

  function moveTo(nextStep: HospitalStepIndex) {
    onDraftChange?.(getValues());
    setStep(nextStep);
  }

  async function continueToNext() {
    const valid = await trigger([...HOSPITAL_STEP_FIELDS[step]], { shouldFocus: true });
    if (!valid) return;

    if (step === 0 && slugInput !== "") {
      if (slugAvailability.data && !slugAvailability.data.available) {
        return;
      }
    }

    if (step < 3) moveTo((step + 1) as HospitalStepIndex);
  }

  async function submitForm() {
    const valid = await trigger(undefined, { shouldFocus: true });
    if (!valid) {
      const firstInvalidStep = firstIncompleteHospitalStep(getValues());
      if (firstInvalidStep !== undefined) setStep(firstInvalidStep);
      return;
    }

    if (slugInput !== "" && slugAvailability.data && !slugAvailability.data.available) {
      setStep(0);
      return;
    }

    onDraftChange?.(getValues());
    await onSubmit(getValues());
  }

  function goBack() {
    if (step === 0) {
      onDraftChange?.(getValues());
      onBackToAccount?.();
      return;
    }

    moveTo((step - 1) as HospitalStepIndex);
  }

  function goToStep(nextStep: HospitalStepIndex) {
    moveTo(nextStep);
  }

  const availabilityMessage = (() => {
    if (slugInput === "") {
      return {
        tone: "muted" as const,
        text: previewSlug
          ? `Preview: /hospitals/${previewSlug}. A unique URL is generated at submission if this one is taken.`
          : "Start typing a hospital name to preview its workspace URL.",
      };
    }

    if (!explicitSlugValid) {
      return {
        tone: "error" as const,
        text: "Use at least 3 lowercase letters, numbers or single hyphens.",
      };
    }

    if (slugAvailability.isFetching) {
      return { tone: "checking" as const, text: "Checking slug availability..." };
    }

    if (slugAvailability.data?.available === false) {
      return {
        tone: "error" as const,
        text: "This workspace URL is already in use. Choose another slug.",
      };
    }

    if (slugAvailability.data?.available) {
      return { tone: "success" as const, text: "This workspace URL is available." };
    }

    if (slugAvailability.isError) {
      return {
        tone: "muted" as const,
        text: "Availability could not be checked right now. It is verified again when you submit.",
      };
    }

    return {
      tone: "muted" as const,
      text: "Availability is checked automatically.",
    };
  })();

  return (
    <div className="space-y-5">
      <WizardProgress current={step} />

      <div>
        <h2 className="text-lg font-semibold">{STEPS[step].label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{STEPS[step].description}</p>
      </div>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>
            {duplicateSlug ? "That workspace URL is already taken" : "Registration did not complete"}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error}</p>
            {duplicateSlug ? (
              <p className="text-xs">
                Choose a different slug in the Hospital identity step. Your other details
                are still here.
              </p>
            ) : (
              <p className="text-xs">
                Your details have been kept. Retry when you are ready; completed account
                steps are not repeated.
              </p>
            )}
            {duplicateSlug ? (
              <Button type="button" size="sm" variant="outline" onClick={() => goToStep(0)}>
                Change workspace URL
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (step < 3) {
            void continueToNext();
          } else {
            void submitForm();
          }
        }}
      >
        {step === 0 ? (
          <div className="space-y-4">
            <FormField
              id="hospital-name"
              label="Hospital name"
              required
              error={errors.name?.message}
            >
              <Input
                id="hospital-name"
                autoComplete="organization"
                placeholder="Riverside Care Hospital"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "hospital-name-error" : undefined}
                {...register("name")}
              />
            </FormField>

            <FormField
              id="hospital-slug"
              label="Workspace URL (optional)"
              error={errors.slug?.message}
            >
              <Input
                id="hospital-slug"
                placeholder={previewSlug || "riverside-care-hospital"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={Boolean(errors.slug)}
                aria-describedby={errors.slug ? "hospital-slug-error" : undefined}
                {...register("slug")}
              />
            </FormField>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Workspace URL preview</p>
              <p className="mt-1 truncate font-mono text-sm">
                /hospitals/{displayedSlug || "your-hospital"}
              </p>
              <p
                className={
                  availabilityMessage.tone === "error"
                    ? "mt-1 flex items-start gap-1.5 text-xs text-destructive"
                    : availabilityMessage.tone === "success"
                      ? "mt-1 flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"
                      : "mt-1 flex items-start gap-1.5 text-xs text-muted-foreground"
                }
                aria-live="polite"
              >
                {availabilityMessage.tone === "checking" ? (
                  <LoaderCircle className="mt-0.5 size-3.5 shrink-0 animate-spin" />
                ) : availabilityMessage.tone === "success" ? (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                ) : availabilityMessage.tone === "error" ? (
                  <XCircle className="mt-0.5 size-3.5 shrink-0" />
                ) : null}
                {availabilityMessage.text}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Leave the workspace URL blank to generate one from the hospital name. If it
              is already taken, HospitalOS adds a short unique suffix.
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <FormField
              id="hospital-legal-name"
              label="Registered legal name (optional)"
              error={errors.legalName?.message}
            >
              <Input
                id="hospital-legal-name"
                autoComplete="organization"
                aria-invalid={Boolean(errors.legalName)}
                aria-describedby={errors.legalName ? "hospital-legal-name-error" : undefined}
                {...register("legalName")}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="hospital-email"
                label="Hospital contact email (optional)"
                error={errors.email?.message}
              >
                <Input
                  id="hospital-email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@hospital.com"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "hospital-email-error" : undefined}
                  {...register("email")}
                />
              </FormField>

              <FormField
                id="hospital-phone"
                label="Hospital contact phone (optional)"
                error={errors.phone?.message}
              >
                <Input
                  id="hospital-phone"
                  type="tel"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "hospital-phone-error" : undefined}
                  {...register("phone")}
                />
              </FormField>
            </div>

            <p className="text-xs text-muted-foreground">
              These contact details help the HospitalOS review team reach the right person.
              They are separate from your administrator account email.
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="hospital-country"
                label="Country"
                required
                error={errors.country?.message}
              >
                <Select
                  value={country}
                  items={COUNTRY_OPTIONS.map((option) => ({
                    value: option.code,
                    label: option.name,
                  }))}
                  onValueChange={(value) => {
                    if (!value) return;
                    setValue("country", value, { shouldValidate: true });
                    const suggestion = countryOption(value)?.defaultTimezone;
                    if (suggestion) setValue("timezone", suggestion, { shouldValidate: true });
                    setValue("locale", localeForCountry(value, locale), { shouldValidate: true });
                  }}
                >
                  <SelectTrigger
                    id="hospital-country"
                    className="w-full"
                    aria-invalid={Boolean(errors.country)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                id="hospital-locale"
                label="Locale"
                required
                error={errors.locale?.message}
              >
                <Select
                  value={locale}
                  items={LOCALE_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  onValueChange={(value) => {
                    if (!value) return;
                    setValue("locale", value, { shouldValidate: true });
                    setValue("language", languageForLocale(value), { shouldValidate: true });
                    setValue("country", countryFromLocale(value), { shouldValidate: true });
                  }}
                >
                  <SelectTrigger
                    id="hospital-locale"
                    className="w-full"
                    aria-invalid={Boolean(errors.locale)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCALE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="hospital-language"
                label="Language"
                required
                error={errors.language?.message}
              >
                <Select
                  value={language}
                  items={LANGUAGE_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  onValueChange={(value) => {
                    if (value) setValue("language", value, { shouldValidate: true });
                  }}
                >
                  <SelectTrigger
                    id="hospital-language"
                    className="w-full"
                    aria-invalid={Boolean(errors.language)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                id="hospital-timezone"
                label="Timezone"
                required
                error={errors.timezone?.message}
              >
                <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        id="hospital-timezone"
                        variant="outline"
                        className="w-full justify-between font-normal"
                        aria-expanded={timezoneOpen}
                        aria-invalid={Boolean(errors.timezone)}
                      />
                    }
                  >
                    <span className="truncate">{timezone}</span>
                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[min(26rem,calc(100vw-2rem))] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Search IANA timezones..." />
                      <CommandList>
                        <CommandEmpty>No timezone found.</CommandEmpty>
                        <CommandGroup>
                          {timezones.map((option) => (
                            <CommandItem
                              key={option}
                              value={option}
                              data-checked={option === timezone}
                              onSelect={() => {
                                setValue("timezone", option, { shouldValidate: true });
                                setTimezoneOpen(false);
                              }}
                            >
                              {option}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FormField>
            </div>

            <div className="flex gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <p>
                Choosing a country suggests its main timezone; you can still pick any IANA
                timezone. Country, locale and language are shown here for review. The current
                registration API stores the timezone with the hospital; the other regional
                preferences will be stored when profile settings support them.
              </p>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="rounded-xl border">
              <ReviewSection
                title="Hospital identity"
                icon={<Building2 className="size-4" />}
                onEdit={() => goToStep(0)}
                note={
                  slugInput === "" && previewSlug
                    ? "A unique suffix is added automatically if this preview URL is taken."
                    : undefined
                }
              >
                <ReviewRow label="Name" value={values.name ?? ""} />
                <ReviewRow
                  label="Workspace URL"
                  value={`/hospitals/${displayedSlug || "generated-at-submission"}`}
                />
              </ReviewSection>

              <ReviewSection
                title="Contact & legal"
                icon={<ClipboardCheck className="size-4" />}
                onEdit={() => goToStep(1)}
              >
                <ReviewRow label="Legal name" value={values.legalName ?? ""} empty="Not provided" />
                <ReviewRow label="Contact email" value={values.email ?? ""} empty="Not provided" />
                <ReviewRow label="Contact phone" value={values.phone ?? ""} empty="Not provided" />
              </ReviewSection>

              <ReviewSection
                title="Timezone & region"
                icon={<Globe2 className="size-4" />}
                onEdit={() => goToStep(2)}
                note="Only the timezone is persisted by the current registration API."
              >
                <ReviewRow label="Timezone" value={timezone} />
                <ReviewRow label="Country" value={countryOption(country)?.name ?? country} />
                <ReviewRow
                  label="Locale"
                  value={LOCALE_OPTIONS.find((option) => option.value === locale)?.label ?? locale}
                />
                <ReviewRow
                  label="Language"
                  value={LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ?? language}
                />
              </ReviewSection>
            </div>

            <Alert>
              <ShieldCheck className="size-4 text-primary" />
              <AlertTitle>What happens after submission</AlertTitle>
              <AlertDescription>
                Your hospital is created in <strong>PENDING</strong> status. A HospitalOS
                administrator must review and activate it before staff can use the
                workspace. You will become the hospital administrator after activation; no
                public role or permission choice is part of this form. You can follow the
                status of this registration on the next screen.
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
          {step === 0 ? (
            onBackToAccount ? (
              <Button type="button" variant="ghost" onClick={goBack} disabled={submitting}>
                <ArrowLeft className="size-4" /> Back to account
              </Button>
            ) : (
              <span />
            )
          ) : (
            <Button type="button" variant="ghost" onClick={goBack} disabled={submitting}>
              <ArrowLeft className="size-4" /> Back
            </Button>
          )}

          {step < 3 ? (
            <Button type="button" onClick={() => void continueToNext()} disabled={submitting}>
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting} className="sm:min-w-48">
              {submitting ? <LoaderCircle className="animate-spin" /> : null}
              {submitting ? "Submitting registration..." : "Submit for approval"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function WizardProgress({ current }: { current: HospitalStepIndex }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Step {current + 1} of {HOSPITAL_STEP_COUNT}
        </span>
        <span>{STEPS[current].label}</span>
      </div>
      <Progress
        value={((current + 1) / HOSPITAL_STEP_COUNT) * 100}
        aria-label="Registration progress"
      />
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Registration steps">
        {STEPS.map((item, index) => {
          const number = index + 1;
          const state = index < current ? "done" : index === current ? "current" : "next";

          return (
            <li
              key={item.label}
              aria-current={state === "current" ? "step" : undefined}
              className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs"
            >
              <span
                className={
                  state === "current"
                    ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
                    : state === "done"
                      ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
                      : "flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                }
              >
                {state === "done" ? <CheckCircle2 className="size-3.5" /> : number}
              </span>
              <span className={state === "next" ? "text-muted-foreground" : "font-medium"}>
                <span className="hidden sm:inline">{item.shortLabel}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ReviewSection({
  title,
  icon,
  onEdit,
  note,
  children,
}: {
  title: string;
  icon: ReactNode;
  onEdit: () => void;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b p-4 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{children}</dl>
      {note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}
    </section>
  );
}

function ReviewRow({
  label,
  value,
  empty = "Not provided",
}: {
  label: string;
  value: string;
  empty?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value.trim() === "" ? empty : value}</dd>
    </div>
  );
}

function localeForCountry(country: string, currentLocale: string): string {
  return (
    LOCALE_OPTIONS.find((option) => countryFromLocale(option.value) === country)?.value ??
    currentLocale
  );
}
