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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ticket-app/ui/components/select";
import { Save, RotateCcw, Shield, Clock, Key, FileText, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/security/")({
  component: SecuritySettingsRoute,
});

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

interface SecuritySettings {
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number;
  enforce2FA: boolean;
  ipWhitelistEnabled: boolean;
  auditLogRetention: number;
}

const defaultSettings: SecuritySettings = {
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },
  sessionTimeout: 30,
  enforce2FA: false,
  ipWhitelistEnabled: false,
  auditLogRetention: 90,
};

const sessionTimeoutOptions = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "480", label: "8 hours" },
];

const retentionOptions = [
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "1 year" },
];

function SecuritySettingsRoute() {
  const [settings, setSettings] = useState<SecuritySettings>(defaultSettings);
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
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Settings</h1>
          <p className="text-muted-foreground">
            Manage password policies, sessions, and security features
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

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Password Policy
            </CardTitle>
            <CardDescription>Configure minimum password requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="minLength">Minimum Password Length</Label>
              <Input
                id="minLength"
                type="number"
                min={6}
                max={128}
                value={settings.passwordPolicy.minLength}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    passwordPolicy: {
                      ...prev.passwordPolicy,
                      minLength: parseInt(e.target.value) || 8,
                    },
                  }))
                }
                className="w-32"
              />
            </div>

            <div className="space-y-3">
              <Label>Password Requirements</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requireUppercase"
                    checked={settings.passwordPolicy.requireUppercase}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        passwordPolicy: {
                          ...prev.passwordPolicy,
                          requireUppercase: checked as boolean,
                        },
                      }))
                    }
                  />
                  <Label htmlFor="requireUppercase" className="font-normal">
                    Require at least one uppercase letter (A-Z)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requireLowercase"
                    checked={settings.passwordPolicy.requireLowercase}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        passwordPolicy: {
                          ...prev.passwordPolicy,
                          requireLowercase: checked as boolean,
                        },
                      }))
                    }
                  />
                  <Label htmlFor="requireLowercase" className="font-normal">
                    Require at least one lowercase letter (a-z)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requireNumbers"
                    checked={settings.passwordPolicy.requireNumbers}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        passwordPolicy: {
                          ...prev.passwordPolicy,
                          requireNumbers: checked as boolean,
                        },
                      }))
                    }
                  />
                  <Label htmlFor="requireNumbers" className="font-normal">
                    Require at least one number (0-9)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requireSpecialChars"
                    checked={settings.passwordPolicy.requireSpecialChars}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        passwordPolicy: {
                          ...prev.passwordPolicy,
                          requireSpecialChars: checked as boolean,
                        },
                      }))
                    }
                  />
                  <Label htmlFor="requireSpecialChars" className="font-normal">
                    Require at least one special character (!@#$%^&*)
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Session Settings
            </CardTitle>
            <CardDescription>Manage session timeout and security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Session Timeout</Label>
              <Select
                value={String(settings.sessionTimeout)}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, sessionTimeout: parseInt(value) }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sessionTimeoutOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Users will be logged out after this period of inactivity
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>Enforce 2FA for all users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enforce2FA"
                checked={settings.enforce2FA}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, enforce2FA: checked as boolean }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="enforce2FA" className="font-normal">
                  Require 2FA for all users
                </Label>
                <p className="text-xs text-muted-foreground">
                  All users will be required to enable two-factor authentication
                </p>
              </div>
            </div>
            {settings.enforce2FA && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-700">
                  Users who have not set up 2FA will be prompted to do so on their next login
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Log Retention
            </CardTitle>
            <CardDescription>Configure how long audit logs are kept</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Retention Period</Label>
              <Select
                value={String(settings.auditLogRetention)}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, auditLogRetention: parseInt(value) }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {retentionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Audit logs older than this period will be automatically deleted
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>IP Whitelist</CardTitle>
            <CardDescription>Enable IP-based access restriction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ipWhitelistEnabled"
                checked={settings.ipWhitelistEnabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, ipWhitelistEnabled: checked as boolean }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="ipWhitelistEnabled" className="font-normal">
                  Enable IP Whitelist
                </Label>
                <p className="text-xs text-muted-foreground">
                  Only allow access from whitelisted IP addresses
                </p>
              </div>
            </div>
            {settings.ipWhitelistEnabled && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-700">
                  Configure IP ranges in the IP Whitelist section
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
