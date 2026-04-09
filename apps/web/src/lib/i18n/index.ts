import { useEffect, useState, useCallback, createContext, useContext } from "react";
import en from "./en.json";
import ar from "./ar.json";

export type Direction = "ltr" | "rtl";
export type Locale = "en" | "ar";

const RTL_LOCALES: Set<string> = new Set(["ar", "he", "fa", "ur", "ps", "sd", "yi", "ku", "ckb"]);

const translations: Record<Locale, typeof en> = { en, ar };

export interface LocaleConfig {
  locale: Locale;
  direction: Direction;
  dateFormat: string;
  numberFormat: Intl.NumberFormatOptions;
  name: string;
  nativeName: string;
}

export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  en: {
    locale: "en",
    direction: "ltr",
    dateFormat: "MM/dd/yyyy",
    numberFormat: { style: "decimal" },
    name: "English",
    nativeName: "English",
  },
  ar: {
    locale: "ar",
    direction: "rtl",
    dateFormat: "dd/MM/yyyy",
    numberFormat: { style: "decimal" },
    name: "Arabic",
    nativeName: "العربية",
  },
};

function isRTL(locale: string): boolean {
  return RTL_LOCALES.has(locale.split("-")[0].toLowerCase());
}

function getDirection(locale: string): Direction {
  return isRTL(locale) ? "rtl" : "ltr";
}

type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${NestedKeyOf<T[K]>}` : K) : never }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<typeof en>;

function getNestedValue(obj: any, path: string): string {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj) || path;
}

export interface I18nContextValue {
  locale: Locale;
  direction: Direction;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (date: Date | string, format?: string) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "ticket-app-locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === "en" || stored === "ar")) {
        return stored as Locale;
      }
    }
    return "en";
  });

  const [direction, setDirection] = useState<Direction>(() => getDirection(locale));

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    setDirection(getDirection(newLocale));
  }, []);

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = locale;
  }, [locale, direction]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const translation = getNestedValue(translations[locale], key);
      if (!translation || typeof translation !== "string") {
        return key;
      }
      if (params) {
        return Object.entries(params).reduce(
          (str, [k, v]) => str.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
          translation
        );
      }
      return translation;
    },
    [locale]
  );

  const formatDate = useCallback(
    (date: Date | string, format?: string): string => {
      const d = typeof date === "string" ? new Date(date) : date;
      const config = LOCALE_CONFIGS[locale];
      const fmt = format || config.dateFormat;

      const parts = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US").formatToParts(d);
      const formatMap: Record<string, string> = {};
      parts.forEach((part) => {
        formatMap[part.type] = part.value;
      });

      return fmt
        .replace("yyyy", formatMap.year || "")
        .replace("MM", formatMap.month || "")
        .replace("dd", formatMap.day || "");
    },
    [locale]
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      const config = LOCALE_CONFIGS[locale];
      return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
        ...config.numberFormat,
        ...options,
      }).format(value);
    },
    [locale]
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        direction,
        setLocale,
        t,
        formatDate,
        formatNumber,
        isRTL: direction === "rtl",
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function useDirection() {
  const { direction, isRTL, locale } = useI18n();
  return { direction, isRTL, locale };
}

export { getDirection, isRTL, LOCALE_CONFIGS };
export type { TranslationKey };
