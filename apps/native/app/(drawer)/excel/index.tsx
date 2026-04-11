import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Chip,
  Spinner,
  Surface,
  Text,
  TextField,
  Input,
  SegmentedControl,
  useThemeColor,
} from "heroui-native";
import { useRouter } from "expo-router";
import { View, Alert } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact, hapticNotification } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

const ENTITY_TYPES = [
  { value: "tickets", label: "Tickets" },
  { value: "contacts", label: "Contacts" },
  { value: "users", label: "Users" },
  { value: "kb_articles", label: "KB" },
  { value: "saved_replies", label: "Replies" },
] as const;

const ORGANIZATION_ID = 1;
const USER_ID = 1;

type EntityType = (typeof ENTITY_TYPES)[number]["value"];

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

function getStatusColor(
  status: string,
): "primary" | "secondary" | "success" | "warning" | "danger" | "default" {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "danger";
    case "processing":
    case "validating":
      return "primary";
    case "pending":
      return "warning";
    default:
      return "default";
  }
}

export default function ExcelScreen() {
  const _router = useRouter();
  const _queryClient = useQueryClient();
  const mutedColor = useThemeColor("muted");
  const foregroundColor = useThemeColor("foreground");
  const [activeTab, setActiveTab] = useState<"exports" | "imports">("exports");
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>("tickets");
  const [importMode, setImportMode] = useState<"create" | "upsert">("create");
  const [fileUrl, setFileUrl] = useState("");

  const {
    data: exportJobs,
    isLoading: exportsLoading,
    refetch: refetchExports,
  } = useQuery(
    orpc.excel.listExportJobs.queryOptions({
      organizationId: ORGANIZATION_ID,
      limit: 20,
      offset: 0,
    }),
  );

  const {
    data: importJobs,
    isLoading: importsLoading,
    refetch: refetchImports,
  } = useQuery(
    orpc.excel.listImportJobs.queryOptions({
      organizationId: ORGANIZATION_ID,
      limit: 20,
      offset: 0,
    }),
  );

  const createExportMutation = useMutation(
    orpc.excel.createExportJob.mutationOptions({
      onSuccess: () => {
        refetchExports();
        hapticNotification("success");
      },
      onError: (error) => {
        Alert.alert("Export Failed", error.message);
      },
    }),
  );

  const createImportMutation = useMutation(
    orpc.excel.createImportJob.mutationOptions({
      onSuccess: () => {
        refetchImports();
        hapticNotification("success");
        setFileUrl("");
      },
      onError: (error) => {
        Alert.alert("Import Failed", error.message);
      },
    }),
  );

  const getDownloadUrlMutation = useMutation(
    orpc.excel.getExportDownloadUrl.mutationOptions({
      onSuccess: () => {
        Alert.alert("Download Ready", "Your export file is ready for download.");
      },
    }),
  );

  const handleRefresh = async () => {
    if (activeTab === "exports") {
      await refetchExports();
    } else {
      await refetchImports();
    }
    hapticImpact("light");
  };

  const handleExport = () => {
    hapticImpact("medium");
    createExportMutation.mutate({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      entityType: selectedEntityType,
    });
  };

  const handleDownload = async (jobId: string) => {
    hapticImpact("medium");
    try {
      const result = await getDownloadUrlMutation.mutateAsync({
        jobId,
        organizationId: ORGANIZATION_ID,
      });
      Alert.alert("Download", `File available at: ${result.downloadUrl}`);
    } catch {
      Alert.alert("Error", "Failed to get download URL");
    }
  };

  const handleImport = () => {
    if (!fileUrl) {
      Alert.alert("Error", "Please enter a file URL");
      return;
    }
    hapticImpact("medium");
    createImportMutation.mutate({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      entityType: selectedEntityType,
      fileUrl,
      mode: importMode,
    });
  };

  const pollingJobIds = [
    ...(exportJobs
      ?.filter((j) => j.status === "pending" || j.status === "processing")
      .map((j) => j.jobId) || []),
    ...(importJobs
      ?.filter(
        (j) => j.status === "pending" || j.status === "validating" || j.status === "processing",
      )
      .map((j) => j.jobId) || []),
  ];

  useEffect(() => {
    if (pollingJobIds.length === 0) return;

    const interval = setInterval(() => {
      if (activeTab === "exports") {
        refetchExports();
      } else {
        refetchImports();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pollingJobIds.length, activeTab, refetchExports, refetchImports]);

  const renderExportItem = (job: (typeof exportJobs)[number]) => (
    <Surface key={job.jobId} variant="secondary" className="p-3 rounded-lg mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons name="document-text-outline" size={20} color={mutedColor} />
          <View>
            <Text className="text-foreground text-sm font-medium">
              {ENTITY_TYPES.find((t) => t.value === job.entityType)?.label}
            </Text>
            <Text className="text-muted text-xs">
              {job.recordCount !== null ? `${job.recordCount} records` : "Processing..."} •{" "}
              {formatRelativeTime(job.createdAt)}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <Chip variant="flat" color={getStatusColor(job.status)} size="sm">
            <Chip.Label className="text-xs">{job.status}</Chip.Label>
          </Chip>
          {job.status === "completed" && (
            <Button
              variant="light"
              size="sm"
              isIconOnly
              onPress={() => handleDownload(job.jobId)}
              isLoading={getDownloadUrlMutation.isPending}
            >
              <Ionicons name="download-outline" size={18} color={foregroundColor} />
            </Button>
          )}
        </View>
      </View>
    </Surface>
  );

  const renderImportItem = (job: (typeof importJobs)[number]) => (
    <Surface key={job.jobId} variant="secondary" className="p-3 rounded-lg mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons name="document-text-outline" size={20} color={mutedColor} />
          <View>
            <Text className="text-foreground text-sm font-medium">
              {ENTITY_TYPES.find((t) => t.value === job.entityType)?.label}
            </Text>
            <Text className="text-muted text-xs">
              {job.mode === "upsert" ? "Upsert" : "Create"} •{" "}
              {job.totalRows !== null
                ? `${job.processedRows || 0}/${job.totalRows} rows`
                : "Processing..."}{" "}
              • {formatRelativeTime(job.createdAt)}
            </Text>
          </View>
        </View>
        <Chip variant="flat" color={getStatusColor(job.status)} size="sm">
          <Chip.Label className="text-xs">{job.status}</Chip.Label>
        </Chip>
      </View>
      {job.successCount !== null && job.errorCount !== null && (
        <View className="flex-row gap-2 mt-2">
          <Chip variant="flat" color="success" size="sm">
            <Chip.Label className="text-xs">{job.successCount} success</Chip.Label>
          </Chip>
          {job.errorCount > 0 && (
            <Chip variant="flat" color="danger" size="sm">
              <Chip.Label className="text-xs">{job.errorCount} errors</Chip.Label>
            </Chip>
          )}
        </View>
      )}
    </Surface>
  );

  return (
    <Container onRefresh={handleRefresh} refreshing={exportsLoading || importsLoading}>
      <View className="px-4 py-4">
        <Text className="text-2xl font-semibold text-foreground tracking-tight mb-4">
          Excel Import/Export
        </Text>

        <SegmentedControl
          className="mb-4"
          value={activeTab}
          onChange={(value) => setActiveTab(value as typeof activeTab)}
          items={[
            { key: "exports", title: "Exports" },
            { key: "imports", title: "Imports" },
          ]}
        />

        {activeTab === "exports" ? (
          <View>
            <Surface variant="secondary" className="p-4 rounded-lg mb-4">
              <Text className="text-foreground font-medium mb-3">Create Export</Text>
              <TextField className="mb-3">
                <Input
                  label="Entity Type"
                  value={ENTITY_TYPES.find((t) => t.value === selectedEntityType)?.label}
                  onValueChange={() => {}}
                  isReadOnly
                />
              </TextField>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {ENTITY_TYPES.map((type) => (
                  <Chip
                    key={type.value}
                    variant={selectedEntityType === type.value ? "solid" : "flat"}
                    onPress={() => setSelectedEntityType(type.value)}
                  >
                    <Chip.Label className="text-xs">{type.label}</Chip.Label>
                  </Chip>
                ))}
              </View>
              <Button
                variant="primary"
                onPress={handleExport}
                isLoading={createExportMutation.isPending}
              >
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text className="text-white font-medium ml-2">Create Export</Text>
              </Button>
            </Surface>

            <Text className="text-foreground font-medium mb-2">Export History</Text>
            {exportsLoading ? (
              <View className="items-center py-8">
                <Spinner />
              </View>
            ) : exportJobs && exportJobs.length > 0 ? (
              exportJobs.map(renderExportItem)
            ) : (
              <Surface variant="secondary" className="items-center justify-center py-8 rounded-lg">
                <Ionicons name="document-text-outline" size={40} color={mutedColor} />
                <Text className="text-foreground mt-2">No exports yet</Text>
              </Surface>
            )}
          </View>
        ) : (
          <View>
            <Surface variant="secondary" className="p-4 rounded-lg mb-4">
              <Text className="text-foreground font-medium mb-3">Create Import</Text>
              <TextField className="mb-3">
                <Input
                  label="Entity Type"
                  value={ENTITY_TYPES.find((t) => t.value === selectedEntityType)?.label}
                  onValueChange={() => {}}
                  isReadOnly
                />
              </TextField>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {ENTITY_TYPES.map((type) => (
                  <Chip
                    key={type.value}
                    variant={selectedEntityType === type.value ? "solid" : "flat"}
                    onPress={() => setSelectedEntityType(type.value)}
                  >
                    <Chip.Label className="text-xs">{type.label}</Chip.Label>
                  </Chip>
                ))}
              </View>
              <View className="mb-3">
                <Text className="text-muted text-xs mb-2">Import Mode</Text>
                <SegmentedControl
                  value={importMode}
                  onChange={(value) => setImportMode(value as "create" | "upsert")}
                  items={[
                    { key: "create", title: "Create" },
                    { key: "upsert", title: "Upsert" },
                  ]}
                />
              </View>
              <TextField className="mb-3">
                <Input
                  label="File URL"
                  placeholder="https://storage.ticket.cloud.habib.cloud/file.xlsx"
                  value={fileUrl}
                  onChangeText={setFileUrl}
                />
              </TextField>
              <Button
                variant="primary"
                onPress={handleImport}
                isLoading={createImportMutation.isPending}
                isDisabled={!fileUrl}
              >
                <Ionicons name="upload-outline" size={18} color="#fff" />
                <Text className="text-white font-medium ml-2">Start Import</Text>
              </Button>
            </Surface>

            <Text className="text-foreground font-medium mb-2">Import History</Text>
            {importsLoading ? (
              <View className="items-center py-8">
                <Spinner />
              </View>
            ) : importJobs && importJobs.length > 0 ? (
              importJobs.map(renderImportItem)
            ) : (
              <Surface variant="secondary" className="items-center justify-center py-8 rounded-lg">
                <Ionicons name="document-text-outline" size={40} color={mutedColor} />
                <Text className="text-foreground mt-2">No imports yet</Text>
              </Surface>
            )}
          </View>
        )}
      </View>
    </Container>
  );
}
