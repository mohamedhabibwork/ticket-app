import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { orpc } from "@/utils/orpc";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Merge,
  Download,
  User,
  Mail,
  Building,
} from "lucide-react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/contacts/")({
  component: ContactsIndexRoute,
});

function ContactsIndexRoute() {
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const organizationId = 1;

  const { data: contacts, isLoading } = useQuery(
    orpc.contacts.list.queryOptions({
      organizationId,
      search: search || undefined,
      limit: 50,
    }),
  );

  const companies = [...new Set(contacts?.map((c) => c.company).filter(Boolean))];

  const filteredContacts = contacts?.filter((contact) => {
    if (companyFilter && contact.company !== companyFilter) return false;
    return true;
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">Manage your customer contacts</p>
        </div>
        <Button asChild>
          <Link to="/contacts/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[200px]">
              <select
                className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredContacts && filteredContacts.length > 0 ? (
        <div className="space-y-3">
          {filteredContacts.map((contact) => (
            <Card key={contact.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </span>
                      {contact.company && (
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Building className="h-3 w-3" />
                          {contact.company}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {contact.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </span>
                      )}
                      {contact.phone && <span>{contact.phone}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/contacts/$id" params={{ id: String(contact.id) }}>
                        View
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to="/contacts/$id" params={{ id: String(contact.id) }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Merge className="h-4 w-4 mr-2" />
                          Merge
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No contacts found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
