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

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  completed: boolean;
  completedBy?: string;
  completedDate?: string;
  notes?: string;
}

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
  equipmentDisposition: "return_to_pool" | "retire" | "pending_assessment";
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

export default function TerminationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [terminations, setTerminations] = useState<Termination[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [itUsers, setItUsers] = useState<User[]>([]);
  const [showTerminationForm, setShowTerminationForm] = useState(false);
  const [terminationForm, setTerminationForm] = useState({
    employeeName: "",
    employeeEmail: "",
    terminationDate: new Date().toISOString().split("T")[0],
  });

  const isAuthorized =
    currentUser?.role === "Admin" ||
    currentUser?.role === "I.T." ||
    currentUser?.role === "HR";
  const isAdminOrIT =
    currentUser?.role === "Admin" || currentUser?.role === "I.T.";
  const filter = searchParams.get("filter");
  const [isClient, setIsClient] = useState(false);

  // Memoize the filtered terminations to prevent unnecessary re-renders
  const filteredTerminations = useMemo(() => {
    return terminations;
  }, [terminations]);

  // Default IT checklist items
  const defaultChecklist: ChecklistItem[] = [
    {
      id: "1",
      category: "Active Directory",
      description: "Disable Windows/AD account",
      completed: false,
    },
    {
      id: "2",
      category: "Active Directory",
      description:
        'Enter "disabled" and your initials and date in the Description field',
      completed: false,
    },
    {
      id: "3",
      category: "Active Directory",
      description: "Remove all groups from Member Of tab",
      completed: false,
    },
    {
      id: "4",
      category: "Active Directory",
      description:
        "Run Powershell script: Start-ADSyncSyncCycle -PolicyType Delta",
      completed: false,
    },
    {
      id: "5",
      category: "Active Directory",
      description: "ScreenConnect and remove the computer from the domain",
      completed: false,
    },
    {
      id: "6",
      category: "Active Directory",
      description: "ScreenConnect - General button > Machine Product/Serial#",
      completed: false,
    },
    {
      id: "7",
      category: "Microsoft 365",
      description: "Active Users > (NOTE: do not remove license for 30 days)",
      completed: false,
    },
    {
      id: "8",
      category: "Microsoft 365",
      description: "Account tab > Groups > Manage Groups – remove all groups",
      completed: false,
    },
    {
      id: "9",
      category: "Software Access",
      description: "Navigator",
      completed: false,
    },
    {
      id: "10",
      category: "Software Access",
      description: "SourceMed Analytics USPI",
      completed: false,
    },
    {
      id: "11",
      category: "Software Access",
      description: "SourceMed Analytics NSN",
      completed: false,
    },
    {
      id: "12",
      category: "Software Access",
      description: "SonicWall VPN Connect",
      completed: false,
    },
    {
      id: "13",
      category: "Software Access",
      description:
        "Viirtue – Numbers and Devices. Change drop down to Available Number",
      completed: false,
    },
    {
      id: "14",
      category: "Phone/Fax",
      description: "Phone #",
      completed: false,
    },
    {
      id: "15",
      category: "Phone/Fax",
      description: "Fax #",
      completed: false,
    },
    {
      id: "16",
      category: "Software Access",
      description: "Adobe – permanently delete",
      completed: false,
    },
    {
      id: "17",
      category: "Software Access",
      description:
        "Set Ticket type = Access > Termination. Then Angie gets a notice and will disable Availity and Waystar",
      completed: false,
    },
    {
      id: "18",
      category: "Software Access",
      description: "Automate - removed automate license",
      completed: false,
    },
  ];

  useEffect(() => {
    setIsClient(true);
    fetchCurrentUser();
    fetchTerminations();
    fetchITUsers();

    const interval = setInterval(checkOverdueTerminations, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [filter]);

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

  const toggleTerminationExpanded = useCallback((terminationId: number) => {
    setTerminations((prev) =>
      prev.map((t) =>
        t.id === terminationId ? { ...t, isExpanded: !t.isExpanded } : t
      )
    );
  }, []);

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
          employeeName: terminationForm.employeeName,
          employeeEmail: terminationForm.employeeEmail,
          terminationDate: terminationForm.terminationDate,
          initiatedBy: currentUser?.name,
          checklist: defaultChecklist,
          // Set default values for removed fields
          jobTitle: "To be determined",
          department: "To be determined", 
          terminationReason: "Termination process initiated",
        }),
      });

      if (response.ok) {
        setShowTerminationForm(false);
        setTerminationForm({
          employeeName: "",
          employeeEmail: "",
          terminationDate: new Date().toISOString().split("T")[0],
        });
        fetchTerminations();
        alert("Termination process initiated successfully.");
      } else {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        alert(`Failed to initiate termination: ${errorData.error || errorData.details || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error creating termination:", error);
      alert("Failed to initiate termination process. Please check console for details.");
    }
  };

  const updateTermination = async (
    terminationId: number,
    updates: Partial<Termination>
  ) => {
    try {
      // Preserve expanded state during updates
      const currentTermination = terminations.find(
        (t) => t.id === terminationId
      );
      const updatesWithState = {
        ...updates,
        isExpanded: currentTermination?.isExpanded, // Preserve current expanded state
      };

      const response = await fetch(`/api/terminations/${terminationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatesWithState),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to update termination");
      }

      // Only refresh if the update was successful
      fetchTerminations();
    } catch (error) {
      console.error("Error updating termination:", error);
      alert("Failed to update termination. Please try again.");
      fetchTerminations();
    }
  };

  const updateChecklistItem = async (
    terminationId: number,
    itemId: string,
    updates: Partial<ChecklistItem>
  ) => {
    try {
      // Update local state immediately and capture the updated checklist
      let updatedChecklistForApi: ChecklistItem[] | null = null;

      setTerminations((prevTerminations) => {
        return prevTerminations.map((t) => {
          if (t.id !== terminationId || !t.checklist) return t;

          const updatedChecklist = t.checklist.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          );

          // Store the updated checklist for the API call
          updatedChecklistForApi = updatedChecklist;

          return {
            ...t,
            checklist: updatedChecklist,
          };
        });
      });

      // Debounced API call using the captured updated checklist
      const timeoutId = setTimeout(async () => {
        try {
          if (!updatedChecklistForApi) return;

          await fetch(`/api/terminations/${terminationId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ checklist: updatedChecklistForApi }),
          });
        } catch (error) {
          console.error("Error updating checklist item:", error);
        }
      }, 500); // Reduced to 500ms for better responsiveness

      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error("Error in updateChecklistItem:", error);
    }
  };

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to mark equipment returned");
      }

      const result = await response.json();
      const updatedTermination = result.termination;

      // Update local state immediately
      setTerminations((prev) =>
        prev.map((t) =>
          t.id === terminationId
            ? {
                ...updatedTermination,
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
    } catch (error) {
      console.error("Error marking equipment returned:", error);
      alert(
        `Failed to record equipment return: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      // Refresh on error to restore correct state
      fetchTerminations();
    }
  };

  const handleEquipmentDispositionChange = useCallback(
    (terminationId: number, value: "return_to_pool" | "retire" | "pending_assessment") => {
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

  const handleTrackingNumberChange = useCallback(
    (terminationId: number, value: string) => {
      setTerminations((prev) =>
        prev.map((t) =>
          t.id === terminationId
            ? {
                ...t,
                trackingNumber: value,
                isExpanded: t.isExpanded, // Preserve expanded state
              }
            : t
        )
      );
      debouncedUpdateTrackingNumber(terminationId, value);
    },
    [debouncedUpdateTrackingNumber]
  );

  const getStatusColor = (status: string, isOverdue: boolean, equipmentDisposition?: string) => {
    if (isOverdue) return "bg-red-100 text-red-800";
    
    if (status === "pending" && equipmentDisposition === "pending_assessment") {
      return "bg-blue-100 text-blue-800";
    }

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

  const getStatusText = (
    status: string,
    daysRemaining: number,
    isOverdue: boolean,
    equipmentDisposition?: string
  ) => {
    if (isOverdue) return "OVERDUE - Equipment Not Returned";
    
    if (status === "pending" && equipmentDisposition === "pending_assessment") {
      return "Awaiting Equipment Return";
    }

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

  // Rest of your component functions (archiveTermination, deleteTermination, etc.)
  const archiveTermination = async (terminationId: number) => {
    try {
      const response = await fetch(
        `/api/terminations/${terminationId}/archive`,
        {
          method: "POST",
        }
      );

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

  const checkOverdueTerminations = async () => {
    try {
      await fetch("/api/terminations/check-overdue", { method: "POST" });
      fetchTerminations();
    } catch (error) {
      console.error("Error checking overdue terminations:", error);
    }
  };

  const generatePrintReport = (termination: Termination) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const completedChecklistItems =
      termination.checklist?.filter((item) => item.completed) || [];
    const totalChecklistItems = termination.checklist?.length || 0;
    const progress =
      totalChecklistItems > 0
        ? Math.round(
            (completedChecklistItems.length / totalChecklistItems) * 100
          )
        : 0;

    const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Termination Report - ${termination.employeeName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.4; }
        .header { border-bottom: 2px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #dc2626; margin: 0; font-size: 28px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; }
        .employee-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .info-item { margin-bottom: 8px; }
        .info-label { font-weight: bold; color: #6b7280; display: inline-block; width: 180px; }
        .progress-bar { background: #e5e7eb; height: 24px; border-radius: 12px; margin: 15px 0; overflow: hidden; }
        .progress-fill { background: #dc2626; height: 100%; border-radius: 12px; text-align: center; color: white; font-size: 14px; line-height: 24px; font-weight: bold; }
        .checklist { margin: 15px 0; }
        .checklist-item { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .completed { color: #059669; }
        .pending { color: #6b7280; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-left: 10px; font-weight: 500; }
        .completed-badge { background: #d1fae5; color: #065f46; }
        .pending-badge { background: #f3f4f6; color: #374151; }
        .print-date { text-align: right; color: #6b7280; font-size: 14px; margin-top: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
        .stat-number { font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 4px; }
        .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        @media print { body { margin: 20px; } .no-print { display: none; } .section { break-inside: avoid; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Employee Termination Report</h1>
        <div class="print-date">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
      </div>

      <div class="section">
        <h2>Employee Information</h2>
        <div class="employee-info">
          <div>
            <div class="info-item"><span class="info-label">Employee Name:</span> ${
              termination.employeeName
            }</div>
            <div class="info-item"><span class="info-label">Job Title:</span> ${
              termination.jobTitle
            }</div>
            <div class="info-item"><span class="info-label">Department:</span> ${
              termination.department
            }</div>
            <div class="info-item"><span class="info-label">Email:</span> ${
              termination.employeeEmail
            }</div>
          </div>
          <div>
            <div class="info-item"><span class="info-label">Termination Date:</span> ${new Date(
              termination.terminationDate
            ).toLocaleDateString()}</div>
            <div class="info-item"><span class="info-label">Reason:</span> ${
              termination.terminationReason
            }</div>
            <div class="info-item"><span class="info-label">Initiated By:</span> ${
              termination.initiatedBy
            }</div>
            <div class="info-item"><span class="info-label">Status:</span> ${
              termination.status
            }</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Equipment Return</h2>
        <div class="employee-info">
          <div>
            <div class="info-item"><span class="info-label">Tracking Number:</span> ${
              termination.trackingNumber || "Not provided"
            }</div>
            <div class="info-item"><span class="info-label">Disposition:</span> ${
              termination.equipmentDisposition === "return_to_pool"
                ? "Return to Available Pool"
                : termination.equipmentDisposition === "retire"
                ? "Retire Equipment"
                : "Pending Assessment"
            }</div>
          </div>
          <div>
            <div class="info-item"><span class="info-label">Completed By:</span> ${
              termination.completedByUser?.name || "Not assigned"
            }</div>
            <div class="info-item"><span class="info-label">Days Remaining:</span> ${
              termination.daysRemaining
            }</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Checklist Progress</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${progress}%</div>
            <div class="stat-label">Overall Progress</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${completedChecklistItems.length}</div>
            <div class="stat-label">Completed Items</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${totalChecklistItems}</div>
            <div class="stat-label">Total Items</div>
          </div>
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%">${progress}%</div>
        </div>
      </div>

      <div class="section">
        <h2>IT Access Removal Checklist</h2>
        <div class="checklist">
          ${
            termination.checklist
              ?.map(
                (item) => `
            <div class="checklist-item ${
              item.completed ? "completed" : "pending"
            }">
              ${item.completed ? "✓" : "○"} ${item.description}
              <span class="status-badge ${
                item.completed ? "completed-badge" : "pending-badge"
              }">
                ${item.completed ? "Completed" : "Pending"}
              </span>
              ${
                item.completed && item.completedBy
                  ? `<br><small>Completed by ${item.completedBy} on ${
                      item.completedDate
                        ? new Date(item.completedDate).toLocaleDateString()
                        : "unknown date"
                    }</small>`
                  : ""
              }
            </div>
          `
              )
              .join("") || "No checklist items"
          }
        </div>
      </div>

      <div class="section">
        <div class="print-date">
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0 20px 0;">
          Report generated by NSN IT Management Portal<br>
          Termination ID: ${termination.id} | Report ID: ${Date.now()}
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(() => {
            if (!window.closed) {
              window.close();
            }
          }, 1000);
        }
      </script>
    </body>
    </html>`;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const ChecklistSection = ({ termination }: { termination: Termination }) => {
    const [localNewItem, setLocalNewItem] = useState({
      category: "",
      description: "",
    });

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
        {/* Completed By Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Completed By
          </label>
          <select
            value={termination.completedByUserId || ""}
            onChange={(e) =>
              handleCompletedByChange(termination.id, e.target.value)
            }
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Select IT Staff</option>
            {itUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </div>
        <h3 className="font-medium text-gray-900 mb-3">
          IT Access Removal Checklist
        </h3>

        {/* Global Check All/Uncheck All Buttons */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => {
              const updatedChecklist = termination.checklist!.map((item) => ({
                ...item,
                completed: true,
                completedBy: currentUser?.name,
                completedDate: new Date().toISOString(),
              }));
              updateTermination(termination.id, {
                checklist: updatedChecklist,
              });
            }}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center"
          >
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            Check All
          </button>
          <button
            onClick={() => {
              const updatedChecklist = termination.checklist!.map((item) => ({
                ...item,
                completed: false,
                completedBy: undefined,
                completedDate: undefined,
              }));
              updateTermination(termination.id, {
                checklist: updatedChecklist,
              });
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center"
          >
            <MinusIcon className="h-4 w-4 mr-1" />
            Uncheck All
          </button>
        </div>

        {/* Checklist Items */}
        {Object.entries(
          groupChecklistByCategory(termination.checklist || [])
        ).map(([category, items]) => (
          <div key={category} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-800">{category}</h4>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const updatedChecklist = termination.checklist!.map(
                      (item) =>
                        item.category === category
                          ? {
                              ...item,
                              completed: true,
                              completedBy: currentUser?.name,
                              completedDate: new Date().toISOString(),
                            }
                          : item
                    );
                    updateTermination(termination.id, {
                      checklist: updatedChecklist,
                    });
                  }}
                  className="text-green-600 hover:text-green-800 text-xs flex items-center"
                >
                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                  Check All
                </button>
                <button
                  onClick={() => {
                    const updatedChecklist = termination.checklist!.map(
                      (item) =>
                        item.category === category
                          ? {
                              ...item,
                              completed: false,
                              completedBy: undefined,
                              completedDate: undefined,
                            }
                          : item
                    );
                    updateTermination(termination.id, {
                      checklist: updatedChecklist,
                    });
                  }}
                  className="text-gray-600 hover:text-gray-800 text-xs flex items-center"
                >
                  <MinusIcon className="h-3 w-3 mr-1" />
                  Uncheck All
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start space-x-3 p-2 bg-gray-50 rounded"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={(e) =>
                      updateChecklistItem(termination.id, item.id, {
                        completed: e.target.checked,
                        completedBy: e.target.checked
                          ? currentUser?.name
                          : undefined,
                        completedDate: e.target.checked
                          ? new Date().toISOString()
                          : undefined,
                      })
                    }
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <label
                      className={`text-sm ${
                        item.completed
                          ? "text-gray-500 line-through"
                          : "text-gray-700"
                      }`}
                    >
                      {item.description}
                    </label>
                    {item.completed && item.completedBy && (
                      <p className="text-xs text-green-600 mt-1">
                        Completed by {item.completedBy} on{" "}
                        {item.completedDate
                          ? new Date(item.completedDate).toLocaleDateString()
                          : "unknown date"}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeChecklistItem(termination.id, item.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Remove item"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Progress Summary */}
        {termination.checklist && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-800">
                Checklist Progress
              </span>
              <span className="text-sm text-blue-700">
                {termination.checklist.filter((item) => item.completed).length}{" "}
                of {termination.checklist.length} completed
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (termination.checklist.filter((item) => item.completed)
                      .length /
                      termination.checklist.length) *
                    100
                  }%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Add New Checklist Item */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-800 mb-2">
            Add New Checklist Item
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
            <input
              type="text"
              placeholder="Category (e.g., Software Access)"
              value={localNewItem.category}
              onChange={(e) =>
                setLocalNewItem({ ...localNewItem, category: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <input
              type="text"
              placeholder="Description"
              value={localNewItem.description}
              onChange={(e) =>
                setLocalNewItem({
                  ...localNewItem,
                  description: e.target.value,
                })
              }
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <button
            onClick={handleAddChecklistItem}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Item
          </button>
        </div>
      </div>
    );
  };
  

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
                isExpanded: t.isExpanded, // Preserve expanded state
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

  // Helper function to determine if a termination can be archived
const canArchiveTermination = (termination: Termination) => {
  if (termination.status !== 'equipment_returned') return false;
  if (!termination.trackingNumber) return false;
  if (!termination.completedByUserId) return false;
  
  // Check checklist completion
  const completedItems = termination.checklist?.filter(item => item.completed).length || 0;
  const totalItems = termination.checklist?.length || 0;
  const checklistCompletion = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  
  return checklistCompletion === 100;
};

// Helper function to get checklist completion status
const getCompletionStatus = (termination: Termination) => {
  const completedItems = termination.checklist?.filter(item => item.completed).length || 0;
  const totalItems = termination.checklist?.length || 0;
  const checklistCompletion = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  
  return {
    checklistCompletion: Math.round(checklistCompletion),
    isChecklistComplete: checklistCompletion === 100,
    completedItems,
    totalItems
  };
};

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
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Initiate Termination Process
            </h3>
            <form onSubmit={createTermination}>
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    value={terminationForm.employeeName}
                    onChange={(e) =>
                      setTerminationForm({
                        ...terminationForm,
                        employeeName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Email *
                  </label>
                  <input
                    type="email"
                    value={terminationForm.employeeEmail}
                    onChange={(e) =>
                      setTerminationForm({
                        ...terminationForm,
                        employeeEmail: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Termination Date *
                  </label>
                  <input
                    type="date"
                    value={terminationForm.terminationDate}
                    onChange={(e) =>
                      setTerminationForm({
                        ...terminationForm,
                        terminationDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> HR must provide the equipment return tracking number in the termination record.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTerminationForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium"
                >
                  Initiate Termination
                </button>
              </div>
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
                          onClick={() => router.push(`/management-portal/terminations/${termination.id}/edit`)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
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
                        termination.isOverdue,
                        termination.equipmentDisposition
                      )}`}
                    >
                      {termination.isOverdue && (
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      )}
                      {getStatusText(
                        termination.status,
                        termination.daysRemaining,
                        termination.isOverdue,
                        termination.equipmentDisposition
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
                          Tracking Number *
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
                          required
                        />
                      </div>

                      {/* Equipment Disposition */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Equipment Disposition *
                        </label>
                        <select
                          value={termination.equipmentDisposition || "pending_assessment"}
                          onChange={(e) =>
                            handleEquipmentDispositionChange(
                              termination.id,
                              e.target.value as "return_to_pool" | "retire" | "pending_assessment"
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="pending_assessment">Pending Assessment</option>
                          <option value="return_to_pool">Return to Available Pool</option>
                          <option value="retire">Retire Equipment</option>
                        </select>
                      </div>

                      {/* Completed By */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Completed By (IT Staff) *
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
                          required
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

                    {/* Completion Status */}
                    <div className="mt-3 p-3 bg-gray-50 rounded border">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Completion Status</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className={`p-2 rounded ${termination.trackingNumber ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          Tracking Number: {termination.trackingNumber ? '✓ Provided' : '✗ Missing'}
                        </div>
                        <div className={`p-2 rounded ${termination.completedByUserId ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          IT Staff: {termination.completedByUserId ? '✓ Assigned' : '✗ Not Assigned'}
                        </div>
                        <div className={`p-2 rounded ${termination.equipmentDisposition && termination.equipmentDisposition !== 'pending_assessment' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          Disposition: {termination.equipmentDisposition && termination.equipmentDisposition !== 'pending_assessment' ? '✓ Set' : '✗ Not Set'}
                        </div>
                        <div className={`p-2 rounded ${getCompletionStatus(termination).isChecklistComplete ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          Checklist: {getCompletionStatus(termination).checklistCompletion}%
                        </div>
                      </div>
                    </div>

                    {/* Mark Equipment Returned Button */}
                    {isAdminOrIT && (
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            if (!termination.trackingNumber) {
                              alert("Please enter a tracking number");
                              return;
                            }
                            if (!termination.completedByUserId) {
                              alert("Please select an IT staff member");
                              return;
                            }
                            if (!termination.equipmentDisposition || 
                                termination.equipmentDisposition === "pending_assessment") {
                              alert("Please select equipment disposition");
                              return;
                            }
                            
                            markEquipmentReturned(
                              termination.id,
                              termination.trackingNumber!,
                              termination.equipmentDisposition,
                              termination.completedByUserId
                            );
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm flex items-center shadow-sm"
                          disabled={!termination.trackingNumber || !termination.completedByUserId || 
                                    !termination.equipmentDisposition || 
                                    termination.equipmentDisposition === "pending_assessment"}
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Mark Equipment Returned
                          {termination.equipmentDisposition === "return_to_pool" && (
                            <span className="ml-2 text-xs bg-green-600 px-2 py-1 rounded">
                              +1 Laptop to{" "}
                              {
                                itUsers.find(
                                  (u) => u.id === termination.completedByUserId
                                )?.name
                              }
                              's Inventory
                            </span>
                          )}
                        </button>
                        
                        {(!termination.trackingNumber || !termination.completedByUserId || 
                          !termination.equipmentDisposition || termination.equipmentDisposition === "pending_assessment") && (
                          <div className="mt-2 text-xs text-amber-600">
                            {!termination.trackingNumber && "• Tracking number required\n"}
                            {!termination.completedByUserId && "• IT staff member required\n"}
                            {(!termination.equipmentDisposition || termination.equipmentDisposition === "pending_assessment") && 
                             "• Equipment disposition required"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* IT Checklist Section */}
                  {isAdminOrIT && termination.checklist && (
                    <ChecklistSection termination={termination} />
                  )}

                  {/* Action Buttons */}
                  <div className="border-t pt-4 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {termination.isOverdue ? (
                        <span className="text-red-600 font-medium flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          Equipment return is overdue!
                        </span>
                      ) : termination.status === "pending" ? (
                        <span className="text-amber-600 font-medium">
                          {termination.daysRemaining} days remaining for equipment return
                        </span>
                      ) : termination.status === "equipment_returned" ? (
                        <div className="flex items-center space-x-4">
                          <span className="text-green-600 font-medium flex items-center">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Equipment Returned - Ready for Archive
                          </span>
                          <span className="text-blue-600">
                            Checklist: {getCompletionStatus(termination).checklistCompletion}% Complete
                          </span>
                        </div>
                      ) : null}
                    </div>
                    
                    <div className="flex gap-2">
                      {termination.status === "equipment_returned" && (
                        <button
                          onClick={() => {
                            const completion = getCompletionStatus(termination);
                            if (!canArchiveTermination(termination)) {
                              alert(`Cannot archive yet:\n• Checklist must be 100% complete (currently ${completion.checklistCompletion}%)\n• All fields must be completed`);
                              return;
                            }
                            archiveTermination(termination.id);
                          }}
                          className={`px-3 py-1 rounded text-sm flex items-center ${
                            canArchiveTermination(termination)
                              ? "bg-green-500 hover:bg-green-600 text-white shadow-sm"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                          disabled={!canArchiveTermination(termination)}
                          title={
                            canArchiveTermination(termination)
                              ? "Archive this completed termination"
                              : "Complete all requirements to archive"
                          }
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Archive
                          {canArchiveTermination(termination) && (
                            <span className="ml-1 text-xs bg-green-600 px-1 rounded">✓</span>
                          )}
                        </button>
                      )}
                      
                      {termination.status === "equipment_returned" && !canArchiveTermination(termination) && (
                        <div className="text-xs text-amber-600 flex items-center">
                          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                          Complete checklist to archive
                        </div>
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