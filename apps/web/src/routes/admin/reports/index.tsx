import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { orpc } from "@/utils/orpc";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Ticket,
  Users,
  AlertTriangle,
  Star,
  ArrowRight,
} from "lucide-react";

type DateRange = "7d" | "30d" | "90d" | "custom";

export const Route = createFileRoute("/admin/reports/")({
  component: ReportsDashboardPage,
});

function ReportsDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const organizationId = 1;

  const { data: ticketVolume } = useQuery({
    queryKey: ["reports", "ticketVolume", organizationId, dateRange],
    queryFn: () =>
      orpc.reports.getTicketVolume.query({
        organizationId,
        groupBy: "day",
      }),
  });

  const { data: slaCompliance } = useQuery({
    queryKey: ["reports", "slaCompliance", organizationId],
    queryFn: () =>
      orpc.reports.getSlaCompliance.query({ organizationId }),
  });

  const { data: responseTime } = useQuery({
    queryKey: ["reports", "responseTime", organizationId],
    queryFn: () =>
      orpc.reports.getResponseTime.query({ organizationId }),
  });

  const { data: resolutionRate } = useQuery({
    queryKey: ["reports", "resolutionRate", organizationId],
    queryFn: () =>
      orpc.reports.getResolutionRate.query({ organizationId }),
  });

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "custom", label: "Custom" },
  ];

  const stats = [
    {
      title: "Total Tickets",
      value: ticketVolume?.total || 0,
      icon: Ticket,
      color: "blue",
      change: "+12%",
      changeUp: true,
    },
    {
      title: "Open Tickets",
      value: ticketVolume?.byStatus?.find((s: any) => s.statusName === "Open")?.count || 0,
      icon: AlertTriangle,
      color: "amber",
      change: "-5%",
      changeUp: false,
    },
    {
      title: "Avg Response Time",
      value: responseTime ? `${Math.round(responseTime.averageResponseTimeMinutes)}m` : "0m",
      icon: Clock,
      color: "purple",
      change: "-8%",
      changeUp: true,
    },
    {
      title: "Resolution Rate",
      value: resolutionRate ? `${Math.round(resolutionRate.resolutionRate * 100)}%` : "0%",
      icon: CheckCircle2,
      color: "green",
      change: "+3%",
      changeUp: true,
    },
  ];

  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500 text-white",
    amber: "bg-amber-500 text-white",
    purple: "bg-purple-500 text-white",
    green: "bg-green-500 text-white",
  };

  const reportLinks = [
    {
      title: "Ticket Reports",
      description: "Detailed ticket volume, channel, and priority analysis",
      href: "/admin/reports/tickets",
      icon: BarChart3,
    },
    {
      title: "Agent Performance",
      description: "Agent metrics, response times, and CSAT scores",
      href: "/admin/reports/agents",
      icon: Users,
    },
    {
      title: "SLA Compliance",
      description: "SLA breach analysis and compliance tracking",
      href: "/admin/reports/sla",
      icon: AlertTriangle,
    },
    {
      title: "CSAT Reports",
      description: "Customer satisfaction trends and responses",
      href: "/admin/reports/csat",
      icon: Star,
    },
    {
      title: "Custom Reports",
      description: "Build and save custom report configurations",
      href: "/admin/reports/custom",
      icon: TrendingUp,
    },
  ];

  const mockChartData = [
    { day: "Mon", tickets: 45 },
    { day: "Tue", tickets: 52 },
    { day: "Wed", tickets: 38 },
    { day: "Thu", tickets: 65 },
    { day: "Fri", tickets: 48 },
    { day: "Sat", tickets: 22 },
    { day: "Sun", tickets: 18 },
  ];

  const maxChartValue = Math.max(...mockChartData.map((d) => d.tickets));

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Reports Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of support performance metrics
          </p>
        </div>

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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${colorClasses[stat.color]}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    stat.changeUp
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.title}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Volume Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-48">
              {mockChartData.map((data) => (
                <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-blue-100 rounded-t relative" style={{ height: `${(data.tickets / maxChartValue) * 100}%` }}>
                    <div
                      className="absolute bottom-0 w-full bg-blue-500 rounded-t transition-all"
                      style={{ height: `${(data.tickets / maxChartValue) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{data.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ticketVolume?.byStatus?.map((status: any) => {
                const percentage = ticketVolume.total > 0 ? (status.count / ticketVolume.total) * 100 : 0;
                return (
                  <div key={status.statusId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{status.statusName || "Unknown"}</span>
                      <span className="text-sm text-muted-foreground">
                        {status.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {ticketVolume?.byStatus?.reduce(
                    (acc: any, status: any, index: number) => {
                      const percentage = ticketVolume.total > 0 ? (status.count / ticketVolume.total) * 100 : 0;
                      const dashArray = `${percentage} ${100 - percentage}`;
                      const dashOffset = acc.offset;
                      acc.elements.push(
                        <circle
                          key={status.statusId}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"][index % 5]}
                          strokeWidth="20"
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                          transform="rotate(-90 50 50)"
                        />
                      );
                      acc.offset -= percentage;
                      return acc;
                    },
                    { elements: [], offset: 0 }
                  ).elements}
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportLinks.map((link) => (
              <Link
                key={link.title}
                to={link.href}
                className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted transition-colors"
              >
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <link.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{link.title}</div>
                  <div className="text-sm text-muted-foreground">{link.description}</div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
