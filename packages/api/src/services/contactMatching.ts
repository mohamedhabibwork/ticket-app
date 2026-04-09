import { db } from "@ticket-app/db";
import { contacts } from "@ticket-app/db/schema";
import { and, isNull, or, like, ilike } from "drizzle-orm";

export interface MatchCandidate {
  id: number;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  similarity: number;
  matchReasons: string[];
}

export interface FuzzyMatchOptions {
  emailWeight?: number;
  phoneWeight?: number;
  nameWeight?: number;
  companyWeight?: number;
  threshold?: number;
}

const DEFAULT_OPTIONS: FuzzyMatchOptions = {
  emailWeight: 0.4,
  phoneWeight: 0.3,
  nameWeight: 0.2,
  companyWeight: 0.1,
  threshold: 0.75,
};

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()+]/g, "").trim();
}

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

export function calculateSimilarity(
  source: {
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
  },
  target: {
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
  },
  options: FuzzyMatchOptions = DEFAULT_OPTIONS,
): { similarity: number; reasons: string[] } {
  let totalScore = 0;
  let totalWeight = 0;
  const reasons: string[] = [];

  if (source.email && target.email) {
    const emailScore = stringSimilarity(normalizeEmail(source.email), normalizeEmail(target.email));
    if (emailScore >= 0.9) {
      totalScore += emailScore * (options.emailWeight || 0.4);
      totalWeight += options.emailWeight || 0.4;
      if (emailScore === 1) reasons.push("Exact email match");
      else reasons.push(`Email similarity: ${Math.round(emailScore * 100)}%`);
    }
  }

  if (source.phone && target.phone) {
    const normSourcePhone = normalizePhone(source.phone);
    const normTargetPhone = normalizePhone(target.phone);

    let phoneScore = 0;
    if (normSourcePhone === normTargetPhone) {
      phoneScore = 1;
    } else if (
      normSourcePhone.includes(normTargetPhone) ||
      normTargetPhone.includes(normSourcePhone)
    ) {
      phoneScore = 0.8;
    } else {
      phoneScore = stringSimilarity(normSourcePhone, normTargetPhone);
    }

    if (phoneScore >= 0.8) {
      totalScore += phoneScore * (options.phoneWeight || 0.3);
      totalWeight += options.phoneWeight || 0.3;
      if (phoneScore === 1) reasons.push("Exact phone match");
      else reasons.push(`Phone similarity: ${Math.round(phoneScore * 100)}%`);
    }
  }

  if ((source.firstName || source.lastName) && (target.firstName || target.lastName)) {
    const sourceFullName = [source.firstName, source.lastName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const targetFullName = [target.firstName, target.lastName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const nameScore = stringSimilarity(sourceFullName, targetFullName);
    if (nameScore >= 0.7) {
      totalScore += nameScore * (options.nameWeight || 0.2);
      totalWeight += options.nameWeight || 0.2;
      reasons.push(`Name similarity: ${Math.round(nameScore * 100)}%`);
    }
  }

  if (source.company && target.company) {
    const companyScore = stringSimilarity(
      source.company.toLowerCase(),
      target.company.toLowerCase(),
    );
    if (companyScore >= 0.7) {
      totalScore += companyScore * (options.companyWeight || 0.1);
      totalWeight += options.companyWeight || 0.1;
      reasons.push(`Company similarity: ${Math.round(companyScore * 100)}%`);
    }
  }

  const finalSimilarity = totalWeight > 0 ? totalScore / totalWeight : 0;
  return { similarity: finalSimilarity, reasons };
}

export async function findFuzzyDuplicates(
  organizationId: number,
  contactData: {
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
  },
  options: FuzzyMatchOptions = DEFAULT_OPTIONS,
): Promise<MatchCandidate[]> {
  const _conditions = [isNull(contacts.deletedAt)];

  const searchConditions = [];

  if (contactData.email) {
    const normalizedEmail = normalizeEmail(contactData.email);
    searchConditions.push(
      like(contacts.email, `%${normalizedEmail.split("@")[0]}%`),
      ilike(contacts.email, `%${normalizedEmail}%`),
    );
  }

  if (contactData.phone) {
    const normalizedPhone = normalizePhone(contactData.phone);
    searchConditions.push(like(contacts.phone, `%${normalizedPhone}%`));
  }

  if (contactData.firstName || contactData.lastName) {
    const fullName = [contactData.firstName, contactData.lastName].filter(Boolean).join(" ");
    if (fullName) {
      searchConditions.push(
        ilike(contacts.firstName, `%${fullName}%`),
        ilike(contacts.lastName, `%${fullName}%`),
      );
    }
  }

  if (searchConditions.length === 0) {
    return [];
  }

  const allConditions = [
    eq(contacts.organizationId, organizationId),
    isNull(contacts.deletedAt),
    or(...searchConditions),
  ].filter(Boolean) as any;

  const candidates = await db.query.contacts.findMany({
    where: and(...allConditions),
    limit: 50,
  });

  const duplicates: MatchCandidate[] = [];

  for (const candidate of candidates) {
    if (candidate.id === (contactData as any).id) continue;

    const { similarity, reasons } = calculateSimilarity(contactData, candidate, options);

    if (similarity >= (options.threshold || 0.75)) {
      duplicates.push({
        id: candidate.id,
        email: candidate.email,
        phone: candidate.phone,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        company: candidate.company,
        similarity,
        matchReasons: reasons,
      });
    }
  }

  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

export async function findExactDuplicates(
  organizationId: number,
  contactData: {
    email?: string | null;
    phone?: string | null;
  },
): Promise<(typeof contacts.$inferSelect)[]> {
  const conditions = [eq(contacts.organizationId, organizationId), isNull(contacts.deletedAt)];

  if (contactData.email && contactData.phone) {
    conditions.push(
      or(
        eq(contacts.email, normalizeEmail(contactData.email)),
        eq(contacts.phone, normalizePhone(contactData.phone)),
      )!,
    );
  } else if (contactData.email) {
    conditions.push(eq(contacts.email, normalizeEmail(contactData.email)));
  } else if (contactData.phone) {
    conditions.push(eq(contacts.phone, normalizePhone(contactData.phone)));
  } else {
    return [];
  }

  return await db.query.contacts.findMany({
    where: and(...conditions),
  });
}

export function suggestMergeStrategy(
  primary: {
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    language?: string | null;
    timezone?: string | null;
  },
  secondary: {
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    language?: string | null;
    timezone?: string | null;
  },
): Record<string, { value: string | null; source: "primary" | "secondary" }> {
  return {
    email: {
      value: primary.email || secondary.email,
      source: primary.email ? "primary" : "secondary",
    },
    phone: {
      value: primary.phone || secondary.phone,
      source: primary.phone ? "primary" : "secondary",
    },
    firstName: {
      value: primary.firstName || secondary.firstName,
      source: primary.firstName ? "primary" : "secondary",
    },
    lastName: {
      value: primary.lastName || secondary.lastName,
      source: primary.lastName ? "primary" : "secondary",
    },
    company: {
      value: primary.company || secondary.company,
      source: primary.company ? "primary" : "secondary",
    },
    language: {
      value: primary.language || secondary.language,
      source: primary.language ? "primary" : "secondary",
    },
    timezone: {
      value: primary.timezone || secondary.timezone,
      source: primary.timezone ? "primary" : "secondary",
    },
  };
}
