import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { ArrowLeft, Sun, Moon, Monitor, ChevronRight } from "lucide-react";

type Theme = "light" | "dark" | "system";
type Density = "compact" | "comfortable" | "spacious";

export const Route = createFileRoute("/settings/appearance")({
  component: AppearanceSettingsRoute,
});

function AppearanceSettingsRoute() {
  const _queryClient = useQueryClient();

  const [theme, setTheme] = useState<Theme>("system");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [density, setDensity] = useState<Density>("comfortable");

  const updateMutation = useMutation({
    mutationFn: async (_data: { theme: Theme; sidebarCollapsed: boolean; density: Density }) => {
      return true;
    },
    onSuccess: () => {
      toast.success("Appearance settings saved");
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ theme, sidebarCollapsed, density });
  };

  const themes: { value: Theme; label: string; icon: typeof Sun; description: string }[] = [
    {
      value: "light",
      label: "Light",
      icon: Sun,
      description: "Always use light theme",
    },
    {
      value: "dark",
      label: "Dark",
      icon: Moon,
      description: "Always use dark theme",
    },
    {
      value: "system",
      label: "System",
      icon: Monitor,
      description: "Follow your system preferences",
    },
  ];

  const densities: { value: Density; label: string; description: string }[] = [
    {
      value: "compact",
      label: "Compact",
      description: "More content, less spacing",
    },
    {
      value: "comfortable",
      label: "Comfortable",
      description: "Balanced spacing and content",
    },
    {
      value: "spacious",
      label: "Spacious",
      description: "More breathing room",
    },
  ];

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Appearance Settings</h1>
          <p className="text-muted-foreground">Customize the look and feel</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTheme(t.value)}
                    className={`p-4 border rounded-lg text-center transition-colors ${
                      theme === t.value ? "border-primary bg-primary/5" : "hover:bg-muted"
                    }`}
                  >
                    <t.icon className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sidebar</CardTitle>
            </CardHeader>
            <CardContent>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
              >
                <div>
                  <div className="font-medium">Collapsed sidebar by default</div>
                  <div className="text-sm text-muted-foreground">
                    Start with the sidebar in collapsed state
                  </div>
                </div>
                <div
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    sidebarCollapsed ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      sidebarCollapsed ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </div>
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Density</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {densities.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDensity(d.value)}
                    className={`w-full flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      density === d.value ? "border-primary bg-primary/5" : "hover:bg-muted"
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-medium">{d.label}</div>
                      <div className="text-sm text-muted-foreground">{d.description}</div>
                    </div>
                    {density === d.value && <ChevronRight className="h-5 w-5 text-primary" />}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && "Saving..."}
              Save Preferences
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
