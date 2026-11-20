"use client";

import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DateRangePicker({ value, onChange }: { value?: DateRange; onChange: (value: DateRange | undefined) => void }) {
  const label = value?.from
    ? value.to
      ? `${format(value.from, "MMM d")} - ${format(value.to, "MMM d, yyyy")}`
      : format(value.from, "MMM d, yyyy")
    : "Select date range";

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="w-full justify-start text-left font-normal sm:w-64" />}>
        <CalendarIcon className="mr-2 size-4" aria-hidden="true" />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={value} onSelect={onChange} numberOfMonths={2} />
      </PopoverContent>
    </Popover>
  );
}
