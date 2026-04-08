import { useMutation } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ticket-app/ui/components/card";
import { Loader2, StickyNote } from "lucide-react";
import { useState } from "react";

import { orpc } from "@/utils/orpc";

interface TicketNoteProps {
  ticketId: number;
  onSuccess?: () => void;
}

export function TicketNote({ ticketId, onSuccess }: TicketNoteProps) {
  const [body, setBody] = useState("");

  const createMutation = useMutation(
    orpc.ticketMessages.create.mutationOptions({
      onSuccess: () => {
        setBody("");
        onSuccess?.();
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    createMutation.mutate({
      ticketId,
      authorType: "agent",
      messageType: "note",
      bodyHtml: `<p>${body.replace(/\n/g, "<br>")}</p>`,
      bodyText: body,
      isPrivate: true,
    });
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-amber-600 dark:text-amber-400">
          <StickyNote className="h-5 w-5" />
          Internal Note
        </CardTitle>
        <CardDescription>
          Add a private note visible only to agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Type your internal note..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={createMutation.isPending}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="secondary"
              disabled={createMutation.isPending || !body.trim()}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <StickyNote className="h-4 w-4 mr-2" />
              )}
              Add Note
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}