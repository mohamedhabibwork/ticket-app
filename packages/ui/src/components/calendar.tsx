"use client";

import { cn } from "@ticket-app/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";

interface CalendarProps extends Omit<React.ComponentProps<"div">, "value" | "onChange"> {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  mode?: "single" | "range";
  rangeValue?: { start: Date | null; end: Date | null };
  onRangeChange?: (range: { start: Date | null; end: Date | null }) => void;
  disabled?: boolean;
}

function Calendar({
  className,
  value,
  onChange,
  minDate,
  maxDate,
  disabledDates = [],
  mode = "single",
  rangeValue,
  onRangeChange,
  disabled = false,
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    if (mode === "range" && rangeValue?.start) {
      return new Date(rangeValue.start.getFullYear(), rangeValue.start.getMonth(), 1);
    }
    return value ? new Date(value.getFullYear(), value.getMonth(), 1) : new Date();
  });
  const [selectingStart, setSelectingStart] = React.useState(true);

  const selectedDate = mode === "range" ? null : value;
  const selectedRange = mode === "range" ? rangeValue : null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return disabledDates.some(
      (d) =>
        d.getDate() === date.getDate() &&
        d.getMonth() === date.getMonth() &&
        d.getFullYear() === date.getFullYear()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (mode === "single") {
      return (
        selectedDate &&
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear()
      );
    }

    if (mode === "range" && selectedRange) {
      const start = selectedRange.start;
      const end = selectedRange.end;
      if (!start) return false;
      if (end) {
        return date >= start && date <= end;
      }
      return date.getTime() === start.getTime();
    }

    return false;
  };

  const isInRange = (date: Date) => {
    if (mode !== "range" || !selectedRange?.start || !selectedRange?.end) return false;
    return date > selectedRange.start && date < selectedRange.end;
  };

  const handleDateClick = (date: Date) => {
    if (disabled || isDisabled(date)) return;

    if (mode === "single") {
      onChange?.(date);
    } else {
      if (selectingStart) {
        onRangeChange?.({ start: date, end: null });
        setSelectingStart(false);
      } else {
        if (selectedRange?.start && date < selectedRange.start) {
          onRangeChange?.({ start: date, end: selectedRange.start });
        } else {
          onRangeChange?.({ start: selectedRange?.start ?? null, end: date });
        }
        setSelectingStart(true);
      }
    }
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div
      data-slot="calendar"
      className={cn("w-fit rounded-none border bg-popover p-3 shadow-md ring-1 ring-foreground/10", className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-8 pb-3">
        <button
          type="button"
          onClick={() => {
            const prev = new Date(currentMonth);
            prev.setMonth(prev.getMonth() - 1);
            setCurrentMonth(prev);
          }}
          disabled={disabled}
          className="rounded-sm p-1 hover:bg-muted disabled:opacity-50"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="text-xs font-medium">{formatDate(currentMonth)}</span>
        <button
          type="button"
          onClick={() => {
            const next = new Date(currentMonth);
            next.setMonth(next.getMonth() + 1);
            setCurrentMonth(next);
          }}
          disabled={disabled}
          className="rounded-sm p-1 hover:bg-muted disabled:opacity-50"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="size-7 p-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) =>
          date ? (
            <button
              key={idx}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={disabled || isDisabled(date)}
              className={cn(
                "size-7 rounded-sm p-1 text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
                isToday(date) && "bg-muted font-medium",
                isSelected(date) && "bg-primary text-primary-foreground hover:bg-primary",
                isInRange(date) && "bg-primary/10"
              )}
            >
              {date.getDate()}
            </button>
          ) : (
            <span key={idx} className="size-7" />
          )
        )}
      </div>
    </div>
  );
}

export { Calendar };
