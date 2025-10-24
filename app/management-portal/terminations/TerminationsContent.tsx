"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  MinusIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";

// =============================================================================
// INTERFACE DEFINITIONS
// =============================================================================

/**
 * User interface representing system users with role-based access

 */
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

/**
 * Checklist item for IT access removal tasks

 */
interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  completed: boolean;
  completedBy?: string;
  completedDate?: string;
  notes?: string;
}

/**
 * Main termination record interface
 * @interface Termination
 */
interface Termination {
  id: number;
  employeeName: string;
  employeeEmail: string;
  jobTitle: string;
  department: string;
  terminationDate: string;
  terminationReason: string;
  initiatedBy: string;
  status: "pending" | "equipment_returned" | "archived" | "overdue";
  trackingNumber?: string;
  equipmentDisposition: "return_to_pool" | "retire";
  daysRemaining: number;
  isOverdue: boolean;
  licensesRemoved: {
    automateLicense: boolean;
    screenConnect: boolean;
    office365: boolean;
    adobeAcrobat: boolean;
    phone: boolean;
    fax: boolean;
    additionalRemovals?: string;
  };
  checklist?: ChecklistItem[];
  completedByUserId?: number;
  completedByUser?: User;
  timestamp: string;
  isExpanded?: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * TerminationsContent Component
 * 
 * Manages the employee termination process including:
 * - Creating new termination records
 * - Tracking equipment returns
 * - IT access removal checklist
 * - Equipment inventory management
 * - Automated overdue tracking
 * 
 * @component

 */
export default function TerminationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================
  
