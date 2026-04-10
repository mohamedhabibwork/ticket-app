import { Avatar } from "@ticket-app/ui/components/avatar";
import type { ViewerPresence } from "@ticket-app/socket-client";

interface PresenceAvatarsProps {
  viewers: ViewerPresence[];
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
}

export function PresenceAvatars({ viewers, maxVisible = 5, size = "md" }: PresenceAvatarsProps) {
  if (viewers.length === 0) return null;

  const visibleViewers = viewers.slice(0, maxVisible);
  const overflowCount = viewers.length - maxVisible;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-3">
        {visibleViewers.map((viewer) => (
          <div
            key={`${viewer.ticketId}-${viewer.userId}`}
            className="relative"
            title={viewer.userName}
          >
            <Avatar src={viewer.avatarUrl} fallback={viewer.userName} size={size} />
            <span
              className={`
                absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-background
                size-2.5 animate-pulse
                bg-emerald-500
              `}
            />
          </div>
        ))}
        {overflowCount > 0 && (
          <div
            className={`
              flex items-center justify-center rounded-full bg-muted text-muted-foreground
              ring-2 ring-background font-medium
              ${size === "sm" ? "size-6 text-[10px]" : size === "lg" ? "size-10 text-sm" : "size-8 text-xs"}
            `}
          >
            +{overflowCount}
          </div>
        )}
      </div>
      <span className="text-sm text-muted-foreground">
        {viewers.length === 1 ? "1 person viewing" : `${viewers.length} people viewing`}
      </span>
    </div>
  );
}
