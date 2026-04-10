import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "../../utils/orpc";
import {
  Package,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";

interface Order {
  id: number;
  uuid: string;
  storeId: number;
  platformOrderId: string;
  orderNumber: string | null;
  status: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  currency: string;
  subtotalAmount: string | null;
  shippingAmount: string | null;
  taxAmount: string | null;
  totalAmount: string;
  discountAmount: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerName: string | null;
  shippingMethod: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  lineItems: any[] | null;
  platformCreatedAt: string | null;
  store?: {
    id: number;
    name: string;
    platform: string;
  };
}

interface OrderPanelProps {
  contactId?: number;
  email?: string;
  phone?: string;
  organizationId: number;
  onLookup?: (query: string) => void;
}

export function OrderPanel({ contactId, email, phone, organizationId, onLookup }: OrderPanelProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["ecommerce-orders", contactId, email, phone, organizationId],
    queryFn: async () => {
      if (contactId) {
        return await orpc.ecommerceOrders.getByContact.query({
          organizationId,
          contactId,
          limit: 10,
        });
      } else if (email) {
        return await orpc.ecommerceOrders.searchByEmail.query({
          organizationId,
          email,
          limit: 10,
        });
      } else if (phone) {
        return await orpc.ecommerceOrders.searchByPhone.query({
          organizationId,
          phone,
          limit: 10,
        });
      }
      return [];
    },
    enabled: !!(contactId || email || phone),
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    onLookup?.(searchQuery);
    setIsSearching(false);
  };

  const toggleOrder = (orderId: number) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const formatCurrency = (amount: string | null, currency: string = "SAR") => {
    if (!amount) return "—";
    const num = parseFloat(amount);
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency,
    }).format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      refunded: "bg-gray-100 text-gray-800",
      unfulfilled: "bg-orange-100 text-orange-800",
    };

    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          statusColors[status.toLowerCase()] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status}
      </span>
    );
  };

  const platformLogos: Record<string, string> = {
    shopify: "S",
    woocommerce: "W",
    salla: "S",
    zid: "Z",
  };

  if (!contactId && !email && !phone) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
        <div className="text-center py-6">
          <ShoppingCart className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No customer information available
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Orders will appear when contact details are available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Order History</h3>
            {orders.length > 0 && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">
                {orders.length}
              </span>
            )}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search by email, phone, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin text-gray-400" />
            <p className="text-gray-500 mt-2 text-sm">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No orders found</p>
            <p className="text-gray-400 text-xs mt-1">
              Orders from connected stores will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {orders.map((order: Order) => {
              const isExpanded = expandedOrders.has(order.id);
              const lineItems = order.lineItems || [];

              return (
                <div key={order.id} className="p-4">
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => toggleOrder(order.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded text-xs flex items-center justify-center font-bold text-gray-600">
                          {platformLogos[order.store?.platform || ""] || "?"}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {order.orderNumber || `#${order.platformOrderId}`}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="text-sm text-gray-500 space-y-0.5">
                        <p>{order.store?.name || "Unknown Store"}</p>
                        <p>{formatDate(order.platformCreatedAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(order.totalAmount, order.currency)}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 mx-auto mt-1 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 mx-auto mt-1 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {lineItems.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                            Items
                          </h4>
                          <div className="space-y-2">
                            {lineItems.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <div>
                                  <p className="text-gray-900 dark:text-white">{item.title}</p>
                                  {item.variantTitle && (
                                    <p className="text-gray-500 text-xs">{item.variantTitle}</p>
                                  )}
                                  <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                                </div>
                                <p className="text-gray-900 dark:text-white">
                                  {formatCurrency(item.price, order.currency)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {order.shippingMethod && (
                          <div>
                            <p className="text-gray-500">Shipping</p>
                            <p className="text-gray-900 dark:text-white">{order.shippingMethod}</p>
                          </div>
                        )}
                        {order.trackingNumber && (
                          <div>
                            <p className="text-gray-500">Tracking</p>
                            <a
                              href={order.trackingUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {order.trackingNumber}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {order.subtotalAmount && (
                          <div>
                            <p className="text-gray-500">Subtotal</p>
                            <p className="text-gray-900 dark:text-white">
                              {formatCurrency(order.subtotalAmount, order.currency)}
                            </p>
                          </div>
                        )}
                        {order.shippingAmount && (
                          <div>
                            <p className="text-gray-500">Shipping</p>
                            <p className="text-gray-900 dark:text-white">
                              {formatCurrency(order.shippingAmount, order.currency)}
                            </p>
                          </div>
                        )}
                        {order.taxAmount && (
                          <div>
                            <p className="text-gray-500">Tax</p>
                            <p className="text-gray-900 dark:text-white">
                              {formatCurrency(order.taxAmount, order.currency)}
                            </p>
                          </div>
                        )}
                        {order.discountAmount && parseFloat(order.discountAmount) > 0 && (
                          <div>
                            <p className="text-gray-500">Discount</p>
                            <p className="text-green-600">
                              -{formatCurrency(order.discountAmount, order.currency)}
                            </p>
                          </div>
                        )}
                      </div>

                      {order.fulfillmentStatus && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-gray-500">
                            Fulfillment:{" "}
                            <span className="font-medium capitalize">
                              {order.fulfillmentStatus}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