  const [terminations, setTerminations] = useState<Termination[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [itUsers, setItUsers] = useState<User[]>([]);
  const [showTerminationForm, setShowTerminationForm] = useState(false);
  const [terminationForm, setTerminationForm] = useState({
    employeeName: "",
    employeeEmail: "",
    jobTitle: "",
    department: "",
    terminationDate: new Date().toISOString().split("T")[0],
    terminationReason: "",
    equipmentDisposition: "return_to_pool" as "return_to_pool" | "retire",
  });
  const [isClient, setIsClient] = useState(false);

  // ===========================================================================
  // ACCESS CONTROL & FILTERING
  // ===========================================================================
  
  /**
   * Role-based access control
   * Admin, I.T., and HR can initiate terminations
   */
  const isAuthorized =
    currentUser?.role === "Admin" ||
    currentUser?.role === "I.T." ||
    currentUser?.role === "HR";
  
  /**
   * Admin and I.T. have additional privileges for checklist management
   */
  const isAdminOrIT =
    currentUser?.role === "Admin" || currentUser?.role === "I.T.";
  
  const filter = searchParams.get("filter");

  // ===========================================================================
  // MEMOIZED VALUES
  // ===========================================================================
  
  /**
   * Memoized filtered terminations to prevent unnecessary re-renders
   * Currently returns all terminations - can be extended for filtering
   */
  const filteredTerminations = useMemo(() => {
    return terminations;
  }, [terminations]);

  // ===========================================================================
  // DEFAULT DATA
  // ===========================================================================
  
  /**
   * Default IT checklist items for new termination records
   * These are standard access removal tasks across all systems
   */
  const defaultChecklist: ChecklistItem[] = [
    {
      id: "1",
      category: "Active Directory",
      description: "Disable Windows/AD account",
      completed: false,
    },
    // ... rest of default checklist items
  ];

  // ===========================================================================
  // LIFECYCLE & DATA FETCHING
  // ===========================================================================
  
  /**
   * Component initialization
   * - Sets client-side flag
   * - Fetches initial data
   * - Sets up overdue check interval
   */
  useEffect(() => {
    setIsClient(true);
    fetchCurrentUser();
    fetchTerminations();
    fetchITUsers();

    // Check for overdue terminations daily
    const interval = setInterval(checkOverdueTerminations, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [filter]);

  /**
   * Fetches current user data for access control
   * @async
   */
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/user");
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  /**
   * Fetches IT users for assignment dropdowns
  
   */
  const fetchITUsers = async () => {
    try {
      const response = await fetch("/api/users?role=IT,Admin");
      if (response.ok) {
        const users = await response.json();
        setItUsers(users);
      }
    } catch (error) {
      console.error("Error fetching IT users:", error);
    }
  };

  /**
   * Fetches termination records with checklist initialization
   * Ensures all terminations have the full checklist
 
   */
  const fetchTerminations = async () => {
    try {
      const url = filter
        ? `/api/terminations?filter=${filter}`
        : "/api/terminations";
      const response = await fetch(url);
      if (response.ok) {
        const terminationsData = await response.json();

        // Ensure each termination has the full checklist
        const terminationsWithChecklist = terminationsData.map(
          (t: Termination) => ({
            ...t,
            isExpanded: false,
            // Always ensure we have the full checklist
            checklist:
              t.checklist && t.checklist.length > 0
                ? t.checklist
                : [...defaultChecklist],
          })
        );

        setTerminations(terminationsWithChecklist);
      } else {
        console.error("Failed to fetch terminations:", response.status);
      }
    } catch (error) {
      console.error("Error fetching terminations:", error);
    } finally {
      setLoading(false);
    }
  };

  // ===========================================================================
  // DEBOUNCED UPDATES
  // ===========================================================================
  
  /**
   * Debounced tracking number update to prevent excessive API calls
   * Waits 1 second after user stops typing before saving

   */
  const debouncedUpdateTrackingNumber = useCallback(
    (terminationId: number, trackingNumber: string) => {
      const timeoutId = setTimeout(async () => {
        try {
          await updateTermination(terminationId, { trackingNumber });
        } catch (error) {
          console.error("Error updating tracking number:", error);
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    },
    []
  );

  // ===========================================================================
  // UI STATE MANAGEMENT
  // ===========================================================================
  
  /**
   * Toggles expansion state of termination card
   * Uses useCallback to prevent unnecessary re-renders

   */
   const toggleTerminationExpanded = useCallback((terminationId: number) => {
    setTerminations((prev) =>
      prev.map((t) =>
        t.id === terminationId ? { ...t, isExpanded: !t.isExpanded } : t
      )
    );
  }, []);

  // ===========================================================================
  // TERMINATION ACTIONS
  // ===========================================================================
  
  /**
   * Archives a termination record
   * Moves termination from active to archived state
   
   */
  const archiveTermination = async (terminationId: number) => {
    try {
      const response = await fetch(`/api/terminations/${terminationId}/archive`, {
        method: "POST",
      });

      if (response.ok) {
        fetchTerminations();
        alert("Termination archived successfully!");
      } else {
        const errorData = await response.json();
        alert(`Failed to archive termination: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error archiving termination:", error);
      alert("Failed to archive termination. Please try again.");
    }
  };

  /**
   * Generates a printable termination report
   * Opens print dialog with formatted report

   */
  const generatePrintReport = (termination: Termination) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const completedChecklistItems = termination.checklist?.filter(item => item.completed) || [];
    const totalChecklistItems = termination.checklist?.length || 0;
    const progress = totalChecklistItems > 0 ? Math.round((completedChecklistItems.length / totalChecklistItems) * 100) : 0;

    // Print content generation...
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  /**
   * Navigates to termination edit page
   
   */
  const handleEditTermination = (terminationId: number) => {
    router.push(`/management-portal/terminations/${terminationId}/edit`);
  };

  /**
   * Creates a new termination record
   * Includes authorization check and default checklist initialization

   */
  const createTermination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      alert("You are not authorized to initiate terminations.");
      return;
    }

    try {
      const response = await fetch("/api/terminations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...terminationForm,
          initiatedBy: currentUser?.name,
          checklist: defaultChecklist,
        }),
      });

      if (response.ok) {
        setShowTerminationForm(false);
        setTerminationForm({
          employeeName: "",
          employeeEmail: "",
          jobTitle: "",
          department: "",
          terminationDate: new Date().toISOString().split("T")[0],
          terminationReason: "",
          equipmentDisposition: "return_to_pool",
        });
        fetchTerminations();
        alert("Termination process initiated successfully.");
      }
    } catch (error) {
      console.error("Error creating termination:", error);
      alert("Failed to initiate termination process.");
    }
  };

  // ===========================================================================
  // DATA UPDATE FUNCTIONS
  // ===========================================================================
  
  /**
   * Updates termination record in both local state and database
   * PRESERVES EXPANDED STATE to prevent collapse during updates

   */
    const updateTermination = async (terminationId: number, updates: Partial<Termination>) => {
    try {
      // Update local state first for immediate feedback
      setTerminations((prev) =>
        prev.map((t) =>
          t.id === terminationId
            ? { 
                ...t, 
                ...updates,
                // CRITICAL: Preserve expanded state during updates
                isExpanded: updates.isExpanded !== undefined ? updates.isExpanded : t.isExpanded
              }
            : t
        )
      );

      // Then update in database
      const response = await fetch(`/api/terminations/${terminationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // NOTE: fetchTerminations() is NOT called here to preserve UI state
      // Only call fetchTerminations() on errors to restore correct state
      
    } catch (error) {
      console.error("Error updating termination:", error);
      alert("Failed to update termination. Please try again.");
      // Refresh on error to restore correct state
      fetchTerminations();
    }
  };

  /**
   * Updates individual checklist item
   * PRESERVES EXPANDED STATE to prevent collapse

   */
  const updateChecklistItem = async (
  terminationId: number,
  itemId: string,
  updates: Partial<ChecklistItem>
) => {
  try {
    const termination = terminations.find((t) => t.id === terminationId);
    if (!termination?.checklist) return;

    const updatedChecklist = termination.checklist.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    );

    // Update local state immediately for better UX
    setTerminations((prev) =>
      prev.map((t) =>
        t.id === terminationId
          ? {
              ...t,
              checklist: updatedChecklist,
              isExpanded: t.isExpanded, // Preserve expanded state
            }
          : t
      )
    );

    // Update in database - don't call fetchTerminations after this
    await updateTermination(terminationId, { checklist: updatedChecklist });
  } catch (error) {
    console.error("Error updating checklist item:", error);
    // Only refresh on error
    fetchTerminations();
  }
};

  /**
   * Removes checklist item from termination
   * PRESERVES EXPANDED STATE to prevent collapse

   */
  const removeChecklistItem = async (terminationId: number, itemId: string) => {
  if (!confirm("Are you sure you want to remove this checklist item?")) {
    return;
  }

  try {
    const termination = terminations.find((t) => t.id === terminationId);
    if (!termination?.checklist) return;

    const updatedChecklist = termination.checklist.filter(
      (item) => item.id !== itemId
    );

    // Update local state immediately
    setTerminations((prev) =>
      prev.map((t) =>
        t.id === terminationId 
          ? { 
              ...t, 
              checklist: updatedChecklist,
              isExpanded: t.isExpanded // Preserve expanded state
            } 
          : t
      )
    );

    // Update in database - don't call fetchTerminations after this
    await updateTermination(terminationId, { checklist: updatedChecklist });
  } catch (error) {
    console.error("Error removing checklist item:", error);
    // Only refresh on error
    fetchTerminations();
  }
};

  /**
   * Marks equipment as returned and updates IT inventory
   * Updates both termination status and IT staff laptop count

   */
  const markEquipmentReturned = async (
  terminationId: number,
  trackingNumber: string,
  equipmentDisposition: string,
  completedByUserId?: number
) => {
  try {
    const response = await fetch(
      `/api/terminations/${terminationId}/return`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber,
          equipmentDisposition,
          completedByUserId,
        }),
      }
    );

    if (response.ok) {
      // Update local state immediately
      setTerminations((prev) =>
        prev.map((t) =>
          t.id === terminationId
            ? {
                ...t,
                status: "equipment_returned" as const,
                isExpanded: t.isExpanded, // Preserve expanded state
              }
            : t
        )
      );

      // If equipment is being returned to pool, update IT Staff inventory
      if (equipmentDisposition === "return_to_pool" && completedByUserId) {
        try {
          await fetch("/api/it-assets/inventory", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: completedByUserId,
              change: 1,
            }),
          });
          console.log(
            `Updated IT Staff inventory for user ${completedByUserId}`
          );
        } catch (inventoryError) {
          console.error("Error updating IT Staff inventory:", inventoryError);
          // Continue even if inventory update fails
        }
      }

      alert("Equipment return recorded successfully and inventory updated.");
      
      // Don't call fetchTerminations() - we've already updated local state
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to mark equipment returned");
    }
  } catch (error) {
    console.error("Error marking equipment returned:", error);
    alert(
      `Failed to record equipment return: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    // Only refresh on error
    fetchTerminations();
  }
};

  // ===========================================================================
  // EVENT HANDLERS WITH STATE PRESERVATION
  // ===========================================================================
  
  /**
   * Handles equipment disposition changes
   * PRESERVES EXPANDED STATE during updates
   */
  const handleEquipmentDispositionChange = useCallback(
  (terminationId: number, value: "return_to_pool" | "retire") => {
    setTerminations((prev) =>
      prev.map((t) =>
        t.id === terminationId
          ? {
              ...t,
              equipmentDisposition: value,
              isExpanded: t.isExpanded, // Preserve expanded state
            }
          : t
      )
    );
    updateTermination(terminationId, { equipmentDisposition: value });
  },
  []
);

  /**
   * Handles completed by user assignment changes
   * PRESERVES EXPANDED STATE during updates
   */
  const handleCompletedByChange = useCallback(
  (terminationId: number, value: string) => {
    const completedByUserId = value ? parseInt(value) : undefined;
    setTerminations((prev) =>
      prev.map((t) =>
        t.id === terminationId
          ? {
              ...t,
              completedByUserId,
              isExpanded: t.isExpanded, // Preserve expanded state
            }
          : t
      )
    );
    updateTermination(terminationId, { completedByUserId });
  },
  []
);

  /**
   * Deletes termination record after confirmation
   
   */
  const deleteTermination = async (terminationId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this termination record? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/terminations/${terminationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTerminations((prev) => prev.filter((t) => t.id !== terminationId));
      }
    } catch (error) {
      console.error("Error deleting termination:", error);
    }
  };

  /**
   * Checks for overdue terminations (runs daily via interval)
   */
  const checkOverdueTerminations = async () => {
    try {
      await fetch("/api/terminations/check-overdue", { method: "POST" });
      fetchTerminations();
    } catch (error) {
      console.error("Error checking overdue terminations:", error);
    }
  };

  // ===========================================================================
  // UI HELPER FUNCTIONS
  // ===========================================================================
  
  /**
   * Returns appropriate CSS classes for status badges
  
   */
  const getStatusColor = (status: string, isOverdue: boolean) => {
    if (isOverdue) return "bg-red-100 text-red-800";

    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "equipment_returned":
        return "bg-green-100 text-green-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  /**
   * Returns human-readable status text

   */
  const getStatusText = (
    status: string,
    daysRemaining: number,
    isOverdue: boolean
  ) => {
    if (isOverdue) return "OVERDUE - Equipment Not Returned";

    switch (status) {
      case "pending":
        return `${daysRemaining} days remaining`;
      case "equipment_returned":
        return "Equipment Returned";
      case "archived":
        return "Archived";
      case "overdue":
        return "Overdue";
      default:
        return "Pending";
    }
  };

  /**
   * Handles tracking number input with debounced save
   */
  const handleTrackingNumberChange = useCallback(
    (terminationId: number, value: string) => {
      setTerminations((prev) =>
        prev.map((t) =>
          t.id === terminationId ? { ...t, trackingNumber: value } : t
        )
      );
      debouncedUpdateTrackingNumber(terminationId, value);
    },
    [debouncedUpdateTrackingNumber]
  );

  /**
   * Auto-fills termination form when employee is selected
   */
  const handleEmployeeSelect = (employee: any) => {
    setTerminationForm((prev) => ({
      ...prev,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.email,
      jobTitle: employee.jobTitle,
      department: employee.department,
    }));
  };

  // ===========================================================================
  // CHECKLIST SECTION COMPONENT
  // ===========================================================================
  
  /**
   * ChecklistSection Component
   * 
   * Manages IT access removal checklist for a specific termination
   * Includes:
   * - Item completion tracking
   * - Bulk operations (check all/uncheck all)
   * - Progress tracking
   * - Custom item addition
   * 
    */
  const ChecklistSection = ({ termination }: { termination: Termination }) => {
    const [localNewItem, setLocalNewItem] = useState({
      category: "",
      description: "",
    });

    /**
     * Adds custom checklist item
     */
    const handleAddChecklistItem = async () => {
      if (!localNewItem.category.trim() || !localNewItem.description.trim()) {
        alert("Please enter both category and description");
        return;
      }

      try {
        const newItem: ChecklistItem = {
          id: `custom-${Date.now()}`,
          category: localNewItem.category.trim(),
          description: localNewItem.description.trim(),
          completed: false,
        };

        const updatedChecklist = [...(termination.checklist || []), newItem];

        setTerminations((prev) =>
          prev.map((t) =>
            t.id === termination.id
              ? {
                  ...t,
                  checklist: updatedChecklist,
                  isExpanded: t.isExpanded,
                }
              : t
          )
        );

        await updateTermination(termination.id, {
          checklist: updatedChecklist,
        });
        setLocalNewItem({ category: "", description: "" });
      } catch (error) {
        console.error("Error adding checklist item:", error);
        fetchTerminations();
      }
    };

    /**
     * Groups checklist items by category for organized display
     */
    const groupChecklistByCategory = (checklist: ChecklistItem[]) => {
      const grouped: { [key: string]: ChecklistItem[] } = {};
      checklist.forEach((item) => {
        if (!grouped[item.category]) {
          grouped[item.category] = [];
        }
        grouped[item.category].push(item);
      });
      return grouped;
    };

    return (
      <div className="border-t pt-4">
        <h3 className="font-medium text-gray-900 mb-3">
          IT Access Removal Checklist
        </h3>

        {/* Checklist UI implementation... */}
      </div>
    );
  };

  // ===========================================================================
  // RENDER LOGIC
  // ===========================================================================
  
  if (!isClient || loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }


  return (
    <div suppressHydrationWarning>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Employee Terminations
        </h1>

        {isAuthorized && (
          <button
            onClick={() => setShowTerminationForm(true)}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium"
          >
            Initiate Termination
          </button>
        )}
      </div>

      {/* Termination Form Modal */}
      {showTerminationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Initiate Termination Process
            </h3>
            <form onSubmit={createTermination}>
              {/* ... your form JSX remains the same ... */}
            </form>
          </div>
        </div>
      )}

      {filteredTerminations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            No Active Termination Processes
          </h2>
          <p className="text-gray-500 mb-4">
            {isAuthorized
              ? "Get started by initiating a termination process."
              : "No termination processes require attention."}
          </p>
          {isAuthorized && (
            <button
              onClick={() => setShowTerminationForm(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium"
            >
              Initiate Termination
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredTerminations.map((termination) => (
            <div
              key={termination.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              {/* Termination Header */}
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-4">
                    <button
                      onClick={() => toggleTerminationExpanded(termination.id)}
                      className="mt-1 text-gray-400 hover:text-gray-600"
                    >
                      {termination.isExpanded ? (
                        <ChevronDownIcon className="h-5 w-5" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {termination.employeeName}
                        </h3>
                        <button
        onClick={() => handleEditTermination(termination.id)}
        className="text-gray-400 hover:text-blue-600"
        title="Edit Termination"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
      <button
        onClick={() => generatePrintReport(termination)}
        className="text-gray-400 hover:text-green-600"
        title="Print Report"
      >
        <PrinterIcon className="h-4 w-4" />
      </button>
                        <button
                          onClick={() => deleteTermination(termination.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete Termination"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                        {termination.isOverdue && (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <p className="text-gray-600">
                        {termination.jobTitle} - {termination.department}
                      </p>
                      <p className="text-sm text-gray-500">
                        Terminated:{" "}
                        {new Date(
                          termination.terminationDate
                        ).toLocaleDateString()}{" "}
                        | Email: {termination.employeeEmail} | Initiated by:{" "}
                        {termination.initiatedBy}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        termination.status,
                        termination.isOverdue
                      )}`}
                    >
                      {termination.isOverdue && (
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      )}
                      {getStatusText(
                        termination.status,
                        termination.daysRemaining,
                        termination.isOverdue
                      )}
                    </div>
                    {termination.trackingNumber && (
                      <div className="text-sm text-gray-500 mt-1">
                        Tracking: {termination.trackingNumber}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Collapsible Content */}
              {termination.isExpanded && (
                <div className="border-t border-gray-200 px-6 py-4 space-y-4">
                  {/* Equipment Return Section */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
                      Equipment Return Process
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Tracking Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tracking Number
                        </label>
                        <input
                          type="text"
                          value={termination.trackingNumber || ""}
                          onChange={(e) =>
                            handleTrackingNumberChange(
                              termination.id,
                              e.target.value
                            )
                          }
                          placeholder="Enter return tracking number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {/* Equipment Disposition */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Equipment Disposition
                        </label>
                        <select
                          value={termination.equipmentDisposition}
                          onChange={(e) =>
                            handleEquipmentDispositionChange(
                              termination.id,
                              e.target.value as "return_to_pool" | "retire"
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="return_to_pool">
                            Return to Available Pool
                          </option>
                          <option value="retire">Retire Equipment</option>
                        </select>
                      </div>

                      {/* Completed By*/}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Completed By (IT Staff)
                        </label>
                        <select
                          value={termination.completedByUserId || ""}
                          onChange={(e) =>
                            handleCompletedByChange(
                              termination.id,
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select IT Staff</option>
                          {itUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Mark Equipment Returned Button */}
                    {isAdminOrIT &&
                      termination.trackingNumber &&
                      termination.completedByUserId && (
                        <div className="mt-4">
                          <button
                            onClick={() =>
                              markEquipmentReturned(
                                termination.id,
                                termination.trackingNumber!,
                                termination.equipmentDisposition,
                                termination.completedByUserId
                              )
                            }
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm flex items-center shadow-sm"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            Mark Equipment Returned
                            {termination.equipmentDisposition ===
                              "return_to_pool" && (
                              <span className="ml-2 text-xs bg-green-600 px-2 py-1 rounded">
                                +1 Laptop to{" "}
                                {
                                  itUsers.find(
                                    (u) =>
                                      u.id === termination.completedByUserId
                                  )?.name
                                }
                                's Inventory
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                  </div>

                  {/* IT Checklist Section - Only for Admin/IT */}
                  {isAdminOrIT && termination.checklist && (
                    <ChecklistSection termination={termination} />
                  )}

                  {/* Action Buttons */}
                  <div className="border-t pt-4 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {termination.isOverdue ? (
                        <span className="text-red-600 font-medium">
                          ⚠️ Equipment return is overdue!
                        </span>
                      ) : (
                        termination.status === "pending" && (
                          <span className="text-amber-600 font-medium">
                            {termination.daysRemaining} days remaining for
                            equipment return
                          </span>
                        )
                      )}
                    </div>
                    <div className="flex gap-2">
                      {termination.status === "equipment_returned" && (
                        <button
                          onClick={() => archiveTermination(termination.id)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
