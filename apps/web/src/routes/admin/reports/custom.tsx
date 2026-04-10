import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { ArrowLeft, Save, Download, Plus, Trash2, FileText, BarChart3 } from "lucide-react";

type GroupBy = "day" | "week" | "month" | "agent" | "team" | "priority";

interface Metric {
  id: string;
  label: string;
  selected: boolean;
}

interface SavedReport {
  id: number;
  name: string;
  metrics: string[];
  groupBy: GroupBy;
  createdAt: string;
}

export const Route = createFileRoute("/admin/reports/custom")({
  component: CustomReportPage,
});

function CustomReportPage() {
  const [reportName, setReportName] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [metrics, setMetrics] = useState<Metric[]>([
    { id: "ticket_count", label: "Ticket Count", selected: true },
    { id: "open_tickets", label: "Open Tickets", selected: true },
    { id: "resolved_tickets", label: "Resolved Tickets", selected: false },
    { id: "first_response_time", label: "First Response Time", selected: false },
    { id: "resolution_time", label: "Resolution Time", selected: false },
    { id: "csat_score", label: "CSAT Score", selected: false },
    { id: "sla_compliance", label: "SLA Compliance", selected: false },
    { id: "new_contacts", label: "New Contacts", selected: false },
  ]);

  const savedReports: SavedReport[] = [
    {
      id: 1,
      name: "Weekly Support Overview",
      metrics: ["ticket_count", "resolved_tickets", "csat_score"],
      groupBy: "week",
      createdAt: "2024-04-01",
    },
    {
      id: 2,
      name: "Agent Performance Summary",
      metrics: ["ticket_count", "first_response_time", "csat_score"],
      groupBy: "agent",
      createdAt: "2024-03-28",
    },
  ];

  const groupByOptions: { value: GroupBy; label: string }[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "agent", label: "Agent" },
    { value: "team", label: "Team" },
    { value: "priority", label: "Priority" },
  ];

  const filterOptions = [
    { id: "status", label: "Status", values: ["Open", "Pending", "Resolved", "Closed"] },
    { id: "priority", label: "Priority", values: ["High", "Medium", "Low"] },
    { id: "channel", label: "Channel", values: ["Email", "Chat", "Phone", "Web"] },
  ];

  const toggleMetric = (metricId: string) => {
    setMetrics((prev) =>
      prev.map((m) => (m.id === metricId ? { ...m, selected: !m.selected } : m)),
    );
  };

  const handleSaveReport = () => {
    if (!reportName.trim()) {
      alert("Please enter a report name");
      return;
    }
    const selectedMetrics = metrics.filter((m) => m.selected);
    if (selectedMetrics.length === 0) {
      alert("Please select at least one metric");
      return;
    }
    alert(`Report "${reportName}" saved successfully!`);
    setReportName("");
  };

  const exportReport = (format: "csv" | "pdf") => {
    alert(`Exporting report as ${format.toUpperCase()}...`);
  };

  const generatePreviewData = () => {
    const selectedMetrics = metrics.filter((m) => m.selected);
    return Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      group:
        groupBy === "day"
          ? `Apr ${i + 1}`
          : groupBy === "week"
            ? `Week ${i + 1}`
            : groupBy === "month"
              ? `Month ${i + 1}`
              : groupBy === "agent"
                ? `Agent ${i + 1}`
                : groupBy === "team"
                  ? `Team ${i + 1}`
                  : `Priority ${i + 1}`,
      ...Object.fromEntries(selectedMetrics.map((m) => [m.id, Math.floor(Math.random() * 100)])),
    }));
  };

  const previewData = generatePreviewData();
  const selectedMetrics = metrics.filter((m) => m.selected);

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" asChild>
          <Link to="/admin/reports">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Custom Report Builder</h1>
          <p className="text-muted-foreground mt-1">Create and save custom report configurations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="reportName">Report Name</Label>
                <Input
                  id="reportName"
                  placeholder="Enter report name..."
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Group By</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {groupByOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={groupBy === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGroupBy(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Select Metrics</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {metrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => toggleMetric(metric.id)}
                    >
                      <Checkbox
                        checked={metric.selected}
                        onCheckedChange={() => toggleMetric(metric.id)}
                      />
                      <span className="text-sm">{metric.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Filter Criteria</Label>
                <div className="space-y-3 mt-2">
                  {filterOptions.map((filter) => (
                    <div key={filter.id} className="border rounded-lg p-3">
                      <div className="font-medium text-sm mb-2">{filter.label}</div>
                      <div className="flex flex-wrap gap-2">
                        {filter.values.map((value) => (
                          <label key={value} className="flex items-center gap-1.5 text-sm">
                            <input type="checkbox" className="rounded" />
                            {value}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Report Preview</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportReport("csv")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportReport("pdf")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-muted-foreground border-b">
                      <th className="px-4 py-3 font-medium capitalize">
                        {groupBy === "day"
                          ? "Date"
                          : groupBy === "week"
                            ? "Week"
                            : groupBy === "month"
                              ? "Month"
                              : groupBy}
                      </th>
                      {selectedMetrics.map((metric) => (
                        <th key={metric.id} className="px-4 py-3 font-medium">
                          {metric.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{row.group}</td>
                        {selectedMetrics.map((metric) => (
                          <td key={metric.id} className="px-4 py-3">
                            {row[metric.id]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={handleSaveReport}>
                <Save className="h-4 w-4 mr-2" />
                Save Report
              </Button>
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Another
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {savedReports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No saved reports yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-3 rounded-lg border hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-sm">{report.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {report.groupBy} • {report.metrics.length} metrics
                          </div>
                        </div>
                        <Button variant="ghost" size="icon-xs">
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <button className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Ticket Volume Report</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Agent Metrics Report</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">SLA Compliance Report</span>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
