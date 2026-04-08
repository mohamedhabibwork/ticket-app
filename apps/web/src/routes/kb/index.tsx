import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Loader2 } from "lucide-react";

import { orpc } from "@/utils/orpc";
import { KbSearch } from "@/components/kb-search";

export const Route = createFileRoute("/kb/")({
  component: KbIndexRoute,
});

function KbIndexRoute() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Find answers to common questions and learn how to get the most out of our platform.
        </p>
      </div>

      <div className="mb-8">
        <KbSearch organizationId={1} locale="en" className="max-w-xl mx-auto" />
      </div>

      <KbCategoriesList />
    </div>
  );
}

function KbCategoriesList() {
  const categories = useQuery(
    orpc.kbCategories.list.queryOptions({
      organizationId: 1,
      isPublished: true,
    })
  );

  if (categories.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!categories.data || categories.data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No articles found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {categories.data.map((category) => (
        <Card key={category.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {category.icon && <span className="text-xl">{category.icon}</span>}
              <Link to="/kb/$slug" params={{ slug: category.slug }}>
                {category.name}
              </Link>
            </CardTitle>
            {category.description && (
              <CardDescription>{category.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {category.articles?.length || 0} articles
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}