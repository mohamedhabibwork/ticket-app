import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { orpc } from "@/utils/orpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Badge } from "@ticket-app/ui/components/badge";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { ArrowLeft, CreditCard, Plus, Trash2, Star, Building2, MapPin, X } from "lucide-react";

const CARD_ICONS: Record<string, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  discover: "DISC",
};

interface PaymentMethod {
  id: number;
  type: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export default function PaymentMethodsPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: () => orpc.paymentMethods.list.query({ organizationId: 1 }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async ({ methodId }: { methodId: number }) => {
      return await orpc.paymentMethods.setDefault.mutate({
        organizationId: 1,
        paymentMethodId: methodId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ methodId }: { methodId: number }) => {
      return await orpc.paymentMethods.delete.mutate({
        organizationId: 1,
        paymentMethodId: methodId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
    },
  });

  const addCardMutation = useMutation({
    mutationFn: async () => {
      return await orpc.paymentMethods.create.mutate({
        organizationId: 1,
        cardNumber,
        expMonth: parseInt(expiry.split("/")[0]),
        expYear: parseInt(expiry.split("/")[1]),
        cvc,
        name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      setIsAddOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setCardNumber("");
    setExpiry("");
    setCvc("");
    setName("");
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/billing">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payment Methods</h1>
            <p className="text-muted-foreground mt-1">
              Manage your payment methods and billing address
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Saved Cards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : paymentMethods && paymentMethods.length > 0 ? (
                <div className="space-y-4">
                  {paymentMethods.map((method: PaymentMethod) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-muted rounded flex items-center justify-center text-xs font-bold">
                          {CARD_ICONS[method.brand?.toLowerCase()] || method.brand?.toUpperCase() || "CARD"}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {method.brand || "Card"} ****{method.last4}
                            {method.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Expires {method.expMonth}/{method.expYear}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDefaultMutation.mutate({ methodId: method.id })}
                            disabled={setDefaultMutation.isPending}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeMutation.mutate({ methodId: method.id })}
                          disabled={removeMutation.isPending || method.isDefault}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payment methods added yet</p>
                  <p className="text-sm mt-1">Add a card to start your subscription</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Billing Address
              </CardTitle>
              <CardDescription>
                Used for invoicing and tax purposes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Acme Corporation</p>
                    <p className="text-muted-foreground">123 Main Street</p>
                    <p className="text-muted-foreground">San Francisco, CA 94102</p>
                    <p className="text-muted-foreground">United States</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Edit Address
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="mb-2">
                If you have questions about your payment methods or billing, please contact
                our support team.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Add Payment Method</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsAddOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your card details securely. Your information is encrypted and processed by Stripe.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="4242 4242 4242 4242"
                  value={formatCardNumber(cardNumber)}
                  onChange={(e) => setCardNumber(e.target.value)}
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Cardholder Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => addCardMutation.mutate()}
                disabled={
                  !cardNumber ||
                  !expiry ||
                  !cvc ||
                  !name ||
                  addCardMutation.isPending
                }
              >
                {addCardMutation.isPending ? "Adding..." : "Add Card"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
