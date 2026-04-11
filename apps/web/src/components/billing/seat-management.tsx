import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../../utils/orpc";

interface Seat {
  id: number;
  userId: number;
  role: string;
  addedAt: string;
  removedAt: string | null;
  user?: {
    id: number;
    uuid: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
  };
}

interface Subscription {
  id: number;
  uuid: string;
  status: string;
  seatCount: number;
  agentCount?: number;
  maxAgents?: number;
  seatLimitReached?: boolean;
  seats?: Seat[];
}

interface SeatManagementProps {
  subscription: Subscription;
  onUpdate?: () => void;
}

export function SeatManagement({ subscription, onUpdate }: SeatManagementProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const queryClient = useQueryClient();

  const addSeatMutation = useMutation(
    (orpc as any).subscriptions.addSeat.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
        setIsAddOpen(false);
        setEmail("");
        onUpdate?.();
      },
    }),
  );

  const removeSeatMutation = useMutation(
    (orpc as any).subscriptions.removeSeat.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
        onUpdate?.();
      },
    }),
  );

  const handleAddByEmail = async () => {
    if (!email.includes("@")) return;
    // TODO: Look up user by email and get userId
    await addSeatMutation.mutateAsync({ organizationId: 1, userId: 1 } as any);
  };

  const currentSeats = subscription.seats || [];
  const activeSeats = currentSeats.filter((s) => !s.removedAt);
  const agentCount = subscription.agentCount || activeSeats.length;
  const maxAgents = subscription.maxAgents || 0;
  const isUnlimited = maxAgents === -1;
  const seatsAvailable = isUnlimited ? Infinity : maxAgents - agentCount;
  const isAtLimit = !isUnlimited && seatsAvailable <= 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
            <span>👥</span> Total Seats
          </h3>
          <div className="text-2xl font-bold">
            {agentCount}
            {isUnlimited ? "" : ` / ${maxAgents}`}
          </div>
          {isAtLimit && (
            <p className="text-xs text-amber-600 mt-1 flex items-center">⚠️ Seat limit reached</p>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Available Seats</h3>
          <div className="text-2xl font-bold">{isUnlimited ? "∞" : seatsAvailable}</div>
          {!isUnlimited && (
            <p className="text-xs text-gray-500 mt-1">
              {seatsAvailable > 0 ? `${seatsAvailable} seats remaining` : "No seats available"}
            </p>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Subscription Seats</h3>
          <div className="text-2xl font-bold">{subscription.seatCount}</div>
          <p className="text-xs text-gray-500 mt-1">Paid seat allocation</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Team Members</h3>
            <p className="text-sm text-gray-500">Manage who has access to your support workspace</p>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            disabled={isAtLimit}
            className={`px-4 py-2 rounded flex items-center gap-2 ${
              isAtLimit
                ? "bg-gray-100 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <span>➕</span> Add Seat
          </button>
        </div>

        <div className="p-4">
          {currentSeats.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Added</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentSeats.map((seat) => (
                  <tr key={seat.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">
                      {seat.user?.displayName ||
                        `${seat.user?.firstName || ""} ${seat.user?.lastName || ""}`.trim() ||
                        "Unknown"}
                    </td>
                    <td className="py-3 text-gray-500">{seat.user?.email || "N/A"}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                        {seat.role || "agent"}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">
                      {seat.addedAt ? new Date(seat.addedAt).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() =>
                          removeSeatMutation.mutateAsync({
                            organizationId: 1,
                            userId: seat.userId,
                          } as any)
                        }
                        disabled={removeSeatMutation.isPending}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-gray-500 mb-4">No team members added yet</p>
              <button
                onClick={() => setIsAddOpen(true)}
                disabled={isAtLimit}
                className={`px-4 py-2 rounded ${
                  isAtLimit
                    ? "bg-gray-100 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <span>➕</span> Add Your First Team Member
              </button>
            </div>
          )}
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-2">Add Team Member</h2>
            <p className="text-gray-500 mb-4">
              {isAtLimit
                ? "You've reached your seat limit. Upgrade your plan to add more team members."
                : "Enter the email address of the team member you want to add."}
            </p>

            <div className="py-4">
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <input
                type="email"
                placeholder="agent@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isAtLimit}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!email || isAtLimit || addSeatMutation.isPending}
                onClick={handleAddByEmail}
                className={`px-4 py-2 rounded ${
                  !email || isAtLimit
                    ? "bg-gray-100 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {addSeatMutation.isPending ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAtLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800">Seat Limit Reached</p>
              <p className="text-sm text-amber-700">Upgrade your plan to add more team members</p>
            </div>
          </div>
          <button className="px-4 py-2 border border-amber-300 rounded bg-white">
            Upgrade Plan
          </button>
        </div>
      )}
    </div>
  );
}
