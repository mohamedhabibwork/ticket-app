import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Textarea } from "@ticket-app/ui/components/textarea";
import { ArrowLeft, Download, Eye, FileText, Check, Clock, Ticket, X } from "lucide-react";
import { orpc } from "@/utils/orpc";

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

interface Submission {
  id: number;
  uuid: string;
  formId: number;
  contactId: number | null;
  ticketId: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date | string;
  contact?: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export const Route = createFileRoute("/admin/forms/id/submissions")({
  component: FormSubmissionsRoute,
});

function FormSubmissionsRoute() {
  const { id } = useParams({ from: "/admin/forms/id/submissions" });
  const formId = Number(id);

  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: form, isLoading: formLoading } = useQuery(
    orpc.forms.get.queryOptions({
      id: formId,
      organizationId: 1,
    })
  );

  const { data: submissions, isLoading: submissionsLoading, refetch } = useQuery(
    orpc.forms.getSubmissions?.queryOptions({
      formId,
      organizationId: 1,
    }) || { enabled: false }
  );

  const convertToTicketMutation = useMutation(
    orpc.forms.convertToTicket?.mutationOptions({
      onSuccess: () => refetch(),
    })
  );

  const filteredSubmissions = submissions?.filter((sub: Submission) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      sub.contact?.email.toLowerCase().includes(search) ||
      sub.uuid.toLowerCase().includes(search)
    );
  });

  const exportToCSV = () => {
    if (!submissions || submissions.length === 0) return;

    const headers = ["ID", "Date", "Email", "Name", "IP Address", "Status", "Ticket ID"];
    const rows = submissions.map((sub: Submission) => [
      sub.id,
      new Date(sub.createdAt).toISOString(),
      sub.contact?.email || "",
      `${sub.contact?.firstName || ""} ${sub.contact?.lastName || ""}`.trim(),
      sub.ipAddress || "",
      sub.ticketId ? "Converted" : "New",
      sub.ticketId || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-${formId}-submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (submission: Submission) => {
    if (submission.ticketId) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          <Check className="h-3 w-3" />
          Converted
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
        <Clock className="h-3 w-3" />
        New
      </span>
    );
  };

  if (formLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!form) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Form not found</p>
            <Link to="/admin/forms/">
              <Button variant="outline" className="mt-4">Back to Forms</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <Link to="/admin/forms/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Forms
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{form.name} - Submissions</h1>
            <p className="text-muted-foreground">View and manage form submissions</p>
          </div>
          <Button variant="outline" onClick={exportToCSV} disabled={!submissions || submissions.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search submissions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {submissionsLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredSubmissions && filteredSubmissions.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {filteredSubmissions.map((submission: Submission) => (
              <Card
                key={submission.id}
                className={`cursor-pointer transition-colors ${
                  selectedSubmission?.id === submission.id ? "border-primary" : ""
                }`}
                onClick={() => setSelectedSubmission(submission)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {submission.contact?.email || "No email"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {submission.contact?.firstName} {submission.contact?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(submission.createdAt)}
                      </p>
                    </div>
                    {getStatusBadge(submission)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Submission Details</span>
                {selectedSubmission && !selectedSubmission.ticketId && (
                  <Button
                    size="sm"
                    onClick={() => convertToTicketMutation?.mutate({ submissionId: selectedSubmission.id })}
                    disabled={convertToTicketMutation.isPending}
                  >
                    <Ticket className="mr-2 h-4 w-4" />
                    Convert to Ticket
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSubmission ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Submission ID</Label>
                      <p className="font-mono text-sm">#{selectedSubmission.id}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Date</Label>
                      <p className="text-sm">{new Date(selectedSubmission.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="text-sm">{selectedSubmission.contact?.email || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">IP Address</Label>
                      <p className="text-sm font-mono">{selectedSubmission.ipAddress || "N/A"}</p>
                    </div>
                    {selectedSubmission.ticketId && (
                      <div>
                        <Label className="text-muted-foreground">Ticket</Label>
                        <Link to={`/tickets/${selectedSubmission.ticketId}`}>
                          <p className="text-sm text-primary">View Ticket #{selectedSubmission.ticketId}</p>
                        </Link>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Field Values</Label>
                    <div className="bg-muted/50 rounded-none p-4 space-y-2">
                      <p className="text-sm text-muted-foreground">No field values available</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-4" />
                  <p>Select a submission to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No submissions found</p>
            <p className="text-sm text-muted-foreground">
              Share your form to start receiving submissions
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
