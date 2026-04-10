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
import { Textarea } from "@ticket-app/ui/components/textarea";
import {
  Save,
  RotateCcw,
  Upload,
  Mail,
  Globe,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
} from "lucide-react";

export const Route = createFileRoute("/admin/branding/email")({
  component: EmailTemplateCustomizationRoute,
});

interface EmailBranding {
  headerLogo: string | null;
  footerText: string;
  headerBackgroundColor: string;
  borderColor: string;
  socialLinks: {
    twitter: string;
    facebook: string;
    linkedin: string;
    instagram: string;
  };
}

const defaultBranding: EmailBranding = {
  headerLogo: null,
  footerText: "© 2024 Your Company. All rights reserved.",
  headerBackgroundColor: "#6366f1",
  borderColor: "#e5e7eb",
  socialLinks: {
    twitter: "",
    facebook: "",
    linkedin: "",
    instagram: "",
  },
};

function EmailTemplateCustomizationRoute() {
  const [branding, setBranding] = useState<EmailBranding>(defaultBranding);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewLogo(reader.result as string);
        setBranding((prev) => ({ ...prev, headerLogo: reader.result as string }));
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
    setBranding(defaultBranding);
    setPreviewLogo(null);
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Template Customization</h1>
          <p className="text-muted-foreground">
            Customize email templates with your brand identity
          </p>
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
              <CardTitle>Email Header</CardTitle>
              <CardDescription>Upload your email header logo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Header Logo</Label>
                <div className="flex items-center gap-4">
                  <div
                    className="h-16 w-64 border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden"
                    style={{ borderColor: branding.borderColor }}
                  >
                    {previewLogo ? (
                      <img
                        src={previewLogo}
                        alt="Header Logo"
                        className="max-h-12 object-contain"
                      />
                    ) : (
                      <Mail className="h-8 w-8 text-muted-foreground" />
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
                  Recommended size: 200x60px. Max file size: 2MB
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="headerBg">Header Background Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="headerBg"
                      value={branding.headerBackgroundColor}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, headerBackgroundColor: e.target.value }))
                      }
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <Input
                      value={branding.headerBackgroundColor}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, headerBackgroundColor: e.target.value }))
                      }
                      className="w-28 font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="borderColor">Border Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="borderColor"
                      value={branding.borderColor}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, borderColor: e.target.value }))
                      }
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <Input
                      value={branding.borderColor}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, borderColor: e.target.value }))
                      }
                      className="w-28 font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Footer</CardTitle>
              <CardDescription>Customize the footer text and social links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="footerText">Footer Text</Label>
                <Textarea
                  id="footerText"
                  value={branding.footerText}
                  onChange={(e) => setBranding((prev) => ({ ...prev, footerText: e.target.value }))}
                  placeholder="Enter footer text..."
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label>Social Media Links</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={branding.socialLinks.twitter}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, twitter: e.target.value },
                        }))
                      }
                      placeholder="Twitter URL"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={branding.socialLinks.facebook}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, facebook: e.target.value },
                        }))
                      }
                      placeholder="Facebook URL"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={branding.socialLinks.linkedin}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, linkedin: e.target.value },
                        }))
                      }
                      placeholder="LinkedIn URL"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={branding.socialLinks.instagram}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, instagram: e.target.value },
                        }))
                      }
                      placeholder="Instagram URL"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Email Preview</CardTitle>
              <CardDescription>See how your email template will look</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-lg border overflow-hidden"
                style={{ borderColor: branding.borderColor }}
              >
                <div
                  className="h-20 flex items-center px-6 gap-4"
                  style={{ backgroundColor: branding.headerBackgroundColor }}
                >
                  {previewLogo ? (
                    <img
                      src={previewLogo}
                      alt="Logo"
                      className="h-10 object-contain brightness invert"
                    />
                  ) : (
                    <Globe className="h-8 w-8 text-white" />
                  )}
                </div>

                <div className="p-6 bg-white">
                  <div className="mb-4">
                    <h3 className="font-medium mb-2">Email Subject Line</h3>
                    <div className="h-3 w-3/4 rounded bg-gray-200" />
                    <div className="h-3 w-1/2 rounded bg-gray-200 mt-2" />
                  </div>
                  <div className="h-32 bg-gray-50 rounded mb-4 flex items-center justify-center">
                    <span className="text-gray-400">Email Content Area</span>
                  </div>
                </div>

                <div className="px-6 py-4 border-t" style={{ borderColor: branding.borderColor }}>
                  <p className="text-xs text-gray-500 mb-3">{branding.footerText}</p>
                  <div className="flex gap-3">
                    {branding.socialLinks.twitter && <Twitter className="h-4 w-4 text-gray-400" />}
                    {branding.socialLinks.facebook && (
                      <Facebook className="h-4 w-4 text-gray-400" />
                    )}
                    {branding.socialLinks.linkedin && (
                      <Linkedin className="h-4 w-4 text-gray-400" />
                    )}
                    {branding.socialLinks.instagram && (
                      <Instagram className="h-4 w-4 text-gray-400" />
                    )}
                    {!branding.socialLinks.twitter &&
                      !branding.socialLinks.facebook &&
                      !branding.socialLinks.linkedin &&
                      !branding.socialLinks.instagram && (
                        <span className="text-xs text-gray-400">No social links configured</span>
                      )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
