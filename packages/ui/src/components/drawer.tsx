"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@ticket-app/ui/lib/utils";
import { XIcon } from "lucide-react";
import * as React from "react";

function Drawer({
  open,
  onOpenChange,
  children,
  ...props
}: DialogPrimitive.Root.Props & {
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} {...props}>
      {children}
    </DialogPrimitive.Root>
  );
}

function DrawerOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function DrawerContent({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <DialogPrimitive.Portal>
      <DrawerOverlay />
      <div className="fixed inset-y-0 right-0 z-50">
        <div
          role="dialog"
          data-slot="drawer-content"
          className={cn(
            "flex h-full flex-col bg-background shadow-lg ring-1 ring-foreground/10 duration-200 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    </DialogPrimitive.Portal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex items-center justify-between border-b px-4 py-3", className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function DrawerClose({ className, ...props }: DialogPrimitive.Close.Props) {
  return (
    <DialogPrimitive.Close
      data-slot="drawer-close"
      className={cn(
        "rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring/50",
        className,
      )}
      {...props}
    >
      <XIcon className="size-4" />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  );
}

function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      className={cn("flex-1 overflow-y-auto px-4 py-4", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("flex items-center gap-2 border-t px-4 py-3", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
  DrawerBody,
  DrawerFooter,
};
