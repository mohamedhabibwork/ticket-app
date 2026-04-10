import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Loader2, Plus, FileText, Edit, Eye, Trash2, Inbox, Copy } from "lucide-react";
import { orpc } from "@/utils/orpc";

const FORM_TYPES = [
  { value: "all", label: "All Forms" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
];

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export const Route = createFileRoute("/admin/forms/")({
  component: FormListRoute,
});

function FormListRoute() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: forms,
    isLoading,
    refetch,
  } = useQuery(
    orpc.forms.list.queryOptions({
      organizationId: 1,
    }),
  );

  const deleteMutation = useMutation(
    orpc.forms.delete?.mutationOptions({
      onSuccess: () => refetch(),
    }),
  );

  const filteredForms = forms?.filter((form) => {
    const matchesSearch = form.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && form.isPublished) ||
      (statusFilter === "draft" && !form.isPublished);
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (isPublished: boolean) => {
    if (isPublished) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
        Draft
      </span>
    );
  };

  const copyEmbedCode = (formId: number) => {
    const embedCode = `<iframe src="${window.location.origin}/forms/${formId}" width="100%" height="600" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedCode);
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Web Forms</h1>
          <p className="text-muted-foreground">Create and manage web forms for your organization</p>
        </div>
        <Link to="/admin/forms/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Form
          </Button>
        </Link>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {FORM_TYPES.map((type) => (
            <Button
              key={type.value}
              variant={statusFilter === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(type.value)}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredForms && filteredForms.length > 0 ? (
        <div className="space-y-4">
          {filteredForms.map((form) => (
            <Card key={form.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-muted p-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{form.name}</h3>
                      {getStatusBadge(form.isPublished)}
                    </div>
                    {form.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {form.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{form.fields?.length || 0} fields</span>
                      <span>Created {formatRelativeTime(form.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link to="/admin/forms/new">
                      <Button variant="ghost" size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/admin/forms/builder">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to={`/forms/${form.id}`} target="_blank">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => copyEmbedCode(form.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Link to={`/admin/forms/${form.id}/submissions`}>
                      <Button variant="ghost" size="icon">
                        <Inbox className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this form?")) {
                          deleteMutation?.mutate({ id: form.id });
                        }
                      }}
                      disabled={deleteMutation?.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No forms found</p>
            <Link to="/admin/forms/new">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create your first form
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
