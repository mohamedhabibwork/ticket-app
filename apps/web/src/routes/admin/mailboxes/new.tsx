import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { orpc } from "@/utils/orpc";

const CONNECTION_TYPES = [
  { value: "imap_smtp", label: "IMAP/SMTP" },
  { value: "gmail_oauth", label: "Gmail OAuth" },
  { value: "outlook_oauth", label: "Microsoft Outlook OAuth" },
  { value: "pop3_smtp", label: "POP3/SMTP" },
];

export const Route = createFileRoute("/admin/mailboxes/new")({
  component: AddMailboxRoute,
});

function AddMailboxRoute() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    connectionType: "imap_smtp",
    defaultTeamId: undefined as number | undefined,
    autoReplyEnabled: false,
    autoReplySubject: "",
    autoReplyBodyHtml: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: teams }: any = useQuery(
    orpc.teams.list.queryOptions({
      organizationId: 1,
    } as any),
  );

  const createMutation = useMutation(
    orpc.mailboxes.create.mutationOptions({
      onSuccess: (data: any) => {
        navigate({ to: "/admin/mailboxes/id", params: { id: String(data.id) } });
      },
    }) as any,
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (formData.autoReplyEnabled) {
      if (!formData.autoReplySubject.trim()) {
        newErrors.autoReplySubject = "Auto-reply subject is required when enabled";
      }
      if (!formData.autoReplyBodyHtml.trim()) {
        newErrors.autoReplyBodyHtml = "Auto-reply body is required when enabled";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    createMutation.mutate({
      organizationId: 1,
      name: formData.name,
      email: formData.email,
      connectionType: formData.connectionType as
        | "imap_smtp"
        | "gmail_oauth"
        | "outlook_oauth"
        | "pop3_smtp",
      defaultTeamId: formData.defaultTeamId,
      autoReplyEnabled: formData.autoReplyEnabled,
      autoReplySubject: formData.autoReplySubject || undefined,
      autoReplyBodyHtml: formData.autoReplyBodyHtml || undefined,
    } as any);
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/admin/mailboxes" })}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Mailboxes
        </Button>
        <h1 className="text-2xl font-bold">Add New Mailbox</h1>
        <p className="text-muted-foreground">Configure a new email mailbox for receiving tickets</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the mailbox details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Mailbox Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Support Team, Sales Inquiries"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="support@yourcompany.com"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="connectionType">Connection Type</Label>
              <select
                id="connectionType"
                value={formData.connectionType}
                onChange={(e) => setFormData({ ...formData, connectionType: e.target.value })}
                className="flex h-8 w-full rounded-none border border-input bg-transparent px-3 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                {CONNECTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultTeam">Default Team</Label>
              <select
                id="defaultTeam"
                value={formData.defaultTeamId ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultTeamId: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="flex h-8 w-full rounded-none border border-input bg-transparent px-3 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                <option value="">No default team</option>
                {teams?.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auto-Reply Settings</CardTitle>
            <CardDescription>Configure automatic replies for new emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoReplyEnabled"
                checked={formData.autoReplyEnabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, autoReplyEnabled: checked as boolean })
                }
              />
              <Label htmlFor="autoReplyEnabled" className="font-normal">
                Enable auto-reply
              </Label>
            </div>

            {formData.autoReplyEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="autoReplySubject">Auto-Reply Subject *</Label>
                  <Input
                    id="autoReplySubject"
                    value={formData.autoReplySubject}
                    onChange={(e) => setFormData({ ...formData, autoReplySubject: e.target.value })}
                    placeholder="Thank you for contacting us"
                  />
                  {errors.autoReplySubject && (
                    <p className="text-xs text-destructive">{errors.autoReplySubject}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoReplyBodyHtml">Auto-Reply Body *</Label>
                  <textarea
                    id="autoReplyBodyHtml"
                    value={formData.autoReplyBodyHtml}
                    onChange={(e) =>
                      setFormData({ ...formData, autoReplyBodyHtml: e.target.value })
                    }
                    placeholder="We have received your message and will respond shortly..."
                    rows={4}
                    className="flex w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  />
                  {errors.autoReplyBodyHtml && (
                    <p className="text-xs text-destructive">{errors.autoReplyBodyHtml}</p>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  You can use merge tags: {"{{contact.first_name}}"},{" "}
                  {"{{ticket.reference_number}}"}, {"{{mailbox.name}}"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/admin/mailboxes" })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Create Mailbox
          </Button>
        </div>
      </form>
    </div>
  );
}
