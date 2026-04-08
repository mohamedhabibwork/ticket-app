import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";

import { orpc } from "@/utils/orpc";

interface TicketReplyProps {
  ticketId: number;
  onSuccess?: () => void;
}

export function TicketReply({ ticketId, onSuccess }: TicketReplyProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const createMutation = useMutation(
    orpc.ticketMessages.create.mutationOptions({
      onSuccess: () => {
        setSubject("");
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
      messageType: "reply",
      bodyHtml: `<p>${body.replace(/\n/g, "<br>")}</p>`,
      bodyText: body,
      isPrivate: false,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Reply to Customer</CardTitle>
        <CardDescription>Send a response to the customer</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Subject (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Type your reply..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={createMutation.isPending}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={createMutation.isPending || !body.trim()}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Reply
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}