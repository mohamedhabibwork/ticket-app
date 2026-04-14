import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@ticket-app/ui/components/tabs";
import { FileUpload } from "@ticket-app/ui/components/file-upload";
import {
  Loader2,
  Download,
  Upload,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  DownloadCloud,
} from "lucide-react";
import { orpc } from "@/utils/orpc";

const ENTITY_TYPES = [
  { value: "tickets", label: "Tickets" },
  { value: "contacts", label: "Contacts" },
  { value: "users", label: "Users" },
  { value: "kb_articles", label: "Knowledge Base" },
  { value: "saved_replies", label: "Saved Replies" },
] as const;

const ORGANIZATION_ID = 1;
const USER_ID = 1;

type EntityType = "tickets" | "contacts" | "users" | "kb_articles" | "saved_replies";

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

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "processing":
    case "validating":
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
}

function getStatusBadge(status: string) {
  const variants: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    processing: "bg-blue-100 text-blue-800",
    validating: "bg-blue-100 text-blue-800",
    pending: "bg-yellow-100 text-yellow-800",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${variants[status] || "bg-gray-100 text-gray-800"}`}
    >
      {getStatusIcon(status)}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export const Route = createFileRoute("/admin/excel/")({
  loader: async ({ context }) => {
    const [exportJobs, importJobs] = await Promise.all([
      context.orpc.excel.listExportJobs.query({
        organizationId: ORGANIZATION_ID,
        limit: 20,
        offset: 0,
      }),
      context.orpc.excel.listImportJobs.query({
        organizationId: ORGANIZATION_ID,
        limit: 20,
        offset: 0,
      }),
    ]);
    return { exportJobs, importJobs };
  },
  component: ExcelManagementRoute,
});

function ExcelManagementRoute() {
  const [activeTab, setActiveTab] = useState<"exports" | "imports">("exports");
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>("tickets");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"create" | "upsert">("create");
  const [matchField, setMatchField] = useState("");
  const { exportJobs: _initialExportJobs, importJobs: _initialImportJobs } =
    Route.useLoaderData<typeof Route>();

  const exportJobsQuery = useQuery(
    (orpc as any).excel.listExportJobs.queryOptions({
      organizationId: ORGANIZATION_ID,
      limit: 20,
      offset: 0,
    }) as any,
  );

  const importJobsQuery = useQuery(
    (orpc as any).excel.listImportJobs.queryOptions({
      organizationId: ORGANIZATION_ID,
      limit: 20,
      offset: 0,
    }) as any,
  );

  const createExportMutation = useMutation(
    (orpc as any).excel.createExportJob.mutationOptions({
      onSuccess: () => {
        exportJobsQuery.refetch();
      },
    }) as any,
  );

  const createImportMutation = useMutation(
    (orpc as any).excel.createImportJob.mutationOptions({
      onSuccess: () => {
        importJobsQuery.refetch();
        setImportFile(null);
      },
    }) as any,
  );

  const getDownloadUrlMutation = useMutation(
    (orpc as any).excel.getExportDownloadUrl.mutationOptions() as any,
  );

  const generateUploadUrlMutation = useMutation(
    (orpc as any).files.generateUploadUrl.mutationOptions() as any,
  );

  const handleExport = () => {
    (createExportMutation as any).mutate({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      entityType: selectedEntityType,
    });
  };

  const handleDownload = (jobId: string) => {
    (getDownloadUrlMutation as any).mutate(
      { jobId, organizationId: ORGANIZATION_ID },
      {
        onSuccess: (data: any) => {
          window.open(data.downloadUrl, "_blank");
        },
      },
    );
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setImportFile(file);

    try {
      const { uploadUrl, publicUrl } = await (generateUploadUrlMutation.mutateAsync({
        organizationId: ORGANIZATION_ID,
        filename: file.name,
        contentType: file.type || "application/vnd.ms-excel",
        sizeBytes: file.size,
        attachmentType: "ticket",
      } as any) as any);

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/vnd.ms-excel",
        },
      });

      (createImportMutation as any).mutate({
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        entityType: selectedEntityType,
        fileUrl: publicUrl,
        mode: importMode,
        matchField: importMode === "upsert" ? matchField : undefined,
      });
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  const pendingExportJobs =
    (exportJobsQuery.data as any)?.filter(
      (j: any) => j.status === "pending" || j.status === "processing",
    ) || [];
  const pendingImportJobs =
    (importJobsQuery.data as any)?.filter(
      (j: any) => j.status === "pending" || j.status === "validating" || j.status === "processing",
    ) || [];
  const hasPendingJobs = pendingExportJobs.length > 0 || pendingImportJobs.length > 0;

  useEffect(() => {
    if (!hasPendingJobs) return;

    const interval = setInterval(() => {
      if (activeTab === "exports") {
        exportJobsQuery.refetch();
      } else {
        importJobsQuery.refetch();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [hasPendingJobs, activeTab]);

  const exportJobs = (exportJobsQuery.data as any) || [];
  const importJobs = (importJobsQuery.data as any) || [];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Excel Import/Export</h1>
        <p className="text-muted-foreground">Export and import data in Excel format</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="exports">
            <Download className="mr-2 h-4 w-4" />
            Exports
          </TabsTrigger>
          <TabsTrigger value="imports">
            <Upload className="mr-2 h-4 w-4" />
            Imports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exports">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Create Export</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Entity Type</label>
                    <select
                      className="w-full rounded-none border border-input bg-background px-3 py-2 text-sm"
                      value={selectedEntityType}
                      onChange={(e) => setSelectedEntityType(e.target.value as EntityType)}
                    >
                      {ENTITY_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleExport}
                    disabled={createExportMutation.isPending}
                  >
                    {createExportMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <DownloadCloud className="mr-2 h-4 w-4" />
                    )}
                    Create Export Job
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Export History</h2>
                  <Button variant="ghost" size="icon" onClick={() => exportJobsQuery.refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                {exportJobsQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : exportJobs.length > 0 ? (
                  <div className="space-y-3">
                    {exportJobs.map((job: any) => (
                      <div
                        key={job.jobId}
                        className="flex items-center justify-between rounded-none border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-muted p-2">
                            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {ENTITY_TYPES.find((t) => t.value === job.entityType)?.label}
                              </span>
                              {getStatusBadge(job.status)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {job.recordCount !== null
                                ? `${job.recordCount} records`
                                : "Processing..."}{" "}
                              • {formatRelativeTime(job.createdAt)}
                            </div>
                          </div>
                        </div>
                        {job.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(job.jobId)}
                            disabled={getDownloadUrlMutation.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <FileSpreadsheet className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
                    <p>No export jobs yet</p>
                    <p className="text-sm">Create your first export to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="imports">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Create Import</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Entity Type</label>
                    <select
                      className="w-full rounded-none border border-input bg-background px-3 py-2 text-sm"
                      value={selectedEntityType}
                      onChange={(e) => setSelectedEntityType(e.target.value as EntityType)}
                    >
                      {ENTITY_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Import Mode</label>
                    <select
                      className="w-full rounded-none border border-input bg-background px-3 py-2 text-sm"
                      value={importMode}
                      onChange={(e) => setImportMode(e.target.value as "create" | "upsert")}
                    >
                      <option value="create">Create New</option>
                      <option value="upsert">Upsert (Update Existing)</option>
                    </select>
                  </div>
                  {importMode === "upsert" && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">Match Field</label>
                      <Input
                        placeholder="e.g., email, id"
                        value={matchField}
                        onChange={(e) => setMatchField(e.target.value)}
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Excel File</label>
                    <FileUpload
                      accept=".xlsx,.xls,.csv"
                      maxSize={50 * 1024 * 1024}
                      onChange={(files) => setImportFile(files[0] || null)}
                      onUpload={handleFileUpload}
                      disabled={createImportMutation.isPending}
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={!importFile || createImportMutation.isPending}
                    onClick={() => importFile && handleFileUpload([importFile])}
                  >
                    {createImportMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Start Import
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Import History</h2>
                  <Button variant="ghost" size="icon" onClick={() => importJobsQuery.refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                {importJobsQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : importJobs.length > 0 ? (
                  <div className="space-y-3">
                    {importJobs.map((job: any) => (
                      <div
                        key={job.jobId}
                        className="flex items-center justify-between rounded-none border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-muted p-2">
                            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {ENTITY_TYPES.find((t) => t.value === job.entityType)?.label}
                              </span>
                              {getStatusBadge(job.status)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {job.mode === "upsert" ? "Upsert" : "Create"} •{" "}
                              {job.totalRows !== null
                                ? `${job.processedRows || 0}/${job.totalRows} rows`
                                : "Processing..."}{" "}
                              {job.successCount !== null && job.errorCount !== null
                                ? `(${job.successCount} success, ${job.errorCount} errors)`
                                : ""}
                              • {formatRelativeTime(job.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <FileSpreadsheet className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
                    <p>No import jobs yet</p>
                    <p className="text-sm">Upload an Excel file to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
