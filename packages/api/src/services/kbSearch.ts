import { db } from "@ticket-app/db";
import { kbArticles, kbCategories } from "@ticket-app/db/schema";
import { and, eq, isNull, desc, sql } from "drizzle-orm";

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
  options: SearchKbArticlesOptions,
): Promise<KbArticleSearchResult[]> {
  const { organizationId, query, locale = "en", limit = 20, categoryId } = options;

  const searchQuery = query.trim();
  const tsQuery = searchQuery.replace(/\s+/g, " & ") + ":*";

  const _titleField =
    locale === "ar" ? sql`COALESCE(${kbArticles.titleAr}, ${kbArticles.title})` : kbArticles.title;

  const baseConditions = [
    eq(kbArticles.organizationId, organizationId),
    eq(kbArticles.status, "published"),
    isNull(kbArticles.deletedAt),
  ];

  if (categoryId) {
    baseConditions.push(eq(kbArticles.categoryId, categoryId));
  }

  const _fullTextSearch = sql`
    setweight(to_tsvector('english', ${kbArticles.title}), 'A') ||
    setweight(to_tsvector('english', COALESCE(${kbArticles.titleAr}, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(${kbArticles.bodyText}, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(${kbArticles.metaDescription}, '')), 'D')
    @@ to_tsquery('english', ${tsQuery})
  `;

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
      tsRank: sql<number>`ts_rank(
        setweight(to_tsvector('english', ${kbArticles.title}), 'A') ||
        setweight(to_tsvector('english', COALESCE(${kbArticles.titleAr}, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(${kbArticles.bodyText}, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(${kbArticles.metaDescription}, '')), 'D'),
        to_tsquery('english', ${tsQuery})
      )`.as("ts_rank"),
    })
    .from(kbArticles)
    .leftJoin(
      kbCategories,
      and(eq(kbArticles.categoryId, kbCategories.id), isNull(kbCategories.deletedAt)),
    )
    .where(and(...baseConditions))
    .orderBy(
      desc(sql`ts_rank`),
      desc(kbArticles.helpfulYes),
      desc(kbArticles.viewCount),
      desc(kbArticles.publishedAt),
    )
    .limit(limit);

  const processedResults = results
    .map((article) => {
      const title = locale === "ar" && article.titleAr ? article.titleAr : article.title;

      return {
        ...article,
        title,
        rank: Number(article.tsRank) * 1000,
      };
    })
    .filter((article) => article.rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);

  return processedResults;
}

export async function getKbArticleSuggestions(
  options: SearchKbArticlesOptions,
): Promise<KbArticleSearchResult[]> {
  return searchKbArticles({
    ...options,
    limit: options.limit || 5,
  });
}
