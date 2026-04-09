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
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Save, RotateCcw, Upload, Globe } from "lucide-react";

export const Route = createFileRoute("/admin/branding/")({
  component: BrandingSettingsRoute,
});

interface BrandingSettings {
  headerLogo: string | null;
  favicon: string | null;
  companyName: string;
  primaryColor: string;
}

const defaultSettings: BrandingSettings = {
  headerLogo: null,
  favicon: null,
  companyName: "Support Platform",
  primaryColor: "#6366f1",
};

function BrandingSettingsRoute() {
  const [settings, setSettings] = useState<BrandingSettings>(defaultSettings);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [previewFavicon, setPreviewFavicon] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewLogo(reader.result as string);
        setSettings((prev) => ({ ...prev, headerLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewFavicon(reader.result as string);
        setSettings((prev) => ({ ...prev, favicon: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setPreviewLogo(null);
    setPreviewFavicon(null);
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Branding Settings</h1>
          <p className="text-muted-foreground">Customize your support platform appearance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo Settings</CardTitle>
              <CardDescription>Upload your company logo and favicon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Header Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-48 border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                    {previewLogo ? (
                      <img src={previewLogo} alt="Header Logo" className="max-h-10 object-contain" />
                    ) : (
                      <Globe className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Logo
                      </span>
                    </Button>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended size: 200x50px. Max file size: 2MB
                </p>
              </div>

              <div className="space-y-2">
                <Label>Favicon</Label>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                    {previewFavicon ? (
                      <img src={previewFavicon} alt="Favicon" className="h-8 w-8 object-contain" />
                    ) : (
                      <Globe className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFaviconUpload}
                      className="hidden"
                    />
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Favicon
                      </span>
                    </Button>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended size: 32x32px or 16x16px. ICO, PNG, or SVG format.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic information about your company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={settings.companyName}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, companyName: e.target.value }))
                  }
                  placeholder="Enter your company name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    id="primaryColor"
                    value={settings.primaryColor}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    placeholder="#6366f1"
                    className="w-32 font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This color will be used as the primary accent across your platform
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>See how your branding will look</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-lg border overflow-hidden"
                style={{ borderColor: settings.primaryColor }}
              >
                <div
                  className="h-16 flex items-center px-4 gap-3"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  {previewLogo ? (
                    <img src={previewLogo} alt="Logo" className="h-8 object-contain brightness invert" />
                  ) : (
                    <Globe className="h-6 w-6 text-white" />
                  )}
                  <span className="text-white font-medium">{settings.companyName}</span>
                </div>
                <div className="p-4 bg-background">
                  <div className="space-y-2">
                    <div className="h-4 rounded" style={{ backgroundColor: `${settings.primaryColor}20` }} />
                    <div className="h-3 w-3/4 rounded" style={{ backgroundColor: `${settings.primaryColor}15` }} />
                    <div className="h-3 w-1/2 rounded" style={{ backgroundColor: `${settings.primaryColor}10` }} />
                    <div
                      className="h-8 mt-4 rounded flex items-center justify-center text-white text-sm"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      Sample Button
                    </div>
                  </div>
                </div>
              </div>
              {previewFavicon && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Favicon preview:</span>
                  <img src={previewFavicon} alt="Favicon" className="h-6 w-6" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
