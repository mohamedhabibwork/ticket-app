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
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { GuestRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/useAuth";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/portal/verify-otp")({
  loader: async () => {
    return {};
  },
  component: GuestRouteWrapper,
});

function GuestRouteWrapper() {
  return (
    <GuestRoute>
      <VerifyOtpRoute />
    </GuestRoute>
  );
}

function VerifyOtpRoute() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const search = Route.useSearch() as any;
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resendTimer]);

  const verifyOtpMutation = useMutation(
    orpc.auth.verifyOtp.mutationOptions({
      onSuccess: (data: any) => {
        if (search.type === "password_reset") {
          navigate({
            to: "/portal/reset-password",
            search: {
              email: search.email,
              tempToken: data.tempToken,
            },
          });
        } else if (search.type === "login") {
          completeLoginWithOtpMutation.mutate({
            email: search.email!,
            tempToken: data.tempToken!,
          } as any);
        } else if (search.type === "email_verification") {
          toast.success("Email verified successfully!");
          navigate({ to: "/portal/login" });
        }
      },
      onError: (err: any) => {
        setError(err.message);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      },
    }) as any,
  );

  const completeLoginWithOtpMutation = useMutation(
    orpc.auth.completeLoginWithOtp.mutationOptions({
      onSuccess: (data: any) => {
        login({ sessionToken: data.sessionToken, user: data.user });
        window.location.href = "/dashboard";
      },
      onError: (err: any) => {
        setError(err.message);
      },
    }) as any,
  );

  const resendMutation = useMutation(
    orpc.auth.sendOtp.mutationOptions({
      onSuccess: () => {
        toast.success("Verification code resent");
        setResendTimer(60);
        setError("");
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to resend code");
      },
    }) as any,
  );

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError("");

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((d) => d) && newCode.join("").length === 6) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (codeToVerify?: string) => {
    const finalCode = codeToVerify || code.join("");
    if (finalCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    verifyOtpMutation.mutate({
      email: search.email,
      phone: search.phone,
      code: finalCode,
      type: search.type === "totp" ? "login" : search.type,
    } as any);
  };

  const handleResend = () => {
    if (resendTimer > 0) return;

    resendMutation.mutate({
      email: search.email,
      phone: search.phone,
      method: search.email ? "email" : "whatsapp",
      type: search.type === "totp" ? "login" : search.type,
    } as any);
  };

  const getTitle = () => {
    switch (search.type) {
      case "login":
        return "Verify Your Login";
      case "password_reset":
        return "Reset Your Password";
      case "email_verification":
        return "Verify Your Email";
      case "totp":
        return "Enter Authenticator Code";
      default:
        return "Enter Verification Code";
    }
  };

  const getDescription = () => {
    switch (search.type) {
      case "login":
        return "Enter the 6-digit code we sent to your email to complete login.";
      case "password_reset":
        return "Enter the 6-digit code we sent to verify your identity.";
      case "email_verification":
        return "Enter the 6-digit code sent to your email to verify your address.";
      case "totp":
        return "Enter the 6-digit code from your authenticator app.";
      default:
        return "Enter the 6-digit code to continue.";
    }
  };

  const isPending = verifyOtpMutation.isPending || completeLoginWithOtpMutation.isPending;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/portal/login" aria-label="Back to login">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold text-center">{getTitle()}</CardTitle>
          <CardDescription className="text-center">{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="otp-0" className="sr-only">
              Verification code
            </Label>
            <div className="flex gap-2 justify-center">
              {code.map((digit, index) => (
                <Input
                  key={index}
                  id={`otp-${index}`}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-bold"
                  disabled={isPending}
                  aria-label={`Digit ${index + 1} of 6`}
                />
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => handleVerify()}
            disabled={code.some((d) => !d) || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify"
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {resendTimer > 0 ? (
              <p>
                Resend code in <span className="font-medium tabular-nums">{resendTimer}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendMutation.isPending}
                className="text-primary hover:underline disabled:opacity-50"
              >
                {resendMutation.isPending ? (
                  <>
                    <Loader2 className="inline mr-1 h-3 w-3 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Resend code"
                )}
              </button>
            )}
          </div>

          <Separator />

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/portal/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
