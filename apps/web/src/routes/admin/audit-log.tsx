import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ticket-app/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ticket-app/ui/components/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ticket-app/ui/components/dialog";
import {
  Search,
  Download,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from "lucide-react";

export const Route = createFileRoute("/admin/audit-log")({
  loader: async () => {
    return {};
  },
  component: AuditLogRoute,
});

interface AuditEntry {
  id: number;
  uuid: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  };
  organization?: {
    name: string;
    slug: string;
  };
}

interface SearchFilters {
  actor: string;
  action: string;
  resourceType: string;
  dateFrom: string;
  dateTo: string;
}

const RESOURCE_TYPES = [
  { value: "", label: "All Resources" },
  { value: "user", label: "User" },
  { value: "organization", label: "Organization" },
  { value: "ticket", label: "Ticket" },
  { value: "contact", label: "Contact" },
  { value: "role", label: "Role" },
  { value: "team", label: "Team" },
  { value: "mailbox", label: "Mailbox" },
  { value: "workflow", label: "Workflow" },
  { value: "settings", label: "Settings" },
];

const ACTIONS = [
  { value: "", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "export", label: "Export" },
  { value: "import", label: "Import" },
];

const DEFAULT_FILTERS: SearchFilters = {
  actor: "",
  action: "",
  resourceType: "",
  dateFrom: "",
  dateTo: "",
};

