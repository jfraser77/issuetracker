"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  PencilIcon, 
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  MinusIcon
} from "@heroicons/react/24/outline";
import SearchEmployees from "@/app/components/SearchEmployees";

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
    jobTitle: "",
    department: "",
    terminationDate: new Date().toISOString().split('T')[0],
    terminationReason: "",
    equipmentDisposition: "return_to_pool" as "return_to_pool" | "retire"
  });
  const [newChecklistItem, setNewChecklistItem] = useState({
    category: "",
    description: ""
  });

  const isAuthorized = currentUser?.role === "Admin" || currentUser?.role === "I.T." || currentUser?.role === "HR";
  const isAdminOrIT = currentUser?.role === "Admin" || currentUser?.role === "I.T.";
  const filter = searchParams.get('filter');
  const [isClient, setIsClient] = useState(false);

  // Default IT checklist items
  const defaultChecklist: ChecklistItem[] = [
    {
      id: "1",
      category: "Active Directory",
      description: "Disable Windows/AD account",
      completed: false
    },
    {
      id: "2",
      category: "Active Directory",
      description: 'Enter "disabled" and your initials and date in the Description field',
      completed: false
    },
    {
      id: "3",
      category: "Active Directory",
      description: "Remove all groups from Member Of tab",
      completed: false
    },
    {
      id: "4",
      category: "Active Directory",
      description: "Run Powershell script: Start-ADSyncSyncCycle -PolicyType Delta",
      completed: false
    },
    {
      id: "5",
      category: "Active Directory",
      description: "ScreenConnect and remove the computer from the domain",
      completed: false
    },
    {
      id: "6",
      category: "Active Directory",
      description: "ScreenConnect - General button > Machine Product/Serial#",
      completed: false
    },
    {
      id: "7",
      category: "Microsoft 365",
      description: "Active Users > (NOTE: do not remove license for 30 days)",
      completed: false
    },
    {
      id: "8",
      category: "Microsoft 365",
      description: "Account tab > Groups > Manage Groups – remove all groups",
      completed: false
    },
    {
      id: "9",
      category: "Software Access",
      description: "Navigator",
      completed: false
    },
    {
      id: "10",
      category: "Software Access",
      description: "SourceMed Analytics USPI",
      completed: false
    },
    {
      id: "11",
      category: "Software Access",
      description: "SourceMed Analytics NSN",
      completed: false
    },
    {
      id: "12",
      category: "Software Access",
      description: "SonicWall VPN Connect",
      completed: false
    },
    {
      id: "13",
      category: "Software Access",
      description: "Viirtue – Numbers and Devices. Change drop down to Available Number",
      completed: false
    },
    {
      id: "14",
      category: "Phone/Fax",
      description: "Phone #",
      completed: false
    },
    {
      id: "15",
      category: "Phone/Fax",
      description: "Fax #",
      completed: false
    },
    {
      id: "16",
      category: "Software Access",
      description: "Adobe – permanently delete",
      completed: false
    },
    {
      id: "17",
      category: "Software Access",
      description: "Set Ticket type = Access > Termination. Then Angie gets a notice and will disable Availity and Waystar",
      completed: false
    },
    {
      id: "18",
      category: "Software Access",
      description: "Automate - removed automate license",
      completed: false
    }
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
    const url = filter ? `/api/terminations?filter=${filter}` : '/api/terminations';
    const response = await fetch(url);
    if (response.ok) {
      const terminationsData = await response.json();
      // Ensure each termination has the checklist - FIXED
      const terminationsWithChecklist = terminationsData.map((t: Termination) => ({ 
        ...t, 
        isExpanded: false,
        // Use default checklist if no checklist exists OR if checklist is empty
        checklist: (t.checklist && t.checklist.length > 0) ? t.checklist : [...defaultChecklist]
      }));
      setTerminations(terminationsWithChecklist);
    }
  } catch (error) {
    console.error("Error fetching terminations:", error);
  } finally {
    setLoading(false);
  }
};

  const toggleTerminationExpanded = (terminationId: number) => {
    setTerminations(prev => prev.map(t => 
      t.id === terminationId ? { ...t, isExpanded: !t.isExpanded } : t
    ));
  };

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
          checklist: defaultChecklist
        }),
      });

      if (response.ok) {
        setShowTerminationForm(false);
        setTerminationForm({
          employeeName: "",
          employeeEmail: "",
          jobTitle: "",
          department: "",
          terminationDate: new Date().toISOString().split('T')[0],
          terminationReason: "",
          equipmentDisposition: "return_to_pool"
        });
        fetchTerminations();
        alert("Termination process initiated successfully.");
      }
    } catch (error) {
      console.error("Error creating termination:", error);
      alert("Failed to initiate termination process.");
    }
  };

  const updateTermination = async (terminationId: number, updates: Partial<Termination>) => {
  try {
    const response = await fetch(`/api/terminations/${terminationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
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
    // Refresh to get the correct state from server
    fetchTerminations();
  }
};

  const updateChecklistItem = async (terminationId: number, itemId: string, updates: Partial<ChecklistItem>) => {
  try {
    const termination = terminations.find(t => t.id === terminationId);
    if (!termination?.checklist) return;

    const updatedChecklist = termination.checklist.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );

    // Update local state immediately for better UX
    setTerminations(prev => prev.map(t => 
      t.id === terminationId ? { ...t, checklist: updatedChecklist } : t
    ));

    // Update in database
    await updateTermination(terminationId, { checklist: updatedChecklist });
  } catch (error) {
    console.error("Error updating checklist item:", error);
    // Revert local state on error
    fetchTerminations();
  }
};

  const addChecklistItem = async (terminationId: number) => {
  if (!newChecklistItem.category.trim() || !newChecklistItem.description.trim()) {
    alert("Please enter both category and description");
    return;
  }

  try {
    const termination = terminations.find(t => t.id === terminationId);
    if (!termination?.checklist) return;

    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}`,
      category: newChecklistItem.category.trim(),
      description: newChecklistItem.description.trim(),
      completed: false
    };

    const updatedChecklist = [...termination.checklist, newItem];
    
    // Update local state immediately
    setTerminations(prev => prev.map(t => 
      t.id === terminationId ? { ...t, checklist: updatedChecklist } : t
    ));
    
    // Update in database
    await updateTermination(terminationId, { checklist: updatedChecklist });
    
    // Clear the form
    setNewChecklistItem({ category: "", description: "" });
  } catch (error) {
    console.error("Error adding checklist item:", error);
    fetchTerminations(); // Refresh on error
  }
};

  const removeChecklistItem = async (terminationId: number, itemId: string) => {
  if (!confirm("Are you sure you want to remove this checklist item?")) {
    return;
  }

  try {
    const termination = terminations.find(t => t.id === terminationId);
    if (!termination?.checklist) return;

    const updatedChecklist = termination.checklist.filter(item => item.id !== itemId);
    
    // Update local state immediately
    setTerminations(prev => prev.map(t => 
      t.id === terminationId ? { ...t, checklist: updatedChecklist } : t
    ));
    
    // Update in database
    await updateTermination(terminationId, { checklist: updatedChecklist });
  } catch (error) {
    console.error("Error removing checklist item:", error);
    fetchTerminations(); // Refresh on error
  };
};


  const markEquipmentReturned = async (terminationId: number, trackingNumber: string, equipmentDisposition: string) => {
    try {
      const response = await fetch(`/api/terminations/${terminationId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber, equipmentDisposition }),
      });

      if (response.ok) {
        if (equipmentDisposition === "return_to_pool" && isAdminOrIT) {
          await fetch("/api/it-assets/inventory", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              userId: currentUser?.id, 
              change: 1 
            }),
          });
        }
        fetchTerminations();
        alert("Equipment return recorded successfully.");
      }
    } catch (error) {
      console.error("Error marking equipment returned:", error);
    }
  };

  const archiveTermination = async (terminationId: number) => {
    try {
      const response = await fetch(`/api/terminations/${terminationId}/archive`, {
        method: "POST",
      });

      if (response.ok) {
        fetchTerminations();
      }
    } catch (error) {
      console.error("Error archiving termination:", error);
    }
  };

  const deleteTermination = async (terminationId: number) => {
    if (!confirm("Are you sure you want to delete this termination record? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/terminations/${terminationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTerminations(prev => prev.filter(t => t.id !== terminationId));
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

  const getStatusText = (status: string, daysRemaining: number, isOverdue: boolean) => {
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

  const handleEmployeeSelect = (employee: any) => {
    setTerminationForm(prev => ({
      ...prev,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.email,
      jobTitle: employee.jobTitle,
      department: employee.department
    }));
  };

  const groupChecklistByCategory = (checklist: ChecklistItem[]) => {
    const grouped: { [key: string]: ChecklistItem[] } = {};
    checklist.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
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

      {/* Termination Form Modal - Same as before */}
      {showTerminationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Initiate Termination Process</h3>
            <form onSubmit={createTermination}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    value={terminationForm.employeeName}
                    onChange={(e) => setTerminationForm({ ...terminationForm, employeeName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Email *
                  </label>
                  <input
                    type="email"
                    value={terminationForm.employeeEmail}
                    onChange={(e) => setTerminationForm({ ...terminationForm, employeeEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={terminationForm.jobTitle}
                    onChange={(e) => setTerminationForm({ ...terminationForm, jobTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    value={terminationForm.department}
                    onChange={(e) => setTerminationForm({ ...terminationForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Termination Date *
                  </label>
                  <input
                    type="date"
                    value={terminationForm.terminationDate}
                    onChange={(e) => setTerminationForm({ ...terminationForm, terminationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Equipment Disposition *
                  </label>
                  <select
                    value={terminationForm.equipmentDisposition}
                    onChange={(e) => setTerminationForm({ ...terminationForm, equipmentDisposition: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="return_to_pool">Return to Available Pool</option>
                    <option value="retire">Retire Equipment</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Termination Reason *
                </label>
                <textarea
                  value={terminationForm.terminationReason}
                  onChange={(e) => setTerminationForm({ ...terminationForm, terminationReason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTerminationForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                >
                  Initiate Termination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {terminations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            No Active Termination Processes
          </h2>
          <p className="text-gray-500 mb-4">
            {isAuthorized 
              ? "Get started by initiating a termination process."
              : "No termination processes require attention."
            }
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
          {terminations.map((termination) => (
            <div
              key={termination.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              {/* Termination Header - Always Visible */}
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
                          className="text-gray-400 hover:text-blue-600"
                          title="Edit Termination"
                        >
                          <PencilIcon className="h-4 w-4" />
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
                      <p className="text-gray-600">{termination.jobTitle} - {termination.department}</p>
                      <p className="text-sm text-gray-500">
                        Terminated: {new Date(termination.terminationDate).toLocaleDateString()} | 
                        Email: {termination.employeeEmail} |
                        Initiated by: {termination.initiatedBy}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(termination.status, termination.isOverdue)}`}>
                      {termination.isOverdue && <ExclamationTriangleIcon className="h-4 w-4 mr-1" />}
                      {getStatusText(termination.status, termination.daysRemaining, termination.isOverdue)}
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
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">
                      Equipment Return
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tracking Number
                        </label>
                        <input
                          type="text"
                          value={termination.trackingNumber || ""}
                          onChange={(e) => updateTermination(termination.id, { trackingNumber: e.target.value })}
                          placeholder="Enter return tracking number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Equipment Disposition
                        </label>
                        <select
                          value={termination.equipmentDisposition}
                          onChange={(e) => updateTermination(termination.id, { 
                            equipmentDisposition: e.target.value as "return_to_pool" | "retire" 
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="return_to_pool">Return to Available Pool</option>
                          <option value="retire">Retire Equipment</option>
                        </select>
                      </div>
                    </div>
                    {isAdminOrIT && termination.trackingNumber && (
                      <div className="mt-3">
                        <button
                          onClick={() => markEquipmentReturned(
                            termination.id, 
                            termination.trackingNumber!, 
                            termination.equipmentDisposition
                          )}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm flex items-center"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Mark Equipment Returned
                        </button>
                      </div>
                    )}
                  </div>

{/* IT Checklist Section - Only for Admin/IT */}
{isAdminOrIT && termination.checklist && (
  <div className="border-t pt-4">
    <h3 className="font-medium text-gray-900 mb-3">
      IT Access Removal Checklist
    </h3>
    
    {/* Completed By Dropdown */}
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Completed By
      </label>
      <select
        value={termination.completedByUserId || ""}
        onChange={(e) => updateTermination(termination.id, { 
          completedByUserId: e.target.value ? parseInt(e.target.value) : undefined 
        })}
        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm"
      >
        <option value="">Select IT Staff</option>
        {itUsers.map(user => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.role})
          </option>
        ))}
      </select>
    </div>

    {/* Global Check All/Uncheck All Buttons */}
    <div className="mb-4 flex gap-2">
      <button
        onClick={() => {
          const updatedChecklist = termination.checklist!.map(item => ({
            ...item,
            completed: true,
            completedBy: currentUser?.name,
            completedDate: new Date().toISOString()
          }));
          updateTermination(termination.id, { checklist: updatedChecklist });
        }}
        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center"
      >
        <CheckCircleIcon className="h-4 w-4 mr-1" />
        Check All
      </button>
      <button
        onClick={() => {
          const updatedChecklist = termination.checklist!.map(item => ({
            ...item,
            completed: false,
            completedBy: undefined,
            completedDate: undefined
          }));
          updateTermination(termination.id, { checklist: updatedChecklist });
        }}
        className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center"
      >
        <MinusIcon className="h-4 w-4 mr-1" />
        Uncheck All
      </button>
    </div>

    {/* Checklist Items */}
    {Object.entries(groupChecklistByCategory(termination.checklist)).map(([category, items]) => {
      const allChecked = items.every(item => item.completed);
      const someChecked = items.some(item => item.completed);
      
      return (
        <div key={category} className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-800">{category}</h4>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  const updatedChecklist = termination.checklist!.map(item =>
                    item.category === category 
                      ? { 
                          ...item, 
                          completed: true,
                          completedBy: currentUser?.name,
                          completedDate: new Date().toISOString()
                        }
                      : item
                  );
                  updateTermination(termination.id, { checklist: updatedChecklist });
                }}
                className="text-green-600 hover:text-green-800 text-xs flex items-center"
              >
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Check All
              </button>
              <button
                onClick={() => {
                  const updatedChecklist = termination.checklist!.map(item =>
                    item.category === category 
                      ? { 
                          ...item, 
                          completed: false,
                          completedBy: undefined,
                          completedDate: undefined
                        }
                      : item
                  );
                  updateTermination(termination.id, { checklist: updatedChecklist });
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
              <div key={item.id} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(e) => updateChecklistItem(termination.id, item.id, { 
                    completed: e.target.checked,
                    completedBy: e.target.checked ? currentUser?.name : undefined,
                    completedDate: e.target.checked ? new Date().toISOString() : undefined
                  })}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <label className={`text-sm ${item.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                    {item.description}
                  </label>
                  {item.completed && item.completedBy && (
                    <p className="text-xs text-green-600 mt-1">
                      Completed by {item.completedBy} on {item.completedDate ? new Date(item.completedDate).toLocaleDateString() : 'unknown date'}
                    </p>
                  )}
                  {/* Notes Field */}
                  <textarea
                    placeholder="Add notes..."
                    value={item.notes || ""}
                    onChange={(e) => updateChecklistItem(termination.id, item.id, { notes: e.target.value })}
                    className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-xs"
                    rows={2}
                  />
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
      );
    })}

    {/* Progress Summary */}
    {termination.checklist && (
      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-blue-800">
            Checklist Progress
          </span>
          <span className="text-sm text-blue-700">
            {termination.checklist.filter(item => item.completed).length} of {termination.checklist.length} completed
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${(termination.checklist.filter(item => item.completed).length / termination.checklist.length) * 100}%` 
            }}
          ></div>
        </div>
      </div>
    )}

    {/* Add New Checklist Item */}
    <div className="border-t pt-4">
      <h4 className="font-medium text-gray-800 mb-2">Add New Checklist Item</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
        <input
          type="text"
          placeholder="Category (e.g., Software Access)"
          value={newChecklistItem.category}
          onChange={(e) => setNewChecklistItem({ ...newChecklistItem, category: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        />
        <input
          type="text"
          placeholder="Description"
          value={newChecklistItem.description}
          onChange={(e) => setNewChecklistItem({ ...newChecklistItem, description: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        />
      </div>
      <button
        onClick={() => addChecklistItem(termination.id)}
        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
      >
        <PlusIcon className="h-4 w-4 mr-1" />
        Add Item
      </button>
    </div>
  </div>
)}

                  {/* Action Buttons */}
                  <div className="border-t pt-4 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {termination.isOverdue ? (
                        <span className="text-red-600 font-medium">
                          ⚠️ Equipment return is overdue!
                        </span>
                      ) : termination.status === "pending" && (
                        <span className="text-amber-600 font-medium">
                          {termination.daysRemaining} days remaining for equipment return
                        </span>
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