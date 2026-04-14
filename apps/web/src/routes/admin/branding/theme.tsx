import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Label } from "@ticket-app/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ticket-app/ui/components/select";
import { Save, RotateCcw, Sun, Moon, Palette } from "lucide-react";

export const Route = createFileRoute("/admin/branding/theme")({
  loader: async () => {
    return {};
  },
  component: ThemeEditorRoute,
});

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface ThemeSettings {
  colors: ThemeColors;
  darkMode: {
    primary: string;
    secondary: string;
    accent: string;
  };
  borderRadius: "none" | "sm" | "md" | "lg" | "full";
  fontFamily: "sans" | "serif" | "mono";
}

const defaultTheme: ThemeSettings = {
  colors: {
    primary: "#6366f1",
    secondary: "#8b5cf6",
    accent: "#ec4899",
  },
  darkMode: {
    primary: "#818cf8",
    secondary: "#a78bfa",
    accent: "#f472b6",
  },
  borderRadius: "md",
  fontFamily: "sans",
};

const fontFamilies = [
  { value: "sans", label: "Sans Serif (Inter)" },
  { value: "serif", label: "Serif (Georgia)" },
  { value: "mono", label: "Monospace (Fira Code)" },
];

const borderRadiusOptions = [
  { value: "none", label: "None (0px)" },
  { value: "sm", label: "Small (4px)" },
  { value: "md", label: "Medium (8px)" },
  { value: "lg", label: "Large (16px)" },
  { value: "full", label: "Full (9999px)" },
];

function ThemeEditorRoute() {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [activePreview, setActivePreview] = useState<"light" | "dark">("light");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleReset = () => {
    setTheme(defaultTheme);
  };

  const getRadiusValue = (radius: ThemeSettings["borderRadius"]) => {
    const values = { none: "0px", sm: "4px", md: "8px", lg: "16px", full: "9999px" };
    return values[radius];
  };

  const getFontFamily = (font: ThemeSettings["fontFamily"]) => {
    const families = {
      sans: "system-ui, -apple-system, sans-serif",
      serif: "Georgia, Times New Roman, serif",
      mono: "Fira Code, Consolas, monospace",
    };
    return families[font];
  };

  const currentColors = activePreview === "light" ? theme.colors : theme.darkMode;
  const bgColor = activePreview === "light" ? "#ffffff" : "#0f172a";
  const textColor = activePreview === "light" ? "#0f172a" : "#f8fafc";

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Theme Editor</h1>
          <p className="text-muted-foreground">Customize colors, fonts, and visual appearance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Theme"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
              <CardDescription>Choose colors for light mode</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.colors.primary}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, primary: e.target.value },
                        }))
                      }
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <span className="text-sm font-mono">{theme.colors.primary}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.colors.secondary}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, secondary: e.target.value },
                        }))
                      }
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <span className="text-sm font-mono">{theme.colors.secondary}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.colors.accent}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, accent: e.target.value },
                        }))
                      }
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <span className="text-sm font-mono">{theme.colors.accent}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dark Mode Colors</CardTitle>
              <CardDescription>Customize colors for dark mode</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.darkMode.primary}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          darkMode: { ...prev.darkMode, primary: e.target.value },
                        }))
                      }
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <span className="text-sm font-mono">{theme.darkMode.primary}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.darkMode.secondary}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          darkMode: { ...prev.darkMode, secondary: e.target.value },
                        }))
                      }
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <span className="text-sm font-mono">{theme.darkMode.secondary}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.darkMode.accent}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          darkMode: { ...prev.darkMode, accent: e.target.value },
                        }))
                      }
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <span className="text-sm font-mono">{theme.darkMode.accent}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Border radius and font family</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Border Radius</Label>
                  <Select
                    value={theme.borderRadius}
                    onValueChange={(value) =>
                      setTheme((prev) => ({
                        ...prev,
                        borderRadius: value as ThemeSettings["borderRadius"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {borderRadiusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select
                    value={theme.fontFamily}
                    onValueChange={(value) =>
                      setTheme((prev) => ({
                        ...prev,
                        fontFamily: value as ThemeSettings["fontFamily"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={activePreview === "light" ? "default" : "ghost"}
                    size="icon-xs"
                    onClick={() => setActivePreview("light")}
                  >
                    <Sun className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={activePreview === "dark" ? "default" : "ghost"}
                    size="icon-xs"
                    onClick={() => setActivePreview("dark")}
                  >
                    <Moon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                {activePreview === "light" ? "Light mode preview" : "Dark mode preview"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-lg border p-4 space-y-4"
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                  borderRadius: getRadiusValue(theme.borderRadius),
                  fontFamily: getFontFamily(theme.fontFamily),
                }}
              >
                <div className="flex gap-2">
                  <div
                    className="h-10 w-10 rounded"
                    style={{ backgroundColor: currentColors.primary }}
                  />
                  <div
                    className="h-10 w-10 rounded"
                    style={{ backgroundColor: currentColors.secondary }}
                  />
                  <div
                    className="h-10 w-10 rounded"
                    style={{ backgroundColor: currentColors.accent }}
                  />
                </div>
                <div className="space-y-2">
                  <div
                    className="h-4 w-3/4 rounded"
                    style={{ backgroundColor: `${currentColors.primary}30` }}
                  />
                  <div
                    className="h-3 w-1/2 rounded"
                    style={{ backgroundColor: `${currentColors.primary}20` }}
                  />
                </div>
                <div
                  className="h-8 flex items-center justify-center text-white rounded"
                  style={{ backgroundColor: currentColors.primary }}
                >
                  Primary Button
                </div>
                <div
                  className="h-8 flex items-center justify-center rounded"
                  style={{
                    backgroundColor: currentColors.secondary,
                    color: activePreview === "dark" ? "#0f172a" : "#ffffff",
                  }}
                >
                  Secondary Button
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Color Swatches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(currentColors).map(([name, color]) => (
                  <div key={name} className="text-center">
                    <div
                      className="h-12 w-full rounded border"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs mt-1 block capitalize">{name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{color}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
