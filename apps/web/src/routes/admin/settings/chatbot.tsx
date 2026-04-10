import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import {
  Loader2,
  Bot,
  Plus,
  Trash2,
  CheckCircle,
  TrendingUp,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin/settings/chatbot")({
  component: ChatbotSettingsRoute,
});

function ChatbotSettingsRoute() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [escalationThreshold, setEscalationThreshold] = useState(3);
  const [responseDelaySeconds, setResponseDelaySeconds] = useState(5);
  const [analyticsDays, _setAnalyticsDays] = useState(30);

  const {
    data: configs,
    isLoading,
    refetch,
  } = useQuery(
    orpc.chatbot.listConfigs.queryOptions({
      organizationId: 1,
    }),
  );

  const { data: analytics, isLoading: _analyticsLoading } = useQuery(
    orpc.chatbot.getAnalytics.queryOptions({
      organizationId: 1,
      days: analyticsDays,
    }),
  );

  const createMutation = useMutation(
    orpc.chatbot.configureChatbot.mutationOptions({
      onSuccess: () => {
        refetch();
        setShowAddForm(false);
        resetForm();
      },
    }),
  );

  const updateMutation = useMutation(
    orpc.chatbot.updateConfig.mutationOptions({
      onSuccess: () => refetch(),
    }),
  );

  const deleteMutation = useMutation(
    orpc.chatbot.deleteConfig.mutationOptions({
      onSuccess: () => refetch(),
    }),
  );

  const resetForm = () => {
    setName("");
    setIsEnabled(false);
    setEscalationThreshold(3);
    setResponseDelaySeconds(5);
  };

  const handleSubmit = () => {
    if (!name) return;

    createMutation.mutate({
      organizationId: 1,
      name,
      isEnabled,
      escalationThreshold,
      responseDelaySeconds,
    });
  };

  const toggleEnabled = (id: number, currentEnabled: boolean) => {
    updateMutation.mutate({
      id,
      isEnabled: !currentEnabled,
    });
  };

  const currentConfig = configs && configs.length > 0 ? configs[0] : null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-purple-100 p-3">
            <Bot className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Chatbot Settings</h1>
            <p className="text-muted-foreground">
              Configure your AI-powered customer support chatbot
            </p>
          </div>
        </div>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-3">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.totalSessions}</p>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.resolvedSessions}</p>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-orange-100 p-3">
                  <ArrowUpRight className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.escalatedSessions}</p>
                  <p className="text-sm text-muted-foreground">Escalated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-purple-100 p-3">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {(analytics.escalationRate * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Escalation Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chatbot Configuration</CardTitle>
              <CardDescription>
                Configure chatbot behavior and escalation thresholds
              </CardDescription>
            </div>
            {!currentConfig && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Configuration
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : currentConfig ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`rounded-full p-3 ${
                      currentConfig.isEnabled ? "bg-green-100" : "bg-gray-100"
                    }`}
                  >
                    <Bot
                      className={`h-6 w-6 ${
                        currentConfig.isEnabled ? "text-green-600" : "text-gray-500"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-lg">{currentConfig.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentConfig.isEnabled ? "Active" : "Disabled"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={currentConfig.isEnabled ? "destructive" : "default"}
                  onClick={() => toggleEnabled(currentConfig.id, !!currentConfig.isEnabled)}
                >
                  {currentConfig.isEnabled ? "Disable" : "Enable"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Escalation Threshold</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={escalationThreshold}
                      onChange={(e) => setEscalationThreshold(parseInt(e.target.value) || 3)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">
                      low-confidence messages before escalation
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Response Delay</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={responseDelaySeconds}
                      onChange={(e) => setResponseDelaySeconds(parseInt(e.target.value) || 5)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">
                      seconds before escalating to agent
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    updateMutation.mutate({
                      id: currentConfig.id,
                      escalationThreshold,
                      responseDelaySeconds,
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this configuration?")) {
                      deleteMutation.mutate({ id: currentConfig.id });
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No chatbot configuration</p>
              <p className="text-sm">Configure the chatbot to start helping customers</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base Integration</CardTitle>
          <CardDescription>
            The chatbot uses your published KB articles to answer customer questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded bg-muted">
            <p className="text-sm">
              The chatbot automatically searches through your published knowledge base articles to
              find relevant answers. Articles with higher relevance scores are preferred. Configure
              your knowledge base in the KB section.
            </p>
          </div>
        </CardContent>
      </Card>

      {showAddForm && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Add Chatbot Configuration</CardTitle>
            <CardDescription>Configure your AI chatbot settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Bot Name</Label>
              <Input
                id="name"
                placeholder="Support Assistant"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Escalation Threshold</Label>
              <Input
                id="threshold"
                type="number"
                min={1}
                max={10}
                value={escalationThreshold}
                onChange={(e) => setEscalationThreshold(parseInt(e.target.value) || 3)}
              />
              <p className="text-xs text-muted-foreground">
                Number of low-confidence responses before escalating to a human agent
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delay">Response Delay (seconds)</Label>
              <Input
                id="delay"
                type="number"
                min={0}
                max={60}
                value={responseDelaySeconds}
                onChange={(e) => setResponseDelaySeconds(parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-muted-foreground">
                Seconds to wait for a response before escalation
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSubmit} disabled={!name || createMutation.isPending}>
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
