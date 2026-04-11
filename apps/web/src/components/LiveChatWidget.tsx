import { useState, useRef, useEffect } from "react";
import { Button } from "@ticket-app/ui/components/button";
import { Avatar } from "@ticket-app/ui/components/avatar";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Send, MessageCircle, X, Loader2 } from "lucide-react";
import type { ChatMessage } from "@ticket-app/socket-client";

interface LiveChatWidgetProps {
  sessionId: number;
  messages: ChatMessage[];
  isTyping: { agent: boolean; contact: boolean };
  onSendMessage: (body: string) => void;
  onSendTyping: (isTyping: boolean) => void;
  isAgent?: boolean;
}

export function LiveChatWidget({
  sessionId: _sessionId,
  messages,
  isTyping,
  onSendMessage,
  onSendTyping,
  isAgent = true,
}: LiveChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (value: string) => {
    setInputValue(value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    onSendTyping(true);

    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    if (!inputValue.trim() || isSending) return;

    setIsSending(true);
    onSendMessage(inputValue.trim());
    setInputValue("");
    onSendTyping(false);

    setTimeout(() => setIsSending(false), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <Card className="w-80 shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4" />
              <span className="font-medium">Live Chat</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="size-4" />
            </Button>
          </div>

          <CardContent className="p-0">
            <div className="h-64 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No messages yet</p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id || message.uuid}
                    className={`flex gap-2 ${
                      (message.authorType === "agent") === isAgent ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <Avatar fallback={message.authorName || message.authorType} size="sm" />
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                        (message.authorType === "agent") === isAgent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.body}
                    </div>
                  </div>
                ))
              )}

              {(isTyping.agent || isTyping.contact) && (
                <div className="flex gap-2">
                  <Avatar fallback="..." size="sm" />
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" />
                      <span
                        className="size-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="size-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t p-3">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={isSending}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSend} disabled={!inputValue.trim() || isSending}>
                  {isSending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button size="lg" className="rounded-full shadow-lg" onClick={() => setIsOpen(true)}>
          <MessageCircle className="size-5" />
        </Button>
      )}
    </div>
  );
}
