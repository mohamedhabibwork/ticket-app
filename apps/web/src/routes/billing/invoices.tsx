import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { orpc } from "@/utils/orpc";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Badge } from "@ticket-app/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ticket-app/ui/components/select";
import { ArrowLeft, Download, ExternalLink, FileText, Filter, Calendar } from "lucide-react";

export default function InvoiceHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");

  const { data: invoicesData, isLoading } = useQuery(
    orpc.invoices.list.queryOptions({
      organizationId: 1,
      page: 1,
      limit: 50,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
  );

  const invoices = invoicesData?.invoices || [];

  const filteredInvoices = invoices.filter((invoice: any) => {
    if (statusFilter !== "all" && invoice.status !== statusFilter) return false;
    return true;
  });

  const statusColors: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    unpaid: "bg-yellow-100 text-yellow-800",
    overdue: "bg-red-100 text-red-800",
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const totalPaid = filteredInvoices
    .filter((inv: any) => inv.status === "paid")
    .reduce((sum: number, inv: any) => sum + Number(inv.total), 0);

  const totalPending = filteredInvoices
    .filter((inv: any) => inv.status !== "paid")
    .reduce((sum: number, inv: any) => sum + Number(inv.total), 0);

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
            <h1 className="text-3xl font-bold">Invoice History</h1>
            <p className="text-muted-foreground mt-1">View and download your past invoices</p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Invoices</div>
            <div className="text-2xl font-bold">{filteredInvoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Paid</div>
            <div className="text-2xl font-bold text-green-600">{formatAmount(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{formatAmount(totalPending)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              All Invoices
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="1y">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredInvoices.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div>Invoice</div>
                <div>Date</div>
                <div>Amount</div>
                <div>Status</div>
                <div className="text-right">Actions</div>
              </div>
              {filteredInvoices.map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="grid grid-cols-5 gap-4 items-center py-3 border-b last:border-0"
                >
                  <div className="font-medium">{invoice.number}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(invoice.createdAt)}
                  </div>
                  <div className="font-medium">{formatAmount(invoice.total, invoice.currency)}</div>
                  <div>
                    <Badge className={statusColors[invoice.status] || "bg-gray-100"}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon-xs" asChild>
                      <a
                        href={`/api/invoices/${invoice.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View PDF"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon-xs" asChild>
                      <a
                        href={`/api/invoices/${invoice.id}/pdf?download=true`}
                        download={`invoice-${invoice.number}.pdf`}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
              <p className="text-sm mt-1">
                {statusFilter !== "all"
                  ? `No ${statusFilter} invoices to display`
                  : "Your invoices will appear here once you have an active subscription"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
