import { db } from "@ticket-app/db";
import { kbArticles, kbCategories } from "@ticket-app/db/schema";
import { and, eq, isNull, desc } from "drizzle-orm";

interface SearchKbArticlesOptions {
  organizationId: number;
  query: string;
  locale?: string;
  limit?: number;
  categoryId?: number;
}

interface KbArticleSearchResult {
  id: number;
  uuid: string;
  title: string;
  titleAr: string | null;
  slug: string;
  bodyText: string | null;
  metaDescription: string | null;
  categoryId: number | null;
  viewCount: number;
  helpfulYes: number;
  helpfulNo: number;
  category: {
    id: number;
    name: string;
    nameAr: string | null;
    slug: string;
  } | null;
  rank: number;
}

export async function searchKbArticles(
  options: SearchKbArticlesOptions
): Promise<KbArticleSearchResult[]> {
  const {
    organizationId,
    query,
    locale = "en",
    limit = 20,
    categoryId,
  } = options;

  const searchQuery = query.trim();

  const conditions = [
    eq(kbArticles.organizationId, organizationId),
    eq(kbArticles.status, "published"),
    isNull(kbArticles.deletedAt),
  ];

  if (categoryId) {
    conditions.push(eq(kbArticles.categoryId, categoryId));
  }

  const results = await db
    .select({
      id: kbArticles.id,
      uuid: kbArticles.uuid,
      title: kbArticles.title,
      titleAr: kbArticles.titleAr,
      slug: kbArticles.slug,
      bodyText: kbArticles.bodyText,
      metaDescription: kbArticles.metaDescription,
      categoryId: kbArticles.categoryId,
      viewCount: kbArticles.viewCount,
      helpfulYes: kbArticles.helpfulYes,
      helpfulNo: kbArticles.helpfulNo,
      category: kbCategories,
    })
    .from(kbArticles)
    .leftJoin(
      kbCategories,
      and(
        eq(kbArticles.categoryId, kbCategories.id),
        isNull(kbCategories.deletedAt)
      )
    )
    .where(and(...conditions))
    .orderBy(
      desc(kbArticles.helpfulYes),
      desc(kbArticles.viewCount),
      desc(kbArticles.publishedAt)
    )
    .limit(limit);

  const processedResults = results
    .map((article) => {
      const title = locale === "ar" && article.titleAr ? article.titleAr : article.title;
      const bodyText = article.bodyText || "";
      const searchLower = searchQuery.toLowerCase();
      const titleLower = title.toLowerCase();

      let relevanceScore = 0;
      if (titleLower.includes(searchLower)) {
        relevanceScore += 100;
      }
      if (bodyText.toLowerCase().includes(searchLower)) {
        relevanceScore += 50;
      }

      const searchWords = searchLower.split(/\s+/);
      for (const word of searchWords) {
        if (titleLower.includes(word)) {
          relevanceScore += 20;
        }
        if (bodyText.toLowerCase().includes(word)) {
          relevanceScore += 10;
        }
      }

      return {
        ...article,
        title,
        rank: relevanceScore,
      };
    })
    .filter((article) => article.rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);

  return processedResults;
}

export async function getKbArticleSuggestions(
  options: SearchKbArticlesOptions
): Promise<KbArticleSearchResult[]> {
  return searchKbArticles({
    ...options,
    limit: options.limit || 5,
  });
}