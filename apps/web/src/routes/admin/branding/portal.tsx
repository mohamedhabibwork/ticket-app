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
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Save, RotateCcw, Globe, Lock, Code, Eye } from "lucide-react";

export const Route = createFileRoute("/admin/branding/portal")({
  loader: async () => {
    return {};
  },
  component: PortalCustomizationRoute,
});

interface PortalSettings {
  portalName: string;
  hideUVDeskBranding: boolean;
  customFooterText: string;
  portalPrimaryColor: string;
  customCSS: string;
}

const defaultSettings: PortalSettings = {
  portalName: "Customer Support Portal",
  hideUVDeskBranding: false,
  customFooterText: "Powered by our support platform",
  portalPrimaryColor: "#6366f1",
  customCSS: "",
};

function PortalCustomizationRoute() {
  const [settings, setSettings] = useState<PortalSettings>(defaultSettings);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Portal Customization</h1>
          <p className="text-muted-foreground">Customize the customer support portal appearance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
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
        <div className={showPreview ? "col-span-7" : "col-span-8"}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Portal Identity</CardTitle>
                <CardDescription>Basic portal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="portalName">Portal Name</Label>
                  <Input
                    id="portalName"
                    value={settings.portalName}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, portalName: e.target.value }))
                    }
                    placeholder="Enter portal name"
                  />
                  <p className="text-xs text-muted-foreground">
                    This name will be displayed in the customer portal header
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hideUVDesk"
                    checked={settings.hideUVDeskBranding}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        hideUVDeskBranding: checked as boolean,
                      }))
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="hideUVDesk" className="font-normal">
                      Hide UVDesk Branding
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Removes UVDesk logo and branding from the customer portal (Enterprise feature)
                    </p>
                  </div>
                </div>
                {settings.hideUVDeskBranding && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Enterprise feature active - UVDesk branding will be hidden
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Colors & Footer</CardTitle>
                <CardDescription>Customize portal colors and footer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="portalColor">Portal Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="portalColor"
                      value={settings.portalPrimaryColor}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, portalPrimaryColor: e.target.value }))
                      }
                      className="h-10 w-20 rounded border cursor-pointer"
                    />
                    <Input
                      value={settings.portalPrimaryColor}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, portalPrimaryColor: e.target.value }))
                      }
                      className="w-32 font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This color will be used as the primary accent in the customer portal
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footerText">Custom Footer Text</Label>
                  <Textarea
                    id="footerText"
                    value={settings.customFooterText}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, customFooterText: e.target.value }))
                    }
                    placeholder="Enter custom footer text..."
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    This text will appear at the bottom of the customer portal
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Advanced: Custom CSS
                </CardTitle>
                <CardDescription>Add custom CSS to further customize the portal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customCSS">Custom CSS</Label>
                  <Textarea
                    id="customCSS"
                    value={settings.customCSS}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, customCSS: e.target.value }))
                    }
                    placeholder=".custom-class { color: red; }"
                    rows={6}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use with caution. Invalid CSS may break the portal appearance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {showPreview && (
          <div className="col-span-5">
            <Card>
              <CardHeader>
                <CardTitle>Portal Preview</CardTitle>
                <CardDescription>Live preview of your portal</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="rounded-lg border overflow-hidden"
                  style={{ borderColor: `${settings.portalPrimaryColor}30` }}
                >
                  <div
                    className="h-14 flex items-center px-4 gap-3"
                    style={{ backgroundColor: settings.portalPrimaryColor }}
                  >
                    <Globe className="h-6 w-6 text-white" />
                    <span className="text-white font-medium">{settings.portalName}</span>
                  </div>

                  <div className="p-4 bg-gray-50">
                    <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
                      <div className="h-6 w-1/3 rounded bg-gray-200" />
                      <div className="h-4 w-full rounded bg-gray-100" />
                      <div className="h-4 w-full rounded bg-gray-100" />
                      <div className="h-4 w-2/3 rounded bg-gray-100" />
                      <div
                        className="h-9 rounded flex items-center justify-center text-white text-sm mt-2"
                        style={{ backgroundColor: settings.portalPrimaryColor }}
                      >
                        Submit a Ticket
                      </div>
                    </div>

                    {!settings.hideUVDeskBranding && (
                      <div className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-400">
                        <span>Powered by</span>
                        <span className="font-medium">UVDesk</span>
                      </div>
                    )}

                    {settings.hideUVDeskBranding && (
                      <div className="mt-4 flex items-center justify-center">
                        <span className="text-xs text-gray-400">{settings.customFooterText}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
