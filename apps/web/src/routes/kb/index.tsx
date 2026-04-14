import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ticket-app/ui/components/card";

import { KbSearch } from "@/components/kb-search";
import { getCurrentOrganizationId } from "@/utils/auth";

export const Route = createFileRoute("/kb/")({
  loader: async ({ context }) => {
    const categories = await context.orpc.kbCategories.list.query({
      organizationId: getCurrentOrganizationId()!,
    });
    return { categories };
  },
  component: KbIndexRoute,
});

function KbIndexRoute() {
  const { categories } = Route.useLoaderData();

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

      <KbCategoriesList categories={categories} />
    </div>
  );
}

function KbCategoriesList({ categories }: { categories: any[] }) {
  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No articles found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {categories.map((category: any) => (
        <Card key={category.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {category.icon && <span className="text-xl">{category.icon}</span>}
              <Link to="/kb/$slug" params={{ slug: category.slug }}>
                {category.name}
              </Link>
            </CardTitle>
            {category.description && <CardDescription>{category.description}</CardDescription>}
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
