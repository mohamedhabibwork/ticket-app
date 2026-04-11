import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { Loader2, ChevronDown, Paperclip, X } from "lucide-react";

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
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return then.toLocaleDateString();
}

export const Route = createFileRoute("/tickets/new")({
  component: NewTicketRoute,
});

function NewTicketRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const organizationId = 1;

  const [subject, setSubject] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [selectedPriorityId, setSelectedPriorityId] = useState<number | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const { data: channelsData } = useQuery(
    orpc.channels.list.queryOptions({
      organizationId,
      isActive: true,
    }),
  );

  const { data: agents } = useQuery(
    orpc.users.list.queryOptions({
      organizationId,
      isActive: true,
      limit: 100,
    }),
  );

  const { data: teams } = useQuery(
    orpc.teams.list.queryOptions({
      organizationId,
    }),
  );

  const { data: categories } = useQuery(
    orpc.ticketCategories.list.queryOptions({
      organizationId,
    }),
  );

  const { data: tags } = useQuery(
    orpc.tags.list.queryOptions({
      organizationId,
    }),
  );

  const createMutation = useMutation(
    orpc.tickets.create.mutationOptions({
      onSuccess: async (data) => {
        toast.success("Ticket created successfully");
        queryClient.invalidateQueries(orpc.tickets.list.queryOptions({ organizationId }));
        navigate({ to: "/tickets/$id", params: { id: String(data.id) } });
      },
      onError: (error) => {
        toast.error(`Failed to create ticket: ${error.message}`);
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    createMutation.mutate({
      organizationId,
      subject: subject.trim(),
      descriptionHtml: descriptionHtml || undefined,
      descriptionText: descriptionText || undefined,
      priorityId: selectedPriorityId || undefined,
      channelId: selectedChannelId || undefined,
      assignedAgentId: selectedAgentId || undefined,
      assignedTeamId: selectedTeamId || undefined,
      categoryId: selectedCategoryId || undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachmentFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const removeFile = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const priorityOptions = [
    { id: 1, label: "High", color: "#ef4444" },
    { id: 2, label: "Medium", color: "#f97316" },
    { id: 3, label: "Low", color: "#22c55e" },
  ];

  const selectedPriority = priorityOptions.find((p) => p.id === selectedPriorityId);
  const selectedChannel = channelsData?.find((c) => c.id === selectedChannelId);
  const selectedAgent = agents?.users?.find((a) => a.id === selectedAgentId);
  const selectedTeam = teams?.find((t) => t.id === selectedTeamId);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create Ticket</h1>
        <p className="text-muted-foreground">Submit a new support ticket</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief summary of your issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  placeholder="Describe your issue in detail..."
                  value={descriptionText}
                  onChange={(e) => {
                    setDescriptionText(e.target.value);
                    setDescriptionHtml(`<p>${e.target.value}</p>`);
                  }}
                  className="min-h-[150px] w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">
                  Enter plain text. HTML formatting will be applied automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="customer@habib.cloud"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Channel</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedChannel?.name || "Select channel"}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-full">
                      {channelsData?.map((channel) => (
                        <DropdownMenuItem
                          key={channel.id}
                          onClick={() => setSelectedChannelId(channel.id)}
                        >
                          {channel.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedPriority ? (
                          <span
                            className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium"
                            style={{
                              borderColor: selectedPriority.color,
                              color: selectedPriority.color,
                            }}
                          >
                            {selectedPriority.label}
                          </span>
                        ) : (
                          "Select priority"
                        )}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-full">
                      <DropdownMenuItem onClick={() => setSelectedPriorityId(1)}>
                        <span
                          className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium mr-2"
                          style={{ borderColor: "#ef4444", color: "#ef4444" }}
                        >
                          High
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedPriorityId(2)}>
                        <span
                          className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium mr-2"
                          style={{ borderColor: "#f97316", color: "#f97316" }}
                        >
                          Medium
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedPriorityId(3)}>
                        <span
                          className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium mr-2"
                          style={{ borderColor: "#22c55e", color: "#22c55e" }}
                        >
                          Low
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <DropdownMenu open={showCategoryDropdown} onOpenChange={setShowCategoryDropdown}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedCategoryId && categories?.find((c) => c.id === selectedCategoryId)
                          ? categories.find((c) => c.id === selectedCategoryId)?.name
                          : "Select category (optional)"}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-full max-h-60 overflow-y-auto">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedCategoryId(null);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        None
                      </DropdownMenuItem>
                      {categories?.map((category) => (
                        <DropdownMenuItem
                          key={category.id}
                          onClick={() => {
                            setSelectedCategoryId(category.id);
                            setShowCategoryDropdown(false);
                          }}
                        >
                          {category.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assign to Agent</Label>
                  <DropdownMenu open={showAgentDropdown} onOpenChange={setShowAgentDropdown}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedAgent
                          ? `${selectedAgent.firstName} ${selectedAgent.lastName}`
                          : "Select agent (optional)"}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-full max-h-60 overflow-y-auto">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedAgentId(null);
                          setShowAgentDropdown(false);
                        }}
                      >
                        Unassigned
                      </DropdownMenuItem>
                      {agents?.users?.map((agent) => (
                        <DropdownMenuItem
                          key={agent.id}
                          onClick={() => {
                            setSelectedAgentId(agent.id);
                            setShowAgentDropdown(false);
                          }}
                        >
                          {agent.firstName} {agent.lastName}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2">
                  <Label>Assign to Team</Label>
                  <DropdownMenu open={showTeamDropdown} onOpenChange={setShowTeamDropdown}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedTeam?.name || "Select team (optional)"}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-full max-h-60 overflow-y-auto">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedTeamId(null);
                          setShowTeamDropdown(false);
                        }}
                      >
                        Unassigned
                      </DropdownMenuItem>
                      {teams?.map((team) => (
                        <DropdownMenuItem
                          key={team.id}
                          onClick={() => {
                            setSelectedTeamId(team.id);
                            setShowTeamDropdown(false);
                          }}
                        >
                          {team.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tags?.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
                      selectedTags.includes(tag.id) ? "bg-primary text-primary-foreground" : ""
                    }`}
                    style={{
                      borderColor: selectedTags.includes(tag.id) ? undefined : tag.color,
                      color: selectedTags.includes(tag.id) ? undefined : tag.color,
                      backgroundColor: selectedTags.includes(tag.id) ? "var(--primary)" : undefined,
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
                {(!tags || tags.length === 0) && (
                  <p className="text-sm text-muted-foreground">No tags available</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Add Files
                </Button>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {attachmentFiles.length > 0 && (
                <div className="space-y-2">
                  {attachmentFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded border px-3 py-2"
                    >
                      <span className="text-sm truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="ml-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate({ to: "/tickets" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Ticket
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
