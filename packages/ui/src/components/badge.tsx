import { cn } from "@ticket-app/ui/lib/utils";
import * as React from "react";

function Badge({
  className,
  variant = "default",
  size = "md",
  dot = false,
  removable = false,
  onRemove,
  ...props
}: React.ComponentProps<"span"> & {
  variant?: "default" | "secondary" | "outline" | "destructive" | "success" | "warning";
  size?: "sm" | "md";
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      data-size={size}
      data-dot={dot}
      data-removable={removable}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium transition-colors",
        {
          default: "bg-primary text-primary-foreground",
          secondary: "bg-secondary text-secondary-foreground",
          outline: "border border-input bg-background text-foreground",
          destructive: "bg-destructive/10 text-destructive",
          success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        }[variant],
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        dot && "before:size-1.5 before:rounded-full before:bg-current",
        removable && "pr-1.5",
        className
      )}
      {...props}
    >
      {props.children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring/50"
          aria-label="Remove"
        >
          <svg
            className="size-3"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      )}
    </span>
  );
}

export { Badge };
