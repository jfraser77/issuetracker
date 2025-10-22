"use client";

import { useState, useEffect } from "react";
import {
  ComputerDesktopIcon,
  ArrowPathIcon,
  PlusIcon,
  MinusIcon,
  ShoppingCartIcon,
  CheckIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  ClockIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon as CheckSolidIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/hooks/useUser"; 

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

interface TerminationStats {
  pendingReturns: number;
}

export default function ITAssetsPage() {
  const router = useRouter();
  const { user: currentUser, loading: userLoading } = useUser(); 
  const [itStaff, setItStaff] = useState<ITStaffInventory[]>([]);
  const [laptopOrders, setLaptopOrders] = useState<LaptopOrder[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [terminationStats, setTerminationStats] = useState<TerminationStats>({ pendingReturns: 0 });
  const [loading, setLoading] = useState(true);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [newOrder, setNewOrder] = useState({
    quantity: 1,
    trackingNumber: "",
    orderedByUserId: "",
    intendedRecipientId: "", 
    notes: "",
  });
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  
  // State for direct input editing
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Check if user has access (Admin or I.T. roles only)
  const hasAccess = currentUser?.role === "Admin" || currentUser?.role === "I.T.";

  // Fetch data only when user is loaded
  useEffect(() => {
    if (!userLoading && currentUser) {
      fetchData();
    }
  }, [userLoading, currentUser]);

  // Redirect if no access - only when we have user data
  useEffect(() => {
    if (currentUser && !hasAccess) {
      router.push("/management-portal/dashboard");
    }
  }, [currentUser, hasAccess, router]);

  // Auto-archive old orders - only when component is ready
  useEffect(() => {
    if (!currentUser || !hasAccess) return;

    const archiveOldOrders = async () => {
      try {
        const response = await fetch("/api/it-assets/orders/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const result = await response.json();
          if (result.archived > 0) {
            console.log(`Auto-archived ${result.archived} old orders`);
            fetchData();
          }
        }
      } catch (error) {
        console.error("Error archiving orders:", error);
      }
    };

    archiveOldOrders();
    const interval = setInterval(archiveOldOrders, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser, hasAccess]);

  const fetchData = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);

      // Set new order user ID safely
      setNewOrder((prev) => ({
        ...prev,
        orderedByUserId: currentUser.id.toString(),
      }));

      // Fetch all users for the dropdown
      try {
        const usersResponse = await fetch("/api/users");
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setAllUsers(usersData);
        } else if (usersResponse.status === 401) {
          console.warn("Unauthorized access to /api/users");
          // Continue without users data
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }

      // Fetch IT staff inventory
      try {
        const inventoryResponse = await fetch("/api/it-assets/inventory");
        if (inventoryResponse.ok) {
          const inventoryData = await inventoryResponse.json();
          setItStaff(inventoryData);
        }
      } catch (error) {
        console.error("Error fetching inventory:", error);
      }

      // Fetch active laptop orders (non-archived)
      try {
        const ordersResponse = await fetch("/api/it-assets/orders?active=true");
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          setLaptopOrders(ordersData);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      }

      // Fetch termination stats for pending returns
      try {
        const statsResponse = await fetch("/api/terminations/stats");
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setTerminationStats(statsData);
        }
      } catch (error) {
        console.error("Error fetching termination stats:", error);
      }
    } catch (error) {
      console.error("Error in fetchData:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to increase available laptops
  const increaseAvailable = async (userId: number) => {
    try {
      const response = await fetch("/api/it-assets/inventory", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, change: 1 }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error increasing inventory:", error);
    }
  };

  // Function to decrease available laptops
  const decreaseAvailable = async (
    userId: number,
    currentAvailable: number
  ) => {
    if (currentAvailable <= 0) return;

    try {
      const response = await fetch("/api/it-assets/inventory", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, change: -1 }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error decreasing inventory:", error);
    }
  };

  // Function to update available laptops by direct input
  const updateAvailableByInput = async (userId: number, newValue: number) => {
    if (newValue < 0) {
      alert("Laptop count cannot be negative");
      return;
    }

    try {
      // Get current value to calculate the change needed
      const currentStaff = itStaff.find(staff => staff.userId === userId);
      if (!currentStaff) return;

      const change = newValue - currentStaff.availableLaptops;

      const response = await fetch("/api/it-assets/inventory", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, change }),
      });

      if (response.ok) {
        setEditingUserId(null);
        setEditValue("");
        fetchData();
      }
    } catch (error) {
      console.error("Error updating inventory by input:", error);
      alert("Failed to update laptop count");
    }
  };

  // Function to start editing
  const startEditing = (userId: number, currentValue: number) => {
    setEditingUserId(userId);
    setEditValue(currentValue.toString());
  };

  // Function to cancel editing
  const cancelEditing = () => {
    setEditingUserId(null);
    setEditValue("");
  };

  // Function to handle input submission
  const handleInputSubmit = (userId: number) => {
    const newValue = parseInt(editValue);
    if (isNaN(newValue)) {
      alert("Please enter a valid number");
      return;
    }
    updateAvailableByInput(userId, newValue);
  };

  // Function to handle input key press
  const handleInputKeyPress = (e: React.KeyboardEvent, userId: number) => {
    if (e.key === 'Enter') {
      handleInputSubmit(userId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

 



const createOrder = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newOrder.orderedByUserId || !newOrder.intendedRecipientId) {
    alert("Please select who ordered and who the intended recipient is");
    return;
  }

  try {
    const response = await fetch("/api/it-assets/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quantity: newOrder.quantity,
        trackingNumber: newOrder.trackingNumber || null,
        orderedByUserId: parseInt(newOrder.orderedByUserId),
        intendedRecipientId: parseInt(newOrder.intendedRecipientId), // ADD THIS
        notes: newOrder.notes,
      }),
    });

    const responseData = await response.json();

    if (response.ok) {
      setShowOrderForm(false);
      setNewOrder({
        quantity: 1,
        trackingNumber: "",
        orderedByUserId: currentUser?.id.toString() || "",
        intendedRecipientId: "", // RESET THIS
        notes: "",
      });
      fetchData();
      alert("Order created successfully!");
    } else {
      console.error("Order creation failed:", responseData);
      alert(
        responseData.error ||
          "Failed to create order. Check console for details."
      );
    }
  } catch (error) {
    console.error("Error creating order:", error);
    alert("Network error. Please check your connection and try again.");
  }
};

  const markOrderReceived = async (orderId: number) => {
    try {
      const response = await fetch(`/api/it-assets/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "received" }),
      });

      if (response.ok) {
        fetchData();
        alert("Order marked as received!");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update order");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Failed to update order");
    }
  };

  const archiveOrder = async (orderId: number, action: 'archive' | 'unarchive' = 'archive') => {
  try {
    const response = await fetch(`/api/it-assets/orders/${orderId}/archive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });

    if (response.ok) {
      fetchData();
      alert(`Order ${action === 'unarchive' ? 'unarchived' : 'archived'} successfully!`);
    } else {
      const errorData = await response.json();
      alert(errorData.error || `Failed to ${action} order`);
    }
  } catch (error) {
    console.error(`Error ${action}ing order:`, error);
    alert(`Failed to ${action} order`);
  }
};

  const deleteOrder = async (orderId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this order? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingOrderId(orderId);

    try {
      const response = await fetch(`/api/it-assets/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        fetchData();
        alert("Order deleted successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete order");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Failed to delete order");
    } finally {
      setDeletingOrderId(null);
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

  // Get user display name
  const getUserDisplayName = (item: ITStaffInventory | LaptopOrder) => {
    if ("user" in item && item.user?.name) {
      return item.user.name;
    }
    if ("orderedBy" in item && item.orderedBy?.name) {
      return item.orderedBy.name;
    }
    return `User ${"userId" in item ? item.userId : item.orderedByUserId}`;
  };

  // Get user initial for avatar
  const getUserInitial = (item: ITStaffInventory | LaptopOrder) => {
    const name = getUserDisplayName(item);
    return name.charAt(0).toUpperCase();
  };

  // Get user role
  const getUserRole = (item: ITStaffInventory | LaptopOrder) => {
    if ("user" in item && item.user?.role) {
      return item.user.role;
    }
    if ("orderedBy" in item && item.orderedBy?.role) {
      return item.orderedBy.role;
    }
    return "User";
  };

  // Calculate dynamic stats - filter out archived orders
  const activeOrders = laptopOrders.filter(
    (order) => order.status !== "archived" && !order.isArchived
  );

  const dynamicStats = [
    {
      icon: ComputerDesktopIcon,
      value: itStaff.reduce((sum, staff) => sum + staff.availableLaptops, 0),
      label: "Available Laptops",
      color: "text-green-500",
    },
    {
      icon: ArrowPathIcon,
      value: terminationStats.pendingReturns,
      label: "Pending Returns",
      color: "text-red-500",
      link: "/management-portal/terminations",
    },
  ];

  // Separate current user's inventory from other users
  const currentUserInventory = currentUser 
    ? itStaff.find((staff) => staff.userId === currentUser.id)
    : null;
  const otherUsersInventory = itStaff.filter(
    (staff) => staff.userId !== currentUser?.id
  );
  const totalOtherUsersLaptops = otherUsersInventory.reduce(
    (sum, staff) => sum + staff.availableLaptops,
    0
  );

  if (userLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading IT Assets...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please log in to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          IT Staff Laptop Inventory
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {dynamicStats.map((stat, index) => {
          const IconComponent = stat.icon;
          const cardContent = (
            <div className={`bg-white rounded-lg shadow-sm p-6 ${stat.link ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
              <IconComponent className={`h-8 w-8 ${stat.color} mb-4`} />
              <div className="text-3xl font-bold text-gray-900">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          );

          return stat.link ? (
            <Link key={index} href={stat.link}>
              {cardContent}
            </Link>
          ) : (
            <div key={index}>
              {cardContent}
            </div>
          );
        })}
      </div>

      {/* IT Staff Inventory */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold text-gray-900">
          IT Staff Inventory
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Current User's Inventory Card */}
        {currentUserInventory && (
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-blue-500">
            <div className="flex items-center mb-4 pb-4 border-b border-gray-100">
              <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center mr-4">
                <span className="text-white font-semibold text-lg">
                  {getUserInitial(currentUserInventory)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {getUserDisplayName(currentUserInventory)} (You)
                </h3>
                <p className="text-sm text-gray-500 capitalize">
                  {getUserRole(currentUserInventory)}
                </p>
              </div>
            </div>

            <div className="flex justify-around text-center mb-4">
              <div className="px-4 py-2">
                {editingUserId === currentUserInventory.userId ? (
                  <div className="flex items-center justify-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => handleInputKeyPress(e, currentUserInventory.userId)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-2xl font-bold text-gray-900"
                      autoFocus
                    />
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleInputSubmit(currentUserInventory.userId)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <CheckSolidIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span className="block text-2xl font-bold text-gray-900">
                      {currentUserInventory.availableLaptops}
                    </span>
                    <button
                      onClick={() => startEditing(currentUserInventory.userId, currentUserInventory.availableLaptops)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit count"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <span className="text-xs text-gray-500">Available</span>
              </div>
            </div>

            {/* Buttons to adjust available inventory */}
            <div className="flex justify-center items-center">
              <div className="flex justify-center mt-4 space-x-2">
                <button
                  onClick={() =>
                    decreaseAvailable(
                      currentUserInventory.userId,
                      currentUserInventory.availableLaptops
                    )
                  }
                  disabled={currentUserInventory.availableLaptops <= 0}
                  className={`flex items-center px-3 py-2 rounded-md font-medium ${
                    currentUserInventory.availableLaptops <= 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => increaseAvailable(currentUserInventory.userId)}
                  className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Other Users Inventory Cards */}
        {otherUsersInventory.map((staff) => (
          <div key={staff.userId} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4 pb-4 border-b border-gray-100">
              <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center mr-4">
                <span className="text-white font-semibold text-lg">
                  {getUserInitial(staff)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {getUserDisplayName(staff)}
                </h3>
                <p className="text-sm text-gray-500 capitalize">
                  {getUserRole(staff)}
                </p>
              </div>
            </div>

            <div className="flex justify-around text-center mb-4">
              <div className="px-4 py-2">
                {editingUserId === staff.userId ? (
                  <div className="flex items-center justify-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => handleInputKeyPress(e, staff.userId)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-2xl font-bold text-gray-900"
                      autoFocus
                    />
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleInputSubmit(staff.userId)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <CheckSolidIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span className="block text-2xl font-bold text-gray-900">
                      {staff.availableLaptops}
                    </span>
                    <button
                      onClick={() => startEditing(staff.userId, staff.availableLaptops)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit count"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <span className="text-xs text-gray-500">Available</span>
              </div>
            </div>

            {/* Buttons to adjust available inventory */}
            <div className="flex justify-center items-center">
              <div className="flex justify-center mt-4 space-x-2">
                <button
                  onClick={() =>
                    decreaseAvailable(
                      staff.userId,
                      staff.availableLaptops
                    )
                  }
                  disabled={staff.availableLaptops <= 0}
                  className={`flex items-center px-3 py-2 rounded-md font-medium ${
                    staff.availableLaptops <= 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => increaseAvailable(staff.userId)}
                  className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty state if no inventory */}
        {itStaff.length === 0 && (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">No IT staff inventory found.</p>
          </div>
        )}
      </div>

      {/* Laptop Orders Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Laptop Orders
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Active orders - received orders auto-archive after 30 days
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowOrderForm(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
            >
              <ShoppingCartIcon className="h-4 w-4 mr-2" />
              New Order
            </button>
            <Link
              href="/management-portal/order-history"
              className="bg-blue-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md flex items-center"
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              Order History
            </Link>
          </div>
        </div>

        {/* Order Form Modal */}
        {showOrderForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">New Laptop Order</h3>
              <form onSubmit={createOrder}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ordered By *
                  </label>
                  <select
                    value={newOrder.orderedByUserId}
                    onChange={(e) =>
                      setNewOrder({
                        ...newOrder,
                        orderedByUserId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select User</option>
                    {allUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Intended Recipient *
  </label>
  <select
    value={newOrder.intendedRecipientId}
    onChange={(e) =>
      setNewOrder({
        ...newOrder,
        intendedRecipientId: e.target.value,
      })
    }
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    required
  >
    <option value="">Select Intended Recipient</option>
    {allUsers.map((user) => (
      <option key={user.id} value={user.id}>
        {user.name} ({user.role})
      </option>
    ))}
  </select>
</div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newOrder.quantity}
                    onChange={(e) =>
                      setNewOrder({
                        ...newOrder,
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tracking Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={newOrder.trackingNumber}
                    onChange={(e) =>
                      setNewOrder({
                        ...newOrder,
                        trackingNumber: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter tracking number"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={newOrder.notes}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, notes: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Any additional notes about this order..."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowOrderForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                  >
                    Place Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
<thead className="bg-gray-50">
  <tr>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Tracking Number
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Ordered By
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Intended Recipient
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Quantity
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Order Date
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Status
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Actions
    </th>
  </tr>
</thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No active orders found
                  </td>
                </tr>
              ) : (
                activeOrders.map((order) => (
                  <tr key={order.id}>
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
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                          <span className="text-white text-xs font-semibold">
                            {getUserInitial(order)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {getUserDisplayName(order)}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {getUserRole(order)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
  <div className="flex items-center">
    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mr-3">
      <span className="text-white text-xs font-semibold">
        {order.intendedRecipient?.name?.charAt(0).toUpperCase() || 'U'}
      </span>
    </div>
    <div>
      <div className="font-medium text-gray-900">
        {order.intendedRecipient?.name || `User ${order.intendedRecipientId}`}
      </div>
      <div className="text-xs text-gray-500 capitalize">
        {order.intendedRecipient?.role || 'User'}
      </div>
    </div>
  </div>
</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.orderDate).toLocaleDateString()}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        {order.status === "ordered" && (
                          <button
                            onClick={() => markOrderReceived(order.id)}
                            className="text-green-600 hover:text-green-800 flex items-center"
                            title="Mark as Received"
                          >
                            <CheckIcon className="h-4 w-4 mr-1" />
                            Receive
                          </button>
                        )}
                        {order.isArchived ? (
  <button
    onClick={() => archiveOrder(order.id, 'unarchive')}
    className="text-blue-600 hover:text-blue-800 flex items-center"
    title="Unarchive Order"
  >
    <ArchiveBoxIcon className="h-4 w-4 mr-1" />
    Unarchive
  </button>
) : (
  <button
    onClick={() => archiveOrder(order.id, 'archive')}
    className="text-gray-600 hover:text-gray-800 flex items-center"
    title="Archive Order"
  >
    <ArchiveBoxIcon className="h-4 w-4 mr-1" />
    Archive
  </button>
)}
                        <button
                          onClick={() => deleteOrder(order.id)}
                          disabled={deletingOrderId === order.id}
                          className="text-red-600 hover:text-red-800 flex items-center group relative"
                          title="Delete Order"
                        >
                          <TrashIcon className="h-4 w-4" />
                          {deletingOrderId === order.id ? (
                            <span className="ml-1 text-xs">Deleting...</span>
                          ) : (
                            <span className="ml-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                              Delete
                            </span>
                          )}
                        </button>
                        {order.status === "received" && (
                          <span className="text-gray-400 text-xs">
                            Auto-archives in 30 days
                          </span>
                        )}
                      </div>
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
