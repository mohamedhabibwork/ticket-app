import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../../../utils/orpc";
import { Shield, CheckCircle, XCircle, Trash2, RotateCcw, AlertTriangle, Mail } from "lucide-react";

interface SpamTicket {
  id: number;
  uuid: string;
  referenceNumber: string;
  subject: string;
  createdAt: string;
  contact: {
    id: number;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  status: {
    id: number;
    name: string;
  } | null;
  priority: {
    id: number;
    name: string;
  } | null;
  channel: {
    id: number;
    name: string;
  } | null;
  assignedAgent: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface SpamQuarantinePageProps {
  organizationId: number;
}

export function SpamQuarantinePage({ organizationId }: SpamQuarantinePageProps) {
  const [selectedTicket, setSelectedTicket] = useState<SpamTicket | null>(null);
  const queryClient = useQueryClient();

  const {
    data: spamTickets = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["spam-tickets", organizationId],
    queryFn: () =>
      orpc.tickets.listSpam.query({
        organizationId,
        limit: 50,
      }),
  });

  const releaseMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      return await orpc.tickets.markAsNotSpam.mutate({
        id: ticketId,
        organizationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spam-tickets", organizationId] });
      setSelectedTicket(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      return await orpc.tickets.deletePermanent.mutate({
        id: ticketId,
        organizationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spam-tickets", organizationId] });
      setSelectedTicket(null);
    },
  });

  const handleRelease = (ticket: SpamTicket) => {
    if (
      window.confirm(
        "Are you sure you want to release this ticket from quarantine? It will be moved back to the main inbox.",
      )
    ) {
      releaseMutation.mutate(ticket.id);
    }
  };

  const handleDelete = (ticket: SpamTicket) => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete this spam ticket? This action cannot be undone.",
      )
    ) {
      deleteMutation.mutate(ticket.id);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Spam Quarantine</h1>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Review and manage tickets that have been flagged as spam. Released tickets will return to
          the main inbox.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full"></div>
        </div>
      ) : spamTickets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Spam Tickets
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Your spam quarantine is empty. Great job keeping spam under control!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {spamTickets.length} quarantined ticket{spamTickets.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => refetch()}
                  className="text-sm text-amber-600 hover:text-amber-700"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {spamTickets.map((ticket: SpamTicket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedTicket?.id === ticket.id ? "bg-amber-50 dark:bg-amber-900/20" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">
                          #{ticket.referenceNumber}
                        </span>
                        <span className="text-xs text-gray-400">
                          {getTimeAgo(ticket.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate mb-1">
                        {ticket.subject}
                      </p>
                      {ticket.contact && (
                        <p className="text-xs text-gray-500 truncate">
                          {ticket.contact.email || "No email"}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        Spam
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {selectedTicket ? (
              <>
                <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Ticket Details
                      </h3>
                      <p className="text-sm text-gray-500">#{selectedTicket.referenceNumber}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Quarantined
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Subject</h4>
                    <p className="text-gray-900 dark:text-white">{selectedTicket.subject}</p>
                  </div>

                  {selectedTicket.contact && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Contact</h4>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">
                          {selectedTicket.contact.email || "No email"}
                        </span>
                      </div>
                      {(selectedTicket.contact.firstName || selectedTicket.contact.lastName) && (
                        <p className="text-sm text-gray-500 mt-1">
                          {selectedTicket.contact.firstName} {selectedTicket.contact.lastName}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {selectedTicket.status && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                          {selectedTicket.status.name}
                        </span>
                      </div>
                    )}
                    {selectedTicket.priority && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Priority</h4>
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                          {selectedTicket.priority.name}
                        </span>
                      </div>
                    )}
                    {selectedTicket.channel && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Channel</h4>
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                          {selectedTicket.channel.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 mb-4">
                      Created {new Date(selectedTicket.createdAt).toLocaleString()}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleRelease(selectedTicket)}
                        disabled={releaseMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {releaseMutation.isPending ? "Releasing..." : "Release to Inbox"}
                      </button>
                      <button
                        onClick={() => handleDelete(selectedTicket)}
                        disabled={deleteMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleteMutation.isPending ? "Deleting..." : "Delete Spam"}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-center p-6">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a Ticket
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click on a quarantined ticket to view its details and take action.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {(releaseMutation.isError || deleteMutation.isError) && (
        <div className="fixed bottom-6 right-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-3">
          <XCircle className="w-5 h-5" />
          <span>An error occurred. Please try again.</span>
        </div>
      )}
    </div>
  );
}
