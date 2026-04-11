import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ticket-app/ui/components/card";
import { Loader2, ArrowLeft, Languages, CheckCircle, AlertCircle } from "lucide-react";
import { orpc } from "@/utils/orpc";

function _formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export const Route = createFileRoute("/admin/settings/translation")({
  component: TranslationSettingsRoute,
});

function TranslationSettingsRoute() {
  const organizationId = 1;

  const [provider, setProvider] = useState<"google" | "deepl">("google");
  const [apiKey, setApiKey] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [isEnabled, setIsEnabled] = useState(true);

  const {
    data: config,
    isLoading,
    refetch,
  }: any = useQuery(
    orpc.translation.getConfig.queryOptions({
      organizationId,
    } as any),
  );

  const { data: usageStats }: any = useQuery(
    orpc.translation.getUsageStats.queryOptions({
      organizationId,
    } as any),
  );

  const createMutation = useMutation(
    orpc.translation.createConfig.mutationOptions({
      onSuccess: () => {
        toast.success("Translation configuration saved");
        refetch();
        setApiKey("");
      },
      onError: (error: any) => {
        toast.error(`Failed to save: ${error.message}`);
      },
    }) as any,
  );

  const updateMutation = useMutation(
    orpc.translation.updateConfig.mutationOptions({
      onSuccess: () => {
        toast.success("Translation configuration updated");
        refetch();
        setApiKey("");
      },
      onError: (error: any) => {
        toast.error(`Failed to update: ${error.message}`);
      },
    }) as any,
  );

  const deleteMutation = useMutation(
    orpc.translation.deleteConfig.mutationOptions({
      onSuccess: () => {
        toast.success("Translation configuration deleted");
        refetch();
      },
      onError: (error: any) => {
        toast.error(`Failed to delete: ${error.message}`);
      },
    }) as any,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim()) {
      toast.error("API key is required");
      return;
    }

    if (config) {
      updateMutation.mutate({
        organizationId,
        provider,
        apiKey: apiKey.trim(),
        isEnabled,
        updatedBy: 1,
      });
    } else {
      createMutation.mutate({
        organizationId,
        provider,
        apiKey: apiKey.trim(),
        createdBy: 1,
      });
    }
  };

  const _handleToggleEnabled = () => {
    if (!config) return;
    updateMutation.mutate({
      organizationId,
      isEnabled: !isEnabled,
      updatedBy: 1,
    });
    setIsEnabled(!isEnabled);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <Link to="/admin">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-purple-100 p-3">
            <Languages className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Translation Settings</h1>
            <p className="text-muted-foreground">
              Configure machine translation for ticket messages
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Translation Status</CardTitle>
            <CardDescription>
              Machine translation helps agents understand customer messages in different languages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {config ? (
              <div className="flex items-center justify-between p-4 rounded border bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Translation Active</p>
                    <p className="text-sm text-muted-foreground">
                      Provider: {(usageStats as any)?.provider || (config as any).provider} •
                      Target: {(config as any).targetLanguage?.toUpperCase() || "EN"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                      (config as any).isEnabled
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {(config as any).isEnabled ? "Enabled" : "Disabled"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (
                        confirm("Are you sure you want to delete the translation configuration?")
                      ) {
                        deleteMutation.mutate({ organizationId });
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded border bg-amber-50 dark:bg-amber-950/20">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium">Translation Not Configured</p>
                    <p className="text-sm text-muted-foreground">
                      Set up a translation provider to enable automatic translations
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{config ? "Update Configuration" : "Configure Translation"}</CardTitle>
            <CardDescription>
              Choose a translation provider and enter your API credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="provider"
                      value="google"
                      checked={provider === "google"}
                      onChange={() => setProvider("google")}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Google Translate</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="provider"
                      value="deepl"
                      checked={provider === "deepl"}
                      onChange={() => setProvider("deepl")}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">DeepL</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    config
                      ? "Leave empty to keep current key"
                      : provider === "google"
                        ? "Enter your Google Translate API key"
                        : "Enter your DeepL API key"
                  }
                />
                {provider === "google" ? (
                  <p className="text-xs text-muted-foreground">
                    Get your API key from{" "}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Google Cloud Console
                    </a>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Get your API key from{" "}
                    <a
                      href="https://www.deepl.com/pro-api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      DeepL Pro API
                    </a>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetLanguage">Default Target Language</Label>
                <select
                  id="targetLanguage"
                  className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="nl">Dutch</option>
                  <option value="pl">Polish</option>
                  <option value="ru">Russian</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                  <option value="ar">Arabic</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Agents will see translations in this language by default
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <Languages className="mr-2 h-4 w-4" />
                  )}
                  {config ? "Update Configuration" : "Save Configuration"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Provider</span>
              <span className="text-sm font-medium">
                {(usageStats as any)?.provider || "Not configured"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span
                className={`text-sm font-medium ${
                  (usageStats as any)?.isEnabled ? "text-green-600" : "text-gray-500"
                }`}
              >
                {(usageStats as any)?.isEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Translation usage is tracked per organization for billing purposes. Costs vary by
              provider - Google Translate charges per character, DeepL charges per character based
              on your plan.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
