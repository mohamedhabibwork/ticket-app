import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { orpc } from "@/utils/orpc";
import {
  ArrowLeft,
  Filter,
  Download,
  Ticket,
  Mail,
  Phone,
  MessageSquare,
  Globe,
} from "lucide-react";

type DateRange = "7d" | "30d" | "90d" | "custom";
type Status = "all" | "open" | "pending" | "resolved" | "closed";
type Priority = "all" | "high" | "medium" | "low";
type Channel = "all" | "email" | "chat" | "phone" | "web";

export const Route = createFileRoute("/admin/reports/tickets")({
  component: TicketReportsPage,
});

function TicketReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [status, setStatus] = useState<Status>("all");
  const [priority, setPriority] = useState<Priority>("all");
  const [channel, setChannel] = useState<Channel>("all");
  const organizationId = 1;

  const { data: ticketVolume, isLoading: _isLoading }: any = useQuery(
    orpc.reports.getTicketVolume.queryOptions({
      organizationId,
      groupBy: "day",
    } as any),
  );

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "custom", label: "Custom" },
  ];

  const channelIcons: Record<string, any> = {
    Email: Mail,
    Chat: MessageSquare,
    Phone: Phone,
    Web: Globe,
  };

  const mockTimeSeriesData = [
    { date: "Apr 1", created: 45, resolved: 38 },
    { date: "Apr 5", created: 52, resolved: 48 },
    { date: "Apr 10", created: 38, resolved: 42 },
    { date: "Apr 15", created: 65, resolved: 55 },
    { date: "Apr 20", created: 48, resolved: 52 },
    { date: "Apr 25", created: 55, resolved: 50 },
  ];

  const maxTimeSeriesValue = Math.max(
    ...mockTimeSeriesData.map((d) => Math.max(d.created, d.resolved)),
  );

  const mockTopTags = [
    { tag: "billing", count: 234 },
    { tag: "technical-support", count: 189 },
    { tag: "refund", count: 156 },
    { tag: "account", count: 134 },
    { tag: "shipping", count: 98 },
    { tag: "product-info", count: 87 },
    { tag: "returns", count: 76 },
    { tag: "feedback", count: 54 },
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" render={<Link to="/admin/reports" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Ticket Reports</h1>
          <p className="text-muted-foreground mt-1">
            Detailed ticket volume and distribution analysis
          </p>
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
              <select
                className="h-8 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                className="h-8 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                className="h-8 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs"
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
              >
                <option value="all">All Channels</option>
                <option value="email">Email</option>
                <option value="chat">Chat</option>
                <option value="phone">Phone</option>
                <option value="web">Web</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{ticketVolume?.total || 0}</div>
                <div className="text-sm text-muted-foreground">Total Tickets</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {ticketVolume?.byStatus?.find((s: any) => s.statusName === "Resolved")?.count ||
                    0}
                </div>
                <div className="text-sm text-muted-foreground">Resolved</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {ticketVolume?.byStatus?.find((s: any) => s.statusName === "Open")?.count || 0}
                </div>
                <div className="text-sm text-muted-foreground">Open</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Tickets Created vs Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockTimeSeriesData.map((data) => (
                <div key={data.date} className="flex items-center gap-4">
                  <div className="w-16 text-sm text-muted-foreground">{data.date}</div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-blue-100 rounded h-6 relative">
                      <div
                        className="bg-blue-500 rounded h-6 absolute left-0 top-0"
                        style={{ width: `${(data.created / maxTimeSeriesValue) * 100}%` }}
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white font-medium">
                        {data.created}
                      </span>
                    </div>
                    <div className="flex-1 bg-green-100 rounded h-6 relative">
                      <div
                        className="bg-green-500 rounded h-6 absolute left-0 top-0"
                        style={{ width: `${(data.resolved / maxTimeSeriesValue) * 100}%` }}
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white font-medium">
                        {data.resolved}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-xs text-muted-foreground">Created</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-xs text-muted-foreground">Resolved</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ticketVolume?.byChannel?.map((channel: any, index: number) => {
                const Icon = channelIcons[channel.channelName || ""] || Ticket;
                const percentage =
                  ticketVolume.total > 0 ? (channel.count / ticketVolume.total) * 100 : 0;
                return (
                  <div key={channel.channelId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {channel.channelName || "Unknown"}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">{channel.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={
                          ["bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-green-500"][
                            index % 4
                          ] + " h-2 rounded-full transition-all"
                        }
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Tickets by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["High", "Medium", "Low"].map((priority, index) => {
                const counts = [45, 120, 85];
                const total = counts.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? (counts[index] / total) * 100 : 0;
                return (
                  <div key={priority}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{priority}</span>
                      <span className="text-sm text-muted-foreground">{counts[index]}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={
                          ["bg-red-500", "bg-amber-500", "bg-blue-500"][index] +
                          " h-2 rounded-full transition-all"
                        }
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockTopTags.map((item, index) => (
                <div key={item.tag} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                    <span className="px-2 py-0.5 bg-muted rounded text-sm">{item.tag}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Tickets</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-muted-foreground border-b">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {mockTimeSeriesData.map((row) => (
                  <tr key={row.date} className="border-b last:border-0">
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3">Email</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">
                        High
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                        Resolved
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{row.created}</td>
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
