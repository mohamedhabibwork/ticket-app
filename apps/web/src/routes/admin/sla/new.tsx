import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ticket-app/ui/components/select";
import { orpc } from "@/utils/orpc";
import { ArrowLeft, Save, Clock, AlertTriangle, Plus, X } from "lucide-react";

export const Route = createFileRoute("/admin/sla/new")({
  component: CreateSlaPolicyRoute,
});

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const DEFAULT_TARGETS = [
  { priorityId: null, priorityName: "High", firstResponseMinutes: 60, resolutionMinutes: 240 },
  { priorityId: null, priorityName: "Medium", firstResponseMinutes: 240, resolutionMinutes: 1440 },
  { priorityId: null, priorityName: "Low", firstResponseMinutes: 480, resolutionMinutes: 2880 },
];

function CreateSlaPolicyRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: priorities } = useQuery({
    queryKey: ["priorities"],
    queryFn: () => orpc.slaPolicies.getPriorities.query(),
  });

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => orpc.users.list.query({ organizationId: 1, limit: 100 }),
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: () => orpc.teams.list.query({ organizationId: 1 }),
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isDefault: false,
    businessHoursOnly: true,
  });

  const [businessHours, setBusinessHours] = useState({
    timezone: "UTC",
    schedule: [
      { day: 1, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
      { day: 2, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
      { day: 3, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
      { day: 4, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
      { day: 5, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
    ],
  });

  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([]);
  const [targets, setTargets] = useState<any[]>(DEFAULT_TARGETS);
  const [escalationActions, setEscalationActions] = useState<Record<string, { escalateAgentId?: number; escalateTeamId?: number }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (priorities && priorities.length > 0) {
      const highPriority = priorities.find((p: any) => p.name.toLowerCase() === "high");
      const mediumPriority = priorities.find((p: any) => p.name.toLowerCase() === "medium");
      const lowPriority = priorities.find((p: any) => p.name.toLowerCase() === "low");

      setTargets([
        { priorityId: highPriority?.id, priorityName: "High", firstResponseMinutes: 60, resolutionMinutes: 240 },
        { priorityId: mediumPriority?.id, priorityName: "Medium", firstResponseMinutes: 240, resolutionMinutes: 1440 },
        { priorityId: lowPriority?.id, priorityName: "Low", firstResponseMinutes: 480, resolutionMinutes: 2880 },
      ]);
    }
  }, [priorities]);

  const createMutation = useMutation(
    orpc.slaPolicies.create.mutationOptions({
      onSuccess: async (data) => {
        const policyId = data.id;

        for (const target of targets) {
          if (target.priorityId) {
            const escalation = escalationActions[target.priorityName] || {};
            await orpc.slaPolicies.createTarget.mutation({
              slaPolicyId: policyId,
              priorityId: target.priorityId,
              firstResponseMinutes: target.firstResponseMinutes,
              resolutionMinutes: target.resolutionMinutes,
              escalateAgentId: escalation.escalateAgentId,
              escalateTeamId: escalation.escalateTeamId,
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ["sla-policies"] });
        navigate({ to: "/admin/sla" });
      },
      onError: (error) => {
        setErrors({ submit: error.message });
      },
    })
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Policy name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      isDefault: formData.isDefault,
      businessHoursOnly: formData.businessHoursOnly,
      businessHoursConfig: formData.businessHoursOnly ? businessHours : undefined,
      holidays: holidays.length > 0 ? holidays : undefined,
    });
  };

  const updateTarget = (index: number, field: string, value: any) => {
    setTargets((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateEscalation = (priorityName: string, field: string, value: any) => {
    setEscalationActions((prev) => ({
      ...prev,
      [priorityName]: {
        ...prev[priorityName],
        [field]: value === "" ? undefined : value,
      },
    }));
  };

  const addHoliday = () => {
    setHolidays([...holidays, { date: "", name: "" }]);
  };

  const removeHoliday = (index: number) => {
    setHolidays(holidays.filter((_, i) => i !== index));
  };

  const updateHoliday = (index: number, field: string, value: string) => {
    setHolidays((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4 pl-0">
          <Link to="/admin/sla">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to SLA Policies
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create SLA Policy</h1>
        <p className="text-muted-foreground mt-1">
          Define service level agreements and response targets
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Policy Details
            </CardTitle>
            <CardDescription>
              Basic information about the SLA policy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Policy Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Standard Support"
                hasError={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this SLA policy..."
                className="h-20 w-full min-w-0 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: !!checked })}
                />
                <Label htmlFor="isDefault" className="cursor-pointer">Set as default policy</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="businessHoursOnly"
                  checked={formData.businessHoursOnly}
                  onCheckedChange={(checked) => setFormData({ ...formData, businessHoursOnly: !!checked })}
                />
                <Label htmlFor="businessHoursOnly" className="cursor-pointer">Business hours only</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {formData.businessHoursOnly && (
          <Card>
            <CardHeader>
              <CardTitle>Business Hours Configuration</CardTitle>
              <CardDescription>
                Define when support is available
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={businessHours.timezone}
                  onChange={(e) => setBusinessHours({ ...businessHours, timezone: e.target.value })}
                  placeholder="e.g., UTC, America/New_York"
                />
              </div>
              <div className="space-y-3">
                <Label>Working Hours</Label>
                {DAYS_OF_WEEK.map((day) => {
                  const scheduleItem = businessHours.schedule.find((s) => s.day === day.value);
                  const isWorkingDay = !!scheduleItem;
                  return (
                    <div key={day.value} className="flex items-center gap-4">
                      <div className="w-24">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={isWorkingDay}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setBusinessHours({
                                ...businessHours,
                                schedule: [
                                  ...businessHours.schedule,
                                  { day: day.value, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
                                ],
                              });
                            } else {
                              setBusinessHours({
                                ...businessHours,
                                schedule: businessHours.schedule.filter((s) => s.day !== day.value),
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`day-${day.value}`} className="ml-2 cursor-pointer">
                          {day.label}
                        </Label>
                      </div>
                      {isWorkingDay && scheduleItem && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={scheduleItem.startHour}
                            onChange={(e) => {
                              setBusinessHours({
                                ...businessHours,
                                schedule: businessHours.schedule.map((s) =>
                                  s.day === day.value ? { ...s, startHour: parseInt(e.target.value) || 0 } : s
                                ),
                              });
                            }}
                            className="w-16"
                          />
                          <span>:</span>
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            value={scheduleItem.startMinute}
                            onChange={(e) => {
                              setBusinessHours({
                                ...businessHours,
                                schedule: businessHours.schedule.map((s) =>
                                  s.day === day.value ? { ...s, startMinute: parseInt(e.target.value) || 0 } : s
                                ),
                              });
                            }}
                            className="w-16"
                          />
                          <span>to</span>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={scheduleItem.endHour}
                            onChange={(e) => {
                              setBusinessHours({
                                ...businessHours,
                                schedule: businessHours.schedule.map((s) =>
                                  s.day === day.value ? { ...s, endHour: parseInt(e.target.value) || 0 } : s
                                ),
                              });
                            }}
                            className="w-16"
                          />
                          <span>:</span>
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            value={scheduleItem.endMinute}
                            onChange={(e) => {
                              setBusinessHours({
                                ...businessHours,
                                schedule: businessHours.schedule.map((s) =>
                                  s.day === day.value ? { ...s, endMinute: parseInt(e.target.value) || 0 } : s
                                ),
                              });
                            }}
                            className="w-16"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Holidays
            </CardTitle>
            <CardDescription>
              Define company holidays when SLA timers should pause
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {holidays.map((holiday, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Input
                    type="date"
                    value={holiday.date}
                    onChange={(e) => updateHoliday(index, "date", e.target.value)}
                    className="w-40"
                  />
                  <Input
                    value={holiday.name}
                    onChange={(e) => updateHoliday(index, "name", e.target.value)}
                    placeholder="Holiday name"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHoliday(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addHoliday}>
                <Plus className="mr-2 h-4 w-4" />
                Add Holiday
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Per-Priority Targets</CardTitle>
            <CardDescription>
              Set response and resolution time targets for each priority level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Priority</th>
                    <th className="px-3 py-2 text-left font-medium">First Response (minutes)</th>
                    <th className="px-3 py-2 text-left font-medium">Resolution (minutes)</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map((target, index) => (
                    <tr key={target.priorityName} className="border-t">
                      <td className="px-3 py-2">
                        <span className="font-medium">{target.priorityName}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="1"
                          value={target.firstResponseMinutes}
                          onChange={(e) => updateTarget(index, "firstResponseMinutes", parseInt(e.target.value) || 0)}
                          className="w-24"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="1"
                          value={target.resolutionMinutes}
                          onChange={(e) => updateTarget(index, "resolutionMinutes", parseInt(e.target.value) || 0)}
                          className="w-24"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Escalation Actions</CardTitle>
            <CardDescription>
              Define what happens when SLA is breached
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {targets.map((target) => (
                <div key={target.priorityName} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">{target.priorityName} Priority Escalation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`agent-${target.priorityName}`}>Escalate to Agent</Label>
                      <Select
                        value={escalationActions[target.priorityName]?.escalateAgentId?.toString() || ""}
                        onValueChange={(value) => updateEscalation(target.priorityName, "escalateAgentId", value)}
                      >
                        <SelectTrigger id={`agent-${target.priorityName}`}>
                          <SelectValue placeholder="Select agent" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {agents?.users?.map((agent: any) => (
                            <SelectItem key={agent.id} value={agent.id.toString()}>
                              {agent.firstName} {agent.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`team-${target.priorityName}`}>Escalate to Team</Label>
                      <Select
                        value={escalationActions[target.priorityName]?.escalateTeamId?.toString() || ""}
                        onValueChange={(value) => updateEscalation(target.priorityName, "escalateTeamId", value)}
                      >
                        <SelectTrigger id={`team-${target.priorityName}`}>
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {teams?.map((team: any) => (
                            <SelectItem key={team.id} value={team.id.toString()}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {errors.submit && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
            {errors.submit}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link to="/admin/sla">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createMutation.isPending ? "Creating..." : "Create Policy"}
          </Button>
        </div>
      </form>
    </div>
  );
}
