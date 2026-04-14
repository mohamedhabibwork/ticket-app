import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Textarea } from "@ticket-app/ui/components/textarea";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { orpc } from "@/utils/orpc";
import { getCurrentOrganizationId } from "@/utils/auth";
import { useOrganization } from "@/hooks/useOrganization";

interface FormField {
  id: number;
  fieldType: string;
  label: string;
  placeholder: string | null;
  helpText: string | null;
  options: unknown;
  isRequired: boolean;
  orderBy: number;
}

export const Route = createFileRoute("/forms/id")({
  loader: async ({ context, params }) => {
    const formId = Number(params.id);
    const form = await context.orpc.forms.get.query({
      id: formId,
      organizationId: getCurrentOrganizationId()!,
    });
    return { form };
  },
  component: PublicFormRoute,
});

function PublicFormRoute() {
  const { organizationId } = useOrganization();
  const { form } = Route.useLoaderData<typeof Route>();

  const submitMutation = useMutation(
    orpc.forms.submit.mutationOptions({
      onSuccess: (data: any) => {
        setSubmitted(true);
        setSubmittedRef(data.referenceNumber);
      },
    }) as any,
  );

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submittedRef, setSubmittedRef] = useState("");

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    form?.fields?.forEach((field: any) => {
      const value = formValues[field.id.toString()] || "";

      if (field.isRequired && !value.trim()) {
        newErrors[field.id.toString()] = `${field.label} is required`;
        return;
      }

      if (value && field.fieldType === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.id.toString()] = "Please enter a valid email address";
        }
      }

      if (value && field.fieldType === "phone") {
        const phoneRegex = /^[+]?[\d\s-()]+$/;
        if (!phoneRegex.test(value)) {
          newErrors[field.id.toString()] = "Please enter a valid phone number";
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const emailField = form?.fields?.find((f: any) => f.fieldType === "email");
    const firstNameField = form?.fields?.find((f: any) =>
      f.label.toLowerCase().includes("first name"),
    );
    const lastNameField = form?.fields?.find((f: any) =>
      f.label.toLowerCase().includes("last name"),
    );

    submitMutation.mutate({
      formId,
      organizationId,
      fields: formValues,
      email: emailField ? formValues[emailField.id.toString()] : undefined,
      firstName: firstNameField ? formValues[firstNameField.id.toString()] : undefined,
      lastName: lastNameField ? formValues[lastNameField.id.toString()] : undefined,
      ipAddress: "127.0.0.1",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    } as any);
  };

  const handleFieldChange = (fieldId: string | number, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldId.toString()]: value }));
    if (errors[fieldId.toString()]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId.toString()];
        return newErrors;
      });
    }
  };

  const renderField = (field: FormField) => {
    const fieldId = field.id.toString();
    const value = formValues[fieldId] || "";
    const fieldError = errors[fieldId];

    const commonProps = {
      id: fieldId,
      value,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      ) => handleFieldChange(fieldId, e.target.value),
      placeholder: field.placeholder || "",
      className: fieldError ? "border-destructive" : "",
    };

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={fieldId}>
          {field.label}
          {field.isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>

        {field.fieldType === "text" && <Input {...commonProps} type="text" />}
        {field.fieldType === "email" && <Input {...commonProps} type="email" />}
        {field.fieldType === "phone" && <Input {...commonProps} type="tel" />}
        {field.fieldType === "number" && <Input {...commonProps} type="number" />}
        {field.fieldType === "textarea" && <Textarea {...commonProps} rows={4} />}
        {field.fieldType === "date" && <Input {...commonProps} type="date" />}
        {field.fieldType === "datetime" && <Input {...commonProps} type="datetime-local" />}
        {field.fieldType === "file" && <Input {...commonProps} type="file" />}
        {field.fieldType === "hidden" && <Input {...commonProps} type="hidden" />}

        {field.fieldType === "checkbox" && (
          <div className="flex items-center gap-2">
            <Checkbox
              id={fieldId}
              checked={value === "true"}
              onCheckedChange={(checked) => handleFieldChange(fieldId, String(checked))}
            />
            <Label htmlFor={fieldId} className="font-normal">
              {field.label}
            </Label>
          </div>
        )}

        {field.fieldType === "select" && (
          <select
            {...commonProps}
            className="flex h-10 w-full rounded-none border border-input bg-transparent px-3 py-2 text-sm"
          >
            <option value="">{field.placeholder || "Select an option"}</option>
            {(field.options as string[] | undefined)?.map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}

        {field.fieldType === "multi-select" && (
          <div className="space-y-1">
            {(field.options as string[] | undefined)?.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox
                  id={`${fieldId}_${i}`}
                  checked={value.split(",").includes(opt)}
                  onCheckedChange={(checked) => {
                    const current = value ? value.split(",") : [];
                    const updated = checked ? [...current, opt] : current.filter((v) => v !== opt);
                    handleFieldChange(fieldId, updated.join(","));
                  }}
                />
                <Label htmlFor={`${fieldId}_${i}`} className="font-normal">
                  {opt}
                </Label>
              </div>
            ))}
          </div>
        )}

        {field.fieldType === "radio" && (
          <div className="space-y-1">
            {(field.options as string[] | undefined)?.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`${fieldId}_${i}`}
                  name={fieldId}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                />
                <Label htmlFor={`${fieldId}_${i}`} className="font-normal">
                  {opt}
                </Label>
              </div>
            ))}
          </div>
        )}

        {field.fieldType === "rating" && (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleFieldChange(fieldId, star.toString())}
                className={`text-2xl transition-colors ${
                  value && parseInt(value) >= star ? "text-yellow-400" : "text-gray-300"
                }`}
              >
                ★
              </button>
            ))}
            <input type="hidden" name={fieldId} value={value} />
          </div>
        )}

        {field.helpText && !fieldError && (
          <p className="text-xs text-muted-foreground">{field.helpText}</p>
        )}
        {fieldError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {fieldError}
          </p>
        )}
      </div>
    );
  };

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Form Not Found</h2>
            <p className="text-muted-foreground">
              This form may have been removed or is no longer available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-4">
              {form.successMessage || "Your submission has been received."}
            </p>
            {submittedRef && (
              <p className="text-sm font-mono bg-muted px-3 py-2 rounded-none inline-block">
                Reference: {submittedRef}
              </p>
            )}
            {form.redirectUrl && (
              <div className="mt-6">
                <p className="text-sm text-muted-foreground mb-2">Redirecting...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{form.name}</CardTitle>
            {form.description && <p className="text-muted-foreground mt-2">{form.description}</p>}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {form.fields?.sort((a: any, b: any) => a.orderBy - b.orderBy).map(renderField)}

              <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
                {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {form.submitButtonText || "Submit"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
