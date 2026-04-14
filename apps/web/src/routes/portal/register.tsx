import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Separator } from "@ticket-app/ui/components/separator";
import { Eye, EyeOff, Loader2, Check, X, Headphones } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import { GuestRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/useAuth";
import { orpc } from "@/utils/orpc";
import { useOrganization } from "@/hooks/useOrganization";

export const Route = createFileRoute("/portal/register")({
  loader: async () => {
    return {};
  },
  component: GuestRouteWrapper,
});

function GuestRouteWrapper() {
  return (
    <GuestRoute>
      <RegisterRoute />
    </GuestRoute>
  );
}

const PASSWORD_REQUIREMENTS = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
];

function RegisterRoute() {
  const { organizationId } = useOrganization();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");

  const passwordStrength = useMemo(() => {
    const passed = PASSWORD_REQUIREMENTS.filter((req) => req.test(formData.password));
    return {
      score: passed.length,
      requirements: PASSWORD_REQUIREMENTS.map((req) => ({
        ...req,
        passed: req.test(formData.password),
      })),
    };
  }, [formData.password]);

  const registerMutation = useMutation(
    orpc.auth.register.mutationOptions({
      onSuccess: (data: any) => {
        login({ sessionToken: data.sessionToken, user: data.user });
        toast.success("Account created successfully!");
        window.location.href = "/dashboard";
      },
      onError: (err: any) => {
        setError(err.message);
      },
    }) as any,
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.firstName.trim()) {
      setError("First name is required");
      return;
    }

    if (!formData.lastName.trim()) {
      setError("Last name is required");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      );
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!acceptTerms) {
      setError("Please accept the terms and conditions");
      return;
    }

    registerMutation.mutate({
      organizationId,
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      ipAddress: window.location.hostname,
      userAgent: navigator.userAgent,
    } as any);
  };

  const getStrengthColor = (score: number) => {
    if (score <= 1) return "bg-destructive";
    if (score <= 2) return "bg-amber-500";
    if (score <= 3) return "bg-blue-500";
    return "bg-green-500";
  };

  const getStrengthLabel = (score: number) => {
    if (score <= 1) return "Weak";
    if (score <= 2) return "Fair";
    if (score <= 3) return "Good";
    return "Strong";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Headphones className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground mt-1">Start your 14-day free trial</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {error && (
              <div
                className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2"
                role="alert"
              >
                <X className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="Sarah"
                    value={formData.firstName}
                    onChange={handleChange}
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Chen"
                    value={formData.lastName}
                    onChange={handleChange}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="sarah@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </Button>
                </div>

                {formData.password && (
                  <div className="space-y-2 mt-2">
                    <div className="flex gap-1">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i < passwordStrength.score
                              ? getStrengthColor(passwordStrength.score)
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password strength:{" "}
                      <span
                        className={`
                        ${passwordStrength.score <= 1 ? "text-destructive" : ""}
                        ${passwordStrength.score === 2 ? "text-amber-500" : ""}
                        ${passwordStrength.score === 3 ? "text-blue-500" : ""}
                        ${passwordStrength.score >= 4 ? "text-green-500" : ""}
                      `}
                      >
                        {getStrengthLabel(passwordStrength.score)}
                      </span>
                    </p>
                    <ul className="space-y-1">
                      {passwordStrength.requirements.map((req, i) => (
                        <li
                          key={i}
                          className={`flex items-center gap-1.5 text-xs ${
                            req.passed ? "text-green-600" : "text-muted-foreground"
                          }`}
                        >
                          {req.passed ? (
                            <Check className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                          )}
                          {req.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <X className="h-3 w-3" aria-hidden="true" />
                    Passwords do not match
                  </p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Passwords match
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                  I agree to the{" "}
                  <Link to="/kb" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/kb" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/portal/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By creating an account, you agree to our{" "}
          <Link to="/kb" className="hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/kb" className="hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
