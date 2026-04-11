import { useQuery } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";

import { orpc } from "@/utils/orpc";

interface SavedReplyFolder {
  id: number;
  name: string;
}

interface SavedReply {
  id: number;
  uuid: string;
  name: string;
  subject: string | null;
  bodyHtml: string;
  bodyText: string | null;
  shortcuts: string | null;
  scope: string;
  folderId: number | null;
}

interface SavedReplyPickerProps {
  organizationId: number;
  userId?: number;
  onSelect: (reply: SavedReply) => void;
  onClose?: () => void;
}

export function SavedReplyPicker({
  organizationId,
  userId,
  onSelect,
  onClose,
}: SavedReplyPickerProps) {
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);

  const { data: replies, isLoading } = useQuery(
    (orpc as any).savedReplies.list.queryOptions({
      organizationId,
      userId: userId ?? undefined,
    }) as any,
  );

  const { data: folders } = useQuery(
    (orpc as any).savedReplies.listFolders.queryOptions({
      organizationId,
    }) as any,
  );

  const typedReplies = (replies ?? []) as SavedReply[];
  const typedFolders = (folders ?? []) as SavedReplyFolder[];

  const filteredReplies = typedReplies.filter((reply: SavedReply) => {
    const matchesSearch =
      !search ||
      reply.name.toLowerCase().includes(search.toLowerCase()) ||
      reply.shortcuts?.toLowerCase().includes(search.toLowerCase()) ||
      reply.bodyText?.toLowerCase().includes(search.toLowerCase());

    const matchesFolder = !selectedFolder || reply.folderId === selectedFolder;

    return matchesSearch && matchesFolder;
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Saved Replies</CardTitle>
        <CardDescription>Select a saved reply to insert</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search replies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {typedFolders.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedFolder === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFolder(null)}
            >
              All
            </Button>
            {typedFolders.map((folder: SavedReplyFolder) => (
              <Button
                key={folder.id}
                variant={selectedFolder === folder.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFolder(folder.id)}
              >
                {folder.name}
              </Button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredReplies.length > 0 ? (
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {filteredReplies.map((reply: SavedReply) => (
              <button
                key={reply.id}
                type="button"
                onClick={() => {
                  onSelect(reply);
                  onClose?.();
                }}
                className="w-full text-left p-3 rounded-md border hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{reply.name}</p>
                    {reply.shortcuts && (
                      <p className="text-xs text-muted-foreground">/{reply.shortcuts}</p>
                    )}
                    {reply.subject && (
                      <p className="text-sm text-muted-foreground truncate mt-1">{reply.subject}</p>
                    )}
                    {reply.bodyText && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {reply.bodyText.slice(0, 100)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground">No saved replies found</p>
        )}
      </CardContent>
    </Card>
  );
}
