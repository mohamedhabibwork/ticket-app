import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { ChevronDown, Filter, X } from "lucide-react";

import { formatRelativeTimeLong } from "@ticket-app/ui/hooks/datetime";
import { getCurrentOrganizationId } from "@/utils/auth";

export const Route = createFileRoute("/tickets/")({
  loader: async ({ context, search }) => {
    const organizationId = getCurrentOrganizationId()!;
    const [tickets, groups, categories] = await Promise.all([
      context.orpc.tickets.list.query({
        organizationId,
        limit: 50,
        ...(search.groupId && { groupId: search.groupId }),
        ...(search.categoryId && { categoryId: search.categoryId }),
      }),
      context.orpc.groups.list.query({ organizationId }),
      context.orpc.ticketCategories.list.query({ organizationId }),
    ]);
    return { tickets, groups, categories };
  },
  component: TicketsIndexRoute,
});

function TicketsIndexRoute() {
  const { tickets, groups, categories } = Route.useLoaderData<typeof Route>();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const selectedGroup = groups?.find((g: any) => g.id === selectedGroupId);
  const selectedCategory = categories?.find((c: any) => c.id === selectedCategoryId);

  const clearFilters = () => {
    setSelectedGroupId(null);
    setSelectedCategoryId(null);
  };

  const hasFilters = selectedGroupId || selectedCategoryId;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-muted-foreground">Manage and respond to customer tickets</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 h-7 gap-1 rounded-none px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5 border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50">
              <Filter className="h-4 w-4 mr-2" />
              Group
              {selectedGroup && `: ${selectedGroup.name}`}
              <ChevronDown className="h-4 w-4 ml-2" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setSelectedGroupId(null)}>
                All Groups
              </DropdownMenuItem>
              {groups?.map((group: any) => (
                <DropdownMenuItem key={group.id} onClick={() => setSelectedGroupId(group.id)}>
                  {group.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 h-7 gap-1 rounded-none px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5 border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50">
              Category
              {selectedCategory && `: ${selectedCategory.name}`}
              <ChevronDown className="h-4 w-4 ml-2" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setSelectedCategoryId(null)}>
                All Categories
              </DropdownMenuItem>
              {categories?.map((category: any) => (
                <DropdownMenuItem
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                >
                  {category.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {tickets && tickets.length > 0 ? (
        <div className="space-y-3">
          {tickets.map((ticket: any) => (
            <Link key={ticket.id} to="/tickets/id" params={{ id: String(ticket.id) }}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-muted-foreground">
                          #{ticket.referenceNumber}
                        </span>
                        {ticket.priority && (
                          <span
                            className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium"
                            style={{
                              borderColor: ticket.priority.color,
                              color: ticket.priority.color,
                            }}
                          >
                            {ticket.priority.label}
                          </span>
                        )}
                        {ticket.status && (
                          <span className="inline-flex items-center rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                            {ticket.status.label}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium truncate">{ticket.subject}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {ticket.contact && (
                          <span>
                            {ticket.contact.firstName} {ticket.contact.lastName}
                          </span>
                        )}
                        <span>{formatRelativeTimeLong(ticket.createdAt)}</span>
                        {ticket.assignedAgent && (
                          <span>Assigned to {ticket.assignedAgent.firstName}</span>
                        )}
                        {ticket.assignedTeam && <span>{ticket.assignedTeam.name}</span>}
                      </div>
                    </div>
                    {ticket.channel && (
                      <span className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium">
                        {ticket.channel.label}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No tickets found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
