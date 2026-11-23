"use client";

import { Check, ChevronsUpDown, LoaderCircle } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  keywords?: string[];
};

export function Combobox({
  id,
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  loading = false,
  loadingMessage = "Loading options...",
  error,
  onRetry,
  disabled = false,
  multiple = false,
  className,
  triggerClassName,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
}: {
  id?: string;
  options: readonly ComboboxOption[];
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
  error?: string;
  onRetry?: () => void;
  disabled?: boolean;
  multiple?: boolean;
  className?: string;
  triggerClassName?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
}) {
  const generatedId = useId();
  const listId = `${id ?? generatedId}-listbox`;
  const [open, setOpen] = useState(false);
  const selectedValues = multiple
    ? Array.isArray(value)
      ? value
      : []
    : typeof value === "string" && value
      ? [value]
      : [];
  const selectedOptions = options.filter((option) =>
    selectedValues.includes(option.value),
  );

  const triggerLabel =
    selectedOptions.length === 0
      ? placeholder
      : multiple
        ? selectedOptions.length <= 2
          ? selectedOptions.map((option) => option.label).join(", ")
          : `${selectedOptions.length} selected`
        : selectedOptions[0]!.label;

  function select(option: ComboboxOption) {
    if (option.disabled) return;
    if (multiple) {
      onValueChange(
        selectedValues.includes(option.value)
          ? selectedValues.filter((entry) => entry !== option.value)
          : [...selectedValues, option.value],
      );
      return;
    }
    onValueChange(option.value);
    setOpen(false);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-haspopup="listbox"
              aria-describedby={ariaDescribedBy}
              aria-invalid={ariaInvalid}
              aria-required={ariaRequired}
              disabled={disabled}
              className={cn(
                "h-9 w-full justify-between px-3 font-normal",
                selectedOptions.length === 0 && "text-muted-foreground",
                triggerClassName,
              )}
            >
              <span className="truncate text-left">{triggerLabel}</span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
            </Button>
          }
        />
        <PopoverContent
          align="start"
          className="w-(--anchor-width) min-w-56 p-0"
        >
          <Command shouldFilter>
            <CommandInput
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              autoFocus
            />
            <CommandList id={listId}>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  {loadingMessage}
                </div>
              ) : error ? (
                <div className="space-y-2 px-3 py-4 text-center text-sm">
                  <p className="text-destructive" role="alert">
                    {error}
                  </p>
                  {onRetry ? (
                    <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                      Try again
                    </Button>
                  ) : null}
                </div>
              ) : (
                <>
                  <CommandEmpty>{emptyMessage}</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => {
                      const selected = selectedValues.includes(option.value);
                      return (
                        <CommandItem
                          key={option.value}
                          value={[option.label, option.description, ...(option.keywords ?? [])]
                            .filter(Boolean)
                            .join(" ")}
                          disabled={option.disabled}
                          data-checked={selected}
                          onSelect={() => select(option)}
                          aria-selected={selected}
                        >
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate">{option.label}</span>
                            {option.description ? (
                              <span className="truncate text-xs text-muted-foreground">
                                {option.description}
                              </span>
                            ) : null}
                          </span>
                          {selected ? (
                            <Check className="size-4 shrink-0" aria-hidden="true" />
                          ) : null}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {multiple && selectedOptions.length > 0 ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Selected: {selectedOptions.map((option) => option.label).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
