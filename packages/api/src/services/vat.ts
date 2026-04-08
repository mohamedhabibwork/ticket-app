import { env } from "@ticket-app/env/server";

export interface VatConfig {
  rate: number;
  country: string;
  invoicePrefix?: string;
}

export const GCC_VAT_RATES: Record<string, number> = {
  SA: 15,
  AE: 5,
  EG: 14,
  OM: 0,
  KW: 0,
  QA: 0,
  BH: 0,
};

export const DEFAULT_VAT_RATE = 15;

export function getVatRate(countryCode: string): number {
  return GCC_VAT_RATES[countryCode.toUpperCase()] ?? DEFAULT_VAT_RATE;
}

export function isGccCountry(countryCode: string): boolean {
  return countryCode.toUpperCase() in GCC_VAT_RATES;
}

export function calculateVat(amount: number, vatRate: number): number {
  return Math.round(amount * (vatRate / 100));
}

export function getAmountWithVat(amount: number, vatRate: number): {
  subtotal: number;
  vatAmount: number;
  total: number;
} {
  const vatAmount = calculateVat(amount, vatRate);
  return {
    subtotal: amount,
    vatAmount,
    total: amount + vatAmount,
  };
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export function parseCurrency(amount: number, currency: string): {
  major: number;
  minor: number;
  formatted: string;
} {
  const major = Math.floor(amount / 100);
  const minor = amount % 100;

  return {
    major,
    minor,
    formatted: `${major}.${minor.toString().padStart(2, "0")} ${currency}`,
  };
}

export function convertToSmallestUnit(
  amount: number,
  currency: string
): number {
  const zeroDecimalCurrencies = ["JPY", "KRW", "VND"];

  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
}

export function convertFromSmallestUnit(
  amount: number,
  currency: string
): number {
  const zeroDecimalCurrencies = ["JPY", "KRW", "VND"];

  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return amount;
  }

  return amount / 100;
}

export function calculateVatForSubscription(params: {
  baseAmount: number;
  vatRate: number;
  seatCount?: number;
}): {
  unitPrice: number;
  unitPriceWithVat: number;
  subtotal: number;
  vatAmount: number;
  total: number;
} {
  const { baseAmount, vatRate, seatCount = 1 } = params;

  const unitPrice = baseAmount;
  const unitPriceWithVat = unitPrice + calculateVat(unitPrice, vatRate);
  const subtotal = unitPrice * seatCount;
  const vatAmount = calculateVat(subtotal, vatRate);
  const total = subtotal + vatAmount;

  return {
    unitPrice,
    unitPriceWithVat,
    subtotal,
    vatAmount,
    total,
  };
}

export function isVatExempt(
  countryCode: string,
  vatNumber?: string
): boolean {
  if (!vatNumber) return false;

  const gccCountries = ["SA", "AE", "EG", "OM", "KW", "QA", "BH"];
  if (!gccCountries.includes(countryCode.toUpperCase())) {
    return true;
  }

  const vatPattern = /^[A-Z]{2}\d{15}$/;
  return vatPattern.test(vatNumber);
}

export function validateVatNumber(vatNumber: string): boolean {
  const patterns: Record<string, RegExp> = {
    SA: /^SA\d{9}$/,
    AE: /^AE\d{15}$/,
    EG: /^EG\d{9,11}$/,
    OM: /^OM\d{7,8}$/,
    KW: /^KW\d{9}$/,
    QA: /^QA\d{8,11}$/,
    BH: /^BH\d{8,9}$/,
  };

  const countryCode = vatNumber.slice(0, 2).toUpperCase();
  const pattern = patterns[countryCode];

  if (!pattern) return false;

  return pattern.test(vatNumber);
}

export function getVatDisplayRate(countryCode: string): string {
  const rate = getVatRate(countryCode);
  return `${rate}%`;
}

export function getCountryFromLocale(locale: string): string {
  const localeToCountry: Record<string, string> = {
    "ar-SA": "SA",
    "ar-AE": "AE",
    "ar-EG": "EG",
    "ar-OM": "OM",
    "ar-KW": "KW",
    "ar-QA": "QA",
    "ar-BH": "BH",
    "en-SA": "SA",
    "en-AE": "AE",
  };

  return localeToCountry[locale] || locale.slice(-2).toUpperCase();
}