function AuditLogRoute() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const limit = 20;

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockEntries: AuditEntry[] = [
      {
        id: 1,
        uuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        action: "update",
        resourceType: "user",
        resourceId: "123",
        changes: {
          firstName: { old: "John", new: "Jonathan" },
          lastSeenAt: { old: "2024-01-15T10:30:00Z", new: "2024-04-09T14:22:00Z" },
        },
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        createdAt: new Date().toISOString(),
        user: { email: "agent@company.com", firstName: "Agent", lastName: "Smith" },
        organization: { name: "Acme Corp", slug: "acme" },
      },
      {
        id: 2,
        uuid: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        action: "create",
        resourceType: "ticket",
        resourceId: "456",
        changes: {
          subject: { new: "Support request for billing issue" },
          priority: { new: "high" },
          status: { new: "open" },
        },
        ipAddress: "10.0.0.50",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        user: { email: "admin@company.com", firstName: "Admin", lastName: "User" },
        organization: { name: "Acme Corp", slug: "acme" },
      },
      {
        id: 3,
        uuid: "c3d4e5f6-a7b8-9012-cdef-123456789012",
        action: "login",
        resourceType: "user",
        resourceId: "789",
        changes: null,
        ipAddress: "172.16.0.25",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        user: { email: "agent2@company.com", firstName: "Jane", lastName: "Doe" },
        organization: { name: "Acme Corp", slug: "acme" },
      },
      {
        id: 4,
        uuid: "d4e5f6a7-b8c9-0123-defa-234567890123",
        action: "update",
        resourceType: "settings",
        resourceId: null,
        changes: {
          enforce_2fa: { old: "false", new: "true" },
        },
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        createdAt: new Date(Date.now() - 10800000).toISOString(),
        user: { email: "admin@company.com", firstName: "Admin", lastName: "User" },
        organization: { name: "Acme Corp", slug: "acme" },
      },
      {
        id: 5,
        uuid: "e5f6a7b8-c9d0-1234-efab-345678901234",
        action: "delete",
        resourceType: "contact",
        resourceId: "999",
        changes: {
          email: { old: "deleted@contact.com" },
          firstName: { old: "Deleted" },
          lastName: { old: "Contact" },
        },
        ipAddress: "10.0.0.50",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        user: { email: "agent@company.com", firstName: "Agent", lastName: "Smith" },
        organization: { name: "Acme Corp", slug: "acme" },
      },
    ];

    let filtered = mockEntries;

    if (filters.actor) {
      filtered = filtered.filter(
        (e) =>
          e.user?.email.toLowerCase().includes(filters.actor.toLowerCase()) ||
          e.user?.firstName.toLowerCase().includes(filters.actor.toLowerCase()) ||
          e.user?.lastName.toLowerCase().includes(filters.actor.toLowerCase()),
      );
    }

    if (filters.action) {
      filtered = filtered.filter((e) => e.action === filters.action);
    }

    if (filters.resourceType) {
      filtered = filtered.filter((e) => e.resourceType === filters.resourceType);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter((e) => new Date(e.createdAt) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e) => new Date(e.createdAt) <= toDate);
    }

    setEntries(filtered);
    setTotalPages(Math.ceil(filtered.length / limit) || 1);
    setIsLoading(false);
  }, [filters]);

  const handleSearch = () => {
    setPage(1);
    fetchEntries();
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    fetchEntries();
  };

  const exportToCsv = () => {
    const headers = [
      "ID",
      "UUID",
      "Action",
      "Resource Type",
      "Resource ID",
      "Actor",
      "IP Address",
      "Created At",
      "Changes",
    ];

    const rows = entries.map((entry) => [
      entry.id,
      entry.uuid,
      entry.action,
      entry.resourceType,
      entry.resourceId || "",
      entry.user ? `${entry.user.firstName} ${entry.user.lastName} (${entry.user.email})` : "",
      entry.ipAddress || "",
      entry.createdAt,
      entry.changes ? JSON.stringify(entry.changes) : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "text-green-600 bg-green-50";
      case "update":
        return "text-blue-600 bg-blue-50";
      case "delete":
        return "text-red-600 bg-red-50";
      case "login":
        return "text-purple-600 bg-purple-50";
      case "logout":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const formatChanges = (changes: Record<string, unknown> | null) => {
    if (!changes) return "-";
    return Object.entries(changes)
      .map(([key, value]) => {
        if (value && typeof value === "object" && "old" in value && "new" in value) {
          return `${key}: ${value.old} → ${value.new}`;
        }
        return `${key}: ${JSON.stringify(value)}`;
      })
      .join(", ");
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">Track all security-relevant events and changes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
          <Button variant="outline" onClick={exportToCsv} disabled={entries.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="actor">Actor</Label>
                <Input
                  id="actor"
                  placeholder="Search by actor..."
                  value={filters.actor}
                  onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">Action</Label>
                <Select
                  value={filters.action}
                  onValueChange={(value) => setFilters((f) => ({ ...f, action: value as string }))}
                >
                  <SelectTrigger id="action">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resourceType">Resource Type</Label>
                <Select
                  value={filters.resourceType}
                  onValueChange={(value) =>
                    setFilters((f) => ({ ...f, resourceType: value as string }))
                  }
                >
                  <SelectTrigger id="resourceType">
                    <SelectValue placeholder="Select resource" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="dateFrom"
                    type="date"
                    className="pl-9"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="dateTo"
                    type="date"
                    className="pl-9"
                    value={filters.dateTo}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                <X className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audit entries found
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getActionColor(
                          entry.action,
                        )}`}
                      >
                        {entry.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.resourceType}</div>
                      {entry.resourceId && (
                        <div className="text-xs text-muted-foreground">ID: {entry.resourceId}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.user ? (
                        <div>
                          <div className="font-medium">
                            {entry.user.firstName} {entry.user.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{entry.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">
                      {formatChanges(entry.changes)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(entry.createdAt), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(entry)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {entries.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Entry ID</Label>
                  <div className="font-mono text-sm">{selectedEntry.uuid}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Action</Label>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getActionColor(
                        selectedEntry.action,
                      )}`}
                    >
                      {selectedEntry.action}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Resource Type</Label>
                  <div className="font-medium">{selectedEntry.resourceType}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Resource ID</Label>
                  <div className="font-mono text-sm">{selectedEntry.resourceId || "-"}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Actor</Label>
                  <div>
                    {selectedEntry.user ? (
                      <>
                        <div>
                          {selectedEntry.user.firstName} {selectedEntry.user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedEntry.user.email}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">IP Address</Label>
                  <div className="font-mono text-sm">{selectedEntry.ipAddress || "-"}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <div>{format(new Date(selectedEntry.createdAt), "PPpp")}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">User Agent</Label>
                  <div className="text-sm">{selectedEntry.userAgent || "-"}</div>
                </div>
              </div>

              {selectedEntry.changes && (
                <div>
                  <Label className="text-muted-foreground">Changes</Label>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-4 text-xs">
                    {JSON.stringify(selectedEntry.changes, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
