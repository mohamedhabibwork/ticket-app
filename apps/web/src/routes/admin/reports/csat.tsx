import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { orpc } from "@/utils/orpc";
import { ArrowLeft, Star, Filter, ThumbsUp } from "lucide-react";

type DateRange = "7d" | "30d" | "90d" | "custom";

interface CSATResponse {
  id: number;
  ticketId: number;
  agentName: string;
  rating: number;
  comment: string;
  submittedAt: string;
}

export const Route = createFileRoute("/admin/reports/csat")({
  component: CSATReportPage,
});

function CSATReportPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const organizationId = 1;

  const { data: _csatTrends } = useQuery(
    orpc.reports.getCsatTrends.queryOptions({
      organizationId,
      interval: "day",
    } as any),
  );

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "custom", label: "Custom" },
  ];

  const overallCSAT = 4.6;
  const totalResponses = 847;
  const mockRatingDistribution = [
    { rating: 5, count: 456, percentage: 54 },
    { rating: 4, count: 267, percentage: 32 },
    { rating: 3, count: 68, percentage: 8 },
    { rating: 2, count: 34, percentage: 4 },
    { rating: 1, count: 22, percentage: 2 },
  ];

  const mockTrendData = [
    { date: "Apr 1", score: 4.4 },
    { date: "Apr 5", score: 4.5 },
    { date: "Apr 10", score: 4.3 },
    { date: "Apr 15", score: 4.7 },
    { date: "Apr 20", score: 4.6 },
    { date: "Apr 25", score: 4.8 },
  ];

  const mockRecentResponses: CSATResponse[] = [
    {
      id: 1,
      ticketId: 1001,
      agentName: "Sarah Johnson",
      rating: 5,
      comment: "Excellent support! Very helpful and resolved my issue quickly.",
      submittedAt: "2024-04-09 10:30",
    },
    {
      id: 2,
      ticketId: 1002,
      agentName: "Michael Chen",
      rating: 4,
      comment: "Good experience, but took a bit longer than expected.",
      submittedAt: "2024-04-09 09:15",
    },
    {
      id: 3,
      ticketId: 1003,
      agentName: "Emily Davis",
      rating: 5,
      comment: "Amazing service! Will definitely recommend.",
      submittedAt: "2024-04-08 16:45",
    },
    {
      id: 4,
      ticketId: 1004,
      agentName: "James Wilson",
      rating: 3,
      comment: "Issue was resolved but communication could be better.",
      submittedAt: "2024-04-08 14:20",
    },
    {
      id: 5,
      ticketId: 1005,
      agentName: "Lisa Anderson",
      rating: 4,
      comment: "Satisfied with the resolution.",
      submittedAt: "2024-04-08 11:00",
    },
  ];

  const maxTrendValue = 5;

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "text-amber-500 fill-amber-500" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" render={<Link to="/admin/reports" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">CSAT Report</h1>
          <p className="text-muted-foreground mt-1">Customer satisfaction trends and responses</p>
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
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select className="h-8 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs">
                <option value="">All Agents</option>
                <option value="sarah">Sarah Johnson</option>
                <option value="michael">Michael Chen</option>
                <option value="emily">Emily Davis</option>
              </select>
              <select className="h-8 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs">
                <option value="">All Teams</option>
                <option value="support">Support Team</option>
                <option value="sales">Sales Team</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-2 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <div className="text-3xl font-bold">{overallCSAT}</div>
                <div className="text-sm text-muted-foreground">Overall CSAT</div>
                <div className="flex items-center gap-1 mt-1">
                  {renderStars(Math.round(overallCSAT))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <ThumbsUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalResponses}</div>
                <div className="text-sm text-muted-foreground">Total Responses</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <ThumbsUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">86%</div>
                <div className="text-sm text-muted-foreground">Satisfied (4-5 stars)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>CSAT Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRatingDistribution.map((item) => (
                <div key={item.rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-24">
                    <span className="text-sm font-medium">{item.rating}</span>
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                    <div
                      className={`h-4 rounded-full transition-all ${
                        item.rating >= 4
                          ? "bg-green-500"
                          : item.rating === 3
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-sm font-medium">{item.count}</span>
                    <span className="text-sm text-muted-foreground ml-1">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {
                    mockRatingDistribution.reduce(
                      (acc: any, item, index) => {
                        const percentage = item.percentage;
                        const dashArray = `${percentage} ${100 - percentage}`;
                        acc.elements.push(
                          <circle
                            key={item.rating}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={["#10b981", "#22c55e", "#eab308", "#f97316", "#ef4444"][index]}
                            strokeWidth="20"
                            strokeDasharray={dashArray}
                            strokeDashoffset={acc.offset}
                            transform="rotate(-90 50 50)"
                          />,
                        );
                        acc.offset -= percentage;
                        return acc;
                      },
                      { elements: [], offset: 0 },
                    ).elements
                  }
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CSAT Trend Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-48">
              {mockTrendData.map((data) => (
                <div key={data.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-gray-100 rounded-t relative" style={{ height: "100%" }}>
                    <div
                      className={`absolute bottom-0 w-full rounded-t transition-all ${
                        data.score >= 4.5
                          ? "bg-green-500"
                          : data.score >= 4.0
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      style={{ height: `${(data.score / maxTrendValue) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{data.date}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-xs text-muted-foreground">4.5+</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span className="text-xs text-muted-foreground">4.0-4.4</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-xs text-muted-foreground">&lt;4.0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent CSAT Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-muted-foreground border-b">
                  <th className="px-4 py-3 font-medium">Ticket</th>
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                  <th className="px-4 py-3 font-medium">Comment</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {mockRecentResponses.map((response) => (
                  <tr key={response.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium">#{response.ticketId}</span>
                    </td>
                    <td className="px-4 py-3">{response.agentName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {renderStars(response.rating)}
                        <span className="text-sm text-muted-foreground">{response.rating}/5</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-muted-foreground truncate">{response.comment}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {response.submittedAt}
                    </td>
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
