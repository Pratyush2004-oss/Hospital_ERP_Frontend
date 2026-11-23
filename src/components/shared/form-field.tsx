"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
};

export function FormField({
  id,
  label,
  description,
  error,
  required,
  children,
  className,
  labelClassName,
}: {
  id?: string;
  label: string;
  description?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  const content = isValidElement(children)
    ? cloneElement(children as ReactElement<FieldControlProps>, {
        id: (children.props as FieldControlProps).id ?? fieldId,
        "aria-describedby":
          [
            (children.props as FieldControlProps)["aria-describedby"],
            describedBy,
          ]
            .filter(Boolean)
            .join(" ") || undefined,
        "aria-invalid": error
          ? true
          : (children.props as FieldControlProps)["aria-invalid"],
        "aria-required": required
          ? true
          : (children.props as FieldControlProps)["aria-required"],
      })
    : children;

  return (
    <div data-slot="form-field" className={cn("grid gap-2", className)}>
      <Label htmlFor={fieldId} className={labelClassName}>
        <span>{label}</span>
        {required ? (
          <>
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> required</span>
          </>
        ) : null}
      </Label>
      {content}
      {description ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
