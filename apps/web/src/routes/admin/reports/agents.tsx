import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { orpc } from "@/utils/orpc";
import { ArrowLeft, Download, ArrowUpDown, Clock, CheckCircle2, Star } from "lucide-react";

type DateRange = "7d" | "30d" | "90d" | "custom";

interface AgentRow {
  id: number;
  name: string;
  email: string;
  ticketsAssigned: number;
  ticketsResolved: number;
  avgFirstResponse: string;
  avgResolution: string;
  csatScore: string;
}

export const Route = createFileRoute("/admin/reports/agents")({
  component: AgentPerformancePage,
});

function AgentPerformancePage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [sortBy, setSortBy] = useState<keyof AgentRow>("ticketsResolved");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const organizationId = 1;

  const { data: _agentPerformance, isLoading: _isLoading } = useQuery({
    queryKey: ["reports", "agentPerformance", organizationId, dateRange],
    queryFn: () =>
      orpc.reports.getAgentPerformance.query({
        organizationId,
      }),
  });

  const { data: _responseTime } = useQuery({
    queryKey: ["reports", "responseTime", organizationId],
    queryFn: () => orpc.reports.getResponseTime.query({ organizationId }),
  });

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "custom", label: "Custom" },
  ];

  const mockAgents: AgentRow[] = [
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah@company.com",
      ticketsAssigned: 156,
      ticketsResolved: 142,
      avgFirstResponse: "12m",
      avgResolution: "4.2h",
      csatScore: "4.8",
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "michael@company.com",
      ticketsAssigned: 134,
      ticketsResolved: 128,
      avgFirstResponse: "8m",
      avgResolution: "3.1h",
      csatScore: "4.9",
    },
    {
      id: 3,
      name: "Emily Davis",
      email: "emily@company.com",
      ticketsAssigned: 98,
      ticketsResolved: 89,
      avgFirstResponse: "15m",
      avgResolution: "5.5h",
      csatScore: "4.6",
    },
    {
      id: 4,
      name: "James Wilson",
      email: "james@company.com",
      ticketsAssigned: 112,
      ticketsResolved: 105,
      avgFirstResponse: "10m",
      avgResolution: "3.8h",
      csatScore: "4.7",
    },
    {
      id: 5,
      name: "Lisa Anderson",
      email: "lisa@company.com",
      ticketsAssigned: 87,
      ticketsResolved: 82,
      avgFirstResponse: "18m",
      avgResolution: "6.2h",
      csatScore: "4.5",
    },
  ];

  const sortedAgents = [...mockAgents].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const modifier = sortDir === "asc" ? 1 : -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal) * modifier;
    }
    return ((aVal as number) - (bVal as number)) * modifier;
  });

  const handleSort = (column: keyof AgentRow) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Tickets Assigned",
      "Tickets Resolved",
      "Avg First Response",
      "Avg Resolution",
      "CSAT Score",
    ];
    const rows = sortedAgents.map((agent) => [
      agent.name,
      agent.email,
      agent.ticketsAssigned,
      agent.ticketsResolved,
      agent.avgFirstResponse,
      agent.avgResolution,
      agent.csatScore,
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agent-performance.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const _formatCSAT = (score: number) => {
    return (score / 5) * 100;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" asChild>
          <Link to="/admin/reports">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Agent Performance Report</h1>
          <p className="text-muted-foreground mt-1">
            Individual agent metrics and productivity analysis
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
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
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {mockAgents.reduce((sum, a) => sum + a.ticketsResolved, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Resolved</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">12m</div>
                <div className="text-sm text-muted-foreground">Avg Response</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">4.5h</div>
                <div className="text-sm text-muted-foreground">Avg Resolution</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">4.7</div>
                <div className="text-sm text-muted-foreground">Avg CSAT</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Agent Metrics</CardTitle>
          <select className="h-8 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs">
            <option value="">All Teams</option>
            <option value="support">Support Team</option>
            <option value="sales">Sales Team</option>
          </select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-muted-foreground border-b">
                  <th className="px-4 py-3 font-medium">
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => handleSort("name")}
                    >
                      Agent
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => handleSort("ticketsAssigned")}
                    >
                      Assigned
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => handleSort("ticketsResolved")}
                    >
                      Resolved
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">Resolution Rate</th>
                  <th className="px-4 py-3 font-medium">
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => handleSort("avgFirstResponse")}
                    >
                      Avg First Response
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => handleSort("avgResolution")}
                    >
                      Avg Resolution
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => handleSort("csatScore")}
                    >
                      CSAT Score
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAgents.map((agent) => {
                  const resolutionRate =
                    agent.ticketsAssigned > 0
                      ? (agent.ticketsResolved / agent.ticketsAssigned) * 100
                      : 0;
                  return (
                    <tr key={agent.id} className="border-b last:border-0">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-sm text-muted-foreground">{agent.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">{agent.ticketsAssigned}</td>
                      <td className="px-4 py-4">{agent.ticketsResolved}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${resolutionRate}%` }}
                            />
                          </div>
                          <span className="text-sm">{resolutionRate.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">{agent.avgFirstResponse}</td>
                      <td className="px-4 py-4">{agent.avgResolution}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span>{agent.csatScore}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
