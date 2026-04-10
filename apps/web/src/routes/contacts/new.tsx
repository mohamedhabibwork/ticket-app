import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Textarea } from "@ticket-app/ui/components/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Loader2 } from "lucide-react";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/contacts/new")({
  component: NewContactRoute,
});

function NewContactRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const organizationId = 1;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [createTicket, setCreateTicket] = useState(false);

  const createMutation = useMutation(
    orpc.contacts.create.mutationOptions({
      onSuccess: async (data) => {
        if (data.duplicate) {
          toast.error("A contact with this email already exists");
          return;
        }
        toast.success("Contact created successfully");
        queryClient.invalidateQueries(orpc.contacts.list.queryOptions({ organizationId }));
        if (createTicket) {
          navigate({ to: "/tickets/new", search: { contactId: data.contact?.id } });
        } else {
          navigate({ to: "/contacts" });
        }
      },
      onError: (error) => {
        toast.error(`Failed to create contact: ${error.message}`);
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() && !lastName.trim() && !email.trim()) {
      toast.error("Please provide at least a name or email");
      return;
    }

    createMutation.mutate({
      organizationId,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      company: company.trim() || undefined,
    });
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add Contact</h1>
        <p className="text-muted-foreground">Create a new customer contact</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Acme Inc."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this contact..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  id="createTicket"
                  checked={createTicket}
                  onCheckedChange={(checked) => setCreateTicket(checked === true)}
                />
                <span className="text-sm">Create a ticket after saving</span>
              </label>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate({ to: "/contacts" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Contact
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
