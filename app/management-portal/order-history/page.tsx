"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArchiveBoxIcon } from "@heroicons/react/24/outline";

interface LaptopOrder {
  id: number;
  orderNumber: string;
  trackingNumber: string | null;
  orderedByUserId: number;
  quantity: number;
  status: "ordered" | "received" | "cancelled" | "archived";
  orderDate: string;
  receivedDate: string | null;
  notes: string;
  orderedBy?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  isArchived?: boolean;
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<LaptopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "archived">("archived");

  useEffect(() => {
    fetchOrderHistory();
  }, [filter]);

  const fetchOrderHistory = async () => {
    try {
      setLoading(true);
      const url =
        filter === "archived"
          ? "/api/it-assets/orders?active=false"
          : "/api/it-assets/orders";

      const response = await fetch(url);
      if (response.ok) {
        const ordersData = await response.json();
        // For all orders, filter to show archived ones at top
        const sortedOrders = ordersData.sort(
          (a: LaptopOrder, b: LaptopOrder) => {
            if (a.isArchived !== b.isArchived) return a.isArchived ? -1 : 1;
            return (
              new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
            );
          }
        );
        setOrders(sortedOrders);
      }
    } catch (error) {
      console.error("Error fetching order history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case "received":
        return "bg-green-100 text-green-800";
      case "ordered":
        return "bg-amber-100 text-amber-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case "received":
        return "Received";
      case "ordered":
        return "Ordered";
      case "cancelled":
        return "Cancelled";
      case "archived":
        return "Archived";
      default:
        return "Pending";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading order history...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <Link
          href="/management-portal/it-assets"
          className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back to IT Assets
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Order History</h1>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setFilter("archived")}
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              filter === "archived"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <ArchiveBoxIcon className="h-4 w-4 inline mr-2" />
            Archived Orders
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              filter === "all"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            All Orders
          </button>
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-600">
            {filter === "archived"
              ? "Orders that have been manually archived or auto-archived after 30 days"
              : "Complete order history including active and archived orders"}
          </p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* REMOVED: Order Number header */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tracking Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ordered By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Received Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className={order.isArchived ? "bg-gray-50" : ""}
                  >
                    {/* REMOVED: Order Number data cell */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.trackingNumber ? (
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded border">
                          {order.trackingNumber}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">
                          No tracking number
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.orderedBy?.name || `User ${order.orderedByUserId}`}
                      {order.isArchived && (
                        <span className="ml-2 text-xs text-gray-500">
                          (Archived)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.orderDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.receivedDate
                        ? formatDate(order.receivedDate)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(
                          order.status
                        )}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
