"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@ticket-app/ui/lib/utils";
import { XIcon } from "lucide-react";
import * as React from "react";

function Modal({
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

function ModalOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="modal-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function ModalContent({
  className,
  size = "md",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  size?: "sm" | "md" | "lg" | "xl" | "full";
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (contentRef.current) {
      contentRef.current.focus();
    }
  }, []);

  return (
    <DialogPrimitive.Portal>
      <ModalOverlay />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          ref={contentRef}
          role="dialog"
          data-slot="modal-content"
          data-size={size}
          tabIndex={-1}
          className={cn(
            "relative z-50 grid w-full gap-4 rounded-none bg-background p-6 text-foreground shadow-lg ring-1 ring-foreground/10 duration-200 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            {
              sm: "max-w-sm",
              md: "max-w-lg",
              lg: "max-w-2xl",
              xl: "max-w-4xl",
              full: "max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]",
            }[size],
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

function ModalHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="modal-header" className={cn("flex flex-col gap-1.5", className)} {...props} />
  );
}

function ModalTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="modal-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  );
}

function ModalDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="modal-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function ModalBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="modal-body" className={cn("text-xs", className)} {...props} />;
}

function ModalFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-footer"
      className={cn("flex items-center justify-end gap-2 border-t pt-4", className)}
      {...props}
    />
  );
}

function ModalClose({ className, ...props }: DialogPrimitive.Close.Props) {
  return (
    <DialogPrimitive.Close
      data-slot="modal-close"
      className={cn(
        "absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring/50 disabled:pointer-events-none",
        className,
      )}
      {...props}
    >
      <XIcon className="size-4" />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  );
}

export {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ModalClose,
};
