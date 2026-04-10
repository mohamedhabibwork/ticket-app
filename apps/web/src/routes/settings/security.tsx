import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@ticket-app/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ticket-app/ui/components/tabs";
import { Loader2, ArrowLeft, Shield, Smartphone, Key, Globe, Trash2, Monitor } from "lucide-react";

export const Route = createFileRoute("/settings/security")({
  component: SecuritySettingsRoute,
});

function SecuritySettingsRoute() {
  const queryClient = useQueryClient();
  const [show2FASetup, setShow2FASetup] = useState(false);

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryFn: () => [
      {
        id: 1,
        device: "Chrome on MacOS",
        location: "San Francisco, CA",
        ip: "192.168.1.1",
        lastActive: new Date().toISOString(),
        current: true,
      },
      {
        id: 2,
        device: "Safari on iPhone",
        location: "San Francisco, CA",
        ip: "192.168.1.2",
        lastActive: new Date(Date.now() - 86400000).toISOString(),
        current: false,
      },
    ],
    queryKey: ["sessions"],
  });

  const { data: apiKeys } = useQuery({
    queryFn: () => [
      {
        id: 1,
        name: "Production API Key",
        prefix: "sk_live_xxxx",
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        lastUsed: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    queryKey: ["apiKeys"],
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (_sessionId: number) => {
      return true;
    },
    onSuccess: () => {
      toast.success("Session revoked");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: async (_keyId: number) => {
      return true;
    },
    onSuccess: () => {
      toast.success("API key deleted");
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });

  const handleRevokeSession = (_sessionId: number) => {
    if (confirm("Are you sure you want to revoke this session?")) {
      revokeSessionMutation.mutate(sessionId);
    }
  };

  const handleDeleteApiKey = (_keyId: number) => {
    if (confirm("Are you sure you want to delete this API key?")) {
      deleteApiKeyMutation.mutate(keyId);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Security Settings</h1>
          <p className="text-muted-foreground">Manage your account security</p>
        </div>
      </div>

      <Tabs defaultValue="2fa">
        <TabsList className="w-full">
          <TabsTrigger value="2fa" className="flex-1">
            <Shield className="h-4 w-4 mr-2" />
            2FA
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex-1">
            <Monitor className="h-4 w-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="apikeys" className="flex-1">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
        </TabsList>

        <TabsContent value="2fa" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {show2FASetup ? (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Scan this QR code with your authenticator app:
                    </p>
                    <div className="w-48 h-48 bg-white mx-auto flex items-center justify-center rounded border">
                      <span className="text-muted-foreground">QR Code Placeholder</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Or enter this code manually:</Label>
                    <Input value="JBSWY3DPEHPK3PXP" readOnly className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>Enter the 6-digit code from your app:</Label>
                    <Input placeholder="000000" maxLength={6} className="font-mono text-center" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setShow2FASetup(false)}>Verify</Button>
                    <Button variant="ghost" onClick={() => setShow2FASetup(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-green-600" />
                      <div>
                        <div className="font-medium">2FA is not enabled</div>
                        <div className="text-sm text-muted-foreground">
                          Protect your account with two-factor authentication
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => setShow2FASetup(true)}>Enable 2FA</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>Manage devices that are logged into your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              ) : (
                sessions?.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {session.device}
                          {session.current && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {session.location} • {session.ip}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Last active: {formatDate(session.lastActive)}
                        </div>
                      </div>
                    </div>
                    {!session.current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Revoke
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apikeys" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>Manage API keys for accessing the API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="mb-4">
                <Key className="h-4 w-4 mr-2" />
                Create New API Key
              </Button>

              {apiKeys?.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{key.name}</div>
                    <div className="text-sm text-muted-foreground font-mono">{key.prefix}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Created: {formatDate(key.createdAt)} • Last used: {formatDate(key.lastUsed)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteApiKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
