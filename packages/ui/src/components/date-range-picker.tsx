"use client";

import { cn } from "@ticket-app/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from "lucide-react";
import * as React from "react";

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface Preset {
  label: string;
  getValue: () => DateRange;
}

interface DateRangePickerProps extends Omit<React.ComponentProps<"div">, "value" | "onChange"> {
  value?: DateRange;
  onChange?: (value: DateRange) => void;
  presets?: Preset[];
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

const defaultPresets: Preset[] = [
  {
    label: "Today",
    getValue: () => ({
      start: new Date(new Date().setHours(0, 0, 0, 0)),
      end: new Date(new Date().setHours(23, 59, 59, 999)),
    }),
  },
  {
    label: "Yesterday",
    getValue: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: new Date(yesterday.setHours(0, 0, 0, 0)),
        end: new Date(yesterday.setHours(23, 59, 59, 999)),
      };
    },
  },
  {
    label: "Last 7 days",
    getValue: () => {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return {
        start: new Date(start.setHours(0, 0, 0, 0)),
        end: new Date(new Date().setHours(23, 59, 59, 999)),
      };
    },
  },
  {
    label: "Last 30 days",
    getValue: () => {
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return {
        start: new Date(start.setHours(0, 0, 0, 0)),
        end: new Date(new Date().setHours(23, 59, 59, 999)),
      };
    },
  },
  {
    label: "This month",
    getValue: () => {
      const start = new Date();
      start.setDate(1);
      return {
        start: new Date(start.setHours(0, 0, 0, 0)),
        end: new Date(new Date().setHours(23, 59, 59, 999)),
      };
    },
  },
  {
    label: "Last month",
    getValue: () => {
      const end = new Date();
      end.setDate(0);
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return {
        start: new Date(start.setHours(0, 0, 0, 0)),
        end: new Date(end.setHours(23, 59, 59, 999)),
      };
    },
  },
];

function DateRangePicker({
  className,
  value,
  onChange,
  presets = defaultPresets,
  placeholder = "Select date range",
  disabled = false,
  clearable = true,
  onClear,
  ...props
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [selectingStart, setSelectingStart] = React.useState(true);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedRange = value || { start: null, end: null };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDateClick = (date: Date) => {
    if (selectingStart) {
      onChange?.({ start: date, end: null });
      setSelectingStart(false);
    } else {
      if (selectedRange.start && date < selectedRange.start) {
        onChange?.({ start: date, end: selectedRange.start });
      } else {
        onChange?.({ start: selectedRange.start, end: date });
      }
      setSelectingStart(true);
      setIsOpen(false);
    }
  };

  const handlePresetClick = (preset: Preset) => {
    onChange?.(preset.getValue());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.({ start: null, end: null });
    onClear?.();
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

  const isInRange = (date: Date) => {
    if (!selectedRange.start || !selectedRange.end) return false;
    return date >= selectedRange.start && date <= selectedRange.end;
  };

  const isSameDay = (d1: Date, d2: Date | null) => {
    if (!d2) return false;
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  const days = getDaysInMonth(currentMonth);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectingStart(true);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} data-slot="date-range-picker" className={cn("relative", className)} {...props}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex h-8 w-full min-w-0 items-center justify-between rounded-none border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "ring-1 ring-ring/50"
        )}
      >
        <span className={cn("flex items-center gap-2", !value?.start && "text-muted-foreground")}>
          <CalendarIcon className="size-4" />
          {value?.start ? (
            <>
              {formatDate(value.start)} - {formatDate(value.end)}
            </>
          ) : (
            placeholder
          )}
        </span>
        {clearable && value?.start && (
          <span
            onClick={handleClear}
            className="ml-2 rounded-sm hover:bg-muted p-0.5"
            role="button"
          >
            <svg className="size-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l6 6M9 3l-6 6" />
            </svg>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 flex rounded-none border bg-popover shadow-lg ring-1 ring-foreground/10">
          <div className="border-r p-3">
            <div className="flex items-center justify-between gap-8 pb-3">
              <button
                type="button"
                onClick={() => {
                  const prev = new Date(currentMonth);
                  prev.setMonth(prev.getMonth() - 1);
                  setCurrentMonth(prev);
                }}
                className="rounded-sm p-1 hover:bg-muted"
              >
                <ChevronLeftIcon className="size-4" />
              </button>
              <span className="text-xs font-medium">
                {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = new Date(currentMonth);
                  next.setMonth(next.getMonth() + 1);
                  setCurrentMonth(next);
                }}
                className="rounded-sm p-1 hover:bg-muted"
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
                    className={cn(
                      "size-7 rounded-sm p-1 text-xs transition-colors hover:bg-muted",
                      isToday(date) && "bg-muted font-medium",
                      isSameDay(date, selectedRange.start) && "bg-primary text-primary-foreground",
                      isSameDay(date, selectedRange.end) && "bg-primary text-primary-foreground",
                      isInRange(date) && !isSameDay(date, selectedRange.start) && !isSameDay(date, selectedRange.end) && "bg-primary/10"
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

          <div className="w-36 p-2">
            <div className="pb-2 text-xs font-medium text-muted-foreground">Presets</div>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className="block w-full rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { DateRangePicker };
