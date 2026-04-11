import { useState } from "react";
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
import { Textarea } from "@ticket-app/ui/components/textarea";
import { ArrowLeft, Save, MessageSquare, Heart, Headphones, Settings } from "lucide-react";

const FORM_TYPES = [
  {
    value: "contact",
    label: "Contact Form",
    description: "Basic contact form with common fields",
    icon: MessageSquare,
  },
  {
    value: "feedback",
    label: "Feedback Form",
    description: "Collect customer feedback and suggestions",
    icon: Heart,
  },
  {
    value: "support",
    label: "Support Request",
    description: "Technical support request form",
    icon: Headphones,
  },
  {
    value: "custom",
    label: "Custom Form",
    description: "Build your own form from scratch",
    icon: Settings,
  },
];

export const Route = createFileRoute("/admin/forms/new")({
  component: CreateFormRoute,
});

function CreateFormRoute() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    formType: "contact",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Form name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    navigate({ to: "/admin/forms/builder", state: { formData } as any });
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate({ to: "/admin/forms" })} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Forms
        </Button>
        <h1 className="text-2xl font-bold">Create New Form</h1>
        <p className="text-muted-foreground">Set up a new web form for your organization</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the form details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Form Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Contact Us, Support Request"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this form's purpose"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Form Type</CardTitle>
            <CardDescription>Choose a template or start from scratch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FORM_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.value}
                    className={`relative cursor-pointer rounded-none border-2 p-4 transition-colors ${
                      formData.formType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                    onClick={() => setFormData({ ...formData, formType: type.value })}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-muted p-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                    {formData.formType === type.value && (
                      <div className="absolute top-2 right-2">
                        <div className="h-4 w-4 rounded-full bg-primary" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/forms" })}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Continue to Builder
          </Button>
        </div>
      </form>
    </div>
  );
}
