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
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Plus, Trash2, Edit2, Save, XCircle, Globe, Shield } from "lucide-react";

export const Route = createFileRoute("/admin/security/ip-whitelist")({
  loader: async () => {
    return {};
  },
  component: IPWhitelistRoute,
});

interface IPEntry {
  id: string;
  cidr: string;
  label: string;
  enabled: boolean;
}

const initialEntries: IPEntry[] = [
  { id: "1", cidr: "192.168.1.0/24", label: "Office Network", enabled: true },
  { id: "2", cidr: "10.0.0.0/8", label: "VPN Range", enabled: true },
];

function IPWhitelistRoute() {
  const [entries, setEntries] = useState<IPEntry[]>(initialEntries);
  const [newCidr, setNewCidr] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCidr, setEditCidr] = useState("");
  const [editLabel, setEditLabel] = useState("");

  const handleAddEntry = () => {
    if (!newCidr || !newLabel) return;

    const newEntry: IPEntry = {
      id: Date.now().toString(),
      cidr: newCidr,
      label: newLabel,
      enabled: true,
    };

    setEntries([...entries, newEntry]);
    setNewCidr("");
    setNewLabel("");
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  const handleToggleEntry = (id: string) => {
    setEntries(
      entries.map((entry) => (entry.id === id ? { ...entry, enabled: !entry.enabled } : entry)),
    );
  };

  const handleStartEdit = (entry: IPEntry) => {
    setEditingId(entry.id);
    setEditCidr(entry.cidr);
    setEditLabel(entry.label);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editCidr || !editLabel) return;

    setEntries(
      entries.map((entry) =>
        entry.id === editingId ? { ...entry, cidr: editCidr, label: editLabel } : entry,
      ),
    );
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCidr("");
    setEditLabel("");
  };

  const isValidCIDR = (cidr: string): boolean => {
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!cidrRegex.test(cidr)) return false;

    const [ip, prefix] = cidr.split("/");
    const prefixNum = parseInt(prefix);
    if (prefixNum < 0 || prefixNum > 32) return false;

    const octets = ip.split(".").map((o) => parseInt(o));
    return octets.every((o) => o >= 0 && o <= 255);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">IP Whitelist</h1>
          <p className="text-muted-foreground">
            Manage IP addresses and ranges that can access your portal
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add IP Range
            </CardTitle>
            <CardDescription>Add a new IP address or CIDR range to the whitelist</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="newCidr">IP Address / CIDR Range</Label>
                <Input
                  id="newCidr"
                  value={newCidr}
                  onChange={(e) => setNewCidr(e.target.value)}
                  placeholder="192.168.1.0/24 or 10.0.0.1"
                />
                <p className="text-xs text-muted-foreground">
                  Use CIDR notation (e.g., 192.168.1.0/24) for ranges
                </p>
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="newLabel">Label</Label>
                <Input
                  id="newLabel"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Office Network"
                />
              </div>
              <Button onClick={handleAddEntry} disabled={!newCidr || !newLabel}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            {newCidr && !isValidCIDR(newCidr) && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-500">
                <XCircle className="h-3 w-3" />
                Invalid CIDR format. Use format: 192.168.1.0/24
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Whitelisted IPs
            </CardTitle>
            <CardDescription>
              {entries.length} IP range{entries.length !== 1 ? "s" : ""} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entries.length > 0 ? (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      entry.enabled ? "bg-background" : "bg-muted/50"
                    }`}
                  >
                    {editingId === entry.id ? (
                      <div className="flex-1 flex gap-4 items-end">
                        <div className="flex-1 space-y-1">
                          <Label className="text-muted-foreground text-xs">CIDR</Label>
                          <Input
                            value={editCidr}
                            onChange={(e) => setEditCidr(e.target.value)}
                            className="font-mono"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-muted-foreground text-xs">Label</Label>
                          <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                        </div>
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={entry.enabled}
                            onCheckedChange={() => handleToggleEntry(entry.id)}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <span
                                className={`font-mono text-sm ${
                                  !entry.enabled ? "text-muted-foreground line-through" : ""
                                }`}
                              >
                                {entry.cidr}
                              </span>
                            </div>
                            <p
                              className={`text-xs ${
                                entry.enabled ? "text-muted-foreground" : "text-muted-foreground/50"
                              }`}
                            >
                              {entry.label}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleStartEdit(entry)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Globe className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No IP ranges configured</p>
                <p className="text-xs text-muted-foreground">
                  Add an IP range above to restrict access
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CIDR Notation Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Single IP</p>
                <p className="text-muted-foreground font-mono">192.168.1.1/32</p>
              </div>
              <div>
                <p className="font-medium">Small range (4 IPs)</p>
                <p className="text-muted-foreground font-mono">192.168.1.0/30</p>
              </div>
              <div>
                <p className="font-medium">Class C range (256 IPs)</p>
                <p className="text-muted-foreground font-mono">192.168.1.0/24</p>
              </div>
              <div>
                <p className="font-medium">Class B range (65,536 IPs)</p>
                <p className="text-muted-foreground font-mono">192.168.0.0/16</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
