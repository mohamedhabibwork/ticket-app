import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Loader2, Plus, Edit2, Trash2, Eye, Mail, Copy } from "lucide-react";
import { orpc } from "@/utils/orpc";

interface EmailTemplate {
  id?: number;
  name: string;
  subject: string;
  body: string;
  type: "auto_reply" | "confirmation" | "follow_up" | "custom";
  isActive: boolean;
  mergeTags: string[];
}

const TEMPLATE_TYPES = [
  { value: "auto_reply", label: "Auto-Reply" },
  { value: "confirmation", label: "Ticket Confirmation" },
  { value: "follow_up", label: "Follow-Up" },
  { value: "custom", label: "Custom" },
];

const AVAILABLE_MERGE_TAGS = [
  { tag: "{{contact.first_name}}", description: "Contact's first name" },
  { tag: "{{contact.last_name}}", description: "Contact's last name" },
  { tag: "{{contact.email}}", description: "Contact's email" },
  { tag: "{{ticket.reference_number}}", description: "Ticket reference number" },
  { tag: "{{ticket.subject}}", description: "Ticket subject" },
  { tag: "{{ticket.status}}", description: "Ticket status" },
  { tag: "{{mailbox.name}}", description: "Mailbox name" },
  { tag: "{{agent.first_name}}", description: "Assigned agent's first name" },
  { tag: "{{agent.last_name}}", description: "Assigned agent's last name" },
];

export const Route = createFileRoute("/admin/email-templates/")({
  component: EmailTemplatesRoute,
});

