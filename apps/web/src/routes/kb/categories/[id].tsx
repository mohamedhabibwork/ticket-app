import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import {
  Loader2,
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  FileText,
  GripVertical,
  FolderOpen,
} from "lucide-react";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/kb/categories/id")({
  component: KbCategoryDetailRoute,
});

function KbCategoryDetailRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const organizationId = 1;
  const categoryId = Number(id);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    description: "",
    slug: "",
  });

  const { data: category, isLoading } = useQuery(
    orpc.kbCategories.get.queryOptions(
      { organizationId, id: categoryId },
      { enabled: !isNaN(categoryId) },
    ),
  );

  const { data: articles } = useQuery(
    orpc.kbArticles.list.queryOptions({
      organizationId,
      categoryId,
    }),
  );

  const { data: allArticles } = useQuery(
    orpc.kbArticles.list.queryOptions({
      organizationId,
    }),
  );

  const { data: _categories } = useQuery(
    orpc.kbCategories.list.queryOptions({
      organizationId,
    }),
  );

  const updateMutation = useMutation(
    orpc.kbCategories.update.mutationOptions({
      onSuccess: () => {
        toast.success("Category updated successfully");
        setIsEditing(false);
        queryClient.invalidateQueries(
          orpc.kbCategories.get.queryOptions({ organizationId, id: categoryId }),
        );
      },
      onError: (error) => {
        toast.error(`Failed to update category: ${error.message}`);
      },
    }),
  );

  const updateArticleMutation = useMutation(
    orpc.kbArticles.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          orpc.kbArticles.list.queryOptions({ organizationId, categoryId }),
        );
        queryClient.invalidateQueries(
          orpc.kbCategories.get.queryOptions({ organizationId, id: categoryId }),
        );
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.kbCategories.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Category deleted successfully");
        navigate({ to: "/kb/categories" });
      },
      onError: (error) => {
        toast.error(`Failed to delete category: ${error.message}`);
      },
    }),
  );

  const handleSave = () => {
    updateMutation.mutate({
      organizationId,
      id: categoryId,
      ...editData,
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteMutation.mutate({
        organizationId,
        id: categoryId,
        deletedBy: 1,
      });
    }
  };

  const handleRemoveArticle = (articleId: number) => {
    updateArticleMutation.mutate({
      organizationId,
      id: articleId,
      categoryId: null,
    });
  };

  const handleAddArticle = (articleId: number) => {
    updateArticleMutation.mutate({
      organizationId,
      id: articleId,
      categoryId,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Category not found</p>
            <Button variant="ghost" className="mt-4" asChild>
              <Link to="/kb/categories">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Categories
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableArticles = allArticles?.filter((a) => !articles?.some((ca) => ca.id === a.id));

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/kb/categories">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="h-6 w-6" />
              {category.name}
            </h1>
            {category.description && (
              <p className="text-muted-foreground">{category.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? "Cancel" : "Edit"}
          </Button>
          <Button variant="outline" onClick={handleDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {isEditing && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Edit Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Category name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Category description"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={editData.slug}
                onChange={(e) => setEditData({ ...editData, slug: e.target.value })}
                placeholder="category-slug"
              />
            </div>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Articles ({articles?.length || 0})
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Article
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {availableArticles && availableArticles.length > 0 ? (
                  availableArticles.map((article) => (
                    <DropdownMenuItem key={article.id} onClick={() => handleAddArticle(article.id)}>
                      {article.title}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No available articles</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {articles && articles.length > 0 ? (
            <div className="space-y-2">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between p-3 rounded border"
                >
                  <Link
                    to="/kb/$slug"
                    params={{ slug: article.slug }}
                    className="flex items-center gap-3 flex-1"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{article.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {article.status} • {new Date(article.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleRemoveArticle(article.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No articles in this category</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
