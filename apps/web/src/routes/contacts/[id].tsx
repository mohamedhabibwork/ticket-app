import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Textarea } from "@ticket-app/ui/components/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ticket-app/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ticket-app/ui/components/tabs";
import { Loader2, Edit, Trash2, Merge, ArrowLeft, Mail, Phone, Building, Ticket, ShoppingCart, FileText } from "lucide-react";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/contacts/$id")({
  component: ContactDetailRoute,
});

function ContactDetailRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const organizationId = 1;
  const contactId = Number(id);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
  });

  const { data: contact, isLoading } = useQuery(
    orpc.contacts.get.queryOptions(
      { organizationId, id: contactId },
      { enabled: !isNaN(contactId) }
    )
  );

  const { data: tickets } = useQuery(
    orpc.tickets.list.queryOptions({
      organizationId,
      contactId,
      limit: 10,
    })
  );

  const updateMutation = useMutation(
    orpc.contacts.create.mutationOptions({
      onSuccess: () => {
        toast.success("Contact updated successfully");
        setIsEditing(false);
        queryClient.invalidateQueries(orpc.contacts.get.queryOptions({ organizationId, id: contactId }));
      },
      onError: (error) => {
        toast.error(`Failed to update contact: ${error.message}`);
      },
    })
  );

  const mergeMutation = useMutation(
    orpc.contacts.merge.mutationOptions({
      onSuccess: () => {
        toast.success("Contacts merged successfully");
        navigate({ to: "/contacts" });
      },
      onError: (error) => {
        toast.error(`Failed to merge contacts: ${error.message}`);
      },
    })
  );

  const handleSave = () => {
    updateMutation.mutate({
      organizationId,
      ...editData,
    });
  };

  const handleMerge = (targetId: number) => {
    if (confirm("Are you sure you want to merge these contacts? The source contact will be deleted.")) {
      mergeMutation.mutate({
        organizationId,
        sourceId: contactId,
        targetId,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Contact not found</p>
            <Button variant="ghost" className="mt-4" asChild>
              <Link to="/contacts">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Contacts
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/contacts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {contact.firstName} {contact.lastName}
            </h1>
            <p className="text-muted-foreground">Contact Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? "Cancel" : "Edit"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Merge className="h-4 w-4 mr-2" />
                Merge Contact
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                        value={editData.firstName}
                        onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                        value={editData.lastName}
                        onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={editData.company}
                      onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.company && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.company}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Tickets
                </span>
                <Button size="sm" asChild>
                  <Link to="/tickets/new" search={{ contactId }}>
                    New Ticket
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tickets && tickets.length > 0 ? (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <Link key={ticket.id} to="/tickets/$id" params={{ id: String(ticket.id) }}>
                      <div className="flex items-center justify-between p-3 rounded border hover:bg-accent/50">
                        <div>
                          <div className="font-medium">{ticket.subject}</div>
                          <div className="text-sm text-muted-foreground">
                            #{ticket.referenceNumber}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No tickets found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Order History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                No orders found. Orders from connected eCommerce stores will appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Contact Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add notes about this contact..."
                className="min-h-[150px]"
              />
              <Button className="mt-4">Save Note</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}