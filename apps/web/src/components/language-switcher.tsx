"use client";

import { useI18n, LOCALE_CONFIGS, type Locale } from "@ticket-app/ui/lib/i18n";
import { useDirection } from "@ticket-app/ui/lib/i18n";
import { ChevronDown, Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const { direction } = useDirection();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const locales = Object.values(LOCALE_CONFIGS);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  const currentConfig = LOCALE_CONFIGS[locale];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
        aria-label="Change language"
      >
        <Globe className="h-4 w-4" />
        <span className="font-medium">{currentConfig.nativeName}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className={`
            absolute ${direction === "rtl" ? "left-0" : "right-0"} top-full mt-2 
            min-w-[160px] py-1 bg-background border border-border rounded-md shadow-lg z-50
          `}
        >
          {locales.map((config) => (
            <button
              key={config.locale}
              onClick={() => handleSelect(config.locale)}
              className={`
                w-full px-4 py-2 text-sm text-left hover:bg-accent transition-colors
                flex items-center justify-between
                ${locale === config.locale ? "bg-accent font-medium" : ""}
              `}
            >
              <span>{config.nativeName}</span>
              <span className="text-muted-foreground text-xs">{config.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
