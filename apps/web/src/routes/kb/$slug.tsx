import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { ArrowLeft } from "lucide-react";

import { KbFeedback } from "@/components/kb-feedback";
import { getCurrentOrganizationId } from "@/utils/auth";

export const Route = createFileRoute("/kb/$slug")({
  loader: async ({ context, params }) => {
    const article = await context.orpc.kbArticles.getBySlug.query({
      organizationId: getCurrentOrganizationId()!,
      slug: params.slug,
    });
    return { article };
  },
  component: KbArticleRoute,
});

function KbArticleRoute() {
  const { article } = Route.useLoaderData<typeof Route>();

  if (!article) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Article Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The article you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/kb">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Knowledge Base
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/kb"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Knowledge Base
      </Link>

      <article className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none">
        {article.category && (
          <div className="mb-2 text-sm text-muted-foreground">
            {article.category.icon && <span className="mr-1">{article.category.icon}</span>}
            {article.category.name}
          </div>
        )}

        <h1 className="mb-4 text-3xl font-bold">{article.title}</h1>

        {article.metaDescription && (
          <p className="text-lg text-muted-foreground mb-6">{article.metaDescription}</p>
        )}

        <div className="html-content" dangerouslySetInnerHTML={{ __html: article.bodyHtml }} />
      </article>

      <div className="mt-12 border-t pt-8">
        <KbFeedback articleId={article.id} locale="en" />
      </div>

      {article.relatedArticles && article.relatedArticles.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">Related Articles</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {article.relatedArticles.map((related: any) => (
              <Card key={related.id}>
                <CardHeader className="p-4">
                  <CardTitle className="text-base">
                    <Link to="/kb/$slug" params={{ slug: related.slug }}>
                      {related.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
