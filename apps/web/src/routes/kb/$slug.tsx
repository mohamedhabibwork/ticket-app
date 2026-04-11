import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Loader2 } from "lucide-react";
import { ArrowLeft } from "lucide-react";

import { orpc } from "@/utils/orpc";
import { KbFeedback } from "@/components/kb-feedback";

export const Route = createFileRoute("/kb/$slug")({
  component: KbArticleRoute,
});

function KbArticleRoute() {
  const { slug } = Route.useParams();

  const article = useQuery(
    orpc.kbArticles.getBySlug.queryOptions({
      organizationId: 1,
      slug,
    }),
  );

  if (article.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!article.data) {
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
        {article.data.category && (
          <div className="mb-2 text-sm text-muted-foreground">
            {article.data.category.icon && (
              <span className="mr-1">{article.data.category.icon}</span>
            )}
            {article.data.category.name}
          </div>
        )}

        <h1 className="mb-4 text-3xl font-bold">{article.data.title}</h1>

        {article.data.metaDescription && (
          <p className="text-lg text-muted-foreground mb-6">{article.data.metaDescription}</p>
        )}

        <div className="html-content" dangerouslySetInnerHTML={{ __html: article.data.bodyHtml }} />
      </article>

      <div className="mt-12 border-t pt-8">
        <KbFeedback articleId={article.data.id} locale="en" />
      </div>

      {article.data.relatedArticles && article.data.relatedArticles.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">Related Articles</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {article.data.relatedArticles.map((related) => (
              <Card key={related.id}>
                <CardHeader className="p-4">
                  <CardTitle className="text-base">
                    <Link to="/kb/slug" params={{ slug: related.slug }}>
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
