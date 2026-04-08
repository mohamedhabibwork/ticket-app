import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

export interface SlaBreachStatus {
  hasBreached: boolean;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  isPaused: boolean;
}

interface SlaBadgeProps {
  status: SlaBreachStatus | null;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
}

export function SlaBadge({ status, size = "md", showLabels = true }: SlaBadgeProps) {
  if (!status) {
    return null;
  }

  if (status.isPaused) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 ${
          size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"
        }`}
      >
        <Clock className={size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4"} />
        {showLabels && <span>Paused</span>}
      </div>
    );
  }

  if (status.firstResponseBreached || status.resolutionBreached) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 ${
          size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"
        }`}
      >
        <AlertTriangle className={size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4"} />
        {showLabels && (
          <span>
            {status.firstResponseBreached && "First Response Breached"}
            {status.firstResponseBreached && status.resolutionBreached && " / "}
            {status.resolutionBreached && "Resolution Breached"}
          </span>
        )}
      </div>
    );
  }

  const now = new Date();
  const firstResponseDue = status.firstResponseDueAt
    ? new Date(status.firstResponseDueAt)
    : null;
  const resolutionDue = status.resolutionDueAt
    ? new Date(status.resolutionDueAt)
    : null;

  const getTimeRemaining = () => {
    if (!firstResponseDue && !resolutionDue) return null;

    const target = firstResponseDue && firstResponseDue > now ? firstResponseDue : resolutionDue;
    if (!target) return null;

    const diff = target.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const timeRemaining = getTimeRemaining();
  const isUrgent = firstResponseDue && firstResponseDue.getTime() - now.getTime() < 60 * 60 * 1000;

  if (isUrgent && timeRemaining) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-700 ${
          size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"
        }`}
      >
        <AlertTriangle className={size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4"} />
        {showLabels && <span>{timeRemaining}</span>}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 ${
        size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"
      }`}
    >
      <CheckCircle className={size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4"} />
      {showLabels && timeRemaining && <span>{timeRemaining}</span>}
    </div>
  );
}

interface SlaStatusIndicatorProps {
  ticketId: number;
  className?: string;
}

export function SlaStatusIndicator({ ticketId, className = "" }: SlaStatusIndicatorProps) {
  return (
    <div className={className} data-ticket-id={ticketId} data-sla-badge>
      <SlaBadge status={null} />
    </div>
  );
}
