import { db } from "@ticket-app/db";
import { translationConfigs, translationCache } from "@ticket-app/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2";
const DEEPL_URL = "https://api-free.deepl.com/v1/translate";

export interface TranslateOptions {
  text: string;
  sourceLang?: string;
  targetLang: string;
  organizationId: number;
}

export interface TranslateResult {
  translatedText: string;
  detectedSourceLang?: string;
  provider: string;
}

function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

async function translateWithGoogle(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string
): Promise<TranslateResult> {
  const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: sourceLang === "auto" ? undefined : sourceLang,
      target: targetLang,
      format: "html",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Translate API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    data: {
      translations: Array<{ translatedText: string; detectedSourceLanguage?: string }>;
    };
  };

  return {
    translatedText: data.data.translations[0].translatedText,
    detectedSourceLang: data.data.translations[0].detectedSourceLanguage,
    provider: "google",
  };
}

async function translateWithDeepL(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string
): Promise<TranslateResult> {
  const response = await fetch(DEEPL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `DeepL-Auth-Key ${apiKey}`,
    },
    body: new URLSearchParams({
      text,
      source_lang: sourceLang === "auto" ? undefined : sourceLang.toUpperCase(),
      target_lang: targetLang.toUpperCase(),
      tagHandling: "xml",
      ignore_tags: "exclude",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepL API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    translations: Array<{ detected_source_language?: string; text: string }>;
  };

  return {
    translatedText: data.translations[0].text,
    detectedSourceLang: data.translations[0].detected_source_language?.toLowerCase(),
    provider: "deepl",
  };
}

export async function translateText(options: TranslateOptions): Promise<TranslateResult> {
  const { text, sourceLang = "auto", targetLang, organizationId } = options;

  if (!text.trim()) {
    return { translatedText: "", provider: "none" };
  }

  const textHash = hashText(text.substring(0, 1000));

  const cached = await db.query.translationCache.findFirst({
    where: and(
      eq(translationCache.sourceHash, textHash),
      eq(translationCache.targetLanguage, targetLang)
    ),
  });

  if (cached && cached.expiresAt && cached.expiresAt > new Date()) {
    return {
      translatedText: cached.translatedText,
      provider: cached.provider,
    };
  }

  const config = await db.query.translationConfigs.findFirst({
    where: and(
      eq(translationConfigs.organizationId, organizationId),
      eq(translationConfigs.isEnabled, true)
    ),
  });

  if (!config || !config.apiKeyEnc) {
    throw new Error("Translation not configured or disabled for organization");
  }

  let result: TranslateResult;

  try {
    const { decryptToken } = await import("@ticket-app/api/src/lib/crypto");
    const apiKey = decryptToken(config.apiKeyEnc);

    if (config.provider === "google") {
      result = await translateWithGoogle(text, sourceLang, targetLang, apiKey);
    } else if (config.provider === "deepl") {
      result = await translateWithDeepL(text, sourceLang, targetLang, apiKey);
    } else {
      throw new Error(`Unsupported translation provider: ${config.provider}`);
    }
  } catch (primaryError) {
    if (config.provider === "google") {
      console.warn("Google Translate failed, trying DeepL fallback:", primaryError);
      try {
        const deeplConfig = await db.query.translationConfigs.findFirst({
          where: and(
            eq(translationConfigs.organizationId, organizationId),
            eq(translationConfigs.provider, "deepl"),
            eq(translationConfigs.isEnabled, true)
          ),
        });

        if (deeplConfig?.apiKeyEnc) {
          const { decryptToken } = await import("@ticket-app/api/src/lib/crypto");
          const apiKey = decryptToken(deeplConfig.apiKeyEnc);
          result = await translateWithDeepL(text, sourceLang, targetLang, apiKey);
        } else {
          throw primaryError;
        }
      } catch (deeplError) {
        console.error("DeepL fallback also failed:", deeplError);
        throw primaryError;
      }
    } else {
      throw primaryError;
    }
  }

  await db
    .insert(translationCache)
    .values({
      sourceHash: textHash,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      translatedText: result.translatedText,
      provider: result.provider,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoUpdate({
      target: translationCache.sourceHash,
      set: {
        translatedText: result.translatedText,
        provider: result.provider,
      },
    });

  return result;
}