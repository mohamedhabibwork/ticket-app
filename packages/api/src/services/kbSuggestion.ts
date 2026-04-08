import { db } from "@ticket-app/db";
import { kbArticles } from "@ticket-app/db/schema";
import { and, eq, isNull, desc } from "drizzle-orm";

interface KbSuggestionOptions {
  organizationId: number;
  ticketSubject?: string;
  ticketDescription?: string;
  locale?: string;
  limit?: number;
}

interface KbSuggestionResult {
  id: number;
  title: string;
  titleAr: string | null;
  slug: string;
  bodyText: string | null;
  metaDescription: string | null;
  category: {
    name: string;
    nameAr: string | null;
  } | null;
  relevanceScore: number;
  helpfulnessRatio: number;
}

export async function suggestKbArticles(
  options: KbSuggestionOptions
): Promise<KbSuggestionResult[]> {
  const {
    organizationId,
    ticketSubject = "",
    ticketDescription = "",
    locale = "en",
    limit = 5,
  } = options;

  const combinedText = `${ticketSubject} ${ticketDescription}`.toLowerCase().trim();
  const searchWords = combinedText.split(/\s+/).filter((w) => w.length > 2);

  if (searchWords.length === 0) {
    return getMostHelpfulArticles(organizationId, locale, limit);
  }

  const publishedConditions = [
    eq(kbArticles.organizationId, organizationId),
    eq(kbArticles.status, "published"),
    isNull(kbArticles.deletedAt),
  ];

  const articles = await db.query.kbArticles.findMany({
    where: and(...publishedConditions),
    with: {
      category: true,
    },
    orderBy: [desc(kbArticles.helpfulYes)],
    limit: 50,
  });

  const scoredArticles: KbSuggestionResult[] = [];

  for (const article of articles) {
    const title = locale === "ar" && article.titleAr ? article.titleAr : article.title;
    const titleLower = title.toLowerCase();
    const bodyLower = (article.bodyText || "").toLowerCase();
    const metaLower = ((article.metaKeywords || "") + " " + (article.metaDescription || "")).toLowerCase();

    let relevanceScore = 0;

    for (const word of searchWords) {
      if (titleLower.includes(word)) {
        relevanceScore += 30;
      }
      if (metaLower.includes(word)) {
        relevanceScore += 20;
      }
      if (bodyLower.includes(word)) {
        relevanceScore += 10;
      }
    }

    const subjectWords = ticketSubject.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    for (const word of subjectWords) {
      if (titleLower.includes(word)) {
        relevanceScore += 40;
      }
    }

    const totalHelpful = article.helpfulYes + article.helpfulNo;
    const helpfulnessRatio = totalHelpful > 0 ? article.helpfulYes / totalHelpful : 0;

    if (relevanceScore > 0) {
      scoredArticles.push({
        id: article.id,
        title,
        titleAr: article.titleAr,
        slug: article.slug,
        bodyText: article.bodyText,
        metaDescription: article.metaDescription,
        category: article.category
          ? {
              name: article.category.name,
              nameAr: article.category.nameAr,
            }
          : null,
        relevanceScore,
        helpfulnessRatio,
      });
    }
  }

  return scoredArticles
    .sort((a, b) => {
      const scoreA = a.relevanceScore * 0.7 + a.helpfulnessRatio * a.relevanceScore * 0.3;
      const scoreB = b.relevanceScore * 0.7 + b.helpfulnessRatio * b.relevanceScore * 0.3;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

async function getMostHelpfulArticles(
  organizationId: number,
  locale: string,
  limit: number
): Promise<KbSuggestionResult[]> {
  const articles = await db.query.kbArticles.findMany({
    where: and(
      eq(kbArticles.organizationId, organizationId),
      eq(kbArticles.status, "published"),
      isNull(kbArticles.deletedAt)
    ),
    with: {
      category: true,
    },
    orderBy: [desc(kbArticles.helpfulYes)],
    limit,
  });

  return articles.map((article) => ({
    id: article.id,
    title: locale === "ar" && article.titleAr ? article.titleAr : article.title,
    titleAr: article.titleAr,
    slug: article.slug,
    bodyText: article.bodyText,
    metaDescription: article.metaDescription,
    category: article.category
      ? {
          name: article.category.name,
          nameAr: article.category.nameAr,
        }
      : null,
    relevanceScore: 0,
    helpfulnessRatio:
      article.helpfulYes + article.helpfulNo > 0
        ? article.helpfulYes / (article.helpfulYes + article.helpfulNo)
        : 0,
  }));
}