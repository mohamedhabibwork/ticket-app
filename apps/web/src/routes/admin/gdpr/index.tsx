import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, Download } from "lucide-react";

const api = {
  async get(url: string) {
    return fetch(url);
  },
  async post(url: string, data: unknown) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
};

interface GdprRequest {
  id: number;
  type: "access" | "erasure" | "portability";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  contact?: { email: string; firstName?: string; lastName?: string };
  createdAt: string;
  completedAt?: string;
}

export default function GdprAdminPage() {
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["gdpr-requests", filterStatus, filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterType) params.set("type", filterType);
      const response = await api.get(`/api/gdpr/list?${params}`);
      return response.json() as Promise<GdprRequest[]>;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const response = await api.post("/api/gdpr/update", { id, status, notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gdpr-requests"] });
    },
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: string }) => {
      const endpoint = `/api/gdpr/process${type.charAt(0).toUpperCase() + type.slice(1)}Request`;
      const response = await api.post(endpoint, { id });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gdpr-requests"] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">Pending</span>
        );
      case "in_progress":
        return (
          <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">In Progress</span>
        );
      case "completed":
        return (
          <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">Completed</span>
        );
      case "cancelled":
        return (
          <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-800">Cancelled</span>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "access":
        return (
          <span className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-800">Access</span>
        );
      case "erasure":
        return <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-800">Erasure</span>;
      case "portability":
        return (
          <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">Portability</span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GDPR Requests</h1>
          <p className="text-gray-500">
            Manage data subject access, erasure, and portability requests
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded border px-3 py-2"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded border px-3 py-2"
        >
          <option value="">All Types</option>
          <option value="access">Access</option>
          <option value="erasure">Erasure</option>
          <option value="portability">Portability</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Contact</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests?.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{request.contact?.email}</div>
                    <div className="text-sm text-gray-500">
                      {request.contact?.firstName} {request.contact?.lastName}
                    </div>
                  </td>
                  <td className="px-4 py-3">{getTypeBadge(request.type)}</td>
                  <td className="px-4 py-3">{getStatusBadge(request.status)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {request.status === "pending" && (
                        <button
                          onClick={() =>
                            updateMutation.mutate({ id: request.id, status: "in_progress" })
                          }
                          className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
                        >
                          Start Processing
                        </button>
                      )}
                      {request.status === "in_progress" && (
                        <>
                          {request.type === "access" && (
                            <button
                              onClick={() =>
                                processMutation.mutate({ id: request.id, type: "access" })
                              }
                              className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200"
                            >
                              <FileText className="h-3 w-3" />
                              Export Data
                            </button>
                          )}
                          {request.type === "erasure" && (
                            <button
                              onClick={() =>
                                processMutation.mutate({ id: request.id, type: "erasure" })
                              }
                              className="flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                            >
                              <Trash2 className="h-3 w-3" />
                              Erase Data
                            </button>
                          )}
                          {request.type === "portability" && (
                            <button
                              onClick={() =>
                                processMutation.mutate({ id: request.id, type: "portability" })
                              }
                              className="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </button>
                          )}
                        </>
                      )}
                      {request.status !== "completed" && request.status !== "cancelled" && (
                        <button
                          onClick={() =>
                            updateMutation.mutate({ id: request.id, status: "cancelled" })
                          }
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {requests?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No GDPR requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
