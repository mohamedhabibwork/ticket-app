"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cn } from "@ticket-app/ui/lib/utils";
import { ChevronDownIcon, SearchIcon, XIcon, LoaderIcon } from "lucide-react";
import type { ComponentProps } from "react";

function Select({ ...props }: ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectTrigger({
  className,
  children,
  clearable = false,
  onClear,
  loading = false,
  searchable = false,
  ...props
}: SelectPrimitive.Trigger.Props & {
  clearable?: boolean;
  onClear?: () => void;
  loading?: boolean;
  searchable?: boolean;
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-searchable={searchable}
      className={cn(
        "flex h-8 w-full min-w-0 items-center justify-between rounded-none border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:shrink-0 [&>svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <span className="flex items-center gap-1">
        {loading && (
          <LoaderIcon className="size-3.5 animate-spin text-muted-foreground" />
        )}
        {clearable && !loading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear?.();
            }}
            className="rounded-sm hover:bg-muted p-0.5"
            aria-label="Clear selection"
          >
            <XIcon className="size-3" />
          </button>
        )}
        <SelectPrimitive.Icon>
          <ChevronDownIcon />
        </SelectPrimitive.Icon>
      </span>
    </SelectPrimitive.Trigger>
  );
}

function SelectValue({ ...props }: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectContent({
  className,
  children,
  searchable = false,
  onSearch,
  searchValue,
  ...props
}: SelectPrimitive.Popup.Props & {
  searchable?: boolean;
  onSearch?: (value: string) => void;
  searchValue?: string;
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Popup
        data-slot="select-content"
        data-searchable={searchable}
        className={cn(
          "z-50 max-h-96 w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-none bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      >
        {searchable && (
          <div className="sticky top-0 z-10 border-b bg-popover p-2">
            <div className="flex items-center gap-2 rounded-none border border-input bg-background px-2 py-1">
              <SearchIcon className="size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearch?.(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        )}
        {children}
      </SelectPrimitive.Popup>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-none py-2 pr-8 pl-2 text-xs outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&>svg]:pointer-events-none [&>svg]:shrink-0 [&>svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <svg
            className="size-3.5"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="2,6 5,9 10,3" />
          </svg>
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("p-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup };
