import { useState } from "react";
import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Textarea } from "@ticket-app/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ticket-app/ui/components/select";
import { ArrowLeft, Save, GripVertical, Trash2, Eye, Plus, X } from "lucide-react";

const FIELD_TYPES = [
  { type: "text", label: "Text Field", icon: "T", description: "Single line text input" },
  { type: "textarea", label: "Text Area", icon: "A", description: "Multi-line text input" },
  { type: "email", label: "Email", icon: "@", description: "Email address field" },
  { type: "phone", label: "Phone", icon: "P", description: "Phone number field" },
  { type: "number", label: "Number", icon: "#", description: "Numeric input" },
  { type: "date", label: "Date", icon: "D", description: "Date picker" },
  { type: "datetime", label: "Date & Time", icon: "Dt", description: "Date and time picker" },
  { type: "file", label: "File Upload", icon: "F", description: "File attachment" },
  { type: "checkbox", label: "Checkbox", icon: "C", description: "Single checkbox" },
  { type: "radio", label: "Radio Group", icon: "R", description: "Single selection" },
  { type: "select", label: "Dropdown", icon: "S", description: "Dropdown select" },
  { type: "multi-select", label: "Multi-Select", icon: "M", description: "Multiple selection" },
  { type: "rating", label: "Rating", icon: "*", description: "Star rating" },
  { type: "hidden", label: "Hidden Field", icon: "H", description: "Hidden value" },
];

type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty";
type ConditionLogic = "AND" | "OR";

interface FieldCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
}

interface FieldConditionalLogic {
  operator: ConditionLogic;
  conditions: FieldCondition[];
}

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
  helpText: string;
  showWhen?: FieldConditionalLogic;
  hideWhen?: FieldConditionalLogic;
}

interface FieldSettings {
  label: string;
  placeholder: string;
  required: boolean;
  options: string;
  helpText: string;
  showWhen: FieldConditionalLogic | null;
  hideWhen: FieldConditionalLogic | null;
}

const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not equals" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "is_empty", label: "Is empty" },
  { value: "is_not_empty", label: "Is not empty" },
];

export const Route = createFileRoute("/admin/forms/builder")({
  loader: async () => {
    return {};
  },
  component: FormBuilderRoute,
});

function FormBuilderRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const formDataFromState = (
    location.state as unknown as {
      formData?: { name: string; description: string; formType: string };
    }
  )?.formData;

  const [formName] = useState(formDataFromState?.name || "Untitled Form");
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [draggedType, setDraggedType] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [fieldSettings, setFieldSettings] = useState<FieldSettings>({
    label: "",
    placeholder: "",
    required: false,
    options: "",
    helpText: "",
    showWhen: null,
    hideWhen: null,
  });

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const handleDragStart = (e: React.DragEvent, fieldType: string) => {
    setDraggedType(fieldType);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedType) {
      const newField: FormField = {
        id: `field_${Date.now()}`,
        type: draggedType,
        label: `New ${draggedType} field`,
        placeholder: "",
        required: false,
        options: [],
        helpText: "",
      };
      setFields([...fields, newField]);
      setSelectedFieldId(newField.id);
      setDraggedType(null);
    }
  };

  const _handleFieldDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedType) {
      const targetIndex = fields.findIndex((f) => f.id === targetId);
      const newField: FormField = {
        id: `field_${Date.now()}`,
        type: draggedType,
        label: `New ${draggedType} field`,
        placeholder: "",
        required: false,
        options: [],
        helpText: "",
      };
      const newFields = [...fields];
      newFields.splice(targetIndex + 1, 0, newField);
      setFields(newFields);
      setSelectedFieldId(newField.id);
      setDraggedType(null);
    }
  };

  const handleRemoveField = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleUpdateField = (fieldId: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)));
  };

  const handleSelectField = (fieldId: string) => {
    setSelectedFieldId(fieldId);
    const field = fields.find((f) => f.id === fieldId);
    if (field) {
      setFieldSettings({
        label: field.label,
        placeholder: field.placeholder,
        required: field.required,
        options: field.options.join("\n"),
        helpText: field.helpText,
        showWhen: field.showWhen || null,
        hideWhen: field.hideWhen || null,
      });
    }
  };

  const handleSaveSettings = () => {
    if (selectedFieldId) {
      handleUpdateField(selectedFieldId, {
        label: fieldSettings.label,
        placeholder: fieldSettings.placeholder,
        required: fieldSettings.required,
        options: fieldSettings.options.split("\n").filter((o) => o.trim()),
        helpText: fieldSettings.helpText,
        showWhen: fieldSettings.showWhen || undefined,
        hideWhen: fieldSettings.hideWhen || undefined,
      });
    }
  };

  const addShowWhenCondition = () => {
    const newCondition: FieldCondition = {
      id: `cond_${Date.now()}`,
      field: "",
      operator: "equals",
      value: "",
    };
    const current = fieldSettings.showWhen || { operator: "AND" as ConditionLogic, conditions: [] };
    setFieldSettings({
      ...fieldSettings,
      showWhen: { ...current, conditions: [...current.conditions, newCondition] },
    });
  };

  const addHideWhenCondition = () => {
    const newCondition: FieldCondition = {
      id: `cond_${Date.now()}`,
      field: "",
      operator: "equals",
      value: "",
    };
    const current = fieldSettings.hideWhen || { operator: "AND" as ConditionLogic, conditions: [] };
    setFieldSettings({
      ...fieldSettings,
      hideWhen: { ...current, conditions: [...current.conditions, newCondition] },
    });
  };

  const removeShowWhenCondition = (id: string) => {
    if (!fieldSettings.showWhen) return;
    const conditions = fieldSettings.showWhen.conditions.filter((c) => c.id !== id);
    setFieldSettings({
      ...fieldSettings,
      showWhen: conditions.length === 0 ? null : { ...fieldSettings.showWhen, conditions },
    });
  };

  const removeHideWhenCondition = (id: string) => {
    if (!fieldSettings.hideWhen) return;
    const conditions = fieldSettings.hideWhen.conditions.filter((c) => c.id !== id);
    setFieldSettings({
      ...fieldSettings,
      hideWhen: conditions.length === 0 ? null : { ...fieldSettings.hideWhen, conditions },
    });
  };

  const updateShowWhenCondition = (id: string, updates: Partial<FieldCondition>) => {
    if (!fieldSettings.showWhen) return;
    setFieldSettings({
      ...fieldSettings,
      showWhen: {
        ...fieldSettings.showWhen,
        conditions: fieldSettings.showWhen.conditions.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
      },
    });
  };

  const updateHideWhenCondition = (id: string, updates: Partial<FieldCondition>) => {
    if (!fieldSettings.hideWhen) return;
    setFieldSettings({
      ...fieldSettings,
      hideWhen: {
        ...fieldSettings.hideWhen,
        conditions: fieldSettings.hideWhen.conditions.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
      },
    });
  };

  const updateShowWhenLogic = (logic: ConditionLogic) => {
    if (!fieldSettings.showWhen) return;
    setFieldSettings({
      ...fieldSettings,
      showWhen: { ...fieldSettings.showWhen, operator: logic },
    });
  };

  const updateHideWhenLogic = (logic: ConditionLogic) => {
    if (!fieldSettings.hideWhen) return;
    setFieldSettings({
      ...fieldSettings,
      hideWhen: { ...fieldSettings.hideWhen, operator: logic },
    });
  };

  const handleSaveForm = () => {
    console.log("Saving form:", { name: formName, fields });
    navigate({ to: "/admin/forms" });
  };

  const renderFieldPreview = (field: FormField) => {
    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "number":
        return (
          <Input
            type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
            placeholder={field.placeholder}
          />
        );
      case "textarea":
        return <Textarea placeholder={field.placeholder} rows={3} />;
      case "date":
      case "datetime":
        return <Input type={field.type === "datetime" ? "datetime-local" : "date"} />;
      case "file":
        return <Input type="file" />;
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox id={field.id} />
            <Label htmlFor={field.id} className="font-normal">
              {field.label}
            </Label>
          </div>
        );
      case "radio":
        return (
          <div className="space-y-2">
            {field.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name={field.id} />
                <Label className="font-normal">{opt}</Label>
              </div>
            ))}
          </div>
        );
      case "select":
        return (
          <select className="flex h-8 w-full rounded-none border border-input bg-transparent px-3 py-1 text-xs">
            <option value="">{field.placeholder || "Select an option"}</option>
            {field.options.map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case "rating":
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className="text-xl cursor-pointer">
                ★
              </span>
            ))}
          </div>
        );
      default:
        return <Input placeholder={field.placeholder} />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate({ to: "/admin/forms" })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-lg font-semibold">{formName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? "Hide Preview" : "Preview"}
          </Button>
          <Button onClick={handleSaveForm}>
            <Save className="mr-2 h-4 w-4" />
            Save Form
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {!showPreview ? (
          <>
            <div className="w-64 border-r bg-muted/30 p-4 overflow-y-auto">
              <h3 className="font-medium mb-4">Field Types</h3>
              <div className="space-y-2">
                {FIELD_TYPES.map((fieldType) => (
                  <div
                    key={fieldType.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, fieldType.type)}
                    className="flex items-center gap-3 p-3 bg-background rounded-none border border-border cursor-grab hover:bg-muted transition-colors"
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-muted rounded-none text-sm font-medium">
                      {fieldType.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{fieldType.label}</p>
                      <p className="text-xs text-muted-foreground">{fieldType.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="flex-1 p-6 overflow-y-auto bg-muted/20"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {fields.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-2">
                      Drag fields from the left panel to build your form
                    </p>
                    <p className="text-sm text-muted-foreground">or click a field type to add it</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-3">
                  {fields.map((field, _index) => (
                    <div
                      key={field.id}
                      className={`relative group bg-background rounded-none border-2 transition-colors ${
                        selectedFieldId === field.id
                          ? "border-primary"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                      onClick={() => handleSelectField(field.id)}
                    >
                      <div className="flex items-start gap-3 p-4">
                        <div className="mt-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-none">
                              {field.type}
                            </span>
                            <Label className="text-sm font-medium">{field.label}</Label>
                            {field.required && <span className="text-xs text-destructive">*</span>}
                          </div>
                          {renderFieldPreview({
                            ...field,
                            placeholder: field.placeholder || field.label,
                          })}
                          {field.helpText && (
                            <p className="text-xs text-muted-foreground mt-2">{field.helpText}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveField(field.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedField && (
              <div className="w-96 border-l bg-muted/30 p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Field Settings</h3>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedFieldId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={fieldSettings.label}
                      onChange={(e) =>
                        setFieldSettings({ ...fieldSettings, label: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Placeholder</Label>
                    <Input
                      value={fieldSettings.placeholder}
                      onChange={(e) =>
                        setFieldSettings({ ...fieldSettings, placeholder: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Help Text</Label>
                    <Textarea
                      value={fieldSettings.helpText}
                      onChange={(e) =>
                        setFieldSettings({ ...fieldSettings, helpText: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                  {["radio", "select", "multi-select"].includes(selectedField.type) && (
                    <div className="space-y-2">
                      <Label>Options (one per line)</Label>
                      <Textarea
                        value={fieldSettings.options}
                        onChange={(e) =>
                          setFieldSettings({ ...fieldSettings, options: e.target.value })
                        }
                        rows={4}
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="required"
                      checked={fieldSettings.required}
                      onCheckedChange={(checked) =>
                        setFieldSettings({ ...fieldSettings, required: checked as boolean })
                      }
                    />
                    <Label htmlFor="required" className="font-normal">
                      Required field
                    </Label>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Conditional Logic</h4>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase text-muted-foreground">Show When</Label>
                        {fieldSettings.showWhen && fieldSettings.showWhen.conditions.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Button
                                variant={
                                  fieldSettings.showWhen.operator === "AND" ? "secondary" : "ghost"
                                }
                                size="sm"
                                className="flex-1"
                                onClick={() => updateShowWhenLogic("AND")}
                              >
                                AND
                              </Button>
                              <Button
                                variant={
                                  fieldSettings.showWhen.operator === "OR" ? "secondary" : "ghost"
                                }
                                size="sm"
                                className="flex-1"
                                onClick={() => updateShowWhenLogic("OR")}
                              >
                                OR
                              </Button>
                            </div>
                            {fieldSettings.showWhen.conditions.map((cond) => (
                              <div
                                key={cond.id}
                                className="flex flex-col gap-2 p-2 bg-background rounded-none border"
                              >
                                <div className="flex gap-2 items-center">
                                  <Select
                                    value={cond.field}
                                    onValueChange={(v) =>
                                      updateShowWhenCondition(cond.id, { field: v as string })
                                    }
                                  >
                                    <SelectTrigger className="flex-1 h-7 text-xs">
                                      <SelectValue placeholder="Field" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {fields
                                        .filter((f) => f.id !== selectedField.id)
                                        .map((f) => (
                                          <SelectItem key={f.id} value={f.id}>
                                            {f.label}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => removeShowWhenCondition(cond.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <Select
                                  value={cond.operator}
                                  onValueChange={(v) =>
                                    updateShowWhenCondition(cond.id, {
                                      operator: v as ConditionOperator,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CONDITION_OPERATORS.map((op) => (
                                      <SelectItem key={op.value} value={op.value}>
                                        {op.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {!["is_empty", "is_not_empty"].includes(cond.operator) && (
                                  <Input
                                    value={cond.value}
                                    onChange={(e) =>
                                      updateShowWhenCondition(cond.id, { value: e.target.value })
                                    }
                                    placeholder="Value"
                                    className="h-7 text-xs"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={addShowWhenCondition}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Show Condition
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs uppercase text-muted-foreground">Hide When</Label>
                        {fieldSettings.hideWhen && fieldSettings.hideWhen.conditions.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Button
                                variant={
                                  fieldSettings.hideWhen.operator === "AND" ? "secondary" : "ghost"
                                }
                                size="sm"
                                className="flex-1"
                                onClick={() => updateHideWhenLogic("AND")}
                              >
                                AND
                              </Button>
                              <Button
                                variant={
                                  fieldSettings.hideWhen.operator === "OR" ? "secondary" : "ghost"
                                }
                                size="sm"
                                className="flex-1"
                                onClick={() => updateHideWhenLogic("OR")}
                              >
                                OR
                              </Button>
                            </div>
                            {fieldSettings.hideWhen.conditions.map((cond) => (
                              <div
                                key={cond.id}
                                className="flex flex-col gap-2 p-2 bg-background rounded-none border"
                              >
                                <div className="flex gap-2 items-center">
                                  <Select
                                    value={cond.field}
                                    onValueChange={(v) =>
                                      updateHideWhenCondition(cond.id, { field: v as string })
                                    }
                                  >
                                    <SelectTrigger className="flex-1 h-7 text-xs">
                                      <SelectValue placeholder="Field" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {fields
                                        .filter((f) => f.id !== selectedField.id)
                                        .map((f) => (
                                          <SelectItem key={f.id} value={f.id}>
                                            {f.label}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => removeHideWhenCondition(cond.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <Select
                                  value={cond.operator}
                                  onValueChange={(v) =>
                                    updateHideWhenCondition(cond.id, {
                                      operator: v as ConditionOperator,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CONDITION_OPERATORS.map((op) => (
                                      <SelectItem key={op.value} value={op.value}>
                                        {op.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {!["is_empty", "is_not_empty"].includes(cond.operator) && (
                                  <Input
                                    value={cond.value}
                                    onChange={(e) =>
                                      updateHideWhenCondition(cond.id, { value: e.target.value })
                                    }
                                    placeholder="Value"
                                    className="h-7 text-xs"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={addHideWhenCondition}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Hide Condition
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full" onClick={handleSaveSettings}>
                    Apply Changes
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 p-6 overflow-y-auto bg-muted/20">
            <div className="max-w-xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>{formName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No fields added yet</p>
                  ) : (
                    fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {renderFieldPreview(field)}
                        {field.helpText && (
                          <p className="text-xs text-muted-foreground">{field.helpText}</p>
                        )}
                      </div>
                    ))
                  )}
                  {fields.length > 0 && <Button className="w-full mt-4">Submit</Button>}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
