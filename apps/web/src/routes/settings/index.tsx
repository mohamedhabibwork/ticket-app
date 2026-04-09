import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { User, Lock, Bell, Palette, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/settings/")({
  component: SettingsIndexRoute,
});

function SettingsIndexRoute() {
  const settingsNav = [
    {
      title: "Profile",
      description: "Update your personal information",
      href: "/settings/profile",
      icon: User,
    },
    {
      title: "Password",
      description: "Change your password",
      href: "/settings/password",
      icon: Lock,
    },
    {
      title: "Security",
      description: "Two-factor authentication and sessions",
      href: "/settings/security",
      icon: Lock,
    },
    {
      title: "Notifications",
      description: "Configure how you receive notifications",
      href: "/settings/notifications",
      icon: Bell,
    },
    {
      title: "Appearance",
      description: "Customize the look and feel",
      href: "/settings/appearance",
      icon: Palette,
    },
  ];

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <div className="space-y-4">
        {settingsNav.map((item) => (
          <Link key={item.href} to={item.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}