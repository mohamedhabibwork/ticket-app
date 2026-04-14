import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Textarea } from "@ticket-app/ui/components/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { Loader2, ChevronDown, Save, Eye } from "lucide-react";

import { orpc } from "@/utils/orpc";
import { getCurrentOrganizationId } from "@/utils/auth";
import { useOrganization } from "@/hooks/useOrganization";

export const Route = createFileRoute("/kb/new")({
  loader: async ({ context }) => {
    const categories = await context.orpc.kbCategories.list.query({
      organizationId: getCurrentOrganizationId()!,
    });
    return { categories };
  },
  component: CreateKbArticleRoute,
});

function CreateKbArticleRoute() {
  const { categories } = Route.useLoaderData<typeof Route>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("draft");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [tags, setTags] = useState("");
  const [locale, setLocale] = useState("en");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const createMutation = useMutation(
    orpc.kbArticles.create.mutationOptions({
      onSuccess: async (data: any) => {
        toast.success("Article created successfully");
        queryClient.invalidateQueries(orpc.kbArticles.list.queryOptions({ organizationId }));
        if (status === "published") {
          navigate({ to: "/kb" });
        } else {
          navigate({ to: "/kb/$slug", params: { slug: data.slug } });
        }
      },
      onError: (error: any) => {
        toast.error(`Failed to create article: ${error.message}`);
      },
    }),
  );

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value));
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleSubmit = (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!bodyText.trim()) {
      toast.error("Content is required");
      return;
    }

    createMutation.mutate({
      organizationId,
      title: title.trim(),
      slug: slug.trim() || generateSlug(title),
      bodyHtml: bodyHtml || `<p>${bodyText}</p>`,
      bodyText: bodyText.trim(),
      categoryId: categoryId || undefined,
      status: publish || status === "published" ? "published" : "draft",
      metaTitle: metaTitle.trim() || undefined,
      metaDescription: metaDescription.trim() || undefined,
      metaKeywords: tags.trim() || undefined,
    } as any);
  };

  const selectedCategory = categories?.find((c: any) => c.id === categoryId);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create KB Article</h1>
        <p className="text-muted-foreground">Write a new knowledge base article</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="How to reset your password"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  placeholder="how-to-reset-password"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to auto-generate from title
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Write your article content here..."
                  value={bodyText}
                  onChange={(e) => {
                    setBodyText(e.target.value);
                    setBodyHtml(`<p>${e.target.value}</p>`);
                  }}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter plain text. HTML will be generated automatically.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <DropdownMenu open={showCategoryDropdown} onOpenChange={setShowCategoryDropdown}>
                    <DropdownMenuTrigger>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedCategory?.name || "Select category"}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-full max-h-60 overflow-y-auto">
                      <DropdownMenuItem
                        onClick={() => {
                          setCategoryId(null);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        None
                      </DropdownMenuItem>
                      {categories?.map((category: any) => (
                        <DropdownMenuItem
                          key={category.id}
                          onClick={() => {
                            setCategoryId(category.id);
                            setShowCategoryDropdown(false);
                          }}
                        >
                          {category.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="locale">Locale</Label>
                  <select
                    id="locale"
                    className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    placeholder="password, account, security"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  placeholder="Reset Your Password - Help Center"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  placeholder="Learn how to reset your account password in just a few steps..."
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate({ to: "/kb" })}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e, false)}
              disabled={createMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Draft
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              <Eye className="h-4 w-4 mr-2" />
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publish
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
