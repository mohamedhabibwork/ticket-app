import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { Badge } from "@ticket-app/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ticket-app/ui/components/select";
import { orpc } from "@/utils/orpc";
import { MoreHorizontal, Plus, Edit, Trash2, Clock, Star, Filter } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/sla/")({
  component: SlaPoliciesListRoute,
});

function SlaPoliciesListRoute() {
  const queryClient = useQueryClient();
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: policies, isLoading } = useQuery({
    queryKey: ["sla-policies"],
    queryFn: () => orpc.slaPolicies.list.query(),
  });

  const { data: priorities } = useQuery({
    queryKey: ["priorities"],
    queryFn: () => orpc.slaPolicies.getPriorities.query(),
  });

  const deleteMutation = useMutation(
    orpc.slaPolicies.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["sla-policies"] });
      },
    }),
  );

  const setDefaultMutation = useMutation(
    orpc.slaPolicies.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["sla-policies"] });
      },
    }),
  );

  const handleDelete = (policyId: number, policyName: string) => {
    if (
      confirm(
        `Are you sure you want to delete the SLA policy "${policyName}"? This action cannot be undone.`,
      )
    ) {
      deleteMutation.mutate({ id: policyId });
    }
  };

  const handleSetDefault = (policyId: number) => {
    setDefaultMutation.mutate({ id: policyId, isDefault: true });
  };

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  const getPriorityBadgeColor = (priorityName: string): string => {
    const name = priorityName.toLowerCase();
    if (name === "high" || name === "urgent") return "bg-red-100 text-red-800";
    if (name === "medium") return "bg-yellow-100 text-yellow-800";
    if (name === "low") return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  const filteredPolicies = policies?.filter((policy) => {
    if (priorityFilter === "all") return true;
    return policy.targets?.some(
      (target) => target.priority?.name.toLowerCase() === priorityFilter.toLowerCase(),
    );
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">SLA Policies</h1>
          <p className="text-muted-foreground mt-1">
            Manage service level agreements and response times
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/sla/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Policy
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by priority:</span>
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {priorities?.map((priority: any) => (
              <SelectItem key={priority.id} value={priority.name.toLowerCase()}>
                {priority.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : filteredPolicies && filteredPolicies.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPolicies.map((policy: any) => (
            <Card key={policy.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {policy.name}
                        {policy.isDefault && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
                            <Star className="h-3 w-3" />
                            Default
                          </span>
                        )}
                      </CardTitle>
                      {policy.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {policy.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/admin/sla/${policy.id}`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      {!policy.isDefault && (
                        <DropdownMenuItem onClick={() => handleSetDefault(policy.id)}>
                          <Star className="mr-2 h-4 w-4" />
                          Set as Default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(policy.id, policy.name)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    {policy.businessHoursOnly ? (
                      <Badge variant="outline">Business Hours Only</Badge>
                    ) : (
                      <Badge variant="outline">24/7</Badge>
                    )}
                  </div>

                  {policy.targets && policy.targets.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Priority</th>
                            <th className="px-3 py-2 text-left font-medium">First Response</th>
                            <th className="px-3 py-2 text-left font-medium">Resolution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {policy.targets.map((target: any) => (
                            <tr key={target.id} className="border-t">
                              <td className="px-3 py-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-xs ${getPriorityBadgeColor(target.priority?.name || "")}`}
                                >
                                  {target.priority?.name || "Unknown"}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {formatMinutes(target.firstResponseMinutes)}
                              </td>
                              <td className="px-3 py-2">
                                {formatMinutes(target.resolutionMinutes)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No targets configured</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No SLA policies found. Create your first policy to get started.
        </div>
      )}
    </div>
  );
}