function EmailTemplatesRoute() {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [_isCreating, setIsCreating] = useState(false);
  const [editData, setEditData] = useState<EmailTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const {
    data: templates,
    isLoading,
    refetch,
  } = useQuery(
    (orpc as any).emailTemplates.list.queryOptions({
      organizationId: 1,
    }) as any,
  );

  const createMutation = useMutation(
    (orpc as any).emailTemplates.create.mutationOptions({
      onSuccess: () => {
        setIsCreating(false);
        setEditData(null);
        refetch();
      },
    }),
  );

  const updateMutation = useMutation(
    (orpc as any).emailTemplates.update.mutationOptions({
      onSuccess: () => {
        setIsEditing(false);
        setEditData(null);
        setSelectedTemplate(null);
        refetch();
      },
    }),
  );

  const deleteMutation = useMutation(
    (orpc as any).emailTemplates.delete.mutationOptions({
      onSuccess: () => {
        setSelectedTemplate(null);
        refetch();
      },
    }),
  );

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(true);
    setEditData({
      name: "",
      subject: "",
      body: "",
      type: "custom",
      isActive: true,
      mergeTags: [],
    });
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsEditing(true);
    setEditData({ ...template });
  };

  const handleSave = () => {
    if (!editData) return;

    if (editData.id) {
      (updateMutation as any).mutate({
        id: editData.id,
        organizationId: 1,
        data: editData,
      });
    } else {
      (createMutation as any).mutate({
        organizationId: 1,
        ...editData,
      });
    }
  };

  const handleDelete = (templateId: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      (deleteMutation as any).mutate({ id: templateId });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(null);
    setIsCreating(false);
    setSelectedTemplate(null);
  };

  const insertMergeTag = (tag: string) => {
    if (!editData) return;
    setEditData({
      ...editData,
      body: editData.body + tag,
    });
  };

  const _copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getTemplateTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      auto_reply: "bg-blue-100 text-blue-800",
      confirmation: "bg-green-100 text-green-800",
      follow_up: "bg-purple-100 text-purple-800",
      custom: "bg-gray-100 text-gray-800",
    };
    const label = TEMPLATE_TYPES.find((t) => t.value === type)?.label || type;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || colors.custom}`}>
        {label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground">
            Manage email templates for auto-replies and notifications
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>{(templates as any)?.length || 0} templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates && (templates as any).length > 0 ? (
                (templates as any).map((template: any) => (
                  <div
                    key={template.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setIsEditing(false);
                      setPreviewMode(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{template.name}</span>
                          {!template.isActive && (
                            <span className="text-xs text-muted-foreground">(Inactive)</span>
                          )}
                        </div>
                        {getTemplateTypeBadge(template.type)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">No templates yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-8">
          {isEditing && editData ? (
            <Card>
              <CardHeader>
                <CardTitle>{editData.id ? "Edit Template" : "New Template"}</CardTitle>
                <CardDescription>
                  {editData.id
                    ? "Modify the email template details"
                    : "Create a new email template"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      placeholder="e.g., Welcome Auto-Reply"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Template Type</Label>
                    <select
                      id="type"
                      value={editData.type}
                      onChange={(e) =>
                        setEditData({ ...editData, type: e.target.value as EmailTemplate["type"] })
                      }
                      className="flex h-8 w-full rounded-none border border-input bg-transparent px-3 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                    >
                      {TEMPLATE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject *</Label>
                  <Input
                    id="subject"
                    value={editData.subject}
                    onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
                    placeholder="e.g., Thank you for contacting support"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="body">Email Body *</Label>
                    <Button variant="ghost" size="sm" onClick={() => setPreviewMode(!previewMode)}>
                      <Eye className="mr-2 h-4 w-4" />
                      {previewMode ? "Edit" : "Preview"}
                    </Button>
                  </div>

                  {previewMode ? (
                    <div className="min-h-[200px] p-4 border rounded-lg bg-muted/50">
                      <p className="text-sm mb-2">
                        <strong>Subject:</strong> {editData.subject || "(No subject)"}
                      </p>
                      <div className="prose prose-sm dark:prose-invert">
                        {editData.body.split("\n").map((line, i) => (
                          <p key={i}>{line || <br />}</p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <textarea
                      id="body"
                      value={editData.body}
                      onChange={(e) => setEditData({ ...editData, body: e.target.value })}
                      placeholder="Enter email body content..."
                      rows={10}
                      className="flex w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Insert Merge Tag</Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_MERGE_TAGS.map((mt) => (
                      <button
                        key={mt.tag}
                        onClick={() => insertMergeTag(mt.tag)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border hover:bg-muted transition-colors"
                        title={mt.description}
                      >
                        <Copy className="h-3 w-3" />
                        {mt.tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={editData.isActive}
                    onCheckedChange={(checked) =>
                      setEditData({ ...editData, isActive: checked as boolean })
                    }
                  />
                  <Label htmlFor="isActive" className="font-normal">
                    Active
                  </Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!editData.name || !editData.subject || !editData.body}
                  >
                    Save Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedTemplate ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTemplate.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {getTemplateTypeBadge(selectedTemplate.type)}
                      {!selectedTemplate.isActive && (
                        <span className="ml-2 text-xs text-muted-foreground">(Inactive)</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleEdit(selectedTemplate)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => selectedTemplate.id && handleDelete(selectedTemplate.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Subject</Label>
                  <p className="font-medium mt-1">{selectedTemplate.subject}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Body</Label>
                  <div className="mt-1 p-4 bg-muted/50 rounded-lg">
                    {selectedTemplate.body.split("\n").map((line, i) => (
                      <p key={i} className="mb-1">
                        {line || <br />}
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Merge Tags Used</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {AVAILABLE_MERGE_TAGS.filter((mt) =>
                      selectedTemplate.body.includes(mt.tag),
                    ).map((mt) => (
                      <span
                        key={mt.tag}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-muted"
                        title={mt.description}
                      >
                        {mt.tag}
                      </span>
                    ))}
                    {AVAILABLE_MERGE_TAGS.filter((mt) => !selectedTemplate.body.includes(mt.tag))
                      .length === AVAILABLE_MERGE_TAGS.length && (
                      <span className="text-sm text-muted-foreground">No merge tags used</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Select a template to view details</p>
                <Button variant="outline" onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Template
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
