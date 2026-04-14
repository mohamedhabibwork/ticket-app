import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { orpc } from "@/utils/orpc";
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock, Filter } from "lucide-react";
import { getCurrentOrganizationId } from "@/utils/auth";
import { useOrganization } from "@/hooks/useOrganization";

type DateRange = "7d" | "30d" | "90d" | "custom";

interface BreachedTicket {
  id: number;
  subject: string;
  priority: string;
  breachedAt: string;
  slaPolicy: string;
}

export const Route = createFileRoute("/admin/reports/sla")({
  loader: async ({ context }) => {
    const organizationId = getCurrentOrganizationId()!;
    const slaCompliance = await context.orpc.reports.getSlaCompliance.query({ organizationId });
    return { slaCompliance };
  },
  component: SLACompliancePage,
});

function SLACompliancePage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const { organizationId } = useOrganization();
  const { slaCompliance } = Route.useLoaderData<typeof Route>();

  const { isLoading: _isLoading }: any = useQuery(
    orpc.reports.getSlaCompliance.queryOptions({ organizationId } as any),
  );

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "custom", label: "Custom" },
  ];

  const mockBreachedTickets: BreachedTicket[] = [
    {
      id: 1001,
      subject: "Unable to process payment",
      priority: "High",
      breachedAt: "2024-04-08 14:30",
      slaPolicy: "High Priority - 1h",
    },
    {
      id: 1002,
      subject: "Account access issue",
      priority: "High",
      breachedAt: "2024-04-08 12:15",
      slaPolicy: "High Priority - 1h",
    },
    {
      id: 1003,
      subject: "Refund not received",
      priority: "Medium",
      breachedAt: "2024-04-07 16:45",
      slaPolicy: "Medium Priority - 4h",
    },
    {
      id: 1004,
      subject: "Product damaged on arrival",
      priority: "Low",
      breachedAt: "2024-04-07 10:00",
      slaPolicy: "Low Priority - 8h",
    },
    {
      id: 1005,
      subject: "Shipping delay inquiry",
      priority: "Medium",
      breachedAt: "2024-04-06 09:30",
      slaPolicy: "Medium Priority - 4h",
    },
  ];

  const priorityBreakdown = [
    { priority: "High", total: 45, complied: 38, breached: 7, percentage: 84 },
    { priority: "Medium", total: 120, complied: 108, breached: 12, percentage: 90 },
    { priority: "Low", total: 85, complied: 82, breached: 3, percentage: 96 },
  ];

  const mockTrendData = [
    { date: "Apr 1", compliance: 85 },
    { date: "Apr 5", compliance: 88 },
    { date: "Apr 10", compliance: 82 },
    { date: "Apr 15", compliance: 91 },
    { date: "Apr 20", compliance: 87 },
    { date: "Apr 25", compliance: 90 },
  ];

  const maxTrendValue = 100;

  const overallCompliance = slaCompliance?.complianceRate
    ? Math.round(slaCompliance.complianceRate * 100)
    : 89;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" render={<Link to="/admin/reports" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">SLA Compliance Report</h1>
          <p className="text-muted-foreground mt-1">SLA breach analysis and compliance tracking</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              {dateRangeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={dateRange === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateRange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select className="h-8 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs">
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-2 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{overallCompliance}%</div>
                <div className="text-sm text-muted-foreground">Overall Compliance</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{slaCompliance?.total || 250}</div>
                <div className="text-sm text-muted-foreground">Total Tickets</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{slaCompliance?.withinSla || 228}</div>
                <div className="text-sm text-muted-foreground">Within SLA</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{slaCompliance?.breachedSla || 22}</div>
                <div className="text-sm text-muted-foreground">Breached SLA</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {priorityBreakdown.map((item) => (
          <Card key={item.priority}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span
                  className={`px-2 py-0.5 rounded text-sm ${
                    item.priority === "High"
                      ? "bg-red-100 text-red-800"
                      : item.priority === "Medium"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {item.priority}
                </span>
                <span className="text-2xl font-bold text-green-600">{item.percentage}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Complied</span>
                  <span className="text-sm font-medium">{item.complied}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Breached</span>
                  <span className="text-sm font-medium text-red-600">{item.breached}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>SLA Compliance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-48">
              {mockTrendData.map((data) => (
                <div key={data.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-gray-100 rounded-t relative" style={{ height: "100%" }}>
                    <div
                      className={`absolute bottom-0 w-full rounded-t transition-all ${
                        data.compliance >= 90
                          ? "bg-green-500"
                          : data.compliance >= 80
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      style={{ height: `${(data.compliance / maxTrendValue) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{data.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span className="text-sm">Within SLA</span>
                </div>
                <span className="text-sm font-medium">228 (91%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span className="text-sm">Breached</span>
                </div>
                <span className="text-sm font-medium">22 (9%)</span>
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="20"
                    strokeDasharray="82.25 170"
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="20"
                    strokeDasharray="17.75 170"
                    strokeDashoffset="-82.25"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Breached Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-muted-foreground border-b">
                  <th className="px-4 py-3 font-medium">Ticket ID</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">SLA Policy</th>
                  <th className="px-4 py-3 font-medium">Breached At</th>
                </tr>
              </thead>
              <tbody>
                {mockBreachedTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium">#{ticket.id}</span>
                    </td>
                    <td className="px-4 py-3">{ticket.subject}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          ticket.priority === "High"
                            ? "bg-red-100 text-red-800"
                            : ticket.priority === "Medium"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{ticket.slaPolicy}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{ticket.breachedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
