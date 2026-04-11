import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
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
import { Loader2, ArrowLeft, Save, Play, Eye, EyeOff } from "lucide-react";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin/mailboxes/id/configure")({
  component: MailboxConfigureRoute,
});

function MailboxConfigureRoute() {
  const { id } = useParams({ from: "/admin/mailboxes/$id/configure" });
  const navigate = useNavigate();
  const mailboxId = Number(id);

  const organizationId = 1;

  const { data: mailbox, isLoading } = useQuery(
    orpc.mailboxes.get.queryOptions({
      id: mailboxId,
      organizationId,
    }) as any,
  );

  const [showPassword, setShowPassword] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [formData, setFormData] = useState({
    imapHost: "",
    imapPort: "993",
    imapUsername: "",
    imapPassword: "",
    imapSsl: true,
    smtpHost: "",
    smtpPort: "587",
    smtpUsername: "",
    smtpPassword: "",
    smtpSsl: true,
  });

  useState(() => {
    if (mailbox) {
      setFormData({
        imapHost: mailbox.imapConfig?.host || "",
        imapPort: mailbox.imapConfig?.port?.toString() || "993",
        imapUsername: mailbox.imapConfig?.username || "",
        imapPassword: "",
        imapSsl: mailbox.imapConfig?.useSsl ?? true,
        smtpHost: mailbox.smtpConfig?.host || "",
        smtpPort: mailbox.smtpConfig?.port?.toString() || "587",
        smtpUsername: mailbox.smtpConfig?.username || "",
        smtpPassword: "",
        smtpSsl: mailbox.smtpConfig?.useTls ?? true,
      });
    }
  });

  const configureImapMutation = useMutation(
    orpc.mailboxes.configureImap.mutationOptions({
      onSuccess: () => {
        navigate({ to: "/admin/mailboxes/$id", params: { id } });
      },
    }),
  );

  const configureSmtpMutation = useMutation(
    orpc.mailboxes.configureSmtp.mutationOptions({
      onSuccess: () => {
        navigate({ to: "/admin/mailboxes/$id", params: { id } });
      },
    }),
  );

  const testConnectionMutation = useMutation(
    orpc.mailboxes.testConnection.mutationOptions({
      onSuccess: (result) => {
        if (result.success) {
          alert("Connection successful!");
        } else {
          alert(`Connection failed: ${result.error}`);
        }
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    configureImapMutation.mutate({
      id: mailboxId,
      organizationId,
      host: formData.imapHost,
      port: Number(formData.imapPort),
      username: formData.imapUsername,
      password: formData.imapPassword,
      useSsl: formData.imapSsl,
    });
    configureSmtpMutation.mutate({
      id: mailboxId,
      organizationId,
      host: formData.smtpHost,
      port: Number(formData.smtpPort),
      username: formData.smtpUsername,
      password: formData.smtpPassword,
      useSsl: formData.smtpSsl,
    });
  };

  const handleGmailOAuth = () => {
    window.open(`/api/oauth/gmail?mailboxId=${mailboxId}`, `_blank`, `width=600,height=700`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <Link to="/admin/mailboxes/$id" params={{ id }}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Mailbox
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Configure Mailbox</h1>
        <p className="text-muted-foreground">Set up email server connection settings</p>
      </div>

      {mailbox?.connectionType === "gmail_oauth" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Gmail OAuth</CardTitle>
            <CardDescription>Connect using Google OAuth for secure access</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGmailOAuth}>Connect with Google</Button>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>IMAP Settings</CardTitle>
            <CardDescription>Configure incoming email server (IMAP)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="imapHost">IMAP Host</Label>
                <Input
                  id="imapHost"
                  value={formData.imapHost}
                  onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                  placeholder="imap.gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imapPort">Port</Label>
                <Input
                  id="imapPort"
                  type="number"
                  value={formData.imapPort}
                  onChange={(e) => setFormData({ ...formData, imapPort: e.target.value })}
                  placeholder="993"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imapUsername">Username</Label>
              <Input
                id="imapUsername"
                value={formData.imapUsername}
                onChange={(e) => setFormData({ ...formData, imapUsername: e.target.value })}
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imapPassword">Password / App Password</Label>
              <div className="relative">
                <Input
                  id="imapPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.imapPassword}
                  onChange={(e) => setFormData({ ...formData, imapPassword: e.target.value })}
                  placeholder={mailbox?.imapConfig?.passwordEnc ? "••••••••" : "Enter password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="imapSsl"
                checked={formData.imapSsl}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, imapSsl: checked as boolean })
                }
              />
              <Label htmlFor="imapSsl" className="font-normal">
                Use SSL/TLS
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SMTP Settings</CardTitle>
            <CardDescription>Configure outgoing email server (SMTP)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  value={formData.smtpHost}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">Port</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={formData.smtpPort}
                  onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })}
                  placeholder="587"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpUsername">Username</Label>
              <Input
                id="smtpUsername"
                value={formData.smtpUsername}
                onChange={(e) => setFormData({ ...formData, smtpUsername: e.target.value })}
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpPassword">Password / App Password</Label>
              <div className="relative">
                <Input
                  id="smtpPassword"
                  type={showSmtpPassword ? "text" : "password"}
                  value={formData.smtpPassword}
                  onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                  placeholder={mailbox?.smtpConfig?.passwordEnc ? "••••••••" : "Enter password"}
                />
                <button
                  type="button"
                  onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="smtpSsl"
                checked={formData.smtpSsl}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, smtpSsl: checked as boolean })
                }
              />
              <Label htmlFor="smtpSsl" className="font-normal">
                Use SSL/TLS
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => testConnectionMutation.mutate({ id: mailboxId, organizationId })}
            disabled={testConnectionMutation.isPending}
          >
            {testConnectionMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Test Connection
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/admin/mailboxes/$id", params: { id } })}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={configureImapMutation.isPending || configureSmtpMutation.isPending}
            >
              {(configureImapMutation.isPending || configureSmtpMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
