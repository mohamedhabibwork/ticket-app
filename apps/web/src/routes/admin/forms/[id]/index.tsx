import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ticket-app/ui/components/select";
import { ArrowLeft, Save, Copy, Check, Settings, Globe, Shield, Code, Zap } from "lucide-react";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin/forms/id/")({
  component: FormSettingsRoute,
});

function FormSettingsRoute() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/admin/forms/id/" });
  const formId = Number(id);

  const {
    data: form,
    isLoading,
    refetch,
  } = useQuery(
    orpc.forms.get.queryOptions({
      id: formId,
      organizationId: 1,
    }),
  );

  const updateMutation = useMutation(
    orpc.forms.update?.mutationOptions({
      onSuccess: () => refetch(),
    }),
  );

  const [formSettings, setFormSettings] = useState({
    name: form?.name || "",
    description: form?.description || "",
    submitButtonText: form?.submitButtonText || "Submit",
    successMessage: form?.successMessage || "Thank you for your submission!",
    redirectUrl: form?.redirectUrl || "",
    captchaEnabled: form?.captchaEnabled || false,
    captchaType: "recaptcha_v3" as "recaptcha_v3" | "hcaptcha",
    captchaSiteKey: "",
    notificationEmails: "",
    isPublished: form?.isPublished || false,
  });

  const [embedCode, setEmbedCode] = useState("");
  const [copied, setCopied] = useState(false);

  const generateEmbedCode = () => {
    const iframeCode = `<iframe src="${window.location.origin}/forms/${formId}" width="100%" height="800" frameborder="0"></iframe>`;
    const _jsCode = `<script>!function(){var f=document.createElement('iframe');f.src='/forms/${formId}',f.width='100%',f.height='800',f.frameBorder=0,document.body.appendChild(f)}();</script>`;
    setEmbedCode(iframeCode);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    updateMutation?.mutate({
      id: formId,
      name: formSettings.name,
      description: formSettings.description,
      submitButtonText: formSettings.submitButtonText,
      successMessage: formSettings.successMessage,
      redirectUrl: formSettings.redirectUrl || undefined,
      captchaEnabled: formSettings.captchaEnabled,
      isPublished: formSettings.isPublished,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Form not found</p>
            <Link to="/admin/forms/">
              <Button variant="outline" className="mt-4">
                Back to Forms
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <Link to="/admin/forms/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Forms
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Form Settings</h1>
            <p className="text-muted-foreground">Configure your form behavior and appearance</p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isPublished"
              checked={formSettings.isPublished}
              onCheckedChange={(checked) =>
                setFormSettings({ ...formSettings, isPublished: checked as boolean })
              }
            />
            <Label htmlFor="isPublished" className="font-normal">
              Published
            </Label>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>Basic form configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Form Name *</Label>
              <Input
                id="name"
                value={formSettings.name}
                onChange={(e) => setFormSettings({ ...formSettings, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formSettings.description}
                onChange={(e) => setFormSettings({ ...formSettings, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submitButtonText">Submit Button Text</Label>
              <Input
                id="submitButtonText"
                value={formSettings.submitButtonText}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, submitButtonText: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Submission Settings
            </CardTitle>
            <CardDescription>Configure what happens after form submission</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="successMessage">Success Message</Label>
              <Textarea
                id="successMessage"
                value={formSettings.successMessage}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, successMessage: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redirectUrl">Redirect URL (optional)</Label>
              <Input
                id="redirectUrl"
                type="url"
                value={formSettings.redirectUrl}
                onChange={(e) => setFormSettings({ ...formSettings, redirectUrl: e.target.value })}
                placeholder="https://example.com/thank-you"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to show success message instead
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notificationEmails">Notification Emails</Label>
              <Textarea
                id="notificationEmails"
                value={formSettings.notificationEmails}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, notificationEmails: e.target.value })
                }
                rows={2}
                placeholder="email@example.com&#10;another@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Receive notifications for new submissions (one per line)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              CAPTCHA Configuration
            </CardTitle>
            <CardDescription>Protect your form from spam</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="captchaEnabled"
                checked={formSettings.captchaEnabled}
                onCheckedChange={(checked) =>
                  setFormSettings({ ...formSettings, captchaEnabled: checked as boolean })
                }
              />
              <Label htmlFor="captchaEnabled" className="font-normal">
                Enable CAPTCHA
              </Label>
            </div>
            {formSettings.captchaEnabled && (
              <>
                <div className="space-y-2">
                  <Label>CAPTCHA Provider</Label>
                  <Select
                    value={formSettings.captchaType}
                    onValueChange={(value: "recaptcha_v3" | "hcaptcha") =>
                      setFormSettings({ ...formSettings, captchaType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recaptcha_v3">reCAPTCHA v3</SelectItem>
                      <SelectItem value="hcaptcha">hCaptcha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="captchaSiteKey">Site Key</Label>
                  <Input
                    id="captchaSiteKey"
                    value={formSettings.captchaSiteKey}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, captchaSiteKey: e.target.value })
                    }
                    placeholder="Enter your CAPTCHA site key"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Embed Code
            </CardTitle>
            <CardDescription>Embed this form on your website</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Embed Type</Label>
              <Select
                defaultValue="iframe"
                onValueChange={(value) => {
                  if (value === "iframe") {
                    setEmbedCode(
                      `&lt;iframe src="${window.location.origin}/forms/${formId}" width="100%" height="800" frameborder="0"&gt;&lt;/iframe&gt;`,
                    );
                  } else {
                    setEmbedCode(
                      `&lt;script&gt;!function(){var f=document.createElement('iframe');f.src='/forms/${formId}',f.width='100%',f.height='800',f.frameBorder=0,document.body.appendChild(f)}();&lt;/script&gt;`,
                    );
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iframe">iFrame</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Embed Code</Label>
                <Button variant="ghost" size="sm" onClick={generateEmbedCode}>
                  Generate
                </Button>
              </div>
              <Textarea value={embedCode} readOnly rows={4} className="font-mono text-xs" />
            </div>
            {embedCode && (
              <Button onClick={copyToClipboard}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Copied!" : "Copy Code"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Ticket Mapping
            </CardTitle>
            <CardDescription>Map form fields to ticket fields</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Ticket mapping allows you to auto-populate ticket fields from form submissions.</p>
              <p className="text-sm mt-2">This feature will be available in a future update.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/admin/forms/" })}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
