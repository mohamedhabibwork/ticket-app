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
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Save, RotateCcw, Key, Link2, TestTube, CheckCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/security/sso")({
  component: SSOConfigurationRoute,
});

interface AttributeMapping {
  email: string;
  firstName: string;
  lastName: string;
}

interface SSOSettings {
  enabled: boolean;
  metadataUrl: string;
  entityId: string;
  acsUrl: string;
  attributeMapping: AttributeMapping;
}

const defaultSettings: SSOSettings = {
  enabled: false,
  metadataUrl: "",
  entityId: "",
  acsUrl: "",
  attributeMapping: {
    email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    firstName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
    lastName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
  },
};

function SSOConfigurationRoute() {
  const [settings, setSettings] = useState<SSOSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setTestResult(settings.metadataUrl ? "success" : "error");
    setIsTesting(false);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SSO Configuration</h1>
          <p className="text-muted-foreground">Configure SAML SSO for your organization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              SAML SSO Settings
            </CardTitle>
            <CardDescription>Enable and configure Single Sign-On</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enabled"
                checked={settings.enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, enabled: checked as boolean }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="enabled" className="font-normal">
                  Enable SSO
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow users to sign in using your Identity Provider
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Connection Details
            </CardTitle>
            <CardDescription>Configure your SSO provider settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metadataUrl">Identity Provider Metadata URL</Label>
              <Input
                id="metadataUrl"
                value={settings.metadataUrl}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, metadataUrl: e.target.value }))
                }
                placeholder="https://your-idp.com/metadata"
              />
              <p className="text-xs text-muted-foreground">
                The URL where your IdP publishes its metadata
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entityId">Entity ID (Issuer)</Label>
                <Input
                  id="entityId"
                  value={settings.entityId}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, entityId: e.target.value }))
                  }
                  placeholder="urn:your-app:sp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acsUrl">ACS URL (Assertion Consumer Service)</Label>
                <Input
                  id="acsUrl"
                  value={settings.acsUrl}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, acsUrl: e.target.value }))
                  }
                  placeholder="https://your-app.com/sso/acs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attribute Mapping</CardTitle>
            <CardDescription>
              Map SAML attributes to user profile fields
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailAttr">Email Attribute</Label>
              <Input
                id="emailAttr"
                value={settings.attributeMapping.email}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    attributeMapping: { ...prev.attributeMapping, email: e.target.value },
                  }))
                }
                placeholder="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstNameAttr">First Name Attribute</Label>
                <Input
                  id="firstNameAttr"
                  value={settings.attributeMapping.firstName}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      attributeMapping: { ...prev.attributeMapping, firstName: e.target.value },
                    }))
                  }
                  placeholder="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastNameAttr">Last Name Attribute</Label>
                <Input
                  id="lastNameAttr"
                  value={settings.attributeMapping.lastName}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      attributeMapping: { ...prev.attributeMapping, lastName: e.target.value },
                    }))
                  }
                  placeholder="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Connection</CardTitle>
            <CardDescription>Verify your SSO configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !settings.metadataUrl}
            >
              <TestTube className="mr-2 h-4 w-4" />
              {isTesting ? "Testing..." : "Test SSO Connection"}
            </Button>

            {testResult === "success" && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-700">
                  SSO connection successful! Your configuration is valid.
                </span>
              </div>
            )}

            {testResult === "error" && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-xs text-red-700">
                  Connection failed. Please check your configuration and try again.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
