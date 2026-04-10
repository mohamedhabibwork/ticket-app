import { toast } from "sonner";
import type { NotificationPayload } from "@ticket-app/socket-client";
import { Button } from "@ticket-app/ui/components/button";
import { Eye, X } from "lucide-react";

interface NotificationToastProps {
  notification: NotificationPayload;
  onViewTicket?: (ticketId: number) => void;
  onDismiss?: (notificationId: string) => void;
}

export function showNotificationToast({
  notification,
  onViewTicket,
  onDismiss,
}: NotificationToastProps) {
  const actions = [];

  if (notification.ticketId && onViewTicket) {
    actions.push(
      <Button
        key="view"
        variant="outline"
        size="sm"
        onClick={() => onViewTicket(notification.ticketId!)}
      >
        <Eye className="size-3 mr-1" />
        View Ticket
      </Button>,
    );
  }

  if (onDismiss) {
    actions.push(
      <Button key="dismiss" variant="ghost" size="sm" onClick={() => onDismiss(notification.id)}>
        <X className="size-3 mr-1" />
        Dismiss
      </Button>,
    );
  }

  toast(notification.title, {
    description: notification.body,
    action: actions.length > 0 ? actions[0] : undefined,
    duration: 5000,
  });
}

export function useNotificationToast() {
  const showToast = (notification: NotificationPayload) => {
    showNotificationToast({ notification });
  };

  return { showToast };
}
