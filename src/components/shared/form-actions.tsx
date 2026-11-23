"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FormError({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn(
        "rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function FormActions({
  submitLabel = "Save",
  pendingLabel = "Saving...",
  cancelLabel = "Cancel",
  submitVariant = "default",
  isPending = false,
  disabled = false,
  onCancel,
  onSubmit,
  error,
  children,
  className,
}: {
  submitLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  submitVariant?: ComponentProps<typeof Button>["variant"];
  isPending?: boolean;
  disabled?: boolean;
  onCancel?: () => void;
  /** For footers outside a form element; omit inside a form so Enter submits once. */
  onSubmit?: () => void;
  error?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <FormError>{error}</FormError>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {children}
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
        ) : null}
        <Button
          type="submit"
          variant={submitVariant}
          onClick={onSubmit}
          disabled={isPending || disabled}
        >
          {isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}

/** Alias kept for forms that call the footer by its visual role. */
export const FormFooter = FormActions;

/**
 * Guards in-page forms against losing unsaved edits on reload or tab close.
 * Dialog cancellation should ask for confirmation in the caller when needed.
 */
export function useUnsavedChanges(isDirty: boolean, enabled = true) {
  useEffect(() => {
    if (!enabled || !isDirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [enabled, isDirty]);
}
