import { db } from "@ticket-app/db";
import { translationConfigs, translationCache } from "@ticket-app/db/schema";
import { eq, and } from "drizzle-orm";
import { decryptToken } from "./crypto";

const GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2";
const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";

interface TranslateTextParams {
  text: string;
  sourceLang: string;
  targetLang: string;
  organizationId: number;
}

async function getTranslationConfig(organizationId: number) {
  const config = await db.query.translationConfigs.findFirst({
    where: and(
      eq(translationConfigs.organizationId, organizationId),
      eq(translationConfigs.isEnabled, true),
    ),
  });
  return config;
}

async function getCachedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string | null> {
  const sourceHash = await computeHash(`${text}:${sourceLang}:${targetLang}`);
  const cached = await db.query.translationCache.findFirst({
    where: eq(translationCache.sourceHash, sourceHash),
  });
  return cached?.translatedText ?? null;
}

async function cacheTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
  translatedText: string,
): Promise<void> {
  const sourceHash = await computeHash(`${text}:${sourceLang}:${targetLang}`);
  await db
    .insert(translationCache)
    .values({
      sourceHash,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      translatedText,
      provider: "default",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoUpdate({
      target: [translationCache.sourceHash],
      set: {
        translatedText,
      },
    });
}

async function computeHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function translateWithGoogle(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: text,
      source: sourceLang === "auto" ? undefined : sourceLang,
      target: targetLang,
      format: "text",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Translate API error: ${error}`);
  }

  const result = (await response.json()) as {
    data: {
      translations: Array<{ translatedText: string }>;
    };
  };

  return result.data.translations[0]?.translatedText ?? text;
}

async function translateWithDeepL(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string,
): Promise<string> {
  const params = new URLSearchParams({
    text,
    target_lang: targetLang,
  });

  if (sourceLang !== "auto") {
    params.append("source_lang", sourceLang);
  }

  const response = await fetch(DEEPL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `DeepL-Auth-Key ${apiKey}`,
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepL API error: ${error}`);
  }

  const result = (await response.json()) as {
    translations: Array<{ text: string }>;
  };

  return result.translations[0]?.text ?? text;
}

export async function translateText(
  params: TranslateTextParams,
): Promise<{ translatedText: string; detectedLang?: string }> {
  const { text, sourceLang, targetLang, organizationId } = params;

  const cached = await getCachedTranslation(text, sourceLang, targetLang);
  if (cached) {
    return { translatedText: cached };
  }

  const config = await getTranslationConfig(organizationId);
  if (!config || !config.apiKeyEnc) {
    throw new Error("Translation not configured for organization");
  }

  const apiKey = decryptToken(config.apiKeyEnc);
  let translatedText: string;

  if (config.provider === "deepl") {
    translatedText = await translateWithDeepL(text, sourceLang, targetLang, apiKey);
  } else {
    translatedText = await translateWithGoogle(text, sourceLang, targetLang, apiKey);
  }

  await cacheTranslation(text, sourceLang, targetLang, translatedText);

  return { translatedText };
}
