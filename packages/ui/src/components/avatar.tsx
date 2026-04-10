import { cn } from "@ticket-app/ui/lib/utils";
import * as React from "react";

function Avatar({
  className,
  src,
  alt,
  fallback,
  size = "md",
  status,
  ...props
}: React.ComponentProps<"div"> & {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "offline" | "busy";
}) {
  const [imageError, setImageError] = React.useState(false);

  const initials = fallback
    ? fallback
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div
      data-slot="avatar"
      data-size={size}
      data-status={status}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted",
        {
          sm: "size-6",
          md: "size-8",
          lg: "size-10",
        }[size],
        className,
      )}
      {...props}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={alt || fallback || "Avatar"}
          onError={() => setImageError(true)}
          className="aspect-square size-full object-cover"
        />
      ) : (
        <span
          data-slot="avatar-fallback"
          className="text-[10px] font-medium uppercase text-muted-foreground"
        >
          {initials}
        </span>
      )}
      {status && (
        <span
          data-slot="avatar-status"
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-background",
            {
              online: "bg-emerald-500",
              offline: "bg-muted-foreground/30",
              busy: "bg-red-500",
            }[status],
            size === "sm" ? "size-1.5" : size === "lg" ? "size-3" : "size-2",
          )}
        />
      )}
    </div>
  );
}

export { Avatar };
