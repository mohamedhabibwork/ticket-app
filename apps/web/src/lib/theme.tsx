"use client";

import { useTheme as useNextThemes } from "next-themes";
import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor?: string;
  backgroundColor?: string;
}

interface UseThemeReturn {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

export function useTheme(): UseThemeReturn {
  const { theme, setTheme, resolvedTheme } = useNextThemes();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return {
      theme: "system",
      resolvedTheme: "light",
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: false,
    };
  }

  return {
    theme: (theme as ThemeMode) || "system",
    resolvedTheme: resolvedTheme as "light" | "dark",
    setTheme,
    toggleTheme: () => {
      setTheme(resolvedTheme === "light" ? "dark" : "light");
    },
    isDark: resolvedTheme === "dark",
  };
}

export function getThemeVariables(
  mode: "light" | "dark",
  customPrimaryColor?: string,
  customBackgroundColor?: string
): Record<string, string> {
  const isDark = mode === "dark";

  const primaryColor = customPrimaryColor || "#2563eb";
  const backgroundColor = customBackgroundColor || (isDark ? "#0f172a" : "#ffffff");

  return {
    "--theme-primary": primaryColor,
    "--theme-background": backgroundColor,
    "--theme-foreground": isDark ? "#f1f5f9" : "#0f172a",
    "--theme-card": isDark ? "#1e293b" : "#ffffff",
    "--theme-card-foreground": isDark ? "#f1f5f9" : "#0f172a",
    "--theme-border": isDark ? "#334155" : "#e2e8f0",
    "--theme-input": isDark ? "#334155" : "#e2e8f0",
    "--theme-ring": primaryColor,
    "--theme-secondary": isDark ? "#334155" : "#f1f5f9",
    "--theme-secondary-foreground": isDark ? "#f1f5f9" : "#0f172a",
    "--theme-muted": isDark ? "#334155" : "#f1f5f9",
    "--theme-muted-foreground": isDark ? "#94a3b8" : "#64748b",
    "--theme-accent": isDark ? "#334155" : "#f1f5f9",
    "--theme-accent-foreground": isDark ? "#f1f5f9" : "#0f172a",
    "--theme-destructive": isDark ? "#7f1d1d" : "#fef2f2",
    "--theme-destructive-foreground": isDark ? "#fecaca" : "#991b1b",
    "--theme-success": isDark ? "#14532d" : "#f0fdf4",
    "--theme-success-foreground": isDark ? "#bbf7d0" : "#166534",
    "--theme-warning": isDark ? "#713f12" : "#fefce8",
    "--theme-warning-foreground": isDark ? "#fde68a" : "#a16207",
  };
}

export function applyThemeVariables(
  styleElement: HTMLStyleElement,
  variables: Record<string, string>
): void {
  const css = Object.entries(variables)
    .map(([key, value]) => `${key}: ${value};`)
    .join("\n");
  styleElement.textContent = `:root {\n${css}\n}`;
}
