import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Loader2, Key, Shield, CheckCircle, XCircle, AlertTriangle, Server } from "lucide-react";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin/settings/license")({
  component: LicenseSettingsRoute,
});

function LicenseSettingsRoute() {
  const [licenseKey, setLicenseKey] = useState("");
  const [domain, setDomain] = useState("");
  const [signature, setSignature] = useState("");
  const [productEdition, setProductEdition] = useState("enterprise");
  const [seatLimit, setSeatLimit] = useState(10);
  const [validUntil, setValidUntil] = useState("");

  const {
    data: licenseStatus,
    isLoading,
    refetch,
  } = useQuery(
    orpc.onPremise.getLicenseStatus.queryOptions({
      organizationId: 1,
    }),
  );

  const { data: seatInfo, isLoading: _seatLoading } = useQuery(
    orpc.onPremise.checkSeatLimit.queryOptions({
      organizationId: 1,
    }),
  );

  const verifyMutation = useMutation(
    orpc.onPremise.verifyLicense.mutationOptions({
      onSuccess: () => {
        refetch();
        setLicenseKey("");
        setDomain("");
        setSignature("");
      },
    }),
  );

  const handleVerify = () => {
    if (!licenseKey || !domain) return;

    verifyMutation.mutate({
      organizationId: 1,
      licenseKey,
      domain,
      signature,
      productEdition,
      seatLimit,
      validUntil: validUntil
        ? new Date(validUntil)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
  };

  const getStatusBadge = () => {
    if (!licenseStatus) return null;

    if (licenseStatus.mode === "unlicensed") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
          <XCircle className="h-4 w-4" />
          Unlicensed
        </span>
      );
    }

    if (!licenseStatus.isActive) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
          <XCircle className="h-4 w-4" />
          Expired
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
        <CheckCircle className="h-4 w-4" />
        Active
      </span>
    );
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-indigo-100 p-3">
            <Shield className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">License Settings</h1>
            <p className="text-muted-foreground">Manage your on-premise license and seat limits</p>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>License Status</CardTitle>
          <CardDescription>Current license information for your installation</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`rounded-full p-3 ${
                      licenseStatus?.isActive
                        ? "bg-green-100"
                        : licenseStatus?.mode === "unlicensed"
                          ? "bg-gray-100"
                          : "bg-red-100"
                    }`}
                  >
                    <Key
                      className={`h-6 w-6 ${
                        licenseStatus?.isActive
                          ? "text-green-600"
                          : licenseStatus?.mode === "unlicensed"
                            ? "text-gray-500"
                            : "text-red-600"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-lg">
                      {licenseStatus?.mode === "unlicensed"
                        ? "No License"
                        : licenseStatus?.productEdition || "On-Premise"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {licenseStatus?.mode === "unlicensed"
                        ? "Install a license to activate all features"
                        : `Edition: ${licenseStatus?.productEdition}`}
                    </p>
                  </div>
                </div>
                {getStatusBadge()}
              </div>

              {licenseStatus && licenseStatus.mode !== "unlicensed" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded border">
                    <p className="text-sm text-muted-foreground">Seat Limit</p>
                    <p className="text-xl font-bold">{licenseStatus.seatLimit || "Unlimited"}</p>
                  </div>
                  <div className="p-4 rounded border">
                    <p className="text-sm text-muted-foreground">Valid Until</p>
                    <p className="text-xl font-bold">
                      {licenseStatus.validUntil
                        ? new Date(licenseStatus.validUntil).toLocaleDateString()
                        : "Never"}
                    </p>
                  </div>
                  <div className="p-4 rounded border">
                    <p className="text-sm text-muted-foreground">Last Verified</p>
                    <p className="text-xl font-bold">
                      {licenseStatus.lastVerified
                        ? new Date(licenseStatus.lastVerified).toLocaleDateString()
                        : "Never"}
                    </p>
                  </div>
                </div>
              )}

              <div className="p-4 rounded bg-muted">
                <h4 className="font-medium mb-2">Feature Flags</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Multi-Tenant Mode</span>
                    <span
                      className={`text-sm font-medium ${
                        licenseStatus?.features?.multiTenant ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {licenseStatus?.features?.multiTenant ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Billing Features</span>
                    <span
                      className={`text-sm font-medium ${
                        licenseStatus?.features?.billing ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {licenseStatus?.features?.billing ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {seatInfo && seatInfo.enforced && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seat Usage</CardTitle>
            <CardDescription>Current seat utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-2xl font-bold">
                  {seatInfo.currentCount} / {seatInfo.seatLimit}
                </p>
                <p className="text-sm text-muted-foreground">Seats used</p>
              </div>
              <div
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  seatInfo.allowed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                {seatInfo.allowed ? "Within Limit" : "Limit Exceeded"}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  seatInfo.currentCount / seatInfo.seatLimit > 0.9
                    ? "bg-red-500"
                    : seatInfo.currentCount / seatInfo.seatLimit > 0.7
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
                style={{
                  width: `${Math.min((seatInfo.currentCount / seatInfo.seatLimit) * 100, 100)}%`,
                }}
              ></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Install License</CardTitle>
          <CardDescription>
            Enter your RSA-signed license key to activate on-premise features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-start gap-3">
              <Server className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-2">On-Premise Installation</p>
                <p>
                  Your license key was provided during purchase. It includes an RSA signature for
                  verification. Enter the license key exactly as provided, including the signature
                  block.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseKey">License Key</Label>
            <Input
              id="licenseKey"
              placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Installation Domain</Label>
            <Input
              id="domain"
              placeholder="support.ticket.cloud.habib.cloud"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The domain where this installation is hosted
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature">RSA Signature</Label>
            <Input
              id="signature"
              placeholder="Base64-encoded RSA signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edition">Product Edition</Label>
              <Input
                id="edition"
                placeholder="enterprise"
                value={productEdition}
                onChange={(e) => setProductEdition(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seatLimit">Seat Limit</Label>
              <Input
                id="seatLimit"
                type="number"
                min={1}
                value={seatLimit}
                onChange={(e) => setSeatLimit(parseInt(e.target.value) || 10)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleVerify}
              disabled={!licenseKey || !domain || verifyMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Install License
                </>
              )}
            </Button>
          </div>

          {verifyMutation.isError && (
            <div className="p-3 rounded bg-red-50 text-red-800 text-sm">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              {verifyMutation.error?.message || "License verification failed"}
            </div>
          )}

          {verifyMutation.isSuccess && (
            <div className="p-3 rounded bg-green-50 text-green-800 text-sm">
              <CheckCircle className="h-4 w-4 inline mr-2" />
              License installed successfully!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
