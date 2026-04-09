import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@ticket-app/ui/components/dropdown-menu";
import { Input } from "@ticket-app/ui/components/input";
import { Badge } from "@ticket-app/ui/components/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ticket-app/ui/components/select";
import { orpc } from "@/utils/orpc";
import { MoreHorizontal, Plus, Edit, Trash2, MessageSquare, Search, Folder, Tag } from "lucide-react";

export const Route = createFileRoute("/admin/saved-replies/")({
  component: SavedRepliesListRoute,
});

function SavedRepliesListRoute() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<string>("all");

  const organizationId = 1;

  const { data: replies, isLoading } = useQuery({
    queryKey: ["saved-replies", organizationId],
    queryFn: () => orpc.savedReplies.list.query({ organizationId }),
  });

  const { data: folders } = useQuery({
    queryKey: ["saved-reply-folders", organizationId],
    queryFn: () => orpc.savedReplies.listFolders.query({ organizationId }),
  });

  const deleteMutation = useMutation(
    orpc.savedReplies.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["saved-replies", organizationId] });
      },
    })
  );

  const handleDelete = (replyId: number) => {
    if (confirm("Are you sure you want to delete this saved reply? This action cannot be undone.")) {
      deleteMutation.mutate({ id: replyId });
    }
  };

  const getFolderName = (folderId: number | null): string => {
    if (!folderId) return "No Folder";
    const folder = folders?.find((f: any) => f.id === folderId);
    return folder?.name || "Unknown Folder";
  };

  const getScopeBadgeColor = (scope: string): string => {
    switch (scope) {
      case "organization":
        return "bg-purple-100 text-purple-800";
      case "team":
        return "bg-blue-100 text-blue-800";
      case "personal":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredReplies = replies?.filter((reply: any) => {
    const matchesSearch =
      searchQuery === "" ||
      reply.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reply.bodyText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reply.bodyHtml?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFolder =
      folderFilter === "all" ||
      (folderFilter === "none" && !reply.folderId) ||
      reply.folderId === parseInt(folderFilter);

    return matchesSearch && matchesFolder;
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Saved Replies</h1>
          <p className="text-muted-foreground mt-1">
            Manage pre-written responses for faster ticket handling
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/saved-replies/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Reply
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Folder className="h-4 w-4 text-muted-foreground" />
          <Select value={folderFilter} onValueChange={setFolderFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All folders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All folders</SelectItem>
              <SelectItem value="none">No folder</SelectItem>
              {folders?.map((folder: any) => (
                <SelectItem key={folder.id} value={folder.id.toString()}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4">
        <Button variant="ghost" asChild size="sm" className="pl-0">
          <Link to="/admin/saved-replies/folders">
            <Folder className="mr-2 h-4 w-4" />
            Manage Folders
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : filteredReplies && filteredReplies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReplies.map((reply: any) => (
            <Card key={reply.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {reply.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getFolderName(reply.folderId)}
                        </Badge>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${getScopeBadgeColor(reply.scope)}`}>
                          {reply.scope}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/admin/saved-replies/${reply.id}`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(reply.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reply.subject && (
                    <div className="text-sm font-medium truncate">
                      {reply.subject}
                    </div>
                  )}
                  <div
                    className="text-xs text-muted-foreground line-clamp-3 prose prose-xs max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: reply.bodyHtml?.substring(0, 200) || reply.bodyText?.substring(0, 200) || "",
                    }}
                  />
                  {reply.shortcuts && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Tag className="h-3 w-3" />
                      <span>{reply.shortcuts}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery || folderFilter !== "all" ? (
            <>No saved replies match your search criteria.</>
          ) : (
            <>No saved replies found. Create your first reply to get started.</>
          )}
        </div>
      )}

      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-medium mb-2">Available Merge Tags</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
          <code>{"{{customer_name}}"}</code>
          <code>{"{{customer_email}}"}</code>
          <code>{"{{ticket_id}}"}</code>
          <code>{"{{ticket_reference}}"}</code>
          <code>{"{{ticket_url}}"}</code>
          <code>{"{{agent_name}}"}</code>
          <code>{"{{organization_name}}"}</code>
          <code>{"{{agent_signature}}"}</code>
        </div>
      </div>
    </div>
  );
}
