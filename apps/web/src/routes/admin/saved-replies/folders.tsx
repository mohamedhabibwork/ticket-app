import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { orpc } from "@/utils/orpc";
import { ArrowLeft, Folder, Plus, Edit, Trash2, GripVertical, Check, X, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/admin/saved-replies/folders")({
  component: SavedReplyFoldersRoute,
});

function SavedReplyFoldersRoute() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const organizationId = 1;

  const { data: folders, isLoading } = useQuery({
    queryKey: ["saved-reply-folders", organizationId],
    queryFn: () => orpc.savedReplies.listFolders.query({ organizationId }),
  });

  const { data: replies } = useQuery({
    queryKey: ["saved-replies", organizationId],
    queryFn: () => orpc.savedReplies.list.query({ organizationId }),
  });

  const createMutation = useMutation(
    orpc.savedReplies.createFolder.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["saved-reply-folders", organizationId] });
        setNewFolderName("");
        setShowCreateForm(false);
      },
    })
  );

  const updateMutation = useMutation(
    orpc.savedReplies.updateFolder.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["saved-reply-folders", organizationId] });
        setEditingId(null);
        setEditingName("");
      },
    })
  );

  const deleteMutation = useMutation(
    orpc.savedReplies.deleteFolder.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["saved-reply-folders", organizationId] });
        queryClient.invalidateQueries({ queryKey: ["saved-replies", organizationId] });
      },
    })
  );

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    createMutation.mutate({
      organizationId,
      name: newFolderName.trim(),
    });
  };

  const handleStartEdit = (folder: any) => {
    setEditingId(folder.id);
    setEditingName(folder.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingName.trim() || !editingId) return;

    updateMutation.mutate({
      id: editingId,
      name: editingName.trim(),
    });
  };

  const handleDeleteFolder = (folderId: number, folderName: string) => {
    if (confirm(`Are you sure you want to delete the folder "${folderName}"? Replies in this folder will not be deleted but will become uncategorized.`)) {
      deleteMutation.mutate({ id: folderId });
    }
  };

  const getReplyCount = (folderId: number): number => {
    return replies?.filter((r: any) => r.folderId === folderId).length || 0;
  };

  const handleDragStart = (e: React.DragEvent, folderId: number) => {
    setDraggedId(folderId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) return;

    const draggedIndex = folders?.findIndex((f: any) => f.id === draggedId);
    const targetIndex = folders?.findIndex((f: any) => f.id === targetId);

    if (draggedIndex === undefined || targetIndex === undefined) return;

    const updatedFolders = [...(folders || [])];
    const [removed] = updatedFolders.splice(draggedIndex, 1);
    updatedFolders.splice(targetIndex, 0, removed);

    queryClient.setQueryData(["saved-reply-folders", organizationId], updatedFolders);
    setDraggedId(null);
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4 pl-0">
          <Link to="/admin/saved-replies">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Saved Replies
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Saved Reply Folders</h1>
        <p className="text-muted-foreground mt-1">
          Organize your saved replies into folders
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          Drag and drop to reorder folders
        </p>
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          Create Folder
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleCreateFolder} className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="new-folder">Folder Name</Label>
                <Input
                  id="new-folder"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g., Greetings"
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={!newFolderName.trim() || createMutation.isPending}>
                <Check className="mr-2 h-4 w-4" />
                Create
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewFolderName("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : folders && folders.length > 0 ? (
        <div className="space-y-2">
          {folders.map((folder: any) => (
            <Card
              key={folder.id}
              className={`cursor-move transition-opacity ${
                draggedId === folder.id ? "opacity-50" : ""
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, folder.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, folder.id)}
            >
              <CardContent className="py-3 px-4">
                {editingId === folder.id ? (
                  <form onSubmit={handleSaveEdit} className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoFocus
                        className="max-w-xs"
                      />
                    </div>
                    <Button type="submit" size="sm" disabled={!editingName.trim() || updateMutation.isPending}>
                      <Check className="mr-1 h-4 w-4" />
                      Save
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Folder className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{folder.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        <span>{getReplyCount(folder.id)} replies</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEdit(folder)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteFolder(folder.id, folder.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No folders found. Create your first folder to organize saved replies.
        </div>
      )}
    </div>
  );
}
