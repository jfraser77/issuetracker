"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ComputerDesktopIcon,
  ArrowPathIcon,
  PlusIcon,
  MinusIcon,
  ShoppingCartIcon,
  CheckIcon,
  ArchiveBoxIcon,
  ClockIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon as CheckSolidIcon,
  XMarkIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/hooks/useUser";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ITStaffInventory {
  id: number;
  userId: number;
  availableLaptops: number;
  user?: User;
}

interface LaptopOrder {
  id: number;
  orderNumber: string;
  trackingNumber: string | null;
  orderedByUserId: number;
  intendedRecipientId: number;
  quantity: number;
  status: "ordered" | "received" | "cancelled" | "archived";
  orderDate: string;
  receivedDate: string | null;
  notes: string;
  isArchived?: boolean;
  canUnarchive?: boolean;
  orderedBy?: User;
  intendedRecipient?: User | null;
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-fade-in ${
        type === "success" ? "bg-green-600" : "bg-red-600"
      }`}
    >
      {type === "error" && <ExclamationCircleIcon className="h-4 w-4 shrink-0" />}
      {message}
      <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Inventory Card ───────────────────────────────────────────────────────────

function InventoryCard({
  staff,
  isCurrentUser,
  editingUserId,
  editValue,
  onIncrease,
  onDecrease,
  onStartEdit,
  onCancelEdit,
  onEditChange,
  onEditSubmit,
  onEditKeyDown,
}: {
  staff: ITStaffInventory;
  isCurrentUser: boolean;
  editingUserId: number | null;
  editValue: string;
  onIncrease: (userId: number) => void;
  onDecrease: (userId: number, current: number) => void;
  onStartEdit: (userId: number, current: number) => void;
  onCancelEdit: () => void;
  onEditChange: (value: string) => void;
  onEditSubmit: (userId: number) => void;
  onEditKeyDown: (e: React.KeyboardEvent, userId: number) => void;
}) {
  const name = staff.user?.name ?? `User ${staff.userId}`;
  const role = staff.user?.role ?? "User";
  const initial = name.charAt(0).toUpperCase();
  const isEditing = editingUserId === staff.userId;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-6 transition-shadow hover:shadow-md ${
        isCurrentUser ? "ring-2 ring-blue-500" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
          <span className="text-white font-semibold text-base">{initial}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
            {isCurrentUser && (
              <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full shrink-0">
                You
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{role}</p>
        </div>
      </div>

      {/* Count */}
      <div className="flex flex-col items-center mb-5">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => onEditKeyDown(e, staff.userId)}
              className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-center text-2xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <button
                onClick={() => onEditSubmit(staff.userId)}
                className="text-green-600 hover:text-green-800 transition-colors"
                title="Save"
              >
                <CheckSolidIcon className="h-5 w-5" />
              </button>
              <button
                onClick={onCancelEdit}
                className="text-red-500 hover:text-red-700 transition-colors"
                title="Cancel"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onStartEdit(staff.userId, staff.availableLaptops)}
            className="group flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            title="Click to edit"
          >
            <span className="text-4xl font-bold text-gray-900">
              {staff.availableLaptops}
            </span>
            <PencilIcon className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors mt-1" />
          </button>
        )}
        <span className="text-xs text-gray-500 mt-1">
          Available Laptop{staff.availableLaptops !== 1 ? "s" : ""}
        </span>
      </div>

      {/* +/- Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => onDecrease(staff.userId, staff.availableLaptops)}
          disabled={staff.availableLaptops <= 0}
          className={`flex items-center justify-center w-10 h-10 rounded-lg font-medium transition-colors ${
            staff.availableLaptops <= 0
              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
              : "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600"
          }`}
          title="Remove one laptop"
        >
          <MinusIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => onIncrease(staff.userId)}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium"
          title="Add one laptop"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  received: "bg-green-100 text-green-800",
  ordered: "bg-amber-100 text-amber-800",
  cancelled: "bg-red-100 text-red-800",
  archived: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  received: "Received",
  ordered: "Ordered",
  cancelled: "Cancelled",
  archived: "Archived",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ITAssetsPage() {
  const router = useRouter();
  const { user: currentUser, loading: userLoading } = useUser();

  const [itStaff, setItStaff] = useState<ITStaffInventory[]>([]);
  const [laptopOrders, setLaptopOrders] = useState<LaptopOrder[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pendingReturns, setPendingReturns] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Inline edit state
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  // New order form state
  const [newOrder, setNewOrder] = useState({
    quantity: 1,
    trackingNumber: "",
    orderedByUserId: "",
    intendedRecipientId: "",
    notes: "",
  });

  const hasAccess =
    currentUser?.role === "Admin" || currentUser?.role === "I.T.";

  const filteredITStaff = itStaff.filter(
    (s) => s.user?.role === "Admin" || s.user?.role === "I.T."
  );

  const currentUserInventory = currentUser
    ? filteredITStaff.find((s) => s.userId === currentUser.id) ?? null
    : null;

  const otherUsersInventory = filteredITStaff.filter(
    (s) => s.userId !== currentUser?.id
  );

  const activeOrders = laptopOrders.filter(
    (o) => o.status !== "archived" && !o.isArchived
  );

  const totalAvailable = filteredITStaff.reduce(
    (sum, s) => sum + s.availableLaptops,
    0
  );

  // ── Toast helper ──────────────────────────────────────────────────────────

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type });
    },
    []
  );

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [usersRes, inventoryRes, ordersRes, statsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/it-assets/inventory"),
        fetch("/api/it-assets/orders?active=true"),
        fetch("/api/terminations/stats"),
      ]);

      if (usersRes.ok) setAllUsers(await usersRes.json());
      if (inventoryRes.ok) setItStaff(await inventoryRes.json());
      if (ordersRes.ok) setLaptopOrders(await ordersRes.json());
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setPendingReturns(stats.pendingReturns ?? 0);
      }
    } catch (error) {
      console.error("Error fetching IT assets data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!userLoading && currentUser) {
      setNewOrder((prev) => ({ ...prev, orderedByUserId: currentUser.id.toString() }));
      fetchData();
    }
  }, [userLoading, currentUser, fetchData]);

  useEffect(() => {
    if (currentUser && !hasAccess) {
      router.push("/management-portal/dashboard");
    }
  }, [currentUser, hasAccess, router]);

  // Auto-archive old orders daily
  useEffect(() => {
    if (!currentUser || !hasAccess) return;
    const run = async () => {
      try {
        const res = await fetch("/api/it-assets/orders/archive", { method: "POST" });
        if (res.ok) {
          const result = await res.json();
          if (result.archived > 0) fetchData();
        }
      } catch {}
    };
    run();
    const interval = setInterval(run, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser, hasAccess, fetchData]);

  // ── Inventory mutations (optimistic) ──────────────────────────────────────

  const adjustInventory = useCallback(
    async (userId: number, change: 1 | -1) => {
      // Optimistic update
      setItStaff((prev) =>
        prev.map((s) =>
          s.userId === userId
            ? { ...s, availableLaptops: Math.max(0, s.availableLaptops + change) }
            : s
        )
      );

      try {
        const res = await fetch("/api/it-assets/inventory", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, change }),
        });

        if (!res.ok) {
          // Rollback
          setItStaff((prev) =>
            prev.map((s) =>
              s.userId === userId
                ? { ...s, availableLaptops: Math.max(0, s.availableLaptops - change) }
                : s
            )
          );
          showToast("Failed to update inventory", "error");
        }
      } catch {
        // Rollback
        setItStaff((prev) =>
          prev.map((s) =>
            s.userId === userId
              ? { ...s, availableLaptops: Math.max(0, s.availableLaptops - change) }
              : s
          )
        );
        showToast("Network error — could not update inventory", "error");
      }
    },
    [showToast]
  );

  const updateInventoryByInput = useCallback(
    async (userId: number, newValue: number) => {
      if (isNaN(newValue) || newValue < 0) {
        showToast("Please enter a valid non-negative number", "error");
        return;
      }
      const current = itStaff.find((s) => s.userId === userId)?.availableLaptops ?? 0;
      const change = newValue - current;
      if (change === 0) {
        setEditingUserId(null);
        return;
      }
      setEditingUserId(null);
      setEditValue("");

      setItStaff((prev) =>
        prev.map((s) => (s.userId === userId ? { ...s, availableLaptops: newValue } : s))
      );

      try {
        const res = await fetch("/api/it-assets/inventory", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, change }),
        });

        if (!res.ok) {
          setItStaff((prev) =>
            prev.map((s) => (s.userId === userId ? { ...s, availableLaptops: current } : s))
          );
          showToast("Failed to update laptop count", "error");
        }
      } catch {
        setItStaff((prev) =>
          prev.map((s) => (s.userId === userId ? { ...s, availableLaptops: current } : s))
        );
        showToast("Network error — could not update laptop count", "error");
      }
    },
    [itStaff, showToast]
  );

  const handleEditSubmit = useCallback(
    (userId: number) => {
      const val = parseInt(editValue);
      updateInventoryByInput(userId, val);
    },
    [editValue, updateInventoryByInput]
  );

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent, userId: number) => {
      if (e.key === "Enter") handleEditSubmit(userId);
      else if (e.key === "Escape") {
        setEditingUserId(null);
        setEditValue("");
      }
    },
    [handleEditSubmit]
  );

  // ── Order mutations ───────────────────────────────────────────────────────

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.orderedByUserId || !newOrder.intendedRecipientId) {
      showToast("Please select who ordered and the intended recipient", "error");
      return;
    }

    try {
      const res = await fetch("/api/it-assets/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: newOrder.quantity,
          trackingNumber: newOrder.trackingNumber || null,
          orderedByUserId: parseInt(newOrder.orderedByUserId),
          intendedRecipientId: parseInt(newOrder.intendedRecipientId),
          notes: newOrder.notes,
        }),
      });

      if (res.ok) {
        setShowOrderForm(false);
        setNewOrder({
          quantity: 1,
          trackingNumber: "",
          orderedByUserId: currentUser?.id.toString() ?? "",
          intendedRecipientId: "",
          notes: "",
        });
        await fetchData();
        showToast("Order created successfully");
      } else {
        const err = await res.json();
        showToast(err.error ?? "Failed to create order", "error");
      }
    } catch {
      showToast("Network error — could not create order", "error");
    }
  };

  const markOrderReceived = async (orderId: number) => {
    try {
      const res = await fetch(`/api/it-assets/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "received" }),
      });

      if (res.ok) {
        await fetchData();
        showToast("Order marked as received");
      } else {
        const err = await res.json();
        showToast(err.error ?? "Failed to update order", "error");
      }
    } catch {
      showToast("Network error — could not update order", "error");
    }
  };

  const archiveOrder = async (
    orderId: number,
    action: "archive" | "unarchive" = "archive"
  ) => {
    try {
      const res = await fetch(`/api/it-assets/orders/${orderId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        await fetchData();
        showToast(`Order ${action === "unarchive" ? "unarchived" : "archived"}`);
      } else {
        const err = await res.json();
        showToast(err.error ?? `Failed to ${action} order`, "error");
      }
    } catch {
      showToast(`Network error — could not ${action} order`, "error");
    }
  };

  const deleteOrder = async (orderId: number) => {
    if (!confirm("Delete this order? This cannot be undone.")) return;
    setDeletingOrderId(orderId);

    try {
      const res = await fetch(`/api/it-assets/orders/${orderId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchData();
        showToast("Order deleted");
      } else {
        const err = await res.json();
        showToast(err.error ?? "Failed to delete order", "error");
      }
    } catch {
      showToast("Network error — could not delete order", "error");
    } finally {
      setDeletingOrderId(null);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────

  if (userLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin" />
          <span>Loading IT Assets...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-500">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-500">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">IT Asset Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track laptop inventory and manage orders for IT staff.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <div className="flex items-center gap-3">
            <ComputerDesktopIcon className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <div className="text-3xl font-bold text-gray-900">{totalAvailable}</div>
              <div className="text-sm text-gray-500">Available Laptops</div>
            </div>
          </div>
        </div>

        <Link href="/management-portal/terminations">
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-red-400 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <ArrowPathIcon className="h-8 w-8 text-red-400 shrink-0" />
              <div>
                <div className="text-3xl font-bold text-gray-900">{pendingReturns}</div>
                <div className="text-sm text-gray-500">Pending Equipment Returns</div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* IT Staff Inventory */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          IT Staff Inventory
        </h2>

        {filteredITStaff.length === 0 ? (
          <p className="text-gray-500 text-sm">No IT staff inventory found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Current user card first */}
            {currentUserInventory && (
              <InventoryCard
                key={currentUserInventory.userId}
                staff={currentUserInventory}
                isCurrentUser
                editingUserId={editingUserId}
                editValue={editValue}
                onIncrease={(id) => adjustInventory(id, 1)}
                onDecrease={(id, current) =>
                  current > 0 && adjustInventory(id, -1)
                }
                onStartEdit={(id, val) => {
                  setEditingUserId(id);
                  setEditValue(val.toString());
                }}
                onCancelEdit={() => {
                  setEditingUserId(null);
                  setEditValue("");
                }}
                onEditChange={setEditValue}
                onEditSubmit={handleEditSubmit}
                onEditKeyDown={handleEditKeyDown}
              />
            )}

            {otherUsersInventory.map((staff) => (
              <InventoryCard
                key={staff.userId}
                staff={staff}
                isCurrentUser={false}
                editingUserId={editingUserId}
                editValue={editValue}
                onIncrease={(id) => adjustInventory(id, 1)}
                onDecrease={(id, current) =>
                  current > 0 && adjustInventory(id, -1)
                }
                onStartEdit={(id, val) => {
                  setEditingUserId(id);
                  setEditValue(val.toString());
                }}
                onCancelEdit={() => {
                  setEditingUserId(null);
                  setEditValue("");
                }}
                onEditChange={setEditValue}
                onEditSubmit={handleEditSubmit}
                onEditKeyDown={handleEditKeyDown}
              />
            ))}
          </div>
        )}
      </section>

      {/* Laptop Orders */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Laptop Orders</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Active orders — received orders auto-archive after 30 days
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowOrderForm(true)}
              className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <ShoppingCartIcon className="h-4 w-4" />
              New Order
            </button>
            <Link
              href="/management-portal/order-history"
              className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <ClockIcon className="h-4 w-4" />
              History
            </Link>
          </div>
        </div>

        {/* Order Form Modal */}
        {showOrderForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-gray-900">
                  New Laptop Order
                </h3>
                <button
                  onClick={() => setShowOrderForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={createOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ordered By *
                  </label>
                  <select
                    value={newOrder.orderedByUserId}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, orderedByUserId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  >
                    <option value="">Select user</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Intended Recipient *
                  </label>
                  <select
                    value={newOrder.intendedRecipientId}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, intendedRecipientId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  >
                    <option value="">Select recipient</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newOrder.quantity}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tracking Number{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newOrder.trackingNumber}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, trackingNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Enter tracking number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Notes{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={newOrder.notes}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, notes: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    rows={3}
                    placeholder="Any additional notes..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOrderForm(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Place Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr>
                {[
                  "Tracking #",
                  "Ordered By",
                  "Recipient",
                  "Qty",
                  "Order Date",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 first:rounded-tl-lg last:rounded-tr-lg"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    No active orders
                  </td>
                </tr>
              ) : (
                activeOrders.map((order) => {
                  const orderedByName =
                    order.orderedBy?.name ?? `User ${order.orderedByUserId}`;
                  const orderedByRole = order.orderedBy?.role ?? "User";
                  const recipientName =
                    order.intendedRecipient?.name ??
                    `User ${order.intendedRecipientId}`;
                  const recipientRole =
                    order.intendedRecipient?.role ?? "User";

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        {order.trackingNumber ? (
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-800 text-xs">
                            {order.trackingNumber}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs italic">
                            None
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                            <span className="text-white text-xs font-semibold">
                              {orderedByName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {orderedByName}
                            </div>
                            <div className="text-xs text-gray-400">{orderedByRole}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                            <span className="text-white text-xs font-semibold">
                              {recipientName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {recipientName}
                            </div>
                            <div className="text-xs text-gray-400">{recipientRole}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">
                        {order.quantity}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_STYLES[order.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_LABELS[order.status] ?? "Pending"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {order.status === "ordered" && (
                            <button
                              onClick={() => markOrderReceived(order.id)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-md transition-colors"
                              title="Mark as Received"
                            >
                              <CheckIcon className="h-3.5 w-3.5" />
                              Receive
                            </button>
                          )}

                          {order.isArchived ? (
                            <button
                              onClick={() => archiveOrder(order.id, "unarchive")}
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors"
                            >
                              <ArchiveBoxIcon className="h-3.5 w-3.5" />
                              Unarchive
                            </button>
                          ) : (
                            <button
                              onClick={() => archiveOrder(order.id, "archive")}
                              className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md transition-colors"
                            >
                              <ArchiveBoxIcon className="h-3.5 w-3.5" />
                              Archive
                            </button>
                          )}

                          <button
                            onClick={() => deleteOrder(order.id)}
                            disabled={deletingOrderId === order.id}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                            title="Delete Order"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            {deletingOrderId === order.id ? "Deleting…" : "Delete"}
                          </button>

                          {order.status === "received" && !order.isArchived && (
                            <span className="text-xs text-gray-400">
                              Auto-archives in 30 days
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
