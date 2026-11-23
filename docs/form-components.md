# Form components

Use these shared primitives for new forms. They keep labels, help text, validation and footers consistent across auth and management screens.

## `FormField`

`@/components/shared/form-field`

```tsx
<FormField
  id="branch-name"
  label="Branch name"
  required
  description="Shown throughout the hospital workspace."
  error={form.formState.errors.name?.message}
>
  <Input {...form.register("name")} />
</FormField>
```

- Always pass a stable `id`; the control receives it if it does not already have one.
- `error` renders a `role="alert"` message and sets `aria-invalid`.
- `description` and `error` ids are added to the control's `aria-describedby`.
- Required fields get a visible marker plus screen-reader text.
- Do not create local `Field` wrappers.

## Searchable selection

`@/components/shared/combobox`

```tsx
<FormField id="doctor" label="Doctor" required>
  <Combobox
    id="doctor"
    options={doctors.map((doctor) => ({
      value: doctor.id,
      label: doctor.user.fullName,
      description: doctor.specialization ?? undefined,
    }))}
    value={doctorId}
    onValueChange={(value) => setDoctorId(String(value))}
    placeholder="Select doctor"
    searchPlaceholder="Search doctors..."
    emptyMessage="No doctors found."
    loading={doctors.isLoading}
    error={doctors.isError ? "Could not load doctors." : undefined}
    onRetry={() => void doctors.refetch()}
  />
</FormField>
```

Set `multiple` for multi-select fields. The value is then `string[]`, and the popover stays open while options are toggled. Use `Combobox` for searchable staff, branch, department and doctor lists; use `Select` for short fixed lists such as gender or status.

Keyboard support is provided by Command: type to filter, arrow keys to move, Enter to select, Escape to close.

## Submission and feedback

`@/components/shared/form-actions`

```tsx
<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
  {/* fields */}
  <FormActions
    isPending={mutation.isPending}
    disabled={!form.formState.isDirty}
    onCancel={() => onOpenChange(false)}
    submitLabel="Save changes"
    pendingLabel="Saving..."
    error={submitError}
  />
</form>
```

Inside a `<form>`, leave `onSubmit` unset so the submit button triggers native form submission once. For a footer outside a form, pass `onSubmit`.

Use `FormError` for form-level API errors and `useUnsavedChanges(isDirty)` for long-lived page forms where leaving would discard edits.

## React Hook Form and Zod

Keep schemas and resolver usage at module scope, matching the existing forms:

```tsx
const schema = z.object({
  name: z.string().trim().min(2, "Name is required"),
});
type Values = z.infer<typeof schema>;

const form = useForm<Values>({
  resolver: zodResolver(schema),
  defaultValues: { name: "" },
});
```

For controlled primitives such as `Select` and `Combobox`, use `form.watch` and `form.setValue(..., { shouldDirty: true, shouldValidate: true })`. Do not bypass the existing API payload mapping: the form may use display values, but submit the same typed request the service expects.

## Select

Use the existing Base UI select for fixed option sets:

```tsx
<Select
  value={form.watch("gender")}
  onValueChange={(value) =>
    form.setValue("gender", value as Values["gender"], {
      shouldDirty: true,
      shouldValidate: true,
    })
  }
>
  <SelectTrigger id="patient-gender" className="w-full">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="UNKNOWN">Unknown</SelectItem>
    <SelectItem value="MALE">Male</SelectItem>
  </SelectContent>
</Select>
```

## Checks

Component tests live in `src/components/shared/form-primitives.test.tsx` and cover accessible field wiring, required/error states, searchable keyboard selection, empty/loading/error states and pending footers. Run:

```bash
npx vitest run src/components/shared/form-primitives.test.tsx
```
