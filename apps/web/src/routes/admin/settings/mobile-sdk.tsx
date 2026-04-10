import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Loader2, Smartphone, Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin/settings/mobile-sdk")({
  component: MobileSdkSettingsRoute,
});

function MobileSdkSettingsRoute() {
  const _queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android">("android");
  const [appBundleId, setAppBundleId] = useState("");
  const [fcmServerKey, setFcmServerKey] = useState("");
  const [apnsKeyId, setApnsKeyId] = useState("");
  const [apnsTeamId, setApnsTeamId] = useState("");
  const [apnsKey, setApnsKey] = useState("");
  const [apnsBundleId, setApnsBundleId] = useState("");

  const {
    data: configs,
    isLoading,
    refetch,
  } = useQuery(
    orpc.mobileSdk.listConfigs.queryOptions({
      organizationId: 1,
    }),
  );

  const createMutation = useMutation(
    orpc.mobileSdk.createConfig.mutationOptions({
      onSuccess: () => {
        refetch();
        setShowAddForm(false);
        resetForm();
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.mobileSdk.deleteConfig.mutationOptions({
      onSuccess: () => refetch(),
    }),
  );

  const updateMutation = useMutation(
    orpc.mobileSdk.updateConfig.mutationOptions({
      onSuccess: () => refetch(),
    }),
  );

  const resetForm = () => {
    setPlatform("android");
    setAppBundleId("");
    setFcmServerKey("");
    setApnsKeyId("");
    setApnsTeamId("");
    setApnsKey("");
    setApnsBundleId("");
  };

  const handleSubmit = () => {
    if (!appBundleId) return;

    createMutation.mutate({
      organizationId: 1,
      platform,
      appBundleId,
      fcmServerKey: platform === "android" ? fcmServerKey : undefined,
      apnsKeyId: platform === "ios" ? apnsKeyId : undefined,
      apnsTeamId: platform === "ios" ? apnsTeamId : undefined,
      apnsKey: platform === "ios" ? apnsKey : undefined,
      apnsBundleId: platform === "ios" ? apnsBundleId : undefined,
      isEnabled: true,
    });
  };

  const toggleEnabled = (id: number, currentEnabled: boolean) => {
    updateMutation.mutate({
      id,
      isEnabled: !currentEnabled,
    });
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-blue-100 p-3">
            <Smartphone className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mobile SDK Settings</h1>
            <p className="text-muted-foreground">
              Configure push notifications for iOS and Android mobile apps
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Firebase Cloud Messaging (FCM)</CardTitle>
            <CardDescription>Android push notification configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/20">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Setup Instructions:</strong>
              </p>
              <ol className="text-xs text-blue-700 dark:text-blue-300 mt-2 list-decimal list-inside space-y-1">
                <li>Create a Firebase project</li>
                <li>Enable Cloud Messaging</li>
                <li>Copy the Server Key from Firebase Console</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Apple Push Notification Service (APNs)</CardTitle>
            <CardDescription>iOS push notification configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded bg-purple-50 dark:bg-purple-950/20">
              <p className="text-sm text-purple-800 dark:text-purple-200">
                <strong>Setup Instructions:</strong>
              </p>
              <ol className="text-xs text-purple-700 dark:text-purple-300 mt-2 list-decimal list-inside space-y-1">
                <li>Create an Apple Developer account</li>
                <li>Create an App ID with Push Notifications capability</li>
                <li>Generate an APNs authentication key</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mobile SDK Configurations</CardTitle>
              <CardDescription>Manage your mobile app push notification settings</CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Configuration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : configs && configs.length > 0 ? (
            <div className="space-y-4">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`rounded-full p-2 ${
                        config.platform === "android" ? "bg-green-100" : "bg-purple-100"
                      }`}
                    >
                      <Smartphone
                        className={`h-5 w-5 ${
                          config.platform === "android" ? "text-green-600" : "text-purple-600"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-medium">{config.appBundleId}</p>
                      <p className="text-sm text-muted-foreground">
                        {config.platform === "android" ? "Android (FCM)" : "iOS (APNs)"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleEnabled(config.id, !!config.isEnabled)}
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                        config.isEnabled
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {config.isEnabled ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          Disabled
                        </>
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this configuration?")) {
                          deleteMutation.mutate({ id: config.id });
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Smartphone className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No mobile SDK configurations</p>
              <p className="text-sm">Add a configuration to enable push notifications</p>
            </div>
          )}
        </CardContent>
      </Card>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Mobile SDK Configuration</CardTitle>
            <CardDescription>Enter your push notification credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setPlatform("android")}
                  className={`flex items-center gap-2 px-4 py-2 rounded border ${
                    platform === "android"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-300"
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  Android
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform("ios")}
                  className={`flex items-center gap-2 px-4 py-2 rounded border ${
                    platform === "ios"
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-gray-300"
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  iOS
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appBundleId">App Bundle ID</Label>
              <Input
                id="appBundleId"
                placeholder={platform === "android" ? "com.example.app" : "com.example.app"}
                value={appBundleId}
                onChange={(e) => setAppBundleId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {platform === "android"
                  ? "Firebase package name (applicationId)"
                  : "iOS Bundle Identifier (e.g., com.company.app)"}
              </p>
            </div>

            {platform === "android" && (
              <div className="space-y-2">
                <Label htmlFor="fcmServerKey">FCM Server Key</Label>
                <Input
                  id="fcmServerKey"
                  type="password"
                  placeholder="Enter your FCM server key"
                  value={fcmServerKey}
                  onChange={(e) => setFcmServerKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Found in Firebase Console &gt; Project Settings &gt; Cloud Messaging
                </p>
              </div>
            )}

            {platform === "ios" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apnsBundleId">APNs Bundle ID</Label>
                  <Input
                    id="apnsBundleId"
                    placeholder="com.example.app"
                    value={apnsBundleId}
                    onChange={(e) => setApnsBundleId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apnsKeyId">APNs Key ID</Label>
                  <Input
                    id="apnsKeyId"
                    placeholder="ABC123DEF456"
                    value={apnsKeyId}
                    onChange={(e) => setApnsKeyId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apnsTeamId">Apple Team ID</Label>
                  <Input
                    id="apnsTeamId"
                    placeholder="ABC1234567"
                    value={apnsTeamId}
                    onChange={(e) => setApnsTeamId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apnsKey">APNs Private Key</Label>
                  <Input
                    id="apnsKey"
                    type="password"
                    placeholder="Enter your APNs private key (p8 file content)"
                    value={apnsKey}
                    onChange={(e) => setApnsKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Download from Apple Developer &gt; Certificates, Keys &amp; Profiles
                  </p>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={
                  !appBundleId ||
                  (platform === "android" && !fcmServerKey) ||
                  (platform === "ios" && (!apnsKeyId || !apnsTeamId || !apnsKey)) ||
                  createMutation.isPending
                }
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Configuration
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
