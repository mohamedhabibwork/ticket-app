"use client";

import { useEffect, useState } from "react";

export type Direction = "ltr" | "rtl";

export interface LocaleConfig {
  locale: string;
  direction: Direction;
  dateFormat?: string;
  numberFormat?: Intl.NumberFormatOptions;
}

const RTL_LOCALES = new Set([
  "ar",
  "he",
  "fa",
  "ur",
  "ps",
  "sd",
  "yi",
  "ku",
  "ckb",
]);

const LOCALE_CONFIGS: Record<string, LocaleConfig> = {
  en: { locale: "en", direction: "ltr" },
  ar: { locale: "ar", direction: "rtl", dateFormat: "dd/MM/yyyy" },
  he: { locale: "he", direction: "rtl", dateFormat: "dd/MM/yyyy" },
  fa: { locale: "fa", direction: "rtl", dateFormat: "yyyy/MM/dd" },
  ur: { locale: "ur", direction: "rtl", dateFormat: "dd/MM/yyyy" },
  es: { locale: "es", direction: "ltr", dateFormat: "dd/MM/yyyy" },
  fr: { locale: "fr", direction: "ltr", dateFormat: "dd/MM/yyyy" },
  de: { locale: "de", direction: "ltr", dateFormat: "dd.MM.yyyy" },
};

export function getLocaleConfig(locale: string): LocaleConfig {
  const normalizedLocale = locale.split("-")[0].toLowerCase();
  return LOCALE_CONFIGS[normalizedLocale] || { locale, direction: "ltr" };
}

export function isRTL(locale: string): boolean {
  const normalizedLocale = locale.split("-")[0].toLowerCase();
  return RTL_LOCALES.has(normalizedLocale);
}

export function getDirection(locale: string): Direction {
  return isRTL(locale) ? "rtl" : "ltr";
}

export function useDirection(initialLocale: string = "en") {
  const [direction, setDirection] = useState<Direction>(() => getDirection(initialLocale));
  const [locale, setLocale] = useState(initialLocale);

  useEffect(() => {
    setDirection(getDirection(locale));
    document.documentElement.dir = getDirection(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  return { direction, locale, setLocale, isRTL: direction === "rtl" };
}

export function formatDate(date: Date | string, locale: string = "en"): string {
  const config = getLocaleConfig(locale);
  const d = typeof date === "string" ? new Date(date) : date;

  if (config.dateFormat) {
    const parts = new Intl.DateTimeFormat(config.locale).formatToParts(d);
    const formatMap: Record<string, string> = {};
    parts.forEach((part) => {
      formatMap[part.type] = part.value;
    });

    return config.dateFormat
      .replace("yyyy", formatMap.year || "")
      .replace("MM", formatMap.month || "")
      .replace("dd", formatMap.day || "");
  }

  return new Intl.DateTimeFormat(config.locale).format(d);
}

export function formatNumber(
  value: number,
  locale: string = "en",
  options?: Intl.NumberFormatOptions
): string {
  const config = getLocaleConfig(locale);
  return new Intl.NumberFormat(config.locale, options).format(value);
}

export function getLogicalProperty(
  property: "margin" | "padding" | "border",
  side: "start" | "end",
  value: string
): string {
  const logicalMap: Record<string, Record<string, string>> = {
    margin: { start: "margin-inline-start", end: "margin-inline-end" },
    padding: { start: "padding-inline-start", end: "padding-inline-end" },
    border: { start: "border-inline-start", end: "border-inline-end" },
  };

  return `${logicalMap[property]?.[side] || property}: ${value}`;
}
