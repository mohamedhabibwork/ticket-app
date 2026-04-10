import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import {
  Globe,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/admin/custom-domain")({
  component: CustomDomainRoute,
});

interface DomainStatus {
  domain: string;
  status: "verified" | "pending" | "failed" | "not_configured";
  sslStatus: "valid" | "invalid" | "pending" | "not_enabled";
  verifiedAt: string | null;
}

const defaultDomain: DomainStatus = {
  domain: "",
  status: "not_configured",
  sslStatus: "not_enabled",
  verifiedAt: null,
};

function CustomDomainRoute() {
  const [currentDomain, setCurrentDomain] = useState<DomainStatus>(defaultDomain);
  const [newDomain, setNewDomain] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleAddDomain = async () => {
    if (!newDomain) return;

    setCurrentDomain({
      domain: newDomain,
      status: "pending",
      sslStatus: "pending",
      verifiedAt: null,
    });
    setNewDomain("");
  };

  const handleVerifyDomain = async () => {
    if (!currentDomain.domain) return;

    setIsVerifying(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setCurrentDomain((prev) => ({
      ...prev,
      status: "verified",
      sslStatus: "valid",
      verifiedAt: new Date().toISOString(),
    }));
    setIsVerifying(false);
  };

  const handleRemoveDomain = async () => {
    if (!confirm("Are you sure you want to remove this custom domain?")) return;

    setIsRemoving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setCurrentDomain(defaultDomain);
    setIsRemoving(false);
  };

  const getStatusBadge = (status: DomainStatus["status"]) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            <CheckCircle className="h-3 w-3" />
            Verified
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
            <AlertCircle className="h-3 w-3" />
            Pending
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
            Not Configured
          </span>
        );
    }
  };

  const getSSLBadge = (status: DomainStatus["sslStatus"]) => {
    switch (status) {
      case "valid":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            <CheckCircle className="h-3 w-3" />
            SSL Valid
          </span>
        );
      case "invalid":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            <XCircle className="h-3 w-3" />
            SSL Invalid
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
            <AlertCircle className="h-3 w-3" />
            SSL Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
            SSL Not Enabled
          </span>
        );
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Custom Domain</h1>
        <p className="text-muted-foreground">Configure a custom domain for your customer portal</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Domain Status
            </CardTitle>
            <CardDescription>Current custom domain configuration</CardDescription>
          </CardHeader>
          <CardContent>
            {currentDomain.domain ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-lg">{currentDomain.domain}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(currentDomain.status)}
                      {getSSLBadge(currentDomain.sslStatus)}
                    </div>
                    {currentDomain.verifiedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Verified on {new Date(currentDomain.verifiedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button variant="destructive" onClick={handleRemoveDomain} disabled={isRemoving}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isRemoving ? "Removing..." : "Remove Domain"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Globe className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No custom domain configured</p>
              </div>
            )}
          </CardContent>
        </Card>

        {currentDomain.status === "not_configured" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Custom Domain
              </CardTitle>
              <CardDescription>Enter your custom domain to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="newDomain">Domain Name</Label>
                  <Input
                    id="newDomain"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="support.yourcompany.com"
                  />
                </div>
                <Button onClick={handleAddDomain} disabled={!newDomain}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Domain
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentDomain.domain && currentDomain.status === "pending" && (
          <Card>
            <CardHeader>
              <CardTitle>DNS Configuration</CardTitle>
              <CardDescription>Add the following DNS records to verify your domain</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground uppercase">CNAME Record</Label>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          `CNAME ${currentDomain.domain} ticket-app.uvdesk.com`,
                        )
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Host:</span>{" "}
                      <span className="font-mono">
                        {currentDomain.domain.replace(/^[^.]+/, "*")}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Value:</span>{" "}
                      <span className="font-mono">cname.uvdesk.com</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground uppercase">TXT Record</Label>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        navigator.clipboard.writeText(`TXT uvdesk-verify=${currentDomain.domain}`)
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Host:</span>{" "}
                      <span className="font-mono">uvdesk-verify</span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Value:</span>{" "}
                      <span className="font-mono">{currentDomain.domain}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-700">
                  DNS changes may take up to 48 hours to propagate. Click Verify once you've added
                  the records.
                </span>
              </div>

              <Button onClick={handleVerifyDomain} disabled={isVerifying}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {isVerifying ? "Verifying..." : "Verify Domain"}
              </Button>
            </CardContent>
          </Card>
        )}

        {currentDomain.domain && currentDomain.status === "verified" && (
          <Card>
            <CardHeader>
              <CardTitle>SSL Certificate</CardTitle>
              <CardDescription>Your SSL certificate is automatically managed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">SSL Certificate Active</p>
                  <p className="text-xs text-muted-foreground">
                    Your domain is secured with a valid SSL certificate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              To configure your custom domain, you'll need to add DNS records at your domain
              registrar.
            </p>
            <Button variant="outline" asChild>
              <a
                href="https://docs.uvdesk.com/domain-setup"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Documentation
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
