import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { Loader2, Plus, MoreHorizontal, Edit, Trash2, FolderOpen } from "lucide-react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { getCurrentOrganizationId } from "@/utils/auth";
import { useOrganization } from "@/hooks/useOrganization";

export const Route = createFileRoute("/kb/categories/")({
  loader: async ({ context }) => {
    const categories = await context.orpc.kbCategories.list.query({
      organizationId: getCurrentOrganizationId()!,
    });
    return { categories };
  },
  component: KbCategoriesRoute,
});

function KbCategoriesRoute() {
  const { categories } = Route.useLoaderData<typeof Route>();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string } | null>(null);

  const createMutation = useMutation(
    orpc.kbCategories.create.mutationOptions({
      onSuccess: () => {
        toast.success("Category created successfully");
        setNewCategoryName("");
        queryClient.invalidateQueries({ queryKey: ["kbCategories"] });
      },
      onError: (error: any) => {
        toast.error(`Failed to create category: ${error.message}`);
      },
    }),
  );

  const updateMutation = useMutation(
    orpc.kbCategories.update.mutationOptions({
      onSuccess: () => {
        toast.success("Category updated successfully");
        setEditingCategory(null);
        queryClient.invalidateQueries({ queryKey: ["kbCategories"] });
      },
      onError: (error: any) => {
        toast.error(`Failed to update category: ${error.message}`);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.kbCategories.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Category deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["kbCategories"] });
      },
      onError: (error: any) => {
        toast.error(`Failed to delete category: ${error.message}`);
      },
    }),
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    createMutation.mutate({
      organizationId,
      name: newCategoryName.trim(),
      slug: newCategoryName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
    });
  };

  const handleUpdate = () => {
    if (!editingCategory || !editingCategory.name.trim()) return;

    updateMutation.mutate({
      organizationId,
      id: editingCategory.id,
      name: editingCategory.name.trim(),
    });
  };

  const handleDelete = (categoryId: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteMutation.mutate({
        organizationId,
        id: categoryId,
        deletedBy: 1,
      });
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">KB Categories</h1>
          <p className="text-muted-foreground">Organize your knowledge base articles</p>
        </div>
        <Link to="/kb/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              placeholder="New category name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!newCategoryName.trim() || createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Category
            </Button>
          </form>
        </CardContent>
      </Card>

      {!categories || categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">No categories found</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first category above</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category: any) => (
            <Card key={category.id}>
              <CardContent className="p-4">
                {editingCategory?.id === category.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editingCategory?.name || ""}
                      onChange={(e) =>
                        setEditingCategory({ ...editingCategory!, name: e.target.value })
                      }
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingCategory(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <Link
                      to={"/kb/categories/id" as any}
                      params={{ id: String(category.id) } as any}
                      className="flex-1"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <FolderOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{category.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {category.articles?.length || 0} articles
                          </div>
                        </div>
                      </div>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 h-7 gap-1 rounded-none hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setEditingCategory({ id: category.id, name: category.name })
                          }
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(category.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
