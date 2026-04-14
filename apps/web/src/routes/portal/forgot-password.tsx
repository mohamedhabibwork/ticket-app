import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Separator } from "@ticket-app/ui/components/separator";
import { Loader2, Mail, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GuestRoute } from "@/components/protected-route";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/portal/forgot-password")({
  loader: async () => {
    return {};
  },
  component: GuestRouteWrapper,
});

function GuestRouteWrapper() {
  return (
    <GuestRoute>
      <ForgotPasswordRoute />
    </GuestRoute>
  );
}

function ForgotPasswordRoute() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"email" | "whatsapp">("email");
  const [step, setStep] = useState<"input" | "sent">("input");
  const [sentTo, setSentTo] = useState("");

  const sendOtpMutation = useMutation(
    orpc.auth.sendOtp.mutationOptions({
      onSuccess: () => {
        setStep("sent");
        toast.success(`Verification code sent to ${sentTo}`);
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to send verification code");
      },
    }) as any,
  );

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();

    const target = method === "email" ? email : phone;
    if (!target) {
      toast.error(`Please enter your ${method === "email" ? "email" : "phone number"}`);
      return;
    }

    setSentTo(target);

    sendOtpMutation.mutate({
      email: method === "email" ? email : undefined,
      phone: method === "whatsapp" ? phone : undefined,
      method,
      type: "password_reset",
    } as any);
  };

  const handleResend = () => {
    sendOtpMutation.mutate({
      email: method === "email" ? email : undefined,
      phone: method === "whatsapp" ? phone : undefined,
      method,
      type: "password_reset",
    } as any);
  };

  if (step === "sent") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Check Your {method === "email" ? "Email" : "Phone"}
            </CardTitle>
            <CardDescription className="text-center">
              We sent a verification code to {sentTo}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code we sent to verify your identity and reset your password.
              </p>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                navigate({
                  to: "/portal/verify-otp",
                  search: {
                    email: method === "email" ? email : undefined,
                    phone: method === "whatsapp" ? phone : undefined,
                    type: "password_reset",
                  },
                });
              }}
            >
              Enter Code
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={handleResend}
                disabled={sendOtpMutation.isPending}
                className="text-primary hover:underline disabled:opacity-50"
              >
                {sendOtpMutation.isPending ? (
                  <>
                    <Loader2 className="inline mr-1 h-3 w-3 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Resend code"
                )}
              </button>
            </div>

            <Separator />

            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link to="/portal/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email or phone and we&apos;ll send you a code to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setMethod("email")}
                className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  method === "email"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setMethod("whatsapp")}
                className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  method === "whatsapp"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </button>
            </div>

            {method === "email" ? (
              <div className="space-y-1">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  name="phone"
                  placeholder="+62 812 3456 7890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={sendOtpMutation.isPending || (method === "email" ? !email : !phone)}
            >
              {sendOtpMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code…
                </>
              ) : (
                "Send Verification Code"
              )}
            </Button>
          </form>

          <Separator />

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link to="/portal/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
